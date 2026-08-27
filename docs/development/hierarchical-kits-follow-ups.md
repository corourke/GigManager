# Hierarchical Kits — Follow-Ups

Issues and polish items found during manual pre-merge testing of the Hierarchical Kits
feature (branch `i-would-like-kits-to-be-hierarch-21f6`). Add new items here as they're
found; mark items done (with date) rather than deleting them, so there's a record of
what shipped when.

Related: `.zenflow/tasks/i-would-like-kits-to-be-hierarch-21f6/plan.md` (the original
implementation plan).

## The unifying root cause behind items 3–6

The codebase has two ways to walk a kit's contents: `kit_components` (one level of
direct children only) and `kit_flattened_cache` (fully flattened — every asset in the
whole subtree, ignoring every container boundary, including nested ones). Neither is
the traversal that's actually correct for scanning, packing, and display: **flatten
through non-container kits, but stop and treat a container as one opaque unit — at
every level, not just the top one.** Every place below that needs that in-between
behavior either reimplements it inconsistently or skips it entirely, which is why the
same shape of bug (a nested container's contents leak out as individual assets) shows
up in four unrelated-looking places. A real fix should add one shared, tested
traversal and point every consumer at it, rather than patching each display layer
separately.

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

### 2. "Inventory Items" count is genuinely too high for a non-container kit

**Found:** 2026-08-27, manual test pass, test item 3 (kit detail view)
**Status:** Confirmed wrong; exact root cause not yet pinned — needs the tested kit's
exact composition to reproduce precisely

Confirmed via live testing: a kit with 4 real (physical, taggable) items showed
"Inventory Items: 5". The extra 1 is believed to trace to a non-container sub-kit
somewhere in the tree being counted as though it were itself a physical unit — which
contradicts both the intent ("a non-container kit is just a concept, nothing to scan")
and the existing passing unit test for `countInventoryItems`
(`src/services/kit.service.test.ts`) that specifically covers a non-container sub-kit
and asserts it is *not* counted.

Found in the same code while investigating (real, but doesn't by itself explain a
+1 — it under-counts, not over-counts): `countInventoryItems`
(`src/services/kit.service.ts:635`) recurses into a non-container kit node's children
without multiplying by that node's own `quantity`. If a non-container sub-kit is added
to a parent at quantity 2 ("2× Speaker Pack"), the count should double the sub-kit's own
item count; today it doesn't. Worth fixing regardless of the +1 mystery.

Next step: reproduce with the exact kit tree that showed 5-for-4 (assets, quantities,
and which nodes are container vs. not) and add a regression test pinned to that shape
before changing the function.

### 3. Assigning kits with overlapping physical assets is never flagged

**Found:** 2026-08-27, manual test pass, test items 4 and 8
**Status:** Root-caused, not yet fixed

Two distinct gaps, both landing on the user as "no warning, ever":

- **Within one gig:** `GigKitAssignmentsSection.tsx` (the kit-picker in Gig Edit) has no
  overlap check at all — you can assign two different kits to the same gig that share
  an underlying physical asset (directly, or because one kit is nested inside another),
  and nothing says so.
- **Across gigs:** the asset-level cross-gig equipment-conflict check
  (`checkEquipmentConflicts` in `src/services/conflictDetection.service.ts:234`) is
  actually implemented correctly — it already resolves through
  `kit_flattened_cache`, so nested sub-kits are handled right. The problem is when it
  runs: `GigDetailScreen.tsx` calls `checkAllConflicts` exactly once, in `loadGig()` on
  initial mount (`~line 115`). Adding or removing a kit assignment afterward never
  re-triggers it — only a full page reload does, which is why re-adding kits during a
  test session showed nothing.

Fix direction: re-run `checkAllConflicts` (or at least `checkEquipmentConflicts`) after
every kit-assignment add/remove, not just on mount. Separately, add a same-gig
kit-vs-kit asset-overlap check to the picker in `GigKitAssignmentsSection.tsx` (there's
no existing function for this — closest precedent is the flattened-asset-overlap logic
already in `KitScreen.tsx`'s component picker, which solves the analogous problem for
kit-authoring rather than gig-assignment).

### 4. Packing List explodes a nested container into individual assets

**Found:** 2026-08-27, manual test pass, test item 5
**Status:** Root-caused, not yet fixed

`getPackingListReport` (`src/services/inventoryManagement.service.ts`) pulls a
non-container top-level kit's contents from `kit_flattened_cache`, which flattens
through *every* container boundary in the subtree, not just the ones the top-level kit
itself doesn't have. A container nested a couple of levels down should show as one row
("Mic Case — Container"); instead its individual assets show up as loose rows,
indistinguishable from the kit's other real loose items. See "unifying root cause"
above — this needs the tree-aware traversal, not a flatter cache read.

### 5. Location Explorer: non-container kits render flat and overlapping, plus a
   mystery "Whole kit" row

**Found:** 2026-08-27, manual test pass, test item 4
**Status:** Root-caused, not yet fixed — two separate causes

- **Flat, overlapping rendering:** `LocationExplorer.tsx`'s `groupByKit` (`~line 70`)
  and its render logic only understand two shapes — "container: one collapsible row" or
  "non-container: header + every asset flat beneath it" — with no concept of a nested
  container *inside* a non-container kit. Same root cause as item 4.
- **The "Whole kit" row:** this is real data, not a rendering artifact. Mobile's scan
  cascade (`submitScan` in `src/services/mobile/inventoryTracking.service.ts:244`)
  unconditionally writes a `(kit_id, null)` tracking record for *any* kit-level scan,
  container or not — there's no branch on `is_container`. For a container that's
  correct (the container itself is the physical, taggable thing). For a non-container
  kit it produces a tracking row for something that, per the product model, was never
  supposed to have its own physical identity — which is exactly the phantom row
  `LocationExplorer.tsx:400-423` is rendering as "Whole kit."

  Real fix is at write time, not display time: `submitScan`'s cascade should stop
  writing a standalone `(kit_id, null)` record for a non-container kit and only cascade
  into its children (recursively, respecting *their* container status too). This is
  the same "flatten through non-containers, stop at containers" traversal called out
  above, just on the write path instead of a read path — the biggest, most central
  piece of the four inter-related issues here.

### 6. Manifest report has the same rendering issue as Location Explorer

**Found:** 2026-08-27, manual test pass, test item 6
**Status:** Same root cause as item 5 — will very likely be resolved once the
`submitScan` cascade (item 5) and the shared traversal (see top of this doc) exist.
Every other Manifest behavior tested clean.

## Done

_(none yet)_
