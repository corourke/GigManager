# Hierarchical Kits — Technical Specification

**Status**: Draft — pending Cameron's review (revised after first review pass)
**Date**: 2026-08-25
**Companion**: [Requirements](./requirements.md)

---

## 1. Technical Context

- **Frontend**: React 18 + TypeScript, TanStack Query, react-router. No new dependencies.
- **Backend**: Supabase Postgres 17 with RLS, called directly from the client via `@supabase/supabase-js` — kits are not routed through the `server` Hono edge function today (`kit.service.ts` talks to Postgres directly, same as `asset.service.ts`), and this spec doesn't change that.
- **Files touched**: 1 migration; `kit.service.ts`, `KitScreen.tsx`, `KitDetailScreen.tsx`, `conflictDetection.service.ts`, `packingList.service.ts`, `inventoryTracking.service.ts`, `activityLog.events.ts`; `MobileInventoryMode.tsx` gets a smaller change to consume the now-nested packing list shape.
- **First deployed recursive CTE in this codebase.** Gig hierarchy's `get_gig_hierarchy`/`get_effective_participants` (`05_hierarchy-foundations.md`) were designed with the same shape but never shipped as an actual migration — the `parent_gig_id` column exists, the query support doesn't.

---

## 2. Data Model

### 2.1 Unify `kit_assets` into `kit_components`

Rather than a second table alongside `kit_assets`, `kit_assets` becomes `kit_components`: each row is either a leaf (`asset_id` set) or a branch to recurse into (`child_kit_id` set), mutually exclusive. This is the standard bill-of-materials pattern (raw parts vs. sub-assemblies in one table) and it's a better fit here than two tables — one tree to walk instead of two, one RLS policy instead of two, and it's what makes the unified picker in §4 possible.

This is an in-place migration on a table with real data in every org, not a new empty table — worth being precise about:

```sql
ALTER TABLE public.kit_assets RENAME TO kit_components;

ALTER TABLE public.kit_components
  ALTER COLUMN asset_id DROP NOT NULL,
  ADD COLUMN child_kit_id uuid REFERENCES public.kits(id) ON DELETE CASCADE,
  ADD CONSTRAINT kit_components_exactly_one_target CHECK (
    (asset_id IS NOT NULL AND child_kit_id IS NULL) OR
    (asset_id IS NULL AND child_kit_id IS NOT NULL)
  ),
  ADD CONSTRAINT kit_components_no_self_reference CHECK (child_kit_id <> kit_id);

-- Existing rows all have asset_id set and satisfy the CHECK automatically.

ALTER TABLE public.kit_components DROP CONSTRAINT kit_assets_kit_id_asset_id_key;
CREATE UNIQUE INDEX kit_components_kit_asset_key ON public.kit_components (kit_id, asset_id) WHERE asset_id IS NOT NULL;
CREATE UNIQUE INDEX kit_components_kit_childkit_key ON public.kit_components (kit_id, child_kit_id) WHERE child_kit_id IS NOT NULL;
CREATE INDEX idx_kit_components_child_kit_id ON public.kit_components (child_kit_id) WHERE child_kit_id IS NOT NULL;
```

**Why partial unique indexes, not one plain `UNIQUE(kit_id, asset_id)`**: Postgres treats `NULL` as distinct from every other `NULL` in a unique constraint, so a naive constraint on a now-nullable `asset_id` would silently stop enforcing uniqueness for kit rows once `child_kit_id` rows are mixed in. Two partial indexes, each `WHERE`-scoped to the column that's actually set, keep both kinds of duplicate blocked correctly.

**Downstream rename**: every reference to `kit_assets` in the codebase (`kit.service.ts`'s selects/inserts, `conflictDetection.service.ts`'s join, `packingList.service.ts`, RLS policy names) moves to `kit_components`. This is the size of the migration — it touches everywhere kits are read, not just where sub-kits are added.

### 2.2 Cycle prevention

Same reachability logic as before, now filtered to branch rows only (leaf/asset rows can never participate in a cycle):

