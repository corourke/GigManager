# Hierarchical Kits — Pre-Merge Manual Test Checklist

**Branch**: `i-would-like-kits-to-be-hierarch-21f6`
**Purpose**: full manual verification of the Hierarchical Kits feature and everything it
touched, before merging to `main`. Covers the original implementation (nested kits,
cycle prevention, mobile scanning, conflict detection) plus every fix made during
pre-merge testing (report bugs, container-boundary handling, gig-assignment conflicts).

Related: `docs/development/.archive/hierarchical-kits-follow-ups.md` — the follow-up
log from pre-merge testing. All of its items are now resolved, so it is archived and
kept only as a record of what shipped when.

---

## Walkthrough pass — 2026-09-07 (Claude, local dev server + Act4Audio on hosted dev DB)

The feature is already merged to `main` (commit `2b50210`); this pass ran the checklist
against `main` on a local `npm run dev` (Vite) pointed at the hosted dev Supabase, org
**Act4Audio**. Legend: `[x]` verified this pass · `[~]` partial / indirect ·
`[ ]` still open.

**Verified working:**
- **§2 Kit Detail View** — all except the 6-levels-deep warning (no such kit in the
  data). Small Gig Pack reads Total Assets 15 / Total Items 27 / Inventory Items 10;
  Container vs Items labels correct; "Show container contents" toggles as specified.
- **§1 authoring** — picker All/Assets/Kits tabs confirmed in-UI; the picker-exclusion,
  fixed-sub-kit-qty-1, cycle-flagging, and cycle-beats-duplicate behaviours are all
  covered by the passing `KitScreen.test.tsx` suite (11/11).
- **§5 Location Explorer** — containers render as single "Container" rows; non-container
  kits list loose assets flat with nested containers hoisted to their own rows.
- **§6 Manifest** — location required / gig filter lists every gig incl. a past one;
  asset-own-name rows (not the kit name repeated); on-screen checkbox column with
  row strike-through; visible grid borders.
- **§6 Packing List** — gig selector lists every gig incl. past.
- **§6 Maintenance Queue** — loads clean, no `PGRST201` / console errors.
- **§8** — `typecheck` clean, `lint` clean, `build` succeeds.

**Could NOT verify this pass (environment / data limits, not known failures):**
- **§3 Gig Equipment Assignment, §4 Mobile Scanning** — not exercised live; the
  constrained in-app preview pane could not reliably drive the autosave/modal/tap
  interactions. Backed by passing automated suites (`conflictDetection.service`,
  `ConflictWarning`, `GigKitAssignmentsSection`, `inventoryTracking.service`,
  `packingList.service`, `MobileInventoryMode`). Live click/scan-through still owed.
- **§1** save+reload round-trip and the **Duplicate** button — no unit coverage, modal
  blocker in UI.
- **§6** Packing-list body rows (container = one row; direct+nested = one row),
  print views, Maintenance-Queue kit-name-populated — blocked by the Radix gig
  `<select>` in the pane / no maintenance-flagged asset in the data.
- **§2** 6-levels-deep toast, **§5** pencil-override dialog, **§7** live regression pass.

**One expected-open observation:** §5 still shows stray "Whole kit" rows under
non-container kits, but every one is from an **Aug 26 scan that predates the fix** —
the section note already says to re-check with fresh §4 scans, which weren't done.

**§8 test caveat:** `npm run test:run` = 781 passed / **3 failed**, all in
`GigListScreen.test.tsx` (`localStorage.clear()` in `beforeEach` → `undefined`),
the known local-env `localStorage` gotcha, unrelated to Hierarchical Kits. Confirm
green in CI.

## Prerequisites

- [~] Confirm both migrations are applied to whichever Supabase instance you're testing
      against: `20260826000000_hierarchical_kits.sql` and
      `20260826230000_kit_cycle_batch_check.sql` (`supabase migration list --linked`)
      — both files present in `supabase/migrations/`; the running dev app (hosted dev
      Supabase `qcrzwsazasaojqoqxwnr`) clearly has the schema live (kit hierarchy,
      container-aware counts, cycle checks all functioning in-app). `migration list
      --linked` not run here (remote CLI cmd); assumed applied on that basis.
