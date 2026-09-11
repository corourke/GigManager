# Schema Verification Findings — September 2026

**Purpose**: Record what was actually verified against the live databases (not
migration files) about GigWrangler's RLS-based tenancy model, and the specific
cross-org leaks and gaps found. This is the evidence base for the deferred
Phase 0 / Phase 1 remediation in §7, and for the decision recorded in
[tenant-isolation-architecture.md](./tenant-isolation-architecture.md).

**Status**: Point-in-time snapshot. **Read §8 before trusting anything below.**
**Findings date**: 2026-09-02 (data-volume figures) / 2026-09-02–03 (schema)
**Last Updated**: 2026-09-10

---

## 0. The one-paragraph version

On 2026-09-02, fresh live dumps of both Supabase projects showed dev and prod
in full parity (61/61 RLS policies, 43/43 functions, identical tables — three
minor drifts noted in §2). Verifying the actual policy bodies against the
original hypothesis list confirmed real, live cross-org data leaks on
`gig_financials`, `gig_staff_slots`, `gig_staff_assignments`,
`gig_kit_assignments`, and — not in the original hypothesis —
`inventory_tracking` and gig-scoped `activity_log` rows. It also found the
`gig_financials`/`purchases` "contradictory RLS" belief was right for
`gig_financials` and wrong for `purchases`, that `attachments` are
over-restricted relative to the desired shared-core model, and that
org-offboarding cascade behavior is already mostly correct with three concrete
gaps. All of this work is currently **deferred** — see §7 — because the
direction set on 2026-09-03 (self-serve self-hosting; see
[tenant-isolation-architecture.md](./tenant-isolation-architecture.md)) may
remove the shared-database surface these findings describe entirely.

---

## 1. Method and provenance

**What was used as the source of truth:** fresh `supabase db dump --schema
public --schema auth --linked` taken directly against both live Supabase
projects on **2026-09-02**:

- DEV — project ref `qcrzwsazasaojqoqxwnr` (Supabase org name "GigManager")
- PROD — project ref `hqnnhtxcxedisasvtbqv` (Supabase org name "GigWrangler"),
  serving `gigwrangler.com`

Plus `supabase migration list --linked` against both, to confirm which
migrations were actually *applied* (as opposed to merely present in the repo).

**Cross-check on freshness:** the fresh PROD schema dump was diffed
byte-for-byte against `backups/prod-schema-backup-20260901-193747.sql` (the
pre-migration backup `deploy_prod.sh` had taken the previous day, 2026-09-01,
~13 hours earlier) and came back **identical**. This confirms two things: the
backup from the last deploy was itself accurate, and nothing changed on prod
between that deploy and this verification. Data-volume figures in §4 come from
the paired `backups/prod-data-backup-20260901-193747.sql`.

**What was explicitly NOT used as a source of truth, and why:**

- **The 42 migration files present at the time** (now 49 — see §8) were not
  read chronologically to reconstruct the schema. Migration files describe
  intent at the time they were written; they do not reliably describe the
  live result after 42+ files with drops, renames, and superseding changes.
  They were consulted *after the fact*, only to explain why a specific
  observed drift exists (e.g. tracing when `kit_assets` was renamed to
  `kit_components`).
- **`supabase/dump/schema_dump.sql`**, the dump committed to the repo, was not
  used. It was confirmed stale during this verification: it references three
  tables that no longer exist (`asset_status_history`, `gig_status_history`,
  `kit_assets`) and is missing at least six tables added since it was last
  regenerated (`activity_log`, `ai_scan_usage`, `gig_schedule_entries`,
  `kit_components`, `kit_flattened_cache`, plus the org-contacts columns). Do
  not treat it as current without re-dumping — this finding may itself be
  stale by the time you read it; check its mtime against the current
  migration list before trusting it either way.

**Extraction detail:** RLS policies and function bodies were parsed out of the
dump with a small awk/perl pass that reassembles pg_dump's line-wrapped
`CREATE POLICY` / `CREATE FUNCTION` statements into single logical statements,
then matched against `pg_policies`-style metadata (table, command, role). The
policy text quoted in §5–§6 below is copied verbatim from that extraction, not
paraphrased.

---

## 2. Dev/prod parity

