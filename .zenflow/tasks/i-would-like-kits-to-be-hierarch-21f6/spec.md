# Hierarchical Kits — Technical Specification

**Status**: Draft — pending Cameron's review
**Date**: 2026-08-25
**Companion**: [Requirements](./requirements.md)

---

## 1. Technical Context

- **Frontend**: React 18 + TypeScript, TanStack Query, react-router. No new dependencies — everything below is native Postgres + existing service/component patterns.
- **Backend**: Supabase Postgres 17 with RLS, called directly from the client via `@supabase/supabase-js` (kits are not routed through the `server` Hono edge function today — `kit.service.ts` talks to Postgres directly, same as `asset.service.ts`). This spec follows that pattern; no edge-function changes are needed.
- **Files touched**: 1 new migration; `kit.service.ts`, `KitScreen.tsx`, `KitDetailScreen.tsx`, `conflictDetection.service.ts`, `packingList.service.ts`, `inventoryTracking.service.ts`, `activityLog.events.ts`; `MobileInventoryMode.tsx` gets a smaller change to consume the now-nested packing list shape.
- **First deployed recursive CTE in this codebase.** Gig hierarchy's `get_gig_hierarchy`/`get_effective_participants` (`05_hierarchy-foundations.md`) were designed with the same `STABLE SECURITY DEFINER` shape but never shipped as an actual migration — the `parent_gig_id` column exists, the query support doesn't. This spec follows that documented shape since it's the established convention, but it will be the first one actually running in production.

---

## 2. Data Model

### 2.1 New table: `kit_kits`

```sql
CREATE TABLE public.kit_kits (
    id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    parent_kit_id uuid NOT NULL REFERENCES public.kits(id) ON DELETE CASCADE,
    child_kit_id uuid NOT NULL REFERENCES public.kits(id) ON DELETE CASCADE,
    quantity integer DEFAULT 1 NOT NULL,
    notes text,
    created_at timestamptz DEFAULT now() NOT NULL,

    CONSTRAINT kit_kits_no_self_reference CHECK (parent_kit_id <> child_kit_id),
    CONSTRAINT kit_kits_parent_child_key UNIQUE (parent_kit_id, child_kit_id)
);

CREATE INDEX idx_kit_kits_parent_id ON public.kit_kits (parent_kit_id);
CREATE INDEX idx_kit_kits_child_id ON public.kit_kits (child_kit_id);
```

**Design decisions**
- Shape mirrors `kit_assets` exactly (id/quantity/notes/created_at) — same convention, one FK swapped for two. This is a new table, not a self-referential column on `kits` (unlike `gigs.parent_gig_id`), because many-to-many containment can't be expressed as a single FK on the child row.
- The `child_kit_id` index isn't used by anything in Phase 1 — it exists for the Phase 2 "where used" query (walking upward from a kit to every parent that contains it). Cheap to add now as part of the same migration; expensive to backfill against a populated table later.
- The `CHECK` stops the trivial cycle (a kit listed as its own direct child) for free. It cannot stop an indirect cycle (A contains B, B contains A) — Postgres `CHECK` constraints can't see other rows, so that needs the trigger below.

### 2.2 Cycle prevention

```sql
CREATE OR REPLACE FUNCTION public.kit_would_create_cycle(p_parent_kit_id uuid, p_child_kit_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH RECURSIVE descendants AS (
    SELECT child_kit_id AS kit_id FROM kit_kits WHERE parent_kit_id = p_child_kit_id
    UNION
    SELECT kk.child_kit_id FROM kit_kits kk
    JOIN descendants d ON kk.parent_kit_id = d.kit_id
  )
  SELECT EXISTS (SELECT 1 FROM descendants WHERE kit_id = p_parent_kit_id);
$$;

CREATE OR REPLACE FUNCTION public.prevent_kit_hierarchy_cycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF public.kit_would_create_cycle(NEW.parent_kit_id, NEW.child_kit_id) THEN
    RAISE EXCEPTION 'Adding this kit would create a circular reference' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER kit_kits_prevent_cycle
  BEFORE INSERT OR UPDATE ON public.kit_kits
  FOR EACH ROW EXECUTE FUNCTION public.prevent_kit_hierarchy_cycle();
```

