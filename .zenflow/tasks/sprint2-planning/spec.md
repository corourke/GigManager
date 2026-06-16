# Sprint 2 Technical Specification

**Sprint**: 2 — Multi-Act Scheduling + Staff Mobile Dashboard
**Status**: Draft — pending Cameron's review
**Date**: 2026-06-15
**Companion**: [PRD](./PRD.md) | [Implementation Plan](./implementation-plan.md)

---

## 1. Multi-Act Scheduling

### 1.1 Data Model: `gig_schedule_entries`

New table following existing patterns (UUID PKs, timestamptz, org-scoped RLS).

```sql
CREATE TYPE schedule_activity_type AS ENUM (
  'Load-In',
  'Soundcheck',
  'Rehearsal',
  'Set',
  'Intermission',
  'Load-Out',
  'Other'
);

CREATE TABLE gig_schedule_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id        UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  activity_type schedule_activity_type NOT NULL,
  label         TEXT,                                    -- optional custom label (e.g. "Headliner Set")
  start_time    TIMESTAMPTZ NOT NULL,
  end_time      TIMESTAMPTZ NOT NULL,
  act_participant_id UUID REFERENCES gig_participants(id) ON DELETE SET NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT schedule_entry_time_order CHECK (end_time > start_time)
);

CREATE INDEX idx_schedule_entries_gig ON gig_schedule_entries(gig_id);
CREATE INDEX idx_schedule_entries_act ON gig_schedule_entries(act_participant_id);
```

**Design decisions:**
- `act_participant_id` references `gig_participants(id)` (not `organizations.id`) so the link is scoped to this specific gig's participant roster. `ON DELETE SET NULL` keeps the entry if the act is removed from the gig.
- `label` is optional free text — if null, the UI displays the `activity_type` name. This allows "Opening Set" vs "Headliner Set" without needing custom enum values.
- `sort_order` enables manual reordering independent of time sorting.
- `schedule_activity_type` is a Postgres enum for consistency. The `Other` value plus the `label` field handles edge cases.
- No `organization_id` column — RLS derives access through the parent `gig_id` → `gig_participants` → `organization_members` chain, matching the pattern used by `gig_staff_slots` and `gig_kit_assignments`.