**Both projects had all 42 migrations applied** as of 2026-09-02 (`local ==
remote` for every row through `20260831000100`, on both projects). **RLS
policies (61/61), function signatures and bodies (43/43), tables, columns,
constraints, and triggers were identical** between dev and prod.

Three drifts were found, none of them application-logic:

| # | Drift | Detail | Data behind it | Fix status |
|---|---|---|---|---|
| 1 | **`fin_category` enum** | PROD has an **18th value, `'Production'`**, appended after `'Other expenses'`. DEV does not have it. **No migration adds this value** — migration `20260512000000_fix_fin_categories.sql` explicitly *removes* it (`DROP TYPE ... CASCADE`, remapping any existing `'Production'` rows to `'Other expenses'`). The value's position (appended at the end, not in the original ordering) is the signature of a manual `ALTER TYPE public.fin_category ADD VALUE 'Production'` run directly against prod, after 2026-05-12, and never captured as a migration. | **1 of 118** `gig_financials` rows in prod used `category = 'Production'` as of the 2026-09-01 data backup. | **Not fixed.** See Phase 0, §7. |
| 2 | `gig_financials.category` column ordinal position | Same column, same type (`fin_category`, nullable), different position in the two dumps. Cosmetic side effect of `ADD COLUMN` vs. table-rebuild history. | — | Ignore. |
| 3 | `auth.users` extra indexes | PROD has 4 indexes DEV lacks: `idx_users_email`, `idx_users_name`, `idx_users_created_at_desc`, `idx_users_last_sign_in_at_desc`. Auth schema, not app schema — plausibly added by hand on prod for admin user search. | — | Optional: mirror to dev, or add as a migration. |

**Cosmetic naming lag, identical on both projects (not "drift", just noted for
anyone confused by it later):** `kit_components` still carries constraints and
indexes named `kit_assets_pkey`, `kit_assets_*_fkey`, `idx_kit_assets_*` — it
was renamed from `kit_assets` (migration `20260826000000_hierarchical_kits`)
without renaming its constraints. Likewise `gig_financials`'s `gig_id` and
`organization_id` foreign keys are still named `gig_bids_gig_id_fkey` /
`gig_bids_organization_id_fkey`, from when the table was named `gig_bids`.

---

## 3. The access-check functions (verified bodies)

Everything in §5–§6 reduces to five `SECURITY DEFINER` helper functions. Their
bodies, as actually deployed on 2026-09-02:

| Function | Verified logic |
|---|---|
| `user_has_access_to_gig(gig_id, user_uuid)` | `EXISTS` a row in `gig_participants` for this gig whose `organization_id` has *any* member matching `user_uuid` — **any role**. This is "intersection-based access": belonging to any participating org, in any capacity, grants access. |
| `user_can_manage_gig(gig_id, user_uuid)` | Same shape, but the member must have `role IN ('Admin', 'Manager')`. **Not scoped to a specific organization_id** — Admin/Manager of *any* participating org qualifies. |
| `user_is_admin_of_gig(gig_id, user_uuid)` | Same shape, `role = 'Admin'` of any participating org. |
| `user_is_admin_of_org` / `user_is_admin_or_manager_of_org` / `user_is_member_of_org` | Org-scoped as named — take an explicit `org_id` and check membership/role against that one organization. |

The distinction that matters for everything below: `user_can_manage_gig` and
`user_has_access_to_gig` are **gig-scoped and cross-org by construction** —
they say nothing about which specific organization's rows are being touched.
`user_is_admin_or_manager_of_org` and friends are **org-scoped** — they check
one specific `organization_id`. A table whose RLS uses only the org-scoped
functions is private. A table using the gig-scoped functions is shared across
every organization on that gig, by design.

---

## 4. Confirmed cross-org leaks — full detail

For each table: the exact policies, how they compose, what a member of a
participating (but not owning) organization can see or do, and how much data
was behind it on 2026-09-02.

### 4.1 `gig_staff_slots` and `gig_staff_assignments`

`gig_staff_slots.organization_id` is **nullable**, and — this is the
finding — **no RLS policy on this table references it at all**.

```
SELECT: "Users can view staff slots for accessible gigs"
  USING (user_has_access_to_gig(gig_id, auth.uid()))

ALL:    "Admins and Managers can manage gig staff slots"
  USING (user_can_manage_gig(gig_id, auth.uid()))
```

