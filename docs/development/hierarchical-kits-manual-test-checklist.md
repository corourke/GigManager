# Hierarchical Kits — Pre-Merge Manual Test Checklist

**Branch**: `i-would-like-kits-to-be-hierarch-21f6`
**Purpose**: full manual verification of the Hierarchical Kits feature and everything it
touched, before merging to `main`. Covers the original implementation (nested kits,
cycle prevention, mobile scanning, conflict detection) plus every fix made during
pre-merge testing (report bugs, container-boundary handling, gig-assignment conflicts).

Related: `docs/development/hierarchical-kits-follow-ups.md` (known open items,
deliberately not blocking this merge — see the bottom of this checklist).

## Prerequisites

- [ ] Confirm both migrations are applied to whichever Supabase instance you're testing
      against: `20260826000000_hierarchical_kits.sql` and
      `20260826230000_kit_cycle_batch_check.sql` (`supabase migration list --linked`)
- [ ] Have access to an org with an existing multi-level kit hierarchy. Act4Audio's
      **"Small Gig Pack"** kit is a ready-made example: it directly contains a loose
      asset and the non-container **"Mic Stands"** and **"Moving Heads"** sub-kits, and
      also nests **"Small Lighting Kit"** (non-container) which itself contains two
      *container* sub-kits (**"Lighting, DMX Cables, Long Cables"**, **"Lighting, DMX,
      Wireless"**) — three levels, mixing container and non-container at every level.
      No need to build this from scratch to test viewing/reporting; you will need a
      *fresh* kit for the authoring checks in section 1.

---

## 1. Kit Authoring (Equipment → Kits → Create/Edit)

- [ ] Create a new kit; the "Add Components" picker shows **All / Assets / Kits**
      filter tabs
- [ ] Add a mix of individual assets and existing kits as components in one kit; save
      succeeds and the mix is preserved on reload
- [ ] A sub-kit's row in the components table shows a **fixed quantity of 1**, not an
      editable number input (a kit is a singular thing, not stackable)
- [ ] An asset already added directly to the kit does **not** appear again as a
      candidate in the picker
- [ ] An asset already reachable through an already-added sub-kit's contents does
      **not** appear as a candidate either (same physical item, two paths)
- [ ] Try adding a kit that would create a circular reference (e.g. add kit A's own
      parent back into A): the candidate is **shown, grayed out, with an inline
      "Would create a circular reference" message** — not silently hidden, not a toast
      after a failed save
- [ ] A cyclic candidate is correctly flagged even when it *also* looks like a
      duplicate-asset candidate (cycle warning takes priority)
- [ ] Duplicating a kit (Duplicate button) reproduces its full component list,
      including nested sub-kits

## 2. Kit Detail View (Equipment → Kits → click a kit)

- [ ] **Total Assets** / **Total Items** cards show the fully-flattened counts,
      ignoring every container boundary (drill all the way through)
- [ ] **Inventory Items** card shows the container-aware count: a container sub-kit
      counts as exactly **one** item and isn't drilled into; a non-container sub-kit is
      **transparent** (not counted itself — only its own contents are, recursively)
- [ ] For "Small Gig Pack" specifically: Inventory Items should read **10** (Mic
      Stands' 2 assets + Small Lighting Kit's 5 units [2 containers + 3 loose assets] +
      Moving Heads' 1 asset + Microphone Case counting as 1 container = 10)
- [ ] Kit Structure tree: a container sub-kit is labeled **Container**, a non-container
      sub-kit is labeled **Items**
- [ ] "Show container contents" toggle: off by default (container's own contents
      hidden), turning it on reveals what's sealed inside
- [ ] A kit nested 6+ levels deep triggers the "nested N levels deep — is that
      intentional?" warning toast on load

## 3. Gig Equipment Assignment (Gigs → open a gig → Edit → Equipment section)

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

- [ ] A container kit (top-level or nested) shows as **one collapsible row**, expandable
      to see its contents
- [ ] A non-container kit shows its own loose assets flat beneath it, and each nested
      container found inside it shows as its **own separate row** elsewhere in the same
      location/status group — not exploded into that non-container kit's flat list
- [ ] No stray **"Whole kit"** row appears under a non-container kit (that row should
      no longer exist for kits scanned after this fix)
- [ ] The manual override (pencil icon) still works for both kit-level and asset-level
      rows, and the target gig list includes a gig outside the "active" window if the
      item's current record points to one

## 6. Inventory Reports (Equipment → Inventory → Reports)

### Manifest

- [ ] Location filter is required; gig filter is optional and lists **every** gig
      (not just ones happening this week)
- [ ] Each row shows the **correct asset's own name** — not the kit's name repeated
      for every row (this was the original "duplicate kits" bug)
- [ ] The same physical asset appears **once**, even if it was scanned via more than
      one kit level in its hierarchy
- [ ] Checkbox column is **visible on screen**, not just in print, and clicking a
      checkbox strikes through that row
- [ ] Table has visible grid borders on screen (not just when printed)
- [ ] Print view still looks correct (Print button)

### Packing List

- [ ] Gig selector lists **every** gig for the org, including past/completed ones
- [ ] A container kit — top-level *or* nested arbitrarily deep — shows as **exactly one
      row**, never exploded into its individual assets
- [ ] A kit assigned **both directly to the gig and nested inside another assigned
      kit** produces exactly **one** row for it, not two
- [ ] Checkbox column visible and clickable on screen; grid borders visible
- [ ] Print view still looks correct

### Maintenance Queue

- [ ] Loads without a console error (previously crashed with `PGRST201`)
- [ ] An asset with status "Maintenance" appears with its kit name populated (not
      blank) when it belongs to a kit

## 7. Regression — simple, non-hierarchical kits

- [ ] A single-level kit (assets only, no sub-kits) still creates, edits, assigns to a
      gig, scans (mobile), and reports (Manifest/Packing List) correctly — the
      hierarchy work shouldn't have changed behavior for the common case
- [ ] Quantity handling for a plain asset component (not a sub-kit) is still an
      editable number, clamped to what's in stock

## 8. Full CI gate

- [ ] `npm run typecheck` — clean
- [ ] `npm run lint` — 0 errors (pre-existing warnings are fine)
- [ ] `npm run test:run` — all passing
- [ ] `npm run build` — succeeds

---

## Known open item — not a merge blocker

- [ ] **(Informational only, do not block merge on this)** The "Add Components" picker
      silently omits candidates already covered elsewhere in the kit's tree (no
      cycle-style inline warning for that case yet). Tracked separately in
      `docs/development/hierarchical-kits-follow-ups.md` item 1, already spun off to a
      background session. Confirm it still behaves as documented (items just don't
      appear, no crash, no incorrect data) — this is a UX polish gap, not a
      correctness bug.