**Design decisions**
- This is a DB trigger, not just client-side validation, per requirements §5 ("enforced at write time"). `kit.service.ts`'s `addSubKit` (§4.1) still pre-filters obviously-cyclic candidates in the UI for a better experience, but the trigger is the actual authority — a direct `insert` bypassing the client can't create a cycle.
- Matches requirement 4.1's exact reachability definition: adding parent=Y/child=X is safe only if Y does not already appear in X's descendant tree. `descendants` walks *down* from the proposed child; if the proposed parent shows up in that walk, the link would close a loop.
- `UNION` (not `UNION ALL`) dedupes visited nodes — this both bounds the walk when a DAG has converging paths (a kit reachable two different ways is only visited once) and keeps the function safe even if it's ever called against an already-inconsistent state.
- Follows the `SECURITY DEFINER` / `SET search_path TO 'public'` convention from `user_is_member_of_org` — the established helper-function style in this schema.

### 2.3 Flattening functions

All three share the same recursive shape (a `kit_tree` CTE walking `kit_kits` from a root, carrying a running quantity multiplier and depth). Unlike the cycle-check helper, these return data, so — per the same reasoning that made gig hierarchy's designed functions `SECURITY DEFINER` — each does its own authorization check up front rather than relying on RLS to apply correctly inside a recursive CTE (it doesn't, reliably).

```sql
CREATE OR REPLACE FUNCTION public.get_kit_flattened_assets(p_kit_id uuid)
RETURNS TABLE(asset_id uuid, total_quantity integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM kits k
    WHERE k.id = p_kit_id AND public.user_is_member_of_org(k.organization_id, auth.uid())
  ) THEN
    RAISE EXCEPTION 'Not authorized to view this kit' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH RECURSIVE kit_tree AS (
    SELECT p_kit_id AS kit_id, 1 AS multiplier
    UNION ALL
    SELECT kk.child_kit_id, kt.multiplier * kk.quantity
    FROM kit_kits kk JOIN kit_tree kt ON kk.parent_kit_id = kt.kit_id
  )
  SELECT ka.asset_id, SUM(ka.quantity * kt.multiplier)::integer
  FROM kit_tree kt JOIN kit_assets ka ON ka.kit_id = kt.kit_id
  GROUP BY ka.asset_id;
END;
$$;
```

Quantities compound along the path — 2× a sub-kit that itself contains 3× an item resolves to 6× that item in the flattened total, satisfying the additive rental-value assumption (§6 of requirements) and the "aggregated quantities across all nested levels" requirement (§4.2a) for free, since rental value is just `SUM(asset.rental_value * total_quantity)` plus each kit's own `rental_value` walked the same way.

Two siblings, same shape, different output:
- **`get_kit_nested_structure(p_kit_id uuid)`** → `TABLE(parent_kit_id uuid, child_kit_id uuid, quantity integer, depth integer)` — the edges themselves, for the hierarchical/tree part of §4.2b, and for computing the soft depth-warning (`max(depth)` in the result set — no separate mechanism needed, this is the same walk).
- **`get_kits_flattened_assets(p_kit_ids uuid[])`** → `TABLE(source_kit_id uuid, asset_id uuid, total_quantity integer)` — batch version seeded from multiple roots at once, each output row tagged with which root it came from. Used by conflict detection (§4.2) so checking N gigs' kit assignments is one query, not N.

### 2.4 Row-Level Security

`kit_kits` follows the exact join-through-`kits` pattern already used by `kit_assets`:

```sql
ALTER TABLE public.kit_kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view kit hierarchy for their organization's kits" ON public.kit_kits
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM kits k WHERE k.id = kit_kits.parent_kit_id
            AND public.user_is_member_of_org(k.organization_id, auth.uid()))
  );

CREATE POLICY "Admins and Managers can manage kit hierarchy" ON public.kit_kits
  FOR ALL USING (
    EXISTS (SELECT 1 FROM kits k WHERE k.id = kit_kits.parent_kit_id
            AND public.user_is_admin_or_manager_of_org(k.organization_id, auth.uid()))
    AND EXISTS (SELECT 1 FROM kits k WHERE k.id = kit_kits.child_kit_id
            AND public.user_is_admin_or_manager_of_org(k.organization_id, auth.uid()))
  );
```

The write policy checks **both** `parent_kit_id` and `child_kit_id` against org membership — a kit picker should only ever offer same-org kits, but this is the actual security boundary preventing one organization's kit from being linked into another's, regardless of what the UI allows.

---

## 3. Service Layer Changes