```sql
CREATE OR REPLACE FUNCTION public.kit_would_create_cycle(p_parent_kit_id uuid, p_child_kit_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  WITH RECURSIVE descendants AS (
    SELECT child_kit_id AS kit_id FROM kit_components
    WHERE kit_id = p_child_kit_id AND child_kit_id IS NOT NULL
    UNION
    SELECT kc.child_kit_id FROM kit_components kc
    JOIN descendants d ON kc.kit_id = d.kit_id
    WHERE kc.child_kit_id IS NOT NULL
  )
  SELECT EXISTS (SELECT 1 FROM descendants WHERE kit_id = p_parent_kit_id);
$$;

CREATE OR REPLACE FUNCTION public.prevent_kit_hierarchy_cycle()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF public.kit_would_create_cycle(NEW.kit_id, NEW.child_kit_id) THEN
    RAISE EXCEPTION 'Adding this kit would create a circular reference' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER kit_components_prevent_cycle
  BEFORE INSERT OR UPDATE ON public.kit_components
  FOR EACH ROW WHEN (NEW.child_kit_id IS NOT NULL)
  EXECUTE FUNCTION public.prevent_kit_hierarchy_cycle();
```

`UNION` (not `UNION ALL`) dedupes visited nodes on a DAG with converging paths. `SECURITY DEFINER` / `SET search_path TO 'public'` follows the established `user_is_member_of_org` convention.

### 2.3 Flattened contents cache

Per review: conflict detection and the kit detail view should read a maintained cache, not resolve the tree live on every check. `kit_flattened_cache` stores each kit's fully-resolved asset list, kept correct by a trigger on `kit_components`.

```sql
CREATE TABLE public.kit_flattened_cache (
    kit_id uuid NOT NULL REFERENCES public.kits(id) ON DELETE CASCADE,
    asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    total_quantity integer NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    PRIMARY KEY (kit_id, asset_id)
);

CREATE INDEX idx_kit_flattened_cache_asset_id ON public.kit_flattened_cache (asset_id);

ALTER TABLE public.kit_flattened_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view flattened cache for their organization's kits" ON public.kit_flattened_cache
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM kits k WHERE k.id = kit_flattened_cache.kit_id
            AND public.user_is_member_of_org(k.organization_id, auth.uid()))
  );
-- No client-facing INSERT/UPDATE/DELETE policy — only the SECURITY DEFINER
-- refresh functions below (running as table owner) ever write to this table.
```

**Refresh, and the cascade this requires.** Because a sub-kit can be reused across multiple parents, editing one kit's components can make *every kit that transitively contains it* stale, not just itself. Maintaining the cache means walking upward through `kit_components.child_kit_id` — the same reverse-lookup query the "where used" feature needs, which makes it required infrastructure in Phase 1 even though its UI-facing exposure stays Phase 2 per requirements §4.2b.

```sql
CREATE OR REPLACE FUNCTION public.refresh_kit_flattened_cache(p_kit_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM kits WHERE id = p_kit_id) THEN
    RETURN; -- kit is mid-delete; ON DELETE CASCADE on this table handles cleanup
  END IF;

  DELETE FROM kit_flattened_cache WHERE kit_id = p_kit_id;

  INSERT INTO kit_flattened_cache (kit_id, asset_id, total_quantity)
  WITH RECURSIVE flat AS (
    SELECT asset_id, child_kit_id, quantity AS effective_quantity
    FROM kit_components WHERE kit_id = p_kit_id
    UNION ALL
    SELECT kc.asset_id, kc.child_kit_id, kc.quantity * f.effective_quantity
    FROM kit_components kc
    JOIN flat f ON kc.kit_id = f.child_kit_id
  )
  SELECT p_kit_id, asset_id, SUM(effective_quantity)::integer
  FROM flat
  WHERE asset_id IS NOT NULL
  GROUP BY asset_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_kit_flattened_cache_cascade(p_kit_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  affected_kit uuid;
BEGIN
  PERFORM public.refresh_kit_flattened_cache(p_kit_id);

  FOR affected_kit IN
    WITH RECURSIVE ancestors AS (
      SELECT kit_id FROM kit_components WHERE child_kit_id = p_kit_id
      UNION
      SELECT kc.kit_id FROM kit_components kc
      JOIN ancestors a ON kc.child_kit_id = a.kit_id
    )
    SELECT kit_id FROM ancestors
  LOOP
    PERFORM public.refresh_kit_flattened_cache(affected_kit);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_refresh_kit_flattened_cache()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.refresh_kit_flattened_cache_cascade(COALESCE(NEW.kit_id, OLD.kit_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER kit_components_refresh_cache
  AFTER INSERT OR UPDATE OR DELETE ON public.kit_components
  FOR EACH ROW EXECUTE FUNCTION public.trigger_refresh_kit_flattened_cache();
```

