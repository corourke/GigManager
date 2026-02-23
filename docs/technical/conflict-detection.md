# Conflict Detection

## Overview

Conflict detection identifies scheduling overlaps when multiple gigs share the same staff, venue/act organizations, or equipment during overlapping time periods. Detection is **gig-centric**: given a specific gig (or set of gigs), the system finds other gigs that conflict with it.

## Conflict Types

### Staff Conflicts
Two gigs conflict on staff when the same user is assigned (via `gig_staff_assignments`) to both gigs and their time ranges overlap.

**Data path**: `gigs → gig_staff_slots → gig_staff_assignments → users`

There is no direct FK from `gig_staff_assignments` to `gigs`. Assignments link through `gig_staff_slots.gig_id`.

### Participant Conflicts (Venue & Act)
Two gigs conflict on participants when the same organization appears in `gig_participants` with a conflicting role (`Venue` or `Act`) on both gigs during overlapping times.

**Data path**: `gigs → gig_participants → organizations`

**Configurable roles**: The constant `PARTICIPANT_CONFLICT_ROLES = ['Venue', 'Act']` controls which participant roles trigger conflict detection. The conflict `type` field remains `'venue'` for UI compatibility, with `details.role` indicating the actual role.

### Equipment Conflicts
Two gigs conflict on equipment when the same kit is assigned (via `gig_kit_assignments`) to both gigs during overlapping times.

**Data path**: `gigs → gig_kit_assignments → kits`

## Date-Only Gig Handling

Gigs without specific times store `start` and `end` as noon UTC (`T12:00:00.000Z`), which is a sentinel value. The `isNoonUTC()` utility in `dateUtils.ts` detects this.

When a gig is date-only, `getEffectiveRange()` expands its range to the full day:
- **Start**: `00:00:00.000 UTC` on that date
- **End**: `23:59:59.999 UTC` on that date

This ensures a date-only gig on Feb 27 correctly overlaps with a timed gig on Feb 27 from 7–9 PM UTC.

## Overlap Classification

Given two gigs A and B, `classifyOverlap()` returns:

1. **`'conflict'`** — Their effective ranges directly overlap (`A.start <= B.end AND A.end >= B.start`).
2. **`'warning'`** — They don't directly overlap but are within `WARNING_BUFFER_MS` (4 hours) of each other.
3. **`null`** — No temporal proximity.

## Per-Gig Detection (`checkAllConflicts`)

Used when viewing a single gig's detail screen. Makes 3 parallel Supabase queries:

1. **`checkStaffConflicts(gigId, start, end)`**
   - Query current gig's slots → get slot IDs
   - Query assignments for those slots → get user IDs
   - Query candidate gigs (within widened time range) with their staff slots/assignments
   - Compare user IDs in JS; classify overlaps

2. **`checkParticipantConflicts(gigId, start, end)`**
   - Query current gig's participants with conflicting roles
   - Query candidate gigs with their participants
   - Compare organization IDs in JS; classify overlaps

3. **`checkEquipmentConflicts(gigId, start, end)`**
   - Query current gig's kit assignments
   - Query candidate gigs with their kit assignments
   - Compare kit IDs in JS; classify overlaps

**Query widening**: Database queries use `widenedQueryRange()` which adds `WARNING_BUFFER_MS + DAY_MS` (28 hours) to both ends of the time range. This ensures date-only gigs and warning-proximity gigs are captured as candidates. Precise overlap/warning classification happens in JS after fetching.

## Batch Detection (`checkAllConflictsForGigs`)

Used on the gig list/calendar view to detect conflicts across all visible gigs efficiently. Makes exactly **3 Supabase queries** regardless of the number of gigs:

1. `gig_staff_slots` with nested `gig_staff_assignments` for all gig IDs
2. `gig_participants` (filtered to conflict roles) for all gig IDs
3. `gig_kit_assignments` for all gig IDs

Then builds lookup maps (`staffByGig`, `participantsByGig`, `kitsByGig`) and does O(n²) pairwise comparison in JavaScript:

- For each pair (A, B) where `rangesOverlap(A, B)`:
  - Check shared staff user IDs
  - Check shared participant organization IDs
  - Check shared kit IDs
- Conflicts are emitted **symmetrically** (both A→B and B→A)
- Deduplicated by composite key: `${type}:${gig_id}:${other_gig_id}:${venue_id}`

## Service Location

All conflict detection logic is in `src/services/conflictDetection.service.ts`.

Re-exported from `src/services/gig.service.ts` for convenience, including `checkVenueConflicts` as a legacy alias for `checkParticipantConflicts`.

## Constants

| Constant | Value | Purpose |
|---|---|---|
| `WARNING_BUFFER_MS` | 4 hours (14,400,000 ms) | Proximity threshold for warnings |
| `DAY_MS` | 24 hours (86,400,000 ms) | Used in query widening for date-only gigs |
| `PARTICIPANT_CONFLICT_ROLES` | `['Venue', 'Act']` | Organization roles that trigger participant conflicts |