### 3.1 `kit.service.ts`

New exports, following the file's existing conventions (Supabase calls, `handleApiError`, activity logging via `logActivity`):

```ts
addSubKit(parentKitId: string, childKitId: string, quantity: number, notes?: string): Promise<void>
removeSubKit(kitKitId: string): Promise<void>
getKitFlattenedContents(kitId: string): Promise<{ assets: {asset_id: string; total_quantity: number}[]; maxDepth: number }>
getKitHierarchyTree(kitId: string): Promise<{parent_kit_id: string; child_kit_id: string; quantity: number; depth: number}[]>
```

`addSubKit` calls `.from('kit_kits').insert(...)` and surfaces the trigger's `23514` error as a friendly "This would create a circular reference" message (matching the existing `handleApiError` pattern used for other constraint-violation surfacing in this file). `getKitFlattenedContents` calls `get_kit_flattened_assets` and `get_kit_nested_structure` via `supabase.rpc(...)`, and takes `max(depth)` from the structure result as `maxDepth` for the soft-warning check — no extra query needed.

**`createKit`/`updateKit`** get a parallel `subKits?: {id?, kit_id, quantity, notes?}[]` field alongside the existing `assets` field, diffed with the exact same delete/update/insert approach `updateKit` already uses for `assets` (lines 271-305 today) — same shape, new table. Each add/remove logs a `kit.subkit_added`/`kit.subkit_removed` activity event, mirroring the existing `kit.asset_added`/`kit.asset_removed` pair.

**Validation**: `KitScreen.tsx`'s current `kitAssets.length > 0` requirement (line 259) relaxes to "at least one component, asset or sub-kit" — a kit built entirely from sub-kits (no direct assets) is a valid, expected case per requirements §4.1.

**`getKit`/`getKits`**: unchanged at the DB-query level for the *direct* asset join — they continue to return one level, same as today. Flattened/recursive data comes from the new RPC-backed functions above, called separately where needed (detail view, gig assignment), rather than folded into the existing flat queries. This keeps the common case (list view, edit form showing direct contents) exactly as fast as it is today.

**Incidental note, not in scope**: `duplicateKit` (line 340-350) already doesn't copy `is_container`/`rental_value` — a pre-existing bug, unrelated to this feature. It will also need to copy `kit_kits` rows once sub-kits exist, so touching this function is unavoidable; flagging the existing gap for a decision on whether to fix it in the same pass or file separately.

### 3.2 Conflict detection — the actual behavior change

This is the part of the spec worth being direct about: **today's conflict detection cannot see this bug already.** `checkEquipmentConflicts` (`conflictDetection.service.ts:234-297`) and the equipment portion of `checkAllConflictsForGigs` (`:387-392, 447-448`) both compare kit **IDs** for equality. Two different kits that happen to share the same physical asset — which is already possible today, hierarchy or not — produce zero conflict warning. Requirements §4.3 ("not just checking for the same top-level kit twice") is fixing an existing gap, not just accommodating a new one.

Both functions change to resolve kit assignments to their flattened asset sets before comparing:

```ts
// was: kitIds.includes(a.kit?.id)
// becomes, conceptually:
const { data: flattened } = await supabase.rpc('get_kits_flattened_assets', { p_kit_ids: allAssignedKitIds });
// group by source_kit_id → gig, then compare asset_id sets for overlap across gigs
```

`checkAllConflictsForGigs`'s batch path collects every assigned `kit_id` across all gigs being checked, makes **one** `get_kits_flattened_assets` call, then groups the flattened rows by gig and checks for shared `asset_id`s — avoiding an N+1 RPC-per-kit pattern. The existing `WARNING_BUFFER_MS` / conflict-vs-warning classification logic (`classifyOverlap`, lines 66-81) is unchanged; only what counts as "the same equipment" changes, from kit-ID equality to asset-level overlap.

### 3.3 Packing lists & scanning

`packingList.service.ts`'s `fetchGigPackingList` (lines 65-172) currently does one flat join (`gig_kit_assignments` → `kit_assets` → `assets`). It changes to also fetch `get_kit_nested_structure` for each assigned kit, and merges the nested edges into the packing-list shape the mobile UI already consumes — the goal is a tree the client can walk, not a new data shape the UI has to be rebuilt around.