**Design decisions**
- The cache stores only structure (asset + total quantity), not value — rental value is `total_quantity × asset.rental_value` computed at read time, so editing an asset's price never needs to invalidate any kit's cache, only editing `kit_components` does.
- `refresh_kit_flattened_cache` no-ops if the kit no longer exists, guarding against ordering during a cascading kit delete (deleting kit X cascade-deletes its `kit_components` rows, which fires this trigger for a kit that may already be gone mid-transaction; `kit_flattened_cache` itself also cascade-deletes via its own FK, so this is just avoiding a wasted/erroring refresh, not a correctness gap).
- **Accepted tradeoff**: writing to a kit that's reused by many ancestors now costs proportional to how many ancestors exist (each gets recomputed). For the realistic scale here — an equipment inventory with at most a few hundred kits, nested a handful of levels — this is cheap and happens synchronously in the write transaction. In exchange, conflict-detection and detail-view reads become flat indexed lookups instead of recursive queries, which is the point of caching it.
- Trigger timing means this is safe by construction: `kit_components_prevent_cycle` is `BEFORE`, `kit_components_refresh_cache` is `AFTER` — a rejected cycle never reaches the cache-refresh trigger.

### 2.4 Hierarchy structure (tree shape, not flattened)

One more function, for the tree/depth-warning UI only — this isn't cached, since it's a display concern (viewing/editing one kit at a time), not a hot path like conflict detection:

```sql
CREATE OR REPLACE FUNCTION public.get_kit_hierarchy_tree(p_kit_id uuid)
RETURNS TABLE(parent_kit_id uuid, child_kit_id uuid, quantity integer, depth integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM kits k WHERE k.id = p_kit_id AND public.user_is_member_of_org(k.organization_id, auth.uid())
  ) THEN
    RAISE EXCEPTION 'Not authorized to view this kit' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH RECURSIVE tree AS (
    SELECT kc.kit_id AS parent_kit_id, kc.child_kit_id, kc.quantity, 1 AS depth
    FROM kit_components kc WHERE kc.kit_id = p_kit_id AND kc.child_kit_id IS NOT NULL
    UNION ALL
    SELECT kc.kit_id, kc.child_kit_id, kc.quantity, t.depth + 1
    FROM kit_components kc
    JOIN tree t ON kc.kit_id = t.child_kit_id
    WHERE kc.child_kit_id IS NOT NULL
  )
  SELECT * FROM tree;
END;
$$;
```

`max(depth)` from this result set is the soft depth-warning threshold check (requirements §4.1/§6) — no separate mechanism needed.

### 2.5 Row-Level Security on `kit_components`

```sql
CREATE POLICY "Users can view kit components for their organization's kits" ON public.kit_components
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM kits k WHERE k.id = kit_components.kit_id
            AND public.user_is_member_of_org(k.organization_id, auth.uid()))
  );

CREATE POLICY "Admins and Managers can manage kit components" ON public.kit_components
  FOR ALL USING (
    EXISTS (SELECT 1 FROM kits k WHERE k.id = kit_components.kit_id
            AND public.user_is_admin_or_manager_of_org(k.organization_id, auth.uid()))
    AND (
      child_kit_id IS NULL
      OR EXISTS (SELECT 1 FROM kits k2 WHERE k2.id = kit_components.child_kit_id
                 AND public.user_is_admin_or_manager_of_org(k2.organization_id, auth.uid()))
    )
  );
```

