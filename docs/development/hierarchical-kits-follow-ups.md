# Hierarchical Kits — Follow-Ups

Issues and polish items found during manual pre-merge testing of the Hierarchical Kits
feature (branch `i-would-like-kits-to-be-hierarch-21f6`). Add new items here as they're
found; mark items done (with date) rather than deleting them, so there's a record of
what shipped when.

Related: `.zenflow/tasks/i-would-like-kits-to-be-hierarch-21f6/plan.md` (the original
implementation plan).

## The unifying root cause behind items 3–6 (all fixed 2026-08-27)

The codebase had two ways to walk a kit's contents: `kit_components` (one level of
direct children only) and `kit_flattened_cache` (fully flattened — every asset in the
whole subtree, ignoring every container boundary, including nested ones). Neither was
the traversal that's actually correct for scanning, packing, and display: **flatten
through non-container kits, but stop and treat a container as one opaque unit — at
every level, not just the top one.** Every place that needed that in-between behavior
either reimplemented it inconsistently or skipped it entirely, which is why the same
shape of bug (a nested container's contents leaking out as individual assets) showed
up in four unrelated-looking places.

Fixed by adding that traversal in two forms and pointing every consumer at it:
- `flattenToScanUnits` (`src/services/kit.service.ts`) — for reads, walking a
  `getKitComponentTree` result. Used by `getPackingListReport`.
- `getCascadeTargets` (`src/services/mobile/inventoryTracking.service.ts`) — for the
  mobile scan-cascade write path, walking the packing list's `hierarchy_edges` +
  per-kit `direct_assets`/`is_container`. Fixing what gets *written* here turned out to
  also fix Location Explorer and the Manifest report, since both read
  `inventory_tracking` directly and group by whatever `kit_id` each row carries — once
  a nested container gets tracking rows under its own id instead of the parent's, their
  existing group-by-kit_id rendering already does the right thing. Neither needed a
  rendering-layer change.

## Open

### 1. Add Components picker silently hides items already elsewhere in the kit's tree

**Found:** 2026-08-27, manual test pass, test item 2 (cycle rejection)
**Status:** In progress — spun off to a background session (task `task_2d12ff4c`)

The picker already handles one exclusion case well: a kit that would create a circular
reference isn't hidden, it's shown grayed out with an inline reason ("Would create a
circular reference"). A different exclusion path — assets/kits already covered elsewhere
in the kit's tree (added directly, or reachable through an already-added sub-kit's
flattened contents) — doesn't get the same treatment. Those candidates are just removed
from the list with no trace, which reads as "why isn't this here?" to a user who doesn't
already know the exclusion rule.

Fix direction: same visual treatment as the cycle case (show + gray out + reason),
gated behind a toggle so the default list stays short. See
`src/components/KitScreen.tsx` (`loadPickerCandidates`, `~line 223`) and
`src/components/KitScreen.test.tsx` for the existing cycle-flagging test to extend.

## Done

### 2. "Inventory Items" count too high for a non-container kit — 2026-08-27

Confirmed shape: one non-container sub-kit with 2 assets, plus 2 assets added directly
to the parent — 4 real physical items, but "Inventory Items" showed 5.

Root cause, confirmed by writing a test against the real `getKitComponentTree` +
`countInventoryItems` pipeline for that exact shape: it returned 4 (correct) — the
counting logic itself wasn't the source of the live discrepancy. Found and fixed a
real, adjacent bug while investigating: `countInventoryItems`
(`src/services/kit.service.ts`) recursed into a non-container sub-kit's children
without multiplying by that node's own `quantity` — 2 copies of a non-container sub-kit
counted its contents once instead of twice (an under-count, not the reported
over-count, so it's a separate defect, not a re-explanation of the +1).

Added: a regression test exercising the full DB-assembly path (previously only the
pure counting function was tested, never `getKitComponentTree`'s tree construction) for
the exact reported shape, plus a test for the quantity-multiplier fix. If the original
+1 recurs, we now have the tooling to pin it precisely against real data.

### 3. Assigning kits with overlapping physical assets was never flagged — 2026-08-27

Two distinct gaps, both landing on the user as "no warning, ever":

- **Within one gig:** `GigKitAssignmentsSection.tsx` (the kit picker in Gig Edit) had no
  overlap check at all. Fixed: a client-side check (`getKitsFlattenedSummary`, the same
  approach `KitScreen.tsx`'s own component picker already uses) flags any two assigned
  kits that share a physical asset — a summary banner plus a warning icon on each
  affected row, with a tooltip naming the other kit.
- **Across gigs:** `checkEquipmentConflicts` was already correct (properly resolves
  through `kit_flattened_cache`, so nested sub-kits were handled right) — the problem
  was it only ever ran on `GigDetailScreen.tsx`, a separate read-only screen, once on
  mount. It was never called from `GigScreen.tsx`/`GigKitAssignmentsSection.tsx`, where
  kits are actually assigned, at all. Fixed: wired up in
  `GigKitAssignmentsSection.tsx`, re-running after every kit-assignment add/remove
  (reusing the existing `ConflictWarning` component for display).

### 4. Packing List exploded a nested container into individual assets — 2026-08-27

`getPackingListReport` pulled a non-container kit's contents from
`kit_flattened_cache`, which flattens through every container boundary in the subtree,
not just the ones the top-level kit itself doesn't have. Fixed: now walks
`getKitComponentTree` + the new `flattenToScanUnits` helper, so a nested container
shows as one row ("Mic Case — Container") instead of its assets leaking out as loose
rows.

### 5. Location Explorer: non-container kits rendered flat and overlapping, plus a
   mystery "Whole kit" row — 2026-08-27

Root cause was entirely at write time, not in `LocationExplorer.tsx`'s rendering (which
needed no changes). Mobile's scan cascade (`submitScan`) unconditionally wrote a
`(kit_id, null)` tracking record for any kit-level scan, container or not, and cascaded
through every asset in the kit's fully-flattened subtree regardless of container
boundaries. Fixed: a non-container kit now gets no record of its own when its row is
scanned (no more "Whole kit" row), and cascading now stops at every container
boundary — a nested container gets its own single sealed-unit record under its own id,
so it naturally becomes its own collapsible row wherever it's found, exactly like a
top-level container already did.

### 6. Manifest report had the same rendering issue as Location Explorer — 2026-08-27

Same root cause and same fix as item 5 (both read `inventory_tracking` directly) — no
separate change needed once the scan cascade was fixed.
