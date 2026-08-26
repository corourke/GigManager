# Organizations, Contacts & Clients — Product & Engineering Spec

Status: Proposed, not yet built. Decisions below were confirmed with the product owner (Cameron) on 2026-08-25.

## 1. Problem

On the Gig edit page today:

- **Participants** shows which organizations are on a gig, but only `role` (Venue/Agency/Production/etc.) and `notes` — no way to see or manage *people* at those orgs, and no way to say which one is paying us.
- **Staff Assignments** shows people, but every assignment is implicitly "our own org's roster" — there's no field recording which of a person's organizations they're representing on *this* booking. (`gig_staff_slots.organization_id` is always hard-coded to the viewing org — see §2.3.)
- There is no way to add a new Organization without leaving the gig (`OrganizationSelector` only searches existing orgs; creating one means navigating to `/create-org`).
- There is no "Contact" concept at all. The only person entity is `users`, and the only way to attach a person to an org is `organization_members`, which today always means "a real GigWrangler team member" (invited by email, has a role, shows up in Team).

Net effect: you can't answer "who do I call at the venue" or "who's actually paying for this gig" from inside GigWrangler.

## 2. Decisions (already made, not open for re-litigation in this doc)

1. **No new `contacts` table.** A Contact is a `public.users` row with `user_status = 'contact'` — same table that already holds `'active' | 'pending' | 'inactive'` rows, and already supports rows with no matching `auth.users` account (that's exactly what `'pending'` invites are today — see §5.1). A contact is simply a person who will never log in.
2. **Client is a flag, not a role.** `gig_participants.role` stays an `organization_role` (Venue/Agency/Production/...) describing *what the org does*. A new `gig_participants.is_client boolean` is orthogonal and describes *who's paying* — an org can be both e.g. `Venue` and the client. Shown as a ★ in the Participants table. No uniqueness enforced — a gig can have more than one org flagged client (split-billing, co-promotion) unless a later spec asks to lock it to one.
3. **Primary contact has two levels, both flagged with a ★:**
   - **Org-level default** — `organization_members.is_primary_contact`. "Who do we generally talk to at this org."
   - **Per-gig override** — set when adding a person (contact or staffer) to a specific gig. "Who's the point of contact at this org *for this booking*," which may differ from the org default (a stagehand company's on-site lead varies by show).
4. **Contacts and staff need one unified add-flow**, and financial (staff) and non-financial (contact) attachments to a gig must stay in separate tables — not a shared table with nullable `rate`/`fee` — so a contact can never accidentally accrue cost. See §6.

## 3. Recommended phasing

This is a two-phase build. Phase 1 is materially lower risk (doesn't touch the financial/staffing code path at all) and delivers most of the stated value on its own. Phase 2 is the harder schema+UI unification and should only start once Phase 1 is in use.

| | Value | Cost/Risk | Touches financial code? |
|---|---|---|---|
| **Phase 1** — Org quick-create, Contacts on Organizations, org-level primary contact, `is_client` flag on Participants | High — directly answers "who's the client" and "who do I call," the two things asked for first | Low-Medium — one new SECURITY DEFINER fn, two new nullable columns, one new UI section | No |
| **Phase 2** — Unified add-person-to-gig flow, per-gig contact/staff list grouped by org, per-assignment org affiliation | Medium-High — fixes the "which company is this stagehand from today" gap and finishes the ★-primary-contact-per-gig requirement | Medium-High — new table, new column on `gig_staff_assignments`, restructures two existing gig sections | Yes (additive only — no changes to `gig_financials`, `completeStaffAssignment`, or cost math) |

Ship Phase 1 first, get it in front of real gigs, then start Phase 2.

## 4. Phase 1 — Functional design

### 4.1 Inline organization creation
`OrganizationSelector.tsx` (used in Participants and elsewhere) gets a "+ Create '{query}'" row at the bottom of search results when there's a non-empty query. It opens a small dialog (Name + Roles checkboxes only — the fields `OrganizationScreen.tsx` already treats as the minimum required set) and calls the existing `createOrganization()`. On success, `onSelect(newOrg)` fires exactly like picking an existing result — no navigation away from the gig. Full editing (address, description, allowed domains, Google Places lookup) stays on `OrganizationScreen`, reachable the same way it is today (pencil icon, admin-only).

### 4.2 Contacts section on Organizations
New "Contacts" section on `OrganizationScreen.tsx` (edit mode only — an org must exist first), visually separate from Team/Members. Table: Name, Title, Email, Phone, ★ (primary), Actions.

- **Add Contact** dialog: First name, last name, email (required — it's the natural de-dupe key), phone, title, "Set as primary contact" checkbox. Calls new RPC `add_organization_contact` (§5.1).
- **Edit**: updates `users` (name/phone) + `organization_members.contact_title` directly — both already permitted by existing RLS for org Admins/Managers, no new RPC needed.
- **Toggle primary (★)**: `UPDATE organization_members SET is_primary_contact = true WHERE id = ...` — service function should clear any other primary for that org first (see §5.1 partial unique index, which is the backstop if it doesn't).
- **Remove**: delete the `organization_members` row (does not delete the `users` row — same as removing a team member today).

If the email entered already belongs to an existing `users` row (a real team member elsewhere, or a contact at another org), the person is linked, not duplicated — same behavior `invite_user_to_organization` already has for active users.

### 4.3 Client flag + contact visibility in Participants
`GigParticipantsSection.tsx`:
- New ★ toggle column: "Mark as client." Persists `gig_participants.is_client`.
- New read-only "Contact" column: shows the org's primary contact name (org-level default from §4.2), pulled via the existing organization fetch. Click opens a small popover listing all of that org's contacts (name, title, phone, email — call-to-call info, no editing here). This satisfies "display the contacts associated with a gig" for Phase 1 without building the full per-gig override (that's Phase 2).

### 4.4 Non-goals for Phase 1
- No changes to Staff Assignments UI or `gig_staff_*` tables.
- No per-gig contact attachment (`gig_contacts` table) — that's Phase 2.
- No enforcement that only one org can be `is_client` — ship permissive, tighten later if it's ever a real problem.

## 5. Phase 1 — Engineering spec

### 5.1 Schema (new migration, e.g. `supabase/migrations/<ts>_organizations_contacts_and_client_flag.sql`)

```sql
-- 1. Allow 'contact' as a user_status. Plain CHECK constraint, not an enum — cheap, no ALTER TYPE ordering issues.
ALTER TABLE public.users DROP CONSTRAINT users_user_status_check;
ALTER TABLE public.users ADD CONSTRAINT users_user_status_check
  CHECK (user_status = ANY (ARRAY['active','inactive','pending','contact']::text[]));
COMMENT ON COLUMN public.users.user_status IS
  'active (authenticated), pending (invited, not yet signed up), inactive (disabled), contact (rolodex-only, will never log in)';

-- 2. Org-level primary-contact flag + per-org title, on the existing membership table.
ALTER TABLE public.organization_members ADD COLUMN is_primary_contact boolean NOT NULL DEFAULT false;
ALTER TABLE public.organization_members ADD COLUMN contact_title text;
COMMENT ON COLUMN public.organization_members.contact_title IS
  'Free-text title for this person at this org, e.g. "Venue Manager" — distinct from role, which is a GigWrangler permission level';

-- Backstop: at most one primary contact per org, even if something bypasses the service-layer clear-then-set logic.
CREATE UNIQUE INDEX organization_members_one_primary_contact_per_org
  ON public.organization_members (organization_id) WHERE is_primary_contact = true;

-- 3. Client flag on gig participants. No uniqueness — see decision #2.
ALTER TABLE public.gig_participants ADD COLUMN is_client boolean NOT NULL DEFAULT false;
```

Do **not** add a `'Contact'` value to the `user_role` enum. Reuse `role = 'Viewer'` (lowest existing permission tier) for contact memberships; `users.user_status = 'contact'` is the authoritative signal for "this is a rolodex entry," checked wherever the UI needs to distinguish contacts from real team members. This avoids `ALTER TYPE ... ADD VALUE` transaction-ordering gotchas for no real benefit — nothing currently branches permission logic on a `Contact`-vs-`Viewer` distinction.

### 5.2 New SECURITY DEFINER function

Model directly on `invite_user_to_organization` (`supabase/migrations/20260209000000_initial_schema.sql:598`), which already knows how to create a `users` row with no `auth.users` account. New function, same file as the migration above:

```sql
CREATE OR REPLACE FUNCTION public.add_organization_contact(
  p_organization_id uuid,
  p_email text,
  p_first_name text,
  p_last_name text,
  p_phone text DEFAULT NULL,
  p_title text DEFAULT NULL,
  p_is_primary boolean DEFAULT false,
  p_actor_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_actor_id uuid;
  v_user_id uuid;
  v_member jsonb;
BEGIN
  v_actor_id := COALESCE(p_actor_id, auth.uid());
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = p_organization_id AND user_id = v_actor_id AND role IN ('Admin','Manager')
  ) THEN
    RAISE EXCEPTION 'Permission denied: Only Admins and Managers can add contacts';
  END IF;

  -- Reuse an existing person by email if there is one (any status) rather than duplicate them.
  SELECT id INTO v_user_id FROM public.users WHERE email = p_email;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    INSERT INTO public.users (id, email, first_name, last_name, phone, user_status)
    VALUES (v_user_id, p_email, COALESCE(p_first_name, ''), COALESCE(p_last_name, ''), p_phone, 'contact');
  END IF;

  IF EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = p_organization_id AND user_id = v_user_id) THEN
    RAISE EXCEPTION 'This person is already associated with this organization';
  END IF;

  IF p_is_primary THEN
    UPDATE public.organization_members SET is_primary_contact = false
    WHERE organization_id = p_organization_id AND is_primary_contact = true;
  END IF;

  INSERT INTO public.organization_members (organization_id, user_id, role, contact_title, is_primary_contact)
  VALUES (p_organization_id, v_user_id, 'Viewer', p_title, p_is_primary)
  RETURNING jsonb_build_object(
    'id', id, 'organization_id', organization_id, 'user_id', user_id,
    'contact_title', contact_title, 'is_primary_contact', is_primary_contact
  ) INTO v_member;

  RETURN jsonb_build_object('user_id', v_user_id, 'member', v_member);
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_organization_contact TO authenticated;
```

Call it the same way `convertPendingToActive` calls its RPC (`supabase.rpc(...)`) — no edge-function route needed, `organization.service.ts` can call this directly. Toggling `is_primary_contact` on an *existing* member, and editing `contact_title`/phone/name, are plain authenticated `UPDATE`s — already covered by the existing `"Admins can manage organization members"` and `self_update`/`org_view` policies, so no RPC needed for those.

### 5.3 RLS

No new RLS needed — `organization_members` and `users` already have adequate policies for everything except *creating* a brand-new person, which is what the SECURITY DEFINER function in §5.2 is for.

### 5.4 Types

Regenerate `src/utils/supabase/database.types.ts` (`supabase gen types typescript`). Update `src/utils/supabase/types.ts` (or wherever `Organization`/`User`/`OrganizationRole` hand-written types live) to add `is_primary_contact`, `contact_title` to the member/user shape used by org screens, and `is_client` to the participant shape.

### 5.5 Service layer (`src/services/organization.service.ts`)

Add:
- `addOrganizationContact(organizationId, { email, firstName, lastName, phone?, title?, isPrimary? })` → `supabase.rpc('add_organization_contact', {...})`.
- `updateOrganizationContact(memberId, { title?, isPrimary?, firstName?, lastName?, phone? })` → direct `organization_members` + `users` updates.
- `removeOrganizationContact(memberId)` → delete from `organization_members` (reuse `removeMember` if the semantics match).
- `getOrganizationContacts(organizationId)` → `organization_members` joined to `users`, filtered `users.user_status = 'contact'` **or** `is_primary_contact = true` (a real team member can also be flagged primary contact — e.g. the owner who both logs in and is the point of contact — so don't filter purely on status).

`src/services/gigParticipant.service.ts` — `updateGigParticipants` gains `is_client` on the upsert payload (mirrors how `role`/`notes` are already handled).

### 5.6 Components

New:
- `src/components/organization/OrganizationContactsSection.tsx` — the table + Add/Edit/Remove dialogs described in §4.2, mounted in `OrganizationScreen.tsx`.

Edited:
- `src/components/OrganizationSelector.tsx` — add the inline "+ Create organization" row and a `QuickCreateOrganizationDialog`.
- `src/components/gig/GigParticipantsSection.tsx` — ★ `is_client` column, read-only "Contact" popover column, wire the create-org dialog through.
- `src/components/OrganizationScreen.tsx` — mount `OrganizationContactsSection`.

### 5.7 Verification
- New migration applies cleanly (`supabase db reset` locally); `add_organization_contact` covers: brand-new email, existing-active-user email, existing-contact email re-added to a second org, duplicate-membership rejection, primary-contact auto-demotion.
- UI: create an org inline from Participants without leaving the gig; add two contacts to an org, mark one primary, confirm the other's star clears; mark a participant as client and confirm the star renders and survives reload; confirm Staff Assignments is untouched.

---

## 6. Phase 2 — Functional design (unified People UI)

### 6.1 The real gap this closes
`gig_staff_slots.organization_id` is set to the *viewing* org on every save (`GigStaffSlotsSection.tsx:147`, `227`) — it's tenant-scoping ("only show/manage slots I own"), not a record of who the assigned *person* is representing. Since `organization_members` already allows one `users` row to belong to multiple orgs (`UNIQUE(organization_id, user_id)`, not `UNIQUE(user_id)`), today's data model genuinely cannot say "Jane is filling this Stagehand slot for Acme Crew Co. today, and for Beta Staging on the next gig" — there's nowhere to put that fact. This is the concrete fix for the stage-hand example in the original ask.

### 6.2 Data shape
Two attachment types per gig, kept in **separate tables** on purpose (see decision #4 — a contact must be structurally incapable of carrying cost):

- **`gig_staff_assignments`** (existing, financial) — gains `organization_id` (which of the assigned person's orgs applies to *this* booking) and `is_gig_primary_contact`.
- **`gig_contacts`** (new, non-financial) — `gig_id`, `organization_id`, `user_id`, `title` (defaults to the org's `contact_title` but overridable per gig), `is_gig_primary_contact`, `notes`.

### 6.3 UI: unified "Add Person" flow
One dialog, opened from either section (or a new combined section — see §6.4), used everywhere a person gets attached to a gig:

1. Pick the organization (already selected if opened from that org's row).
2. `UserSelector`, scoped to that org's roster (`organization_members` for that org — includes both real team members and contacts).
3. Toggle: **"Paid role"** on/off.
   - On → staff role `<Select>`, comp type (rate/fee), amount, status. Writes a `gig_staff_assignments` row.
   - Off → optional title (prefilled from the org's `contact_title`). Writes a `gig_contacts` row.
4. Optional checkbox: **"★ Point of contact for [Org] on this gig"** — defaults to whatever the org's global primary contact is, but changeable per gig. Setting it clears any other ★ for that `(gig_id, organization_id)` pair across *both* tables (service-layer responsibility — a cross-table DB constraint isn't worth the complexity here).

### 6.4 Where this lives visually
Keep the two existing sections rather than forcing a single org-grouped tree: Staff Assignments is fundamentally headcount-planning ("we need 3 Stagehands," independent of which org fills them), while Participants is fundamentally org-centric. Collapsing them into one nested structure would make the "how many open Stagehand slots do we have" question harder to answer at a glance, for no real gain.

Instead:
- **Participants** rows expand to show a compact "People" list per org (contacts ★-flagged, staff shown with role + status but no $ amount, to keep the client-facing/org view clean) with an "+ Add Person" button per org that opens the flow in §6.3 pre-scoped to that org.
- **Staff Assignments** rows gain an org badge per assignment (from the new `gig_staff_assignments.organization_id`), defaulting to the slot's org but changeable inline if the picked person belongs to more than one org.
- Both sections' "add" actions open the *same* dialog component — that's the "unified way to add," without forcing a single visual layout that fights either use case.

This is a judgment call worth revisiting once Phase 1 ships and it's clearer from real usage whether people actually want a single merged list. Flagging it here rather than deciding it unilaterally now.

## 7. Phase 2 — Engineering spec

### 7.1 Schema

```sql
ALTER TABLE public.gig_staff_assignments ADD COLUMN organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.gig_staff_assignments ADD COLUMN is_gig_primary_contact boolean NOT NULL DEFAULT false;

-- Backfill existing rows from their slot's org — the only data available, even though it conflates
-- "who owns this slot" with "who the assignee represents." Flag this caveat to whoever reviews the backfill.
UPDATE public.gig_staff_assignments a
SET organization_id = s.organization_id
FROM public.gig_staff_slots s
WHERE a.slot_id = s.id AND a.organization_id IS NULL;

CREATE TABLE public.gig_contacts (
  id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  gig_id uuid NOT NULL REFERENCES public.gigs(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  user_id uuid NOT NULL REFERENCES public.users(id),
  title text,
  is_gig_primary_contact boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gig_id, organization_id, user_id)
);

CREATE INDEX idx_gig_contacts_gig_id ON public.gig_contacts (gig_id);
CREATE INDEX idx_gig_contacts_org_id ON public.gig_contacts (organization_id);

ALTER TABLE public.gig_contacts ENABLE ROW LEVEL SECURITY;

-- Mirror the exact pattern already used for gig_participants / gig_staff_slots.
CREATE POLICY "Admins and Managers can manage gig contacts" ON public.gig_contacts
  USING (public.user_can_manage_gig(gig_id, auth.uid()));
CREATE POLICY "Users can view contacts for accessible gigs" ON public.gig_contacts
  FOR SELECT USING (public.user_has_access_to_gig(gig_id, auth.uid()));

CREATE TRIGGER update_gig_contacts_updated_at BEFORE UPDATE ON public.gig_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

### 7.2 Service layer
- New `src/services/gigContact.service.ts`: `getGigContacts(gigId)`, `updateGigContacts(gigId, contacts[])` (diff/upsert/delete, same autosave pattern as `updateGigParticipants`).
- `src/services/gigStaff.service.ts` — `updateGigStaffSlots` payload gains `organization_id` and `is_gig_primary_contact` per assignment; when a slot is saved, stop hard-coding `organization_id: currentOrganizationId` on the slot itself only where per-assignment org is now authoritative for display (keep slot-level org as the *default* for new assignments in that slot, not the source of truth for existing ones).
- Add a small shared helper (e.g. `clearGigPrimaryContact(gigId, organizationId, excludeTable, excludeId)`) used by both `updateGigStaffSlots` and `updateGigContacts` to enforce the single-★-per-org-per-gig rule across the two tables.

### 7.3 Components
New:
- `src/components/gig/AddGigPersonDialog.tsx` — the unified flow from §6.3, used by both sections.

Edited:
- `src/components/gig/GigParticipantsSection.tsx` — nested "People" list per org row.
- `src/components/gig/GigStaffSlotsSection.tsx` — per-assignment org badge/selector, ★ toggle.

### 7.4 Verification
- Two people from two different orgs assigned to the same multi-count slot, each showing their correct org badge.
- A person who belongs to two orgs gets an org picker when added to a slot; a single-org person doesn't.
- Setting ★ on a contact clears any existing ★ on a staffer for the same org+gig, and vice versa.
- `gig_financials` / `completeStaffAssignment` / cost totals unaffected — run existing financial tests, confirm `gig_contacts` never appears in any cost calculation.
- Full regression of Phase 1 flows (client flag, org contacts) still works after the Staff Assignments changes.

## 8. Open questions for a future pass (not blocking either phase)
- Should `is_client` ever be constrained to one org per gig? Ship permissive; revisit if it causes confusion in practice.
- `users.role_hint` is an existing, entirely unused column (no reads/writes anywhere in `src/` or `supabase/functions/`) — worth a separate dead-code cleanup, unrelated to this feature.
- Should a `'contact'` user ever be promotable to a real invited team member without losing their gig history? (Straightforward: flip `user_status` to `'pending'` and run the existing invite flow — same `users.id`, so `gig_contacts`/`gig_staff_assignments` FKs stay intact. Worth a one-line note in the contact-editing UI, not a schema change.)