The write policy checks **both** kits when `child_kit_id` is set — a kit picker only ever offers same-org kits, but this is the actual boundary stopping one org's kit from being linked into another's regardless of what the UI allows. Renamed from the two near-duplicate `kit_assets` policies to one pair, matching the unified table.

---

## 3. Service Layer Changes

### 3.1 `kit.service.ts`

`createKit`/`updateKit` take one unified `components: {id?, asset_id?, child_kit_id?, quantity, notes?}[]` array (mutually exclusive per row, matching the DB constraint) instead of a separate `assets` array — `updateKit`'s existing diff/insert/update/delete approach (today's lines 271-305) extends unchanged in *shape*, just over the combined array. Activity logging adds `kit.subkit_added`/`kit.subkit_removed` alongside the existing `kit.asset_added`/`kit.asset_removed` (§3.4), keyed on which column is set per row.

```ts
getKitFlattenedContents(kitId: string): Promise<{ assets: {asset_id: string; total_quantity: number}[] }>
// straight select from kit_flattened_cache — no RPC, the cache table is queried directly

getKitHierarchyTree(kitId: string): Promise<{parent_kit_id: string; child_kit_id: string; quantity: number; depth: number}[]>
// calls the get_kit_hierarchy_tree RPC — tree shape isn't cached, computed live for display
```

**Validation**: `KitScreen.tsx`'s current `kitAssets.length > 0` (line 259) relaxes to "at least one component, asset or sub-kit."

**`duplicateKit`**: needs to copy `kit_components` rows (previously `kit_assets`) — already noted last pass that it doesn't currently copy `is_container`/`rental_value` either, a pre-existing gap. Still flagging rather than silently bundling the fix; your call whether it rides along with this change.

### 3.2 Conflict detection

Confirmed as a real, pre-existing gap independent of hierarchy: `checkEquipmentConflicts` (`conflictDetection.service.ts:234-297`) and the equipment portion of `checkAllConflictsForGigs` (`:387-392, 447-448`) both compare kit **IDs**. Two different kits sharing the same physical asset produce zero conflict warning today, hierarchy or not.

With the cache in place, the fix is a direct table read, not a live recursive resolution:

```ts
// was: kitIds.includes(a.kit?.id)
// becomes:
const { data: flattenedRows } = await supabase
  .from('kit_flattened_cache')
  .select('kit_id, asset_id, total_quantity')
  .in('kit_id', allAssignedKitIds);
// group by kit_id -> gig, then compare asset_id sets for overlap across gigs
```

`checkAllConflictsForGigs`'s batch path collects every assigned `kit_id` across all gigs being checked and makes one `kit_flattened_cache` query, grouping the result by gig to check for shared `asset_id`s — no RPC, no N+1, and no live recursive cost at check time at all, since that work already happened when the kits were last edited. The existing `WARNING_BUFFER_MS`/`classifyOverlap` logic (lines 66-81) is unchanged; only what counts as "the same equipment" changes, from kit-ID equality to asset-level overlap via the cache.

### 3.3 Packing lists & scanning

`packingList.service.ts`'s `fetchGigPackingList` (lines 65-172) currently does one flat join (`gig_kit_assignments` → `kit_assets` → `assets`, now `kit_components`). It additionally fetches `get_kit_hierarchy_tree` for each assigned kit and merges the nested edges into the packing-list shape the mobile UI already consumes.

`inventoryTracking.service.ts`'s `submitScan` (lines 244-289) currently cascades exactly one level via `getKitAssetIds`, unconditionally — `is_container` isn't read on the write path today, only in `MobileInventoryMode.tsx`'s UI. Per the confirmed decision (parent's container status wins):
- `getKitAssetIds` becomes recursive — scanning a container kit cascades to every descendant asset and sub-kit, all the way down, in one action.
- `MobileInventoryMode.tsx`'s expand/collapse (`isLogicalKit = kit.is_container === false`, line 141-157) walks the nested tree and stops expanding at the first `is_container = true` boundary going down — a non-container parent shows its immediate children individually (which may now be kits, not just assets); reaching a container kit at any level collapses that whole subtree to one scannable row.

No change to `inventory_tracking` itself — still one row per scan event, same keying; nesting only changes which set of `(kit_id, asset_id)` pairs a single scan action writes.