- [x] Have access to an org with an existing multi-level kit hierarchy. Act4Audio's
      **"Small Gig Pack"** kit is a ready-made example: it directly contains a loose
      asset and the non-container **"Mic Stands"** and **"Moving Heads"** sub-kits, and
      also nests **"Small Lighting Kit"** (non-container) which itself contains two
      *container* sub-kits (**"Lighting, DMX Cables, Long Cables"**, **"Lighting, DMX,
      Wireless"**) — three levels, mixing container and non-container at every level.
      No need to build this from scratch to test viewing/reporting; you will need a
      *fresh* kit for the authoring checks in section 1.

---

## 1. Kit Authoring (Equipment → Kits → Create/Edit)

- [x] Create a new kit; the "Add Components" picker shows **All / Assets / Kits**
      filter tabs — verified on `/kits/new`; dialog header "Add Components", tabs
      All / Assets / Kits present, plus a "Show items already in this kit" toggle.
  Live-UI note: could not reliably operate the "Add Components" modal's internal
  controls (checkboxes / tab filters / qty inputs) through the constrained preview
  pane — the modal renders too small to hit its targets and stray clicks dismiss it.
  Items below that couldn't be click-tested are backed by the passing
  `src/components/KitScreen.test.tsx` suite (11/11 green, run in isolation this pass).

- [ ] Add a mix of individual assets and existing kits as components in one kit; save
      succeeds and the mix is preserved on reload — **not verified end-to-end** (no
      unit test covers the save + DB round-trip; modal blocker in UI). The existing
      "Small Gig Pack" is itself living proof the persisted mix (loose asset + 3
      non-container sub-kits + nested containers) survives reload.
- [x] A sub-kit's row in the components table shows a **fixed quantity of 1**, not an
      editable number input — `KitScreen.test.tsx` → "shows a fixed quantity of 1 for
      sub-kit rows, not an editable input" (passing). Corroborated by the Small Gig
      Pack tree showing every sub-kit as "× 1".
- [x] An asset already added directly to the kit does **not** appear again as a
      candidate in the picker — `KitScreen.test.tsx` → "excludes picker candidates
      whose flattened assets overlap what the kit already contains" (passing).
- [x] An asset already reachable through an already-added sub-kit's contents does
      **not** appear as a candidate either (same physical item, two paths) — same
      passing test (it exercises the *flattened* overlap, i.e. the through-a-sub-kit
      path), plus the toggle-reveal tests.
- [x] Try adding a kit that would create a circular reference: candidate is **shown,
      grayed out, with an inline "Would create a circular reference" message** —
      `KitScreen.test.tsx` → "flags a kit candidate that would create a circular
      reference, inline on its row, and blocks selecting it" (passing; asserts the
      exact "Would create a circular reference" text and that selection is blocked).
      Not re-confirmed by live click-through.
- [x] A cyclic candidate is correctly flagged even when it *also* looks like a
      duplicate-asset candidate (cycle warning takes priority) — `KitScreen.test.tsx`
      → "flags a candidate as cyclic even when its flattened assets also overlap — the
      cycle check takes priority over the duplicate-asset rule" (passing).
- [ ] Duplicating a kit (Duplicate button) reproduces its full component list,
      including nested sub-kits — **not verified** (no unit test; could not complete
      the Duplicate flow in the pane).

## 2. Kit Detail View (Equipment → Kits → click a kit)

