# Hierarchical Kits — Follow-Ups

Issues and polish items found during manual pre-merge testing of the Hierarchical Kits
feature (branch `i-would-like-kits-to-be-hierarch-21f6`) that were deliberately **not**
fixed inline — no data-correctness risk, nothing blocking merge — but are worth tracking
so they don't get lost. Add new items here as they're found; mark items done (with date)
rather than deleting them, so there's a record of what shipped when.

Related: `.zenflow/tasks/i-would-like-kits-to-be-hierarch-21f6/plan.md` (the original
implementation plan).

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

### 2. "Inventory Items" count and a non-container sub-kit's tree row

**Found:** 2026-08-27, manual test pass, test item 3 (kit detail view)
**Status:** Needs clarification before a fix is scoped

Reported: a non-container kit (e.g. "two subs and two tops plus cables" grouped as a
"Speaker Pack" — a logical grouping with no physical tag, nothing to scan on the kit
itself) appeared to be counted as an inventory item in its own right.

What's confirmed so far: `countInventoryItems` in `src/services/kit.service.ts`
(`~line 635`) already treats a non-container sub-kit as transparent — it is *not*
counted itself, only its own contents are, recursively — and this is covered by an
existing passing test (`src/services/kit.service.test.ts`, `countInventoryItems /
maxTreeDepth` describe block) with a scenario matching this exact case. So the
"Inventory Items" summary number on `KitDetailScreen` is not believed to be wrong.

Leading hypothesis: the *tree view* is the actual problem, not the count. In
`ComponentTree` (`src/components/KitDetailScreen.tsx`, `~line 59`), a non-container
sub-kit's row renders with the same shape as a container sub-kit's row — a `× quantity`
suffix and a badge ("Items" vs "Container") — even though a container really is one
scannable physical unit and a non-container sub-kit is purely organizational. The two
rows looking alike is plausibly what reads as "this counts as a thing," independent of
whether the number above it is actually correct.

Needs: confirmation from live testing on which of the two — the summary number, or the
tree row's visual treatment — is what looked wrong, before scoping the fix.

## Done

_(none yet)_