### 3.4 Activity log

`activityLog.events.ts`'s `ACTIVITY_EVENTS` registry gets `kit.subkit_added`/`kit.subkit_removed`, matching the existing `kit.asset_added`/`kit.asset_removed` pair exactly.

---

## 4. UI Changes

### 4.1 One unified picker, not two

Per review, `KitScreen.tsx` gets a single "Add Components" dialog rather than separate asset/sub-kit sections:

- One debounced search box, querying assets and kits in parallel and merging results client-side (they're different tables, so this is two calls under one search box, not one query — the UI never shows that split).
- A lightweight type filter (All / Assets / Kits chips) for narrowing, defaulting to All.
- Each result row shows its name, a small type badge, and — for kit rows — a compact direct-component count (its own `kit_components` count, not the recursive total, so it's cheap to render in a list).
- **Multi-select with checkboxes**, replacing today's one-click-add-per-row pattern, with an "Add N Selected" action — everything gets added at quantity 1, editable inline afterward via the existing quantity-input pattern (line 582-595 today), same as assets are edited today.
- **No client-side cycle pre-filtering in Phase 1** — checking every visible kit row against the reachability function on every keystroke is unnecessary complexity for what should be a rare case. If a selection would create a cycle, the server trigger rejects it and the UI surfaces "This would create a circular reference" inline on that row. Worth revisiting if it turns out to bite people often in practice.

The kit's contents table (both the edit form and `KitDetailScreen.tsx`'s read view) becomes one mixed table — asset rows and sub-kit rows together, each showing name, type badge, quantity, unit value, total value, and a remove button — rather than two separate tables. `KitDetailScreen.tsx`'s value/quantity summary cards (`getTotalValue()`/`getTotalItems()`, lines 104-114) switch from summing the direct join to reading `kit_flattened_cache`, so displayed totals correctly include nested sub-kits.

### 4.2 Hierarchy view & depth warning

A simple indented list under the contents table shows the nested structure from `get_kit_hierarchy_tree` — not a drag-and-drop tree, per the Phase 1 "functional, not fancy" scope in requirements §7. If the tree's `max(depth)` exceeds ~5-6, a non-blocking `toast` (sonner, the existing mechanism throughout this codebase) surfaces the soft depth warning — informational only, never blocks save.

---

## 5. Documentation

Requirements and this spec get merged into `main` (docs only, no app code) once finalized, and linked from `01_roadmap.md`'s Technical Reference Documents table — the same pattern already used for `sprint2-planning`'s PRD/spec, which live in `.zenflow/tasks/sprint2-planning/` and are referenced from the roadmap rather than duplicated into `development-plan/`.

---

## 6. Verification Approach

- `npm run typecheck`, `npm run lint`, `npm run test:run` — the existing CI gates (`.github/workflows/ci.yml`), now covering the new code.
- **New/updated colocated tests**:
  - `kit.service.test.ts`: the unified `components` diffing branch of `updateKit`, relaxed validation.
  - `conflictDetection.service.test.ts`: asset-level overlap across two different kits sharing an asset — the regression test proving today's gap is fixed.
- **Database-level verification** (first deployed recursive CTE in this project — verify directly against a local/dev instance before prod):
  - `kit_would_create_cycle` correctly rejects both a direct and an indirect cycle.
  - `refresh_kit_flattened_cache_cascade` actually reaches every ancestor when a deeply-reused sub-kit changes — this is the part most likely to have a subtle bug, worth a deliberate multi-level, multi-parent test case (edit a kit nested under two unrelated parents, confirm both parents' caches update).
  - RLS blocks a cross-org link attempt at the policy level, not just in the UI.
  - Deleting a kit that's referenced elsewhere doesn't error (the `refresh_kit_flattened_cache` existence guard, §2.3).
- **Manual scan-flow check**: on a real or emulated mobile session, scan a container kit with a nested non-container sub-kit inside it, confirm the cascade goes all the way down while expand/collapse UI stops at the container boundary — this is easy to get subtly wrong and hard to unit-test through the barcode-scanner UI layer.