`inventoryTracking.service.ts`'s `submitScan` (lines 244-289) currently cascades exactly one level via `getKitAssetIds`, unconditionally — `is_container` isn't even read on the write path today, it only drives UI expand/collapse in `MobileInventoryMode.tsx`. This is the seam requirement §4.4 extends:

- `getKitAssetIds` becomes recursive: scanning a kit cascades to **every** descendant asset and sub-kit, all the way down, in one action — this is the "parent's container status wins" rule, and per the confirmed decision it applies whenever a container kit is scanned, full stop, regardless of what's nested inside it.
- The expand/collapse UI in `MobileInventoryMode.tsx` (currently `isLogicalKit = kit.is_container === false`, line 141-157) walks the now-nested tree and stops expanding at the first `is_container = true` boundary it hits going down — a non-container parent still shows its immediate children individually (which may now be kits, not just assets), but once expansion reaches a container kit at any level, that whole subtree collapses to one scannable row.

No change to the `inventory_tracking` table itself — it's still one row per scan event, keyed the same way; nesting only changes which set of `(kit_id, asset_id)` pairs a single scan action writes.

### 3.4 Activity log

`activityLog.events.ts`'s `ACTIVITY_EVENTS` registry gets two new entries, `kit.subkit_added` / `kit.subkit_removed`, matching the existing `kit.asset_added`/`kit.asset_removed` pair exactly (same `contextKeys`, same format-string style).

---

## 4. UI Changes

### 4.1 `KitScreen.tsx` (create/edit)

A "Sub-kits" section mirrors the existing asset picker exactly — same `Dialog` + debounced-search-list pattern (lines 727-787 today), same inline quantity `Input` per row (lines 582-595 today), same "Added" badge treatment. The search call swaps `getAssets` for a kit search, pre-filtering out the kit being edited itself and any candidate that `kit_would_create_cycle` would reject — this is a UX nicety (don't let the user pick something the trigger will bounce anyway), not the security boundary, which stays server-side.

Submit payload gets a `subKits: [{kit_id, quantity, notes?}]` array alongside the existing `assets` array, matching the shape `updateKit` now expects (§3.1).

### 4.2 `KitDetailScreen.tsx` (read view)

- The existing flat `kit.kit_assets` table (lines 240-297) is replaced by the flattened result from `getKitFlattenedContents` — same table UI, now showing the true aggregated total across every nested level instead of only direct assets.
- A new, simple section renders the nested structure from `getKitHierarchyTree` — an indented list (parent → children → grandchildren), not a drag-and-drop tree component, per requirements §7's Phase 1 scope ("functional, not necessarily a rich... tree").
- The summary cards' value/quantity totals (`getTotalValue()`/`getTotalItems()`, lines 104-114) switch from summing `kit.kit_assets` directly to summing the flattened result, so a kit's displayed value correctly includes its nested sub-kits.
- If `maxDepth` from `getKitFlattenedContents` exceeds ~5-6, a non-blocking `toast` (sonner, the existing toast mechanism throughout this codebase) surfaces the soft depth warning from requirements §4.1/§6 — informational only, never blocks save or display.

---

## 5. Verification Approach

- `npm run typecheck`, `npm run lint`, `npm run test:run` — the three existing CI gates (`.github/workflows/ci.yml`), unchanged in kind, just now covering the new code.
- **New/updated colocated tests** (matching the existing `*.service.test.ts` convention):
  - `kit.service.test.ts`: `addSubKit`/`removeSubKit`, the `subKits` diffing branch of `updateKit`, and the relaxed "at least one component" validation.
  - `conflictDetection.service.test.ts`: asset-level overlap detection across two different kits sharing an asset (the case that produces zero conflicts today — this is the regression test that proves the fix).
- **Database-level verification**: this ships the first recursive CTE ever deployed in this project, so beyond the JS/TS test suite, verify directly against a local/dev Supabase instance before this reaches prod: insert a multi-level kit structure, confirm `kit_would_create_cycle` correctly rejects both a direct and an indirect cycle attempt, confirm `get_kit_flattened_assets` quantity multiplication across 3+ levels, and confirm the RLS policies actually block a cross-org link attempt (not just that the UI doesn't offer one).
- **Manual scan-flow check**: on a real or emulated mobile session, scan a container kit that has a nested non-container sub-kit inside it, and confirm the cascade goes all the way down while the expand/collapse UI stops at the container boundary as described in §3.3 — this behavior is easy to get subtly wrong and hard to unit-test end-to-end through the barcode-scanner UI layer.
