# Full SDD workflow

## Configuration
- **Artifacts Path**: {@artifacts_path} → `.zenflow/tasks/i-would-like-kits-to-be-hierarch-21f6`
- **Companions**: [Requirements](./requirements.md) | [Technical Specification](./spec.md)

---

## Workflow Steps

### [x] Step: Requirements

Create a Product Requirements Document (PRD) based on the feature description. Save to `requirements.md`. **Done** — revised 2026-08-25 after product review (many-to-many reuse, no hard depth cap, container-scanning behavior confirmed).

### [x] Step: Technical Specification

Create a technical specification based on the PRD. Save to `spec.md`. **Done** — revised 2026-08-25 after review (unified `kit_components` table, cycle-prevention trigger, write-time-maintained flattened-contents cache, unified asset+kit picker UI).

### [x] Step: Planning

Implementation broken into 6 tasks below, ordered by dependency (schema first, since everything else reads or writes through it; UI split from services since each is a coherent unit on its own).

### [ ] Step: Implementation

Each task references the `spec.md` section(s) it implements and its own verification steps, per the project's rule that tests ship with the code they test, not as a separate task.

---

#### Task 1 — Migration: `kit_components`, cycle prevention, flattened cache

**Implements**: spec §2 (all subsections).

- Write and apply the single migration: rename `kit_assets` → `kit_components`, add `child_kit_id` (nullable), the exactly-one-target and no-self-reference `CHECK`s, swap the old unique constraint for the two partial unique indexes, add `idx_kit_components_child_kit_id`.
- `kit_would_create_cycle` + `prevent_kit_hierarchy_cycle` trigger (spec §2.2).
- `kit_flattened_cache` table + RLS + `refresh_kit_flattened_cache` / `refresh_kit_flattened_cache_cascade` / `trigger_refresh_kit_flattened_cache` + the `AFTER` trigger (spec §2.3).
- `get_kit_hierarchy_tree` function (spec §2.4).
- Updated RLS policies on `kit_components` (spec §2.5), replacing the two old `kit_assets` policies.

**Verification**: apply to a local/dev Supabase instance and manually confirm, per spec §6 — `kit_would_create_cycle` rejects both a direct and an indirect cycle; `refresh_kit_flattened_cache_cascade` reaches every ancestor when a kit nested under two unrelated parents changes (this is the one most likely to have a subtle bug — test it deliberately, don't just infer it from the trigger definition); RLS blocks a cross-org link attempt at the policy level; deleting a referenced kit doesn't error. `npm run typecheck` after regenerating `database.types.ts` against the new schema.

#### Task 2 — Service layer: `kit.service.ts` + activity log

**Implements**: spec §3.1, §3.4.

- `createKit`/`updateKit` take the unified `components` array; extend the existing diff/insert/update/delete logic (today's asset-only version) to the mutually-exclusive shape.
- Relax the "at least one asset" validation to "at least one component."
- `getKitFlattenedContents` (reads `kit_flattened_cache` directly) and `getKitHierarchyTree` (calls the RPC).
- Fix `duplicateKit` to copy `kit_components` rows — and since it's already being touched, fix the pre-existing gap where it doesn't copy `is_container`/`rental_value` either (flagged in spec §3.1; folding the fix in here rather than leaving it half-addressed).
- `activityLog.events.ts`: add `kit.subkit_added`/`kit.subkit_removed`, matching the existing asset pair.

**Verification**: `kit.service.test.ts` covers the unified diffing branch (add/remove/update across mixed asset+sub-kit components), the relaxed validation, and `duplicateKit`'s now-complete copy behavior. `npm run test:run`.

#### Task 3 — `KitScreen.tsx`: unified picker

**Implements**: spec §4.1.

- Single "Add Components" dialog: debounced search across assets and kits in parallel, merged client-side; All/Assets/Kits filter chips; type badge + direct-component count per kit row; checkbox multi-select with "Add N Selected."
- No client-side cycle pre-filtering (per spec, deliberately deferred) — surface the trigger's rejection as an inline "This would create a circular reference" error on the specific row.
- Contents table becomes one mixed table (assets + sub-kits together), reusing the existing inline quantity-input pattern.
- Wire the relaxed validation from Task 2.

**Verification**: update `KitScreen.test.tsx` for the unified picker and mixed contents table. Manual check in the browser preview: add a mix of assets and kits in one session, confirm the cycle-rejection error surfaces correctly when picking a kit that would create one.

#### Task 4 — `KitDetailScreen.tsx`: flattened view + hierarchy tree

**Implements**: spec §4.2.

- Contents table reads `kit_flattened_cache` (via `getKitFlattenedContents`) instead of the direct `kit.kit_assets` join — same table UI, now showing the true aggregated total across nested levels.
- Summary cards (`getTotalValue()`/`getTotalItems()`) switch to the cache-based totals.
- New indented-list section rendering `getKitHierarchyTree`'s result — simple nesting display, not a tree-editing component (Phase 1 scope).
- Non-blocking `toast` when `max(depth)` from the tree result exceeds ~5-6.

**Verification**: update `KitDetailScreen.test.tsx` (or add one if it doesn't exist) for the cache-based totals and hierarchy display. Manual check: a 3-level nested kit shows correct aggregated quantities and a readable indented structure.

#### Task 5 — Conflict detection: asset-level overlap

**Implements**: spec §3.2.

- `checkEquipmentConflicts` and the equipment portion of `checkAllConflictsForGigs` swap kit-ID-equality for a `kit_flattened_cache` lookup + `asset_id` overlap comparison, batched across all assigned kits in one query per the spec.
- `WARNING_BUFFER_MS`/`classifyOverlap` logic is untouched — only what counts as "the same equipment" changes.

**Verification**: `conflictDetection.service.test.ts` gets the regression test proving today's gap is fixed — two *different* kits sharing one physical asset, assigned to overlapping-date gigs, now correctly flags a conflict (confirm it doesn't today, on `main`, before this task, as the baseline).

#### Task 6 — Packing lists & mobile scanning

**Implements**: spec §3.3.

- `packingList.service.ts`'s `fetchGigPackingList` adds `get_kit_hierarchy_tree` per assigned kit, merged into the existing packing-list shape.
- `inventoryTracking.service.ts`'s `getKitAssetIds`/`submitScan` cascade recursively through nested kits.
- `MobileInventoryMode.tsx`'s expand/collapse walks the nested tree, stopping at the first `is_container = true` boundary going down (parent's container status wins, confirmed in requirements §4.4).

**Verification**: update relevant service tests for the recursive cascade. Manual scan-flow check per spec §6 — on a real or emulated mobile session, scan a container kit with a nested non-container sub-kit inside it; confirm the cascade marks everything present in one action while the expand/collapse UI still stops at the container boundary. This one's genuinely hard to unit-test through the barcode-scanner UI layer, so don't skip the manual pass.

---

## Cross-cutting verification (after all tasks)

- `npm run typecheck`, `npm run lint`, `npm run test:run`, `npm run build` — the full CI gate, matching `.github/workflows/ci.yml`.
- A final end-to-end pass: build a 3-level kit from scratch through the UI, assign it to a gig, confirm the packing list and conflict detection both reflect the full nested structure, then edit a deeply-shared sub-kit and confirm the cache updates everywhere it's used.
