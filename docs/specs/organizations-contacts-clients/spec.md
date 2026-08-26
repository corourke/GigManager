# Organizations, Contacts & Clients — Product & Engineering Spec

Status: **Phase 1 shipped** (2026-08-25 — see §4/§5, built as described with minor deviations noted inline). **Phase 2 scope revised** (2026-08-26) after using Phase 1 on real gigs — see §6 onward, which supersedes the original Phase 2 design. The original Phase 2 draft is preserved in git history if the dropped "unified add-person" direction (§6.3/§6.4 in the original) is ever revisited.

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
3. **Primary contact has two levels, both flagged with a ★.** *(Revised 2026-08-26 — see §6 for the shipped-design version of this.)*
   - **Org-level default** — `organization_members.is_primary_contact`. "Who do we generally talk to at this org."
   - **Per-gig override** — a *selection* among that org's existing contacts, not a new contact record. "Who's the point of contact at this org *for this booking*" — e.g. the same production company sends a different producer to different gigs. Falls back to the org-level default when nothing's been chosen for a given gig.
4. ~~Contacts and staff need one unified add-flow~~ — **dropped 2026-08-26.** Financial (staff) and non-financial (contact) attachments still stay in separate tables/flows (a contact must never be able to accrue cost), but there's no plan to merge how they're added. Staff Assignments keeps its own add flow; Participants keeps its own. See §6.

## 3. Recommended phasing

This is a two-phase build. Phase 1 is materially lower risk (doesn't touch the financial/staffing code path at all) and delivers most of the stated value on its own. Phase 2 is the harder schema+UI unification and should only start once Phase 1 is in use.

| | Value | Cost/Risk | Touches financial code? |
|---|---|---|---|
| **Phase 1** — Org quick-create, Contacts on Organizations, org-level primary contact, `is_client` flag on Participants | High — directly answers "who's the client" and "who do I call," the two things asked for first | Low-Medium — one new SECURITY DEFINER fn, two new nullable columns, one new UI section | No |
| **Phase 2** *(revised 2026-08-26 — see §6)* — per-gig contact selection (fallback to org default), per-assignment org affiliation on Staff Assignments | High — both are named, recurring pain points from real gig use, not speculative | Low-Medium — one nullable column reusing the existing Participants save path, one nullable column + UI on Staff Assignments. No new tables. | Assignment org affiliation touches `gig_staff_assignments` (additive column only — no changes to `gig_financials`, `completeStaffAssignment`, or cost math) |

Ship Phase 1 first, get it in front of real gigs, then start Phase 2. *(Done — Phase 1 shipped 2026-08-25, this table reflects what was learned from it.)*

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

### 5.8 What actually shipped differently from this draft
Worth knowing before touching this code again:
- **Permission model is broader than §5.2's draft.** `user_can_manage_org_contacts(org_id, user_id)` allows: Admin/Manager of the org itself, OR Admin/Manager of any org sharing a gig with it, OR (the one this draft didn't anticipate) anyone who's Admin of *any* org — matching the pre-existing, more permissive convention `GigParticipantsSection`'s "Edit Organization" already used (`user_is_admin`, despite the name, just means "Admin of ≥1 org"). Real usage hit a "Permission denied" under the narrower draft version; broadening to match the existing convention fixed it. Three migrations landed this incrementally: `20260825180000`, `20260825210000`, `20260825235338`.
- **Editing a contact's name/phone needed its own RPC** (`update_organization_contact`) — §5.2's assumption that a direct `UPDATE` on `users` would work under existing RLS was wrong; `users` only allows a row's own owner to update it. Same for removal (`remove_organization_contact`) — the Edge Function path assumed in §5.2 has the same "admin of the target org specifically" gap the broadened permission model exists to fix.
- **The primary-contact star is a real toggle**, not set-only — clicking an already-primary contact clears it (`unset_organization_primary_contact`), and the Edit Contact dialog has a checkbox for it too.
- **§4.3's "Contact" popover shipped as an always-visible inline list instead** (name, title, phone as `tel:`, email as `mailto:`), with add/edit/remove/star all reachable without leaving the gig — "Add Contact" lives in the participant row's "⋯ More actions" menu rather than its own button, to keep rows compact.
- Participant rows also picked up small fixes along the way: per-role icons (via `ORG_ROLE_CONFIG`) instead of one generic building icon, city/state shown next to the org name, and "View Organization" now includes this gig's participant notes alongside the org's phone/address/description.

---

## 6. Phase 2 (revised 2026-08-26) — Two independent items