- [x] **Total Assets** / **Total Items** cards show the fully-flattened counts,
      ignoring every container boundary (drill all the way through) — Small Gig Pack:
      Total Assets **15** (distinct), Total Items **27** (with quantities). The
      "Assets in Kit" table ("Aggregated across this kit and everything nested inside
      it") lists all 15 assets incl. those sealed in the two DMX containers and the
      Microphone Case; quantities sum to 27.
- [x] **Inventory Items** card shows the container-aware count: a container sub-kit
      counts as exactly **one** item and isn't drilled into; a non-container sub-kit is
      **transparent** (not counted itself — only its own contents are, recursively) —
      card reads **10**, subtitle "Containers count as one".
- [x] For "Small Gig Pack" specifically: Inventory Items should read **10** — reads
      **10**.
- [x] Kit Structure tree: a container sub-kit is labeled **Container**, a non-container
      sub-kit is labeled **Items** — Mic Stands / Small Lighting Kit / Moving Heads
      show an "Items" badge; Lighting, DMX Cables, Long Cables / Lighting, DMX,
      Wireless / Microphone Case show a "Container" badge.
- [x] "Show container contents" toggle: off by default (container's own contents
      hidden), turning it on reveals what's sealed inside — off by default the 3
      containers show no children; toggling on reveals the 3 cables in "…Long
      Cables", the CHINLY receiver in "…Wireless", and the 5 mics/holders in
      "Microphone Case".
- [ ] A kit nested 6+ levels deep triggers the "nested N levels deep — is that
      intentional?" warning toast on load — **not verified: no 6+-deep kit in the
      Act4Audio data (Small Gig Pack is 3 levels).**

## 3. Gig Equipment Assignment (Gigs → open a gig → Edit → Equipment section)

> **Section 3 was not exercised live** (the gig-edit Equipment flow needs many
> reliable autosave/click interactions that the constrained preview pane couldn't do
> dependably). The underlying logic is covered by passing automated suites run in the
> full `test:run`: `src/services/conflictDetection.service.test.ts` (24 tests,
> resolve-to-assets overlap + cross-gig `checkEquipmentConflicts`),
> `src/components/ConflictWarning.test.tsx`, and
> `src/components/gig/GigKitAssignmentsSection.test.tsx`. Live click-through still
> owed before merge sign-off.

- [ ] Assigning a kit updates the list immediately (autosave, "Saved" indicator)
- [ ] Assign two kits to the same gig that share a physical asset (directly, or one
      nested inside the other): an **"Overlapping equipment"** banner appears, plus a
      warning icon on each affected row with a tooltip naming the other kit
- [ ] Assigning kits with **no** shared assets shows no overlap warning
- [ ] Assign a kit to two gigs with overlapping dates: a **cross-gig conflict** banner
      appears (via `checkEquipmentConflicts`) — check this from the Equipment section
      itself, not just a separate gig detail page
- [ ] The cross-gig conflict banner **re-checks after adding or removing** a kit
      assignment — no page reload needed
- [ ] Removing the conflicting assignment makes the relevant warning disappear (may
      require the *other* gig's assignment to also change, since conflicts are
      symmetric)

## 4. Mobile Scanning (mobile inventory mode, or resize the browser to mobile width)

> **Section 4 was not exercised live** (needs the mobile scan UI plus reliable
> tap/toggle interactions). Logic covered by passing suites in the full `test:run`:
> `src/services/mobile/inventoryTracking.service.test.ts` (`getCascadeTargets` —
> flatten-through-non-container / stop-at-container cascade),
> `src/services/mobile/packingList.service.test.ts`, and
> `src/components/mobile/MobileInventoryMode.test.tsx`. Live scan-through still owed.

- [ ] Open a gig's packing list on mobile: a nested sub-kit renders as **its own row**
      (indented under its parent), not flattened into a sibling card
- [ ] Tapping a **non-container** kit's own row toggle marks its scannable contents as
      scanned, but does **not** create a standalone tracking record for the kit itself
      (no phantom entry with no asset)
- [ ] Tapping a **container** kit's own row toggle marks the container itself as
      scanned *and* cascades through its full contents (including anything nested
      inside it, however deep) — this is intentionally still "cascade everything," since
      a container is one sealed physical unit
- [ ] A nested container reached while scanning a non-container ancestor gets tracked
      under **its own identity**, not folded into the ancestor — verify by checking
      Location Explorer afterward (section 5)
- [ ] The "X / Y items {status}" progress line under a non-container kit's name counts
      *scannable units* (assets + sealed containers), not a raw flattened asset count
- [ ] Un-checking (toggling back) a non-container kit's row correctly reverts all of
      its scannable units, not just a subset
- [ ] Editing a note / flagging Maintenance on an individual asset works and doesn't
      leak onto sibling rows
- [ ] Barcode-scanning a kit's own tag works for a kit that has one; a non-container
      kit with no tag_number shows no false "No Tag" warning on its row (only
      containers are expected to have a tag)

## 5. Location Explorer (Equipment → Inventory → Location Explorer)

*Best tested with fresh scans from section 4, since old data predates these fixes.*

- [x] A container kit (top-level or nested) shows as **one collapsible row**, expandable
      to see its contents — "Lighting, DMX Cables, Long Cables", "Lighting, DMX,
      Wireless" and "Microphone Case" each render as a single row tagged "Container"
      in the In-Warehouse / Warehouse group; not exploded. (Expand-to-see-contents
      not click-tested.)
- [x] A non-container kit shows its own loose assets flat beneath it, and each nested
      container found inside it shows as its **own separate row** elsewhere in the same
      location/status group — not exploded into that non-container kit's flat list —
      "Small Gig Pack" / "Small Lighting Kit" list their loose assets flat under an
      "Items" header, while the DMX containers appear as their own separate rows in
      the same group.
- [ ] No stray **"Whole kit"** row appears under a non-container kit — **NOT met with
      the current data, as expected: stray "Whole kit" rows DO appear under Mic
      Stands / Small Gig Pack / Small Lighting Kit / Moving Heads, but every one is
      from an Aug 26 scan that predates the fix.** Section note says to re-test with
      fresh section-4 scans; those weren't performed in this pass, so this stays open.
- [ ] The manual override (pencil icon) still works for both kit-level and asset-level
      rows, and the target gig list includes a gig outside the "active" window if the
      item's current record points to one — **not verified (pencil dialog not
      exercised this pass).**

## 6. Inventory Reports (Equipment → Inventory → Reports)

### Manifest