**Who can see/do what they shouldn't:** any member of *any* organization
participating in a gig can read *every* staffing slot on that gig, including
slots that belong to another participating organization. Any Admin/Manager of
*any* participating organization can create, edit, or delete *any* slot on
that gig — again, regardless of which org the slot belongs to.

`gig_staff_assignments` has **no `organization_id` column at all**; it is
reached only through `slot_id → gig_staff_slots`:

```
SELECT: "Users can view assignments for accessible gigs"
  USING (EXISTS (
    SELECT 1 FROM gig_staff_slots gss
    WHERE gss.id = gig_staff_assignments.slot_id
      AND user_has_access_to_gig(gss.gig_id, auth.uid())
  ))

ALL:    "Admins and Managers can manage all assignments for accessible g[igs]"
  USING (EXISTS (
    SELECT 1 FROM gig_staff_slots gss
    WHERE gss.id = gig_staff_assignments.slot_id
      AND user_can_manage_gig(gss.gig_id, auth.uid())
  ))

UPDATE: "Staff can update their own assignments"
  USING (user_id = auth.uid())    -- self-service, correctly scoped
```

**Who can see/do what they shouldn't:** any member of any participating
organization can read every staff assignment on the gig — **including the
`rate` and `fee` columns**, i.e. what another organization is paying its
crew. Any Admin/Manager of any participating organization can manage any
assignment on the gig.

**Data volume, 2026-09-02:** `gig_staff_slots` had **1 row** in prod, total.
This leak is real and structural, but there was almost no data behind it at
verification time — it will matter as staffing usage grows, not today.

### 4.2 `gig_kit_assignments`

`organization_id` is **`NOT NULL`** here, which makes it more notable that RLS
still ignores it:

```
SELECT: "Users can view kit assignments for accessible gigs"
  USING (user_has_access_to_gig(gig_id, auth.uid()))

ALL:    "Admins and Managers can manage kit assignments"
  USING (user_can_manage_gig(gig_id, auth.uid()))
```

**Who can see/do what they shouldn't:** any member of any participating
organization sees which kits every other participating organization has
assigned to the gig (kit name, notes, `assigned_by`), and any Admin/Manager of
any participating organization can add, change, or remove another
organization's kit assignment. Note that `kits` itself (§6 in the original
report; unchanged here) is correctly org-private — this leak is specifically
in the *assignment* row that bridges a private kit to a shared gig.

**Data volume, 2026-09-02:** **8 rows** in prod, 0 with a NULL `organization_id`.

### 4.3 `gig_financials`

This is the one with real data behind it, and the one that contradicts the
system's own documentation. **Six** permissive policies apply, and Postgres
ORs all permissive policies together for a given command:

```
ALL:                       "Admins and Managers can manage gig bids"
  USING (user_can_manage_gig(gig_id, auth.uid()))

SELECT (redundant w/above): "Admins and Managers can view bids for accessible gigs"
  USING (user_can_manage_gig(gig_id, auth.uid()))

DELETE (authenticated):    "Admins can delete their organization's financials"
  USING (user_is_admin_of_org(organization_id, auth.uid()))

INSERT (authenticated):    "Admins can insert their organization's financials"
  WITH CHECK (user_is_admin_of_org(organization_id, auth.uid()))

UPDATE (authenticated):    "Admins can update their organization's financials"
  USING (user_is_admin_of_org(organization_id, auth.uid()))
  WITH CHECK (user_is_admin_of_org(organization_id, auth.uid()))

SELECT (authenticated):    "Admins can view their organization's financials"
  USING (user_is_admin_of_org(organization_id, auth.uid()))
```

**Net effective policy per command** (OR of every applicable permissive
policy):