Using Phase 1 on real gigs surfaced two specific, concrete gaps — not the broader "unify how people get added to a gig" direction the original §6/§7 sketched. That direction is dropped: Participants and Staff Assignments keep their own separate add-flows. What's left is smaller and lower-risk than the original draft:

1. **§6.1 — Per-gig contact selection.** A gig needs to be able to say "for *this* booking, Acme Production Co.'s contact is Jane, not their usual Bob" — the same org can send a different producer to different gigs. No unified add-flow involved; this only touches Participants/contacts.
2. **§6.2 — Per-assignment org affiliation on Staff Assignments.** The original motivating example (a stagehand who's on the roster of two different companies, varying by gig) — still completely unaddressed, independent of item 1.

### 6.1 Per-gig contact selection

**Model: a selection, not a new contact.** A contact still only ever lives on the organization (Phase 1, unchanged) — a production company's producers, once added as contacts, are reusable across every gig that company works. What's missing is a per-*gig* pointer to which of those existing contacts is the one for this booking.

- Add one nullable column: `gig_participants.primary_contact_member_id`, referencing `organization_members(id)`.
- **Fallback rule:** if a `gig_participants` row has no `primary_contact_member_id` set, the *effective* contact for that gig is whichever of the org's contacts has `is_primary_contact = true` (the Phase 1 org-level default). If the org has no default either, there's simply no contact shown — same as today.
- **Validation:** the referenced `organization_members` row must belong to the *same* `organization_id` as the `gig_participants` row it's set on (can't point a Venue participant's contact-pick at a Contact who belongs to a different org). Enforced in the service layer (see §6.1 Engineering below), not a DB constraint — this field is written through the same single code path as `role`/`notes`/`is_client` already are, so one validation point is enough.
- **Org-level star is untouched by this.** Toggling a contact's star from *within a gig* only ever writes `gig_participants.primary_contact_member_id` — it must not change `organization_members.is_primary_contact` (that's the org's own screen's job, via the existing Phase 1 `setOrganizationPrimaryContact`/`unsetOrganizationPrimaryContact`). Conflating the two would mean picking a gig-specific producer silently changes the org's global default, which is exactly the bug this feature exists to prevent.