- [x] Location filter is required; gig filter is optional and lists **every** gig
      (not just ones happening this week) — "Location *" is marked required, "Gig
      (optional)" dropdown lists All gigs + Private Birthday Party, Electric Festival,
      TEST tags, SMOKE — Gig A, and the past **July 4th** gig.
- [x] Each row shows the **correct asset's own name** — not the kit's name repeated
      for every row (this was the original "duplicate kits" bug) — verified for
      location "Warehouse": rows under the "Small Gig Pack" / "Mic Stands" / DMX
      container group headers show each asset's own name (CHINLY receiver, Accu-Cable,
      SHEHDS moving head, Shure SM57, …), not "Small Gig Pack" repeated.
- [~] The same physical asset appears **once**, even if it was scanned via more than
      one kit level in its hierarchy — consistent with the fix (rows are grouped by
      the kit they were scanned under and are distinct within each group; no spurious
      in-group duplication seen), but not proven against a targeted single-gig
      two-path case this pass.
- [x] Checkbox column is **visible on screen**, not just in print, and clicking a
      checkbox strikes through that row — leftmost checkbox column renders on screen;
      clicking a row's checkbox checks it and greys/strikes the row text.
- [x] Table has visible grid borders on screen (not just when printed) — cell/row
      borders are visible in the on-screen manifest table.
- [ ] Print view still looks correct (Print button) — **not verified (print not
      triggered).**

### Packing List

- [x] Gig selector lists **every** gig for the org, including past/completed ones —
      dropdown lists Private Birthday Party, Electric Festival, TEST tags, SMOKE —
      Gig A, and the past **July 4th** gig.
- [ ] A container kit — top-level *or* nested arbitrarily deep — shows as **exactly one
      row**, never exploded into its individual assets — **not verified: could not
      reliably drive the Radix gig `<select>` in the constrained preview pane to load
      a packing list.**
- [ ] A kit assigned **both directly to the gig and nested inside another assigned
      kit** produces exactly **one** row for it, not two — **not verified (same
      blocker).**
- [ ] Checkbox column visible and clickable on screen; grid borders visible — **not
      verified (same blocker).**
- [ ] Print view still looks correct — **not verified.**

### Maintenance Queue

- [x] Loads without a console error (previously crashed with `PGRST201`) — tab renders
      the table + "0 assets flagged for maintenance" with no console errors on load.
- [ ] An asset with status "Maintenance" appears with its kit name populated (not
      blank) when it belongs to a kit — **not verified: no assets are currently
      flagged for maintenance in the Act4Audio data.**

## 7. Regression — simple, non-hierarchical kits

- [ ] A single-level kit (assets only, no sub-kits) still creates, edits, assigns to a
      gig, scans (mobile), and reports (Manifest/Packing List) correctly — **not
      exercised live this pass.** Manifest/Packing/Location-Explorer rendering for the
      existing flat kits ("Mic Stands", "Moving Heads" — assets only) looked correct
      wherever they appeared in sections 5–6.
- [x] Quantity handling for a plain asset component (not a sub-kit) is still an
      editable number, clamped to what's in stock — `src/components/KitScreen.test.tsx`
      → "clamps the quantity added for an asset to what is in stock" (passing); picker
      also shows editable "Qty" inputs on asset rows (seen in UI).

## 8. Full CI gate

- [x] `npm run typecheck` — clean (verified 2026-09-07, exit 0, no output)
- [x] `npm run lint` — 0 errors (pre-existing warnings are fine) (verified 2026-09-07, exit 0)
- [ ] `npm run test:run` — all passing — **NOT clean locally: 781 passed / 3 failed.**
      All 3 failures are `src/components/GigListScreen.test.tsx` (`TypeError: Cannot
      read properties of undefined (reading 'clear')` at the `localStorage.clear()` in
      `beforeEach`) — the known local-env `localStorage` gotcha, not a hierarchical-kits
      regression (GigListScreen has no kit code; fix tracked on branch
      `claude/fix-giglistscreen-localstorage-test`). Needs a re-run in CI / with the
      `--localstorage-file` flag to confirm green there.
- [x] `npm run build` — succeeds (verified 2026-09-07, "built in 5.35s"; only the
      pre-existing chunk-size / dynamic-import warnings)

---

## Known open item — not a merge blocker

- [ ] **(Informational only, do not block merge on this)** The "Add Components" picker
      silently omits candidates already covered elsewhere in the kit's tree (no
      cycle-style inline warning for that case yet). Tracked separately as item 1 of
      `docs/development/.archive/hierarchical-kits-follow-ups.md`, which now records
      that item as **fixed on 2026-09-01** (the picker shows such candidates grayed
      out with an inline reason, matching the cycle-prevention case). This entry is
      therefore likely stale — verify against current behavior and close it out rather
      than re-testing the old symptom.