**Hierarchy compatibility notes** (see [PRD §6](./PRD.md#6-relationship-to-gig-hierarchy-sprint-4) for full analysis):
- The table is keyed on `gig_id` with no hierarchy-awareness. Each gig — whether root, child, or flat — owns its own schedule independently. This is deliberate: schedule entries describe what happens *during* a specific gig, not what a parent event's structure looks like.
- `act_participant_id` FK targets `gig_participants(id)`, not `organizations(id)`. In a hierarchy, a child gig's participants may be inherited (via the planned `get_effective_participants` RPC), but each child will have its own `gig_participants` rows to reference. The FK stays valid regardless of how the participant got there (direct or inherited).
- The RLS policy joins through `gig_participants` → `organization_members`. When Sprint 4 adds inherited participants, the join chain still works because `gig_participants` will contain rows for both direct and inherited participants at query time (the `get_effective_participants` function materializes them). No RLS changes needed.
- No recursive CTE or `parent_gig_id` join exists in this table's queries. Sprint 4's hierarchy features (tree traversal, inherited participants/equipment, aggregate financial rollups) operate on the `gigs` table and its existing children tables — `gig_schedule_entries` is just another child table that happens to work.

### 1.2 Row-Level Security

Follows the same pattern as `gig_staff_slots`:

```sql
ALTER TABLE gig_schedule_entries ENABLE ROW LEVEL SECURITY;

-- Read: any member of a participant org
CREATE POLICY "schedule_entries_select"
  ON gig_schedule_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM gig_participants gp
      JOIN organization_members om ON om.organization_id = gp.organization_id
      WHERE gp.gig_id = gig_schedule_entries.gig_id
        AND om.user_id = auth.uid()
    )
  );

-- Insert/Update/Delete: Admin or Manager of a participant org
CREATE POLICY "schedule_entries_modify"
  ON gig_schedule_entries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM gig_participants gp
      JOIN organization_members om ON om.organization_id = gp.organization_id
      WHERE gp.gig_id = gig_schedule_entries.gig_id
        AND om.user_id = auth.uid()
        AND om.role IN ('Admin', 'Manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM gig_participants gp
      JOIN organization_members om ON om.organization_id = gp.organization_id
      WHERE gp.gig_id = gig_schedule_entries.gig_id
        AND om.user_id = auth.uid()
        AND om.role IN ('Admin', 'Manager')
    )
  );
```

### 1.3 TypeScript Types

Add to `src/utils/supabase/types.tsx`:

```typescript
export type DbGigScheduleEntry = Tables['gig_schedule_entries']['Row'];
export type ScheduleActivityType = Database['public']['Enums']['schedule_activity_type'];
```

Add enriched type:

```typescript
export interface GigScheduleEntry extends DbGigScheduleEntry {
  act_participant?: {
    id: string;
    organization?: Partial<Organization>;
    role: string;
  };
}
```

Extend the existing `Gig` interface:

```typescript
interface Gig extends Partial<DbGig> {
  // ... existing fields ...
  schedule_entries?: GigScheduleEntry[];
}
```

### 1.4 Constants

Add to `src/utils/supabase/constants.ts`:

```typescript
export const SCHEDULE_ACTIVITY_TYPES = [
  'Load-In',
  'Soundcheck',
  'Rehearsal',
  'Set',
  'Intermission',
  'Load-Out',
  'Other',
] as const;

export const SCHEDULE_ACTIVITY_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  'Load-In':      { label: 'Load-In',      icon: 'Truck',       color: 'bg-orange-100 text-orange-700' },
  'Soundcheck':   { label: 'Soundcheck',   icon: 'Volume2',     color: 'bg-blue-100 text-blue-700' },
  'Rehearsal':    { label: 'Rehearsal',     icon: 'Music',       color: 'bg-purple-100 text-purple-700' },
  'Set':          { label: 'Set',           icon: 'Mic2',        color: 'bg-green-100 text-green-700' },
  'Intermission': { label: 'Intermission',  icon: 'Coffee',      color: 'bg-amber-100 text-amber-700' },
  'Load-Out':     { label: 'Load-Out',      icon: 'TruckIcon',   color: 'bg-orange-100 text-orange-700' },
  'Other':        { label: 'Other',         icon: 'MoreHorizontal', color: 'bg-gray-100 text-gray-700' },
};
```

### 1.5 Service Layer: `gigSchedule.service.ts`

New file `src/services/gigSchedule.service.ts` following the modular pattern from the Phase 7 split:

```typescript
// Key functions:
getGigScheduleEntries(gigId: string): Promise<GigScheduleEntry[]>
updateGigScheduleEntries(gigId: string, entries: Partial<GigScheduleEntry>[]): Promise<void>
duplicateGigScheduleEntries(sourceGigId: string, targetGigId: string, participantIdMap: Map<string, string>): Promise<void>
```

**`getGigScheduleEntries`**: Fetches entries with joined act participant data. Called by `getGig()` to include `schedule_entries` in the gig payload.

**`updateGigScheduleEntries`**: Full-replace pattern matching `updateGigStaffSlots` — entries with existing IDs are updated, entries without IDs are inserted, entries in the DB but not in the payload are deleted. Wrapped in a single transaction.

**`duplicateGigScheduleEntries`**: Used by `duplicateGig()`. Accepts a map from old participant IDs to new participant IDs so act references are remapped correctly.

### 1.6 Integration with `gig.service.ts`

- `getGig()`: Add a nested select for `gig_schedule_entries` with act participant join, ordered by `sort_order, start_time`.
- `updateGig()`: If `schedule_entries` is present in the update payload, call `updateGigScheduleEntries()`.
- `duplicateGig()`: After duplicating participants, build a participant ID map and call `duplicateGigScheduleEntries()`.
- Re-export `getGigScheduleEntries` and `updateGigScheduleEntries` from `gig.service.ts` for backward compatibility.

### 1.7 Server Route Changes

The Hono server currently handles gig CRUD at the REST level. Two options:

**Option A (Recommended):** No server route changes. Schedule entries are fetched and mutated via the Supabase client directly (same pattern as `gig_staff_slots`, `gig_kit_assignments`, and `gig_financials` — none of these have dedicated server endpoints). RLS handles authorization.

**Option B:** Add `/gigs/:id/schedule` endpoints. This is unnecessary for v1 since there's no cross-org data aggregation needed for schedule entries.

### 1.8 Desktop UI Components

**`src/components/gig/GigScheduleTimeline.tsx`** — Read-only timeline visualization:
- Vertical timeline layout with time markers on the left
- Each entry rendered as a colored card (color per activity type)
- Shows: activity type badge, label (or activity type name), time range, act name, notes
- Overlap warning indicators (orange border + icon) for same-act conflicts
- Responsive — used in both GigDetailScreen and GigScreen

**`src/components/gig/GigScheduleEditor.tsx`** — Edit mode schedule builder:
- List of editable entry rows
- Each row: activity type dropdown, start time picker, end time picker, act selector (filtered to gig's Act participants), label input, notes input
- Add/remove entry buttons
- Drag handle for reordering (optional — can defer to v2)
- Overlap validation with inline warnings

**Integration points:**
- `GigDetailScreen.tsx`: Add `<GigScheduleTimeline entries={gig.schedule_entries} />` section between participants and staff slots.
- `GigScreen.tsx` (editor): Add `<GigScheduleEditor>` in edit mode, with state managed alongside existing gig form state.

### 1.9 Mobile UI

**In `MobileGigDetail.tsx`**: Add a collapsible "Schedule" section (matching the collapsible pattern used for Participants, Staff, Financials):
- Read-only vertical timeline
- Each entry: time range, activity type badge, act name, notes
- Collapsed by default, expands on tap
- In edit mode (for Admin/Manager): allow add/edit/delete of entries using a bottom-sheet or inline form

### 1.10 Conflict Detection

Client-side only for v1. Implemented as a pure function in a utility:

```typescript
// src/utils/scheduleConflicts.ts
interface ScheduleConflict {
  entryA: GigScheduleEntry;
  entryB: GigScheduleEntry;
  type: 'act-overlap';
}

function detectScheduleConflicts(entries: GigScheduleEntry[]): ScheduleConflict[]
```

Logic: For entries sharing the same `act_participant_id` (non-null), check if time ranges overlap. O(n^2) is fine — a gig rarely has more than 20 schedule entries.

### 1.11 Gig Hierarchy Interaction

This section documents how Sprint 2 design decisions relate to the Sprint 4 Hierarchical Gig Structure ([05_hierarchy-foundations](../../../docs/product/development-plan/05_hierarchy-foundations.md), [06_hierarchy-ui](../../../docs/product/development-plan/06_hierarchy-ui.md)).

#### Current state of hierarchy infrastructure

The `gigs` table already has `parent_gig_id` (UUID FK to self, `ON DELETE CASCADE`) and `hierarchy_depth` (integer, default 0) in the initial schema. The `create_gig_complex` RPC passes these through. However:
- No SQL functions are deployed (`get_gig_hierarchy`, `get_effective_participants`, `get_effective_kits` exist only in the spec doc, not in any migration).
- No UI exposes parent gig selection or hierarchy tree navigation.
- No service-layer code reads or writes `parent_gig_id` beyond passing it through `createGig`.

#### What Sprint 2 does NOT touch

- `parent_gig_id` and `hierarchy_depth` columns — left as-is.
- No recursive CTE functions are created or invoked.
- No hierarchy-aware UI is introduced.
- The `GigScheduleTimeline` and `GigScheduleEditor` components only render entries for a single `gig_id` — they have no concept of parent or child gigs.

#### Forward-compatibility constraints and decisions

| Decision | Rationale | Sprint 4 implication |
|---|---|---|
| `gig_schedule_entries.gig_id` is a simple FK, not hierarchy-aware | Schedules are per-gig, not inherited down a tree | Sprint 4 does not need to add schedule inheritance. A child gig has its own schedule entries. |
| `act_participant_id` → `gig_participants(id)` | Scoped to the specific gig's participant roster | When `get_effective_participants` materializes inherited participants as `gig_participants` rows, the FK works transparently. If inherited participants are instead returned only by the RPC (not persisted), the UI will need to resolve act names via the RPC rather than the FK join — this is a Sprint 4 design decision. |
| `detectScheduleConflicts` is per-gig only | Single-gig overlap check; cross-gig conflicts are a hierarchy concern | Sprint 4 should add a `detectCrossGigScheduleConflicts(gigIds[])` function for same-act conflicts across sibling gigs (e.g., band double-booked on two stages). The per-gig function remains useful as-is. |
| `GigScheduleTimeline` accepts `entries[]` with no gig context | Pure display component | Sprint 4 can reuse it inside an aggregate timeline view — pass merged entries from multiple child gigs with a `gig_title` annotation. The component itself doesn't need to know about hierarchy. |
| Schedule duplication uses a `participantIdMap` | Required because duplicated gigs get new participant IDs | Sprint 4's "create child from template" pattern can reuse `duplicateGigScheduleEntries` with the same map approach. |

#### What Sprint 4 will add (not Sprint 2's responsibility)

1. **Aggregate timeline view**: A `GigHierarchyTimeline` that calls `get_gig_hierarchy(rootId)`, fetches schedule entries for all child gigs, and renders a merged multi-track timeline (one track per child gig or stage).
2. **Cross-gig conflict detection**: Check if the same act org has overlapping schedule entries across sibling gigs in the same hierarchy branch.
3. **Schedule template propagation**: Optionally copy a parent's schedule template to new child gigs (convenience, not inheritance — children can then diverge).

---

## 2. Staff Mobile Dashboard

### 2.1 Data Fetching: Staff Assignments Query

The existing `MobileDashboard.tsx` uses `packingListService.fetchUpcomingGigs()` which fetches gigs by organization participation. For the staff dashboard, we need a **user-scoped** query: gigs where the current user has a staff assignment.

New service function in `src/services/mobile/staffDashboard.service.ts`:

```typescript
async function fetchMyUpcomingAssignments(): Promise<StaffDashboardGig[]> {
  // Query: gig_staff_assignments
  //   JOIN gig_staff_slots ON slot_id
  //   JOIN gigs ON gig_staff_slots.gig_id
  //   JOIN staff_roles ON gig_staff_slots.staff_role_id
  //   LEFT JOIN gig_participants (role='Venue') for venue info
  // WHERE:
  //   gig_staff_assignments.user_id = auth.uid()
  //   gig.start >= now() - interval '24 hours'
  //   gig.start <= now() + interval '7 days'
  //   gig.status NOT IN ('Cancelled', 'Settled')
  //   gig_staff_assignments.status != 'Declined'
  // ORDER BY gig.start ASC
}
```

Return type:

```typescript
interface StaffDashboardGig {
  gig: {
    id: string;
    title: string;
    start: string;
    end: string;
    timezone: string;
    status: GigStatus;
  };
  assignment: {
    id: string;
    status: string;
    rate: number | null;
    fee: number | null;
    confirmed_at: string | null;
  };
  role_name: string;
  venue?: {
    name: string;
    address_line1?: string;
    phone_number?: string;
  };
  schedule_entries?: GigScheduleEntry[];  // if multi-act scheduling is done first
}
```

### 2.2 IndexedDB Caching

Extend `src/utils/idb/store.ts` with a new object store:

```typescript
// New store: 'staff_assignments'
putStaffAssignments(assignments: StaffDashboardGig[]): Promise<void>
getStaffAssignments(): Promise<StaffDashboardGig[]>
```

This requires bumping the IDB database version and adding the store in the upgrade handler. Follow the existing pattern used for `gigs` and `packing_lists` stores.

### 2.3 Routing Changes

**`src/routes/guards.tsx` — `LandingRedirect`:**

```typescript
// Current:
if (isMobile) return <Navigate to="/gigs" replace />;
if (userRole === 'Viewer') return <Navigate to="/gigs" replace />;
return <Navigate to="/dashboard" replace />;

// New:
if (isMobile) {
  if (userRole === 'Staff') return <Navigate to="/dashboard" replace />;
  return <Navigate to="/gigs" replace />;
}
if (userRole === 'Viewer') return <Navigate to="/gigs" replace />;
return <Navigate to="/dashboard" replace />;
```

**`src/routes/screens.tsx` — `DashboardRoute`:**

```typescript
// Current:
if (isMobile) return <Navigate to="/gigs" replace />;

// New:
if (isMobile) {
  return (
    <MobileShell active="mobile-dashboard">
      <MobileDashboard
        onViewGig={(id) => nav.navigate(`/inventory?gig=${id}`)}
        onViewGigDetail={(id) => nav.viewGig(id)}
        onViewAllGigs={() => nav.navigate('/gigs')}
      />
    </MobileShell>
  );
}
```

### 2.4 MobileLayout Bottom Nav Changes

The bottom nav currently has 3 items: Gigs, Scanning, Settings. The approach depends on role:

**Recommended approach — role-conditional nav:**

```typescript
// In MobileLayout.tsx, accept userRole as a prop
const navItems = userRole === 'Staff'
  ? [
      { id: 'mobile-dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'mobile-inventory', label: 'Scanning', icon: Barcode },
      { id: 'mobile-settings', label: 'Settings', icon: Settings },
    ]
  : [
      { id: 'mobile-gig-list', label: 'Gigs', icon: List },
      { id: 'mobile-inventory', label: 'Scanning', icon: Barcode },
      { id: 'mobile-settings', label: 'Settings', icon: Settings },
    ];
```

Staff who need the full gig list can access it via the "View All Gigs" button on the dashboard. Admin/Manager users keep their current nav.

The `MobileShell` wrapper and `MobileLayout` need `userRole` threaded through. `MobileShell` already has access to `useAuth()` indirectly — `MobileLayout` needs the prop added.

**Navigation handler in MobileShell:**

```typescript
if (route === 'mobile-dashboard') navigate('/dashboard');
```

### 2.5 MobileDashboard Component Refactor

The existing `MobileDashboard.tsx` needs significant changes:

**Current state:** Fetches upcoming gigs via `packingListService.fetchUpcomingGigs()` — this returns gigs by organization, not by user assignment.

**New behavior:**
1. Fetch via `staffDashboardService.fetchMyUpcomingAssignments()` instead.
2. Each card shows the user's assignment info (role, status, confirm/decline buttons).
3. Confirm/Decline buttons call `updateStaffAssignmentStatus()` (already exists in gig.service.ts).
4. After action, optimistically update the card's assignment status.
5. Maintain offline cache in IDB.

**Card layout per assignment:**

```
┌─────────────────────────────────────┐
│  Fri, Jun 20 • 6:00 PM             │
│  Summer Music Festival       Booked │
│  Role: Sound Engineer    Confirmed ✓│
│                                     │
│  📍 The Amphitheater                │
│                                     │
│  [Directions]  [Call]               │
│  [  Confirm  ] [Decline]  ← if actionable
│  [     View Gig Details    →]       │
└─────────────────────────────────────┘
```

### 2.6 Staff Assignment Status Update

The function `updateStaffAssignmentStatus` already exists and is used by `MobileGigDetail.tsx`:

```typescript
// From gig.service.ts (re-exported from gigStaff.service.ts)
export async function updateStaffAssignmentStatus(
  assignmentId: string,
  status: string,
  confirmedAt?: string | null
): Promise<void>
```

The dashboard will call this same function. No new API endpoint needed.

### 2.7 Offline Sync for Assignment Actions

When offline, Confirm/Decline actions should be queued in the sync outbox (the existing `pending_sync` IDB store). The existing sync infrastructure handles POST/PATCH replay. The dashboard should:

1. Optimistically update the local card state.
2. Queue the mutation in IDB.
3. Show a "pending sync" indicator on the card.
4. On reconnect, the sync worker replays the update.

This is the same pattern used by inventory tracking in MobileInventoryMode.

---

## 3. Migration Plan

### 3.1 New Migration File

Single migration file: `supabase/migrations/YYYYMMDDHHMMSS_add_gig_schedule_entries.sql`

Contents:
1. Create `schedule_activity_type` enum
2. Create `gig_schedule_entries` table
3. Create indexes
4. Enable RLS
5. Create select and modify policies

### 3.2 Type Generation

After migration is applied:
```bash
supabase gen types typescript --linked > src/utils/supabase/database.types.ts
```

### 3.3 IDB Schema Version Bump

The IndexedDB database version needs to be incremented to add the `staff_assignments` object store. This happens in the `idb` open/upgrade handler in `src/utils/idb/store.ts`.

---

## 4. Testing Strategy

### 4.1 Unit Tests

| Test | Location |
|---|---|
| Schedule conflict detection | `src/utils/scheduleConflicts.test.ts` |
| Schedule entry validation (end > start) | `src/utils/scheduleConflicts.test.ts` |
| Landing redirect logic by role | `src/routes/guards.test.ts` |

### 4.2 Integration Tests

| Test | What it verifies |
|---|---|
| Schedule CRUD via Supabase client | RLS enforcement: Staff can read but not write schedule entries |
| Staff assignment query | Returns only the current user's assignments within the time window |

### 4.3 Manual Testing Checklist

**Multi-act scheduling:**
- [ ] Create a gig with 3 acts, add schedule entries for each
- [ ] Verify timeline renders correctly on desktop detail view
- [ ] Verify timeline renders on mobile gig detail (collapsed, expand to see)
- [ ] Edit schedule entries — verify save round-trips correctly
- [ ] Duplicate gig — verify schedule entries are cloned with correct act references
- [ ] Delete an act participant — verify schedule entries keep their data but act reference becomes null
- [ ] Create overlapping entries for the same act — verify conflict warning appears

**Staff mobile dashboard:**
- [ ] Log in as Staff on mobile — verify landing on `/dashboard`
- [ ] Log in as Admin on mobile — verify landing on `/gigs`
- [ ] Verify dashboard shows only assigned gigs for the next 7 days
- [ ] Tap Confirm on an assignment — verify status updates and confirmed_at is set
- [ ] Tap Decline — verify status updates
- [ ] Tap "View All Gigs" — navigates to `/gigs`
- [ ] Tap gig card — navigates to gig detail
- [ ] Tap Directions — opens maps app
- [ ] Go offline — verify cached data displays with offline badge
- [ ] Confirm an assignment while offline — verify it queues and syncs on reconnect
