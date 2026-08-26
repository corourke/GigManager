# Product Requirements Document: Hierarchical Kits

**Status:** Revision of the June 4, 2026 draft below. That draft got through Requirements only — no Technical Specification, Plan, or Implementation followed, and no branch was ever created for it. This revision incorporates decisions made during product review on Aug 25, 2026, and reflects the current architecture (kits are a flat `kit_assets` join today; no kit-to-kit relationship exists in the schema, service layer, or UI).

## 1. Overview

GigWrangler's "Kits" are currently flat collections of "Assets" — a kit can hold multiple assets, but a kit cannot contain another kit. In practice, equipment is built up in layers (a "Mic Kit" and a "Cable Kit" combine into a "Stage Rack"; several racks combine into a full production package), and today that reuse is impossible: building a larger kit means manually re-adding every individual asset from each smaller kit, with no link back to the smaller kit if its contents ever change. This has made kit management largely unusable for real equipment workflows. This document specifies hierarchical kits: kits that can contain other kits, to any of a bounded number of levels, with a kit reusable across multiple parent kits at once.

## 2. Goals

- Allow a kit to contain other kits as well as assets, so equipment can be organized in reusable layers instead of flat, duplicated lists.
- Allow the same sub-kit to be reused inside multiple different parent kits, with changes to a shared sub-kit reflected everywhere it's used.
- Keep the structure bounded and safe — no circular containment, no runaway depth — while supporting real-world equipment layering (a rack of kits, a package of racks).
- Preserve correctness in the workflows that already depend on a kit's contents: gig assignment, packing lists/manifests, conflict detection, and inventory scanning must all account for nested kits automatically, not just direct assets.

## 3. User Personas

- **Inventory Manager** — defines and maintains reusable kit structures (e.g., a standard "Mic Kit" reused across a dozen bigger packages).
- **Rigger / Lead Technician** — needs to see the full breakdown of an assigned kit, flattened to individual assets, to confirm everything is present before a gig.
- **Warehouse Staff** — scans/checks kits in and out during pack-out, load, and return, including kits that themselves contain other kits.

## 4. Functional Requirements

### 4.1 Hierarchy Management

- **Add sub-kits**: A kit can include other existing kits as components, alongside its own directly-added assets (mixing assets and sub-kits in the same kit is required, not optional).
- **Quantity**: Each sub-kit component records how many of that sub-kit are included in the parent (e.g., 2× "Mic Kit A").
- **Reuse across parents**: A kit can be a sub-kit of more than one parent kit simultaneously. Editing a shared sub-kit's contents is reflected in every parent that includes it.
- **Circular reference prevention**: A kit can never be nested — directly or through any chain of sub-kits — inside itself. This must be checked as a full reachability test (is the kit being added anywhere in the *descendant* tree of the kit it's being added to?), not just a check against the immediate parent, because a kit can be reached through more than one path.
- **Depth limit**: Nesting is capped at **4 levels**. Because kits can have multiple parents, a kit's depth is not a fixed property of the kit itself — it depends on the path taken to reach it. The cap applies to every path: adding kit X as a sub-kit of kit Y must be rejected if it would put any existing descendant of X more than 4 levels below any ancestor of Y, including paths that don't yet exist for X or Y individually but would be created by other shared kits elsewhere in the structure. In practice this means depth is validated by a graph walk at write time, not read from a stored column.

### 4.2 Visualization

- **Recursive content view**: Viewing a kit shows both (a) a flattened list of every asset it ultimately contains, with quantities aggregated across all nested levels, and (b) the nested structure itself (which sub-kits, how many, at what level).
- **"Where used" analysis** *(Phase 2 — see §7)*: From any kit, see every parent kit that includes it, directly or indirectly.

### 4.3 Gig Assignments

- **Recursive assignment**: Assigning a parent kit to a gig implicitly assigns everything nested inside it — all sub-kits at every level, and all assets.
- **Manifests / packing lists**: The packing list for a gig shows the full hierarchy of what's assigned, not just top-level kit names.
- **Conflict detection**: Conflicts are detected at the asset level. When multiple kits are assigned to overlapping-date gigs, the system resolves every assignment down to its flattened asset list first, then checks for the same physical asset appearing in more than one place — not just checking for the same top-level kit twice.

### 4.4 Inventory Tracking

- **Container scanning**: A kit marked as a physical `container` (a rack or case, scanned as one sealed unit) governs scanning for everything nested inside it, regardless of whether an individual sub-kit is itself also marked as a container. Scanning the parent container marks its entire nested contents as present in one action.
- **Non-container kits still expand**: A kit that is *not* marked as a container expands to show its immediate components (assets and sub-kits) for individual scanning, same as today — nesting doesn't change this, it just means one of those components might itself be a kit rather than only ever an asset.

## 5. Non-Functional Requirements

- **Performance**: Recursive resolution (flattening, cycle/depth checks) must be efficient enough not to visibly slow down kit editing or gig assignment. Recursive CTEs are the expected approach; caching a flattened view is acceptable if read performance requires it.
- **Data integrity**: The system must never allow a saved state that contains a cycle or exceeds the depth cap — these are enforced at write time, not just checked in the UI.

## 6. Open Questions & Assumptions

- **Assumption**: Rental value rolls up additively — a kit's total rental value is its own value plus the value of every asset and sub-kit nested inside it, at whatever quantities are configured.
- **Assumption**: The depth cap (4 levels) is a hard limit enforced by the system, not a soft warning. If this turns out to be too restrictive in practice, it can be raised later — raising it is a much smaller change than removing it entirely would be.
- **Question**: When a shared sub-kit is edited, should parent kits that include it show a visual indicator that "this kit was recently changed," or is silently reflecting the update sufficient? Leaning toward silent (matches how asset edits already propagate to kits today), but worth confirming.
- **Question, deferred to spec**: Exact UI for adding an existing kit as a sub-kit (a picker alongside the existing asset-picker, most likely) — this is an implementation decision, not a requirements one, but flagging it here so the Technical Specification addresses it explicitly.

## 7. Release Scope & Phasing

Given the urgency (existing kit functionality is a real blocker in day-to-day use) and the decision to support true many-to-many reuse (more complex than a single-parent tree, but necessary for the reuse this is meant to solve), Phase 1 is scoped around **correctness**, not polish:

**Phase 1 — ships the fix**
- Data model for kit-to-kit containment with quantity, full cycle prevention, and the 4-level depth cap enforced on every write
- Basic UI to add/remove existing kits as components of a kit, alongside the existing asset picker (functional, not necessarily a rich drag-and-drop tree)
- Recursive flattened view (§4.2a) — this is what makes packing lists and warehouse scanning trustworthy
- Gig assignment, manifests, and conflict detection correctly account for nested kits (§4.3)
- Container-aware scanning (§4.4)

**Phase 2 — polish, once Phase 1 is stable**
- "Where used" analysis (§4.2b)
- A richer hierarchy visualization / tree-editing UI, if the Phase 1 picker proves limiting in practice

This intentionally leaves out drag-and-drop hierarchy management and status-propagation modes beyond the container default from the original June draft — nothing here should block Phase 1, and both can be revisited after real usage informs what's actually missing.