- **SELECT** = `user_can_manage_gig(gig_id)` **OR** `user_is_admin_of_org(organization_id)`
- **INSERT** = `user_can_manage_gig(gig_id)` **OR** `user_is_admin_of_org(organization_id)` (the `ALL` policy's `USING` doubles as its `WITH CHECK` since it declares none)
- **UPDATE** = `user_can_manage_gig(gig_id)` **OR** `user_is_admin_of_org(organization_id)`
- **DELETE** = `user_can_manage_gig(gig_id)` **OR** `user_is_admin_of_org(organization_id)`

Because these OR together, and `user_can_manage_gig` is satisfied by an
Admin/Manager of *any* participating organization, **the narrow
`user_is_admin_of_org` policies impose no restriction whatsoever** — they are
fully shadowed by the broad ones. The narrow and broad policies were created
**together, in the initial schema migration (`20260209000000`)**, and have
coexisted unreconciled ever since; `20260613000000` (the migration titled
"restrict financials and gig creation") touched `purchases` and gig-creation
authorization but did not touch a single `gig_financials` policy.

**Who can see/do what they shouldn't:** an Admin or Manager belonging to
*any* organization participating in a gig — not just the organization that
owns the financial record — can read, insert, edit, and delete *every*
financial row on that gig: amounts, counterparties, categories, due dates,
payment status, notes. `organization_id` is nullable on this table, so rows
with no owning organization at all are also possible and are governed by the
same broad policy.

**Data volume, 2026-09-02:** **118 rows** in prod, **0** with a NULL
`organization_id` (so the nullability is a schema gap, not yet an active data
gap), category breakdown: 93 NULL, 13 `Car and truck expenses`, 5 `Meals`,
2 `Supplies`, 2 `Travel`, 1 `Contract labor`, 1 `Other expenses`, **1
`Production`** (the drift value from §2).

**This finding directly contradicts [security-scheme.md](./security-scheme.md)
§3**, which states (as of this writing, uncorrected): *"`gig_financials`
table: Only accessible to Admin and Manager roles of the owning
organization."* That has not been true of the live system since the initial
schema was written.

### 4.4 `purchases` — belief corrected, not confirmed

The original hypothesis grouped `purchases` with `gig_financials` as having
"contradictory RLS." Verification found this **wrong for `purchases`**. It
carries exactly **one** policy:

```
ALL: "Admins and Managers can manage purchases"
  USING (user_is_admin_or_manager_of_org(organization_id, auth.uid()))
```

`organization_id` is `NOT NULL`. There is no gig-scoped fallback policy, no
policy referencing `user_can_manage_gig` or `user_has_access_to_gig` at all.
`purchases` is already cleanly org-private, and — since the member-level read
policy was dropped by migration `20260613000000` — Staff/Viewer roles cannot
read it either, matching the documented model. **No action needed here.**

### 4.5 `inventory_tracking` — not in the original hypothesis list

```
ALL: "Users with gig access can manage inventory tracking"
  USING (user_has_access_to_gig(gig_id, auth.uid()))
```

`organization_id` is `NOT NULL` (FK to `organizations`, `ON DELETE CASCADE`)
but, as with `gig_kit_assignments`, no policy references it.

**Who can see/do what they shouldn't:** any member of any participating
organization can read *and write* another organization's equipment-scan
records (status, location, notes, who scanned it, when) for a shared gig.
This is the same leak class as §4.1–4.2, on a table the original hypothesis
list did not mention.

**Data volume, 2026-09-02:** not separately captured in this pass; recommend
checking before prioritizing a fix.

### 4.6 `activity_log` — not in the original hypothesis list

Two policies split the table by whether a row is gig-scoped or org-scoped:

```
SELECT: "activity_log_select_gig_scoped"
  USING (gig_id IS NOT NULL AND user_has_access_to_gig(gig_id, auth.uid()))

SELECT: "activity_log_select_org_scoped"
  USING (gig_id IS NULL AND organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ))
```

The org-scoped half is correctly private. The gig-scoped half is not: any
audit-log entry tied to a gig — e.g. *"Org A's Admin updated gig_financial
X"*, including whatever detail is in that entry's `context` jsonb payload —
is readable by any member of any organization participating in that gig,
regardless of which organization the entry is actually about. This is a
second-order leak: it can expose the *existence and shape* of activity on
data (like `gig_financials` edits) that is supposed to be private, even if
the underlying record's own leak (§4.3) were fixed independently.

---

## 5. `assets` / `kits` — confirmed correctly private (no action needed)

Included for completeness, since the original hypothesis explicitly called
these out and they were verified as expected:

```
assets  SELECT: user_is_member_of_org(organization_id, auth.uid())
assets  ALL:    user_is_admin_or_manager_of_org(organization_id, auth.uid())
kits    SELECT: user_is_member_of_org(organization_id, auth.uid())
kits    ALL:    user_is_admin_or_manager_of_org(organization_id, auth.uid())
```

`kit_components` and `kit_flattened_cache` are scoped through their parent
kit's `organization_id` the same way. No gig-participation fallback exists on
any of the four. These are the reference example of what "properly
org-private" looks like in this schema — contrast with §4.

---

## 6. `attachments` / `entity_attachments` — over-restricted relative to the desired model

```
attachments         SELECT: user_is_member_of_org(organization_id, auth.uid())
attachments         ALL:    user_is_admin_or_manager_of_org(organization_id, auth.uid())
entity_attachments  SELECT: EXISTS (attachment a WHERE a.id = entity_attachments.attachment_id
                             AND user_is_member_of_org(a.organization_id, auth.uid()))
entity_attachments  ALL:    (same join) AND user_is_admin_or_manager_of_org(a.organization_id, auth.uid())
```

`entity_type` is constrained to `{asset, gig, purchase, gig_financial}`. There
is **no `is_shared` flag or any other visibility control** on either table —
visibility is entirely determined by the uploading organization's
membership, full stop.

**This is the mirror image of §4**: instead of leaking private data across
organizations, it *under-shares* data that is supposed to be part of the
shared core. A file attached to a `gig`-type entity by Organization A —
a stage plot, a signed rider, a venue map — is invisible to Organization B
even though both are participants on that same gig. If the eventual model is
"attachments/notes explicitly marked shared are part of the shared core"
(per [tenant-isolation-architecture.md](./tenant-isolation-architecture.md)
§5.2's field-by-field table), the current schema has no mechanism to express
that at all — it would need a new sharing flag (or the federation-layer
redesign in that doc), not just a policy tweak.

---

## 7. Offboarding readiness

**Already correct:** every tenant-scoped table's `organization_id →
organizations(id)` foreign key is `ON DELETE CASCADE`: `gig_participants`,
`gig_staff_slots`, `gig_kit_assignments`, `gig_financials` (as
`gig_bids_organization_id_fkey` — see the naming note in §2),
`purchases`, `assets`, `kits`, `inventory_tracking`, `attachments`,
`organization_members`, `invitations`. `activity_log.organization_id` is `ON
DELETE SET NULL` (audit rows survive org deletion but lose their org tag —
confirm this is the intended retention behavior). Deleting an organization
already removes essentially everything it owns, with no manual untangling,
**for the tables where `organization_id` is populated and `NOT NULL`.**

**Three concrete gaps, in order of how much they matter:**

1. **`gig_staff_slots.organization_id` is nullable.** A NULL-owned slot
   survives any organization's deletion untouched — it cascades from nothing.
   (0 of 1 rows were NULL as of 2026-09-02; the gap is structural, not yet
   populated.)
2. **`gig_financials.organization_id` is nullable**, same problem. (0 of 118
   rows were NULL as of 2026-09-02.)
3. **`gig_staff_assignments` has no `organization_id` at all.** It cascades
   only transitively, through `gig_staff_slots` deletion. If a slot has a
   NULL organization (gap 1), its assignments orphan rather than cascade.
4. **Orphan shared-core gigs.** `gigs` has no owning organization by design
   (§ "gigs has no owning org" in the original hypothesis, confirmed true).
   Deleting the last participating organization on a gig leaves the `gigs`
   row itself intact with zero rows in `gig_participants` — there is no
   trigger or rule that prunes, archives, or flags an ownerless gig.

Closing gaps 1–3 is backfill + `SET NOT NULL`; gap 4 requires a decision (hard
delete on zero-participants, soft-archive, or leave it) before it can be
fixed at all. All four are folded into the deferred Phase 1 scope (§7... see
below) because they're the same "give every private table one unambiguous
owning `organization_id`" work as the RLS fix.

---

## 8. Deferred work — Phase 0 and Phase 1

Two remediation phases were scoped from these findings. **Both are currently
deferred**, not because the findings are wrong, but because of a direction
decision made the day after this verification (2026-09-03): GigWrangler may
move to a model where each organization runs its own database entirely (see
[tenant-isolation-architecture.md](./tenant-isolation-architecture.md), which
records that decision and the collaboration-model redesign that follows from
it). If that direction holds, the entire shared-database surface these
findings describe — one Postgres instance holding every organization's rows,
separated by RLS — goes away, and fixing its RLS policies in place would be
solving a problem the architecture is about to make moot.

**Phase 0 (small, low-risk, arguably worth doing regardless of direction):**
- Reconcile the `fin_category` `'Production'` drift: either add it via a
  proper idempotent migration (`ALTER TYPE ... ADD VALUE IF NOT EXISTS`) so
  dev matches prod and the schema is reproducible from migrations again, or
  remap the one affected row to `'Other expenses'` and remove it from prod to
  match what the migrations actually describe.
- Regenerate or retire `supabase/dump/schema_dump.sql` so it stops being a
  trap for the next person who trusts it.
- Correct [security-scheme.md](./security-scheme.md) §3 and the
  [database.md](./database.md) RLS policy summary table to describe what
  `gig_financials`, `gig_staff_slots`, `gig_staff_assignments`,
  `gig_kit_assignments`, `inventory_tracking`, and gig-scoped `activity_log`
  *actually* do today, rather than what was intended.

**Phase 1 (the real fix, sized for the shared-database world — deferred):**
- Replace the gig-scoped policies on `gig_financials`, `gig_staff_slots`,
  `gig_staff_assignments`, `gig_kit_assignments`, `inventory_tracking`, and
  gig-scoped `activity_log` with org-scoped ones, closing §4's leaks.
- Backfill and `SET NOT NULL` on `gig_staff_slots.organization_id` and
  `gig_financials.organization_id`; give `gig_staff_assignments` a resolvable
  owning organization (via its slot, once that slot's org is guaranteed
  non-null). Closes offboarding gaps 1–3 in §7.
- Decide and implement the orphan-gig rule (§7 gap 4).
- Add a sharing mechanism to `attachments`/`entity_attachments` if the shared
  attachments requirement (§6) is still wanted in whatever architecture ships.

**Decision needed before either phase is picked back up:** does the
self-hosting direction in
[tenant-isolation-architecture.md](./tenant-isolation-architecture.md) hold?
If yes, this shared-database RLS surface may simply cease to exist once
Milestone 1 ships, and Phase 0/1 should probably never be built. If the
hosted tier (that document's Milestone 3) ends up shipping *before* a full
per-org split — i.e. if there is any period where multiple organizations'
data sits in one Cameron-operated database — Phase 1 should be done before
that hosted tier takes real customers, since §4's leaks are live today in
exactly that configuration.

---

## 9. Reading this in six months — what's a snapshot and what's probably stale

**Everything above is a snapshot of 2026-09-02 (schema) and the
2026-09-01/09-02 data backups (row counts).** Concretely, expect the following
to have moved on, and re-verify before acting on this document:

- **Migration count.** 42 migrations were applied at verification time; the
  repo had **49** as of 2026-09-07, five days later. The schema is being
  changed actively. Any of §4–§7's specific policy names, column
  nullability, or table shapes could have changed since — re-run the dump
  method in §1 rather than trusting this document's specifics beyond a few
  weeks old.
- **Data volumes** (§4.1's "1 row", §4.2's "8 rows", §4.3's "118 rows") will
  have grown, likely substantially, especially for `gig_staff_slots` which
  had essentially no data behind its leak at verification time — that will
  not remain true.
- **The `fin_category` drift** (§2) may have been fixed, worsened (more rows
  using `'Production'`), or drifted further since. Check `dumps/dev-schema-*`
  vs `dumps/prod-schema-*` freshly rather than assuming §2's numbers hold.
- **The deferred status in §8** is a decision, not a fact about the schema —
  it can and should be revisited independently of whether the schema itself
  has changed. Check [tenant-isolation-architecture.md](./tenant-isolation-architecture.md)'s
  current status before assuming Phase 0/1 are still on hold.
- **This document does not re-verify itself.** If you're reading it to
  decide whether a leak is still live, the only reliable method is the one in
  §1: a fresh `supabase db dump --linked` against the live project, not this
  document, not the migration files, and not `supabase/dump/schema_dump.sql`.