**Toggle semantics** (what clicking a contact's star inside a gig does):
- Click a contact who is *not* currently effective → sets `primary_contact_member_id` to that contact, for this gig only.
- Click the contact who *is* currently effective **because they were explicitly chosen** for this gig → clears `primary_contact_member_id` back to `null` (reverts to following the org default, whatever it is now or becomes later).
- Click the contact who is currently effective **only because they're the org default** (no explicit pick made yet) → this is the useful "pin it" case: it sets `primary_contact_member_id` to that same contact, converting an implicit/dynamic fallback into an explicit, sticky choice that won't change if the org's default is later reassigned to someone else.

These last two cases look identical in the moment (the same person's star was already lit, and stays lit) but leave different state — one gig now tracks its own contact independent of the org, the other still floats with the org default. Worth a subtle visual cue (e.g. a small "(org default)" hint on hover for the fallback case) so it's not a total surprise later when the org's default contact changes and some gigs move with it and others don't.

#### Engineering
- **Schema** (new migration): `ALTER TABLE public.gig_participants ADD COLUMN primary_contact_member_id uuid REFERENCES public.organization_members(id) ON DELETE SET NULL;` — `ON DELETE SET NULL` means removing a contact from an org automatically falls every gig that had them explicitly pinned back to the org default (or to nothing), which is the correct behavior with zero extra code.
- **RLS:** none needed. This column is governed by the same `"Admins and Managers can manage gig participants"` policy (`user_can_manage_gig`) already covering `role`/`notes`/`is_client` on this table.
- **Service layer:** extend the existing `updateGigParticipants` payload/upsert in `src/services/gigParticipant.service.ts` with `primary_contact_member_id`, exactly parallel to how `is_client` was added in Phase 1. Validate there that the chosen member's `organization_id` matches the participant's `organization_id` before writing (fetch the member row, or pass the org's already-loaded contact list through and check client-side *and* re-check server-side — client-side alone isn't sufficient since RLS doesn't enforce it).
- **Types:** regenerate `database.types.ts`; add `primary_contact_member_id` to the participant shape in `types.tsx`.
- **Components:**
  - `GigParticipantsSection.tsx` — add `primary_contact_member_id` to the participant zod schema/form defaults/load-save, same mechanical pattern as `is_client`.
  - `GigParticipantContactsList.tsx` — needs the participant's `primaryContactMemberId` passed down as a prop (and an `onChange` callback wired to the parent's `setValue`, reusing the existing autosave — **not** a new mutation/RPC). Replace the current star handler (which calls the org-level `setPrimary`/`unsetPrimary` mutations) with the three-case toggle logic above. Compute "effective" per contact as `primary_contact_member_id === contact.id`, or (`primary_contact_member_id` is null AND `contact.is_primary_contact`).
- **Verification:**
  - Two gigs, same org, different explicit contact picks — each gig shows its own, org's own Contacts screen unaffected.
  - No pick on either gig → both show the org default; changing the org default moves both.
  - Pick one, then change the org default → the picked gig keeps its pick, the unpicked one follows the new default.
  - Remove a contact who was explicitly picked on a gig → that gig falls back to the (possibly different) org default without any explicit fix-up.
  - Confirm toggling a gig-level star never changes `organization_members.is_primary_contact`.

### 6.2 Per-assignment org affiliation on Staff Assignments

Unchanged from the original analysis — `gig_staff_slots.organization_id` is set to the *viewing* org on every save (`GigStaffSlotsSection.tsx:147`, `227`) — it's tenant-scoping ("only show/manage slots I own"), not a record of who the assigned *person* is representing. Since `organization_members` already allows one `users` row to belong to multiple orgs, today's data model genuinely cannot say "Jane is filling this Stagehand slot for Acme Crew Co. today, and for Beta Staging on the next gig" — there's nowhere to put that fact.

This item is purely about roster/cost-attribution clarity and stays independent of §6.1 — no point-of-contact star, no interaction with Participants or contacts. (The original draft's `is_gig_primary_contact` on `gig_staff_assignments` was part of the now-dropped unification and is not part of this revision; if "a paid stage manager can also be the on-site contact" turns out to matter later, treat that as a fresh, separate ask.)

#### Functional design
- New nullable `gig_staff_assignments.organization_id`, defaulting to null on new rows.
- When adding/editing an assignment: if the picked person belongs to more than one organization (`organization_members` rows for that `user_id`), show a small org `<Select>` next to them, defaulting to the slot's `organization_id`. If they belong to exactly one org, just show it as a static badge — no picker needed.
- Existing slot-level `organization_id` stays exactly as-is (still the default org for *new* assignments added to that slot) — it's just no longer treated as authoritative for display once an assignment has its own value.

#### Engineering
- **Schema** (new migration):
  ```sql
  ALTER TABLE public.gig_staff_assignments ADD COLUMN organization_id uuid REFERENCES public.organizations(id);

  -- Backfill from the slot's org — the only data available, even though it conflates
  -- "who owns this slot" with "who the assignee represents." Every existing assignment
  -- gets its slot's org as a reasonable starting point; nothing here is authoritative
  -- until someone actually edits the assignment going forward.
  UPDATE public.gig_staff_assignments a
  SET organization_id = s.organization_id
  FROM public.gig_staff_slots s
  WHERE a.slot_id = s.id AND a.organization_id IS NULL;
  ```
- **RLS:** none needed — governed by the same `"Admins and Managers can manage all assignments for accessible g..."` policy already on `gig_staff_assignments`.
- **Types:** regenerate `database.types.ts`.
- **Service layer:** `src/services/gigStaff.service.ts` — `updateGigStaffSlots` payload gains `organization_id` per assignment (parallel to how it already threads `rate`/`fee`/`status`).
- **Components:** `src/components/gig/GigStaffSlotsSection.tsx` — per-assignment org badge/selector next to the person, populated from that person's `organization_members`.
- **Verification:**
  - Two people from two different orgs assigned to the same multi-count slot, each showing their correct org.
  - A person who belongs to two orgs gets an org picker when added to a slot; a single-org person doesn't.
  - `gig_financials`/`completeStaffAssignment`/cost totals unaffected — additive column only, run existing financial tests to confirm.

## 7. Open questions for a future pass (not blocking either item)
- Should `is_client` ever be constrained to one org per gig? Ship permissive; revisit if it causes confusion in practice.
- `users.role_hint` is an existing, entirely unused column (no reads/writes anywhere in `src/` or `supabase/functions/`) — worth a separate dead-code cleanup, unrelated to this feature.
- Should a `'contact'` user ever be promotable to a real invited team member without losing their gig history? (Straightforward: flip `user_status` to `'pending'` and run the existing invite flow — same `users.id`, so FKs like `gig_participants.primary_contact_member_id` stay intact. Worth a one-line note in the contact-editing UI, not a schema change.)
- If "who's the on-site contact" ever needs to cover a *paid* person too (not just org-level contacts), that's a deliberate, separate extension of §6.1 — not something to bolt on silently.
