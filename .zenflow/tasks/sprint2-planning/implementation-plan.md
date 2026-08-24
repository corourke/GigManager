# Sprint 2 Implementation Plan

**Sprint**: 2 — Multi-Act Scheduling + Staff Mobile Dashboard
**Status**: Draft — pending Cameron's review
**Date**: 2026-06-15
**Companion**: [PRD](./PRD.md) | [Technical Spec](./spec.md)

---

## Ordering Rationale

Multi-act scheduling is done first because the staff dashboard benefits from showing schedule entries on the gig cards. The two features are otherwise independent — if needed, they can be parallelized across branches.

Within each feature, the order is: data model → service → desktop UI → mobile UI → tests.

---

## Phase A: Multi-Act Scheduling

### Step A1: Database Migration

**Complexity**: Low
**Dependencies**: None
**Files**:
- `supabase/migrations/YYYYMMDDHHMMSS_add_gig_schedule_entries.sql`

**Work**:
1. Create `schedule_activity_type` enum with 7 values
2. Create `gig_schedule_entries` table with all columns and constraints
3. Create indexes on `gig_id` and `act_participant_id`
4. Enable RLS and create select/modify policies (matching `gig_staff_slots` pattern)

**STOP GATE**: Ask Cameron to apply migration to dev database. Wait for confirmation. Then regenerate types:
```bash
supabase gen types typescript --linked > src/utils/supabase/database.types.ts
```

---

### Step A2: TypeScript Types and Constants

**Complexity**: Low
**Dependencies**: Step A1 (types regenerated)
**Files**:
- `src/utils/supabase/types.tsx` — add `DbGigScheduleEntry`, `ScheduleActivityType`, `GigScheduleEntry` types; extend `Gig` interface
- `src/utils/supabase/constants.ts` — add `SCHEDULE_ACTIVITY_TYPES` array and `SCHEDULE_ACTIVITY_CONFIG` map

**Work**:
1. Add type aliases from generated database types
2. Add enriched `GigScheduleEntry` interface with act participant join
3. Add `schedule_entries?: GigScheduleEntry[]` to `Gig` interface
4. Add activity type constants and display config (icon, color, label)

---

### Step A3: Service Layer

**Complexity**: Medium
**Dependencies**: Step A2
**Files**:
- `src/services/gigSchedule.service.ts` (new)
- `src/services/gig.service.ts` (modify)

**Work**:
1. Create `gigSchedule.service.ts` with:
   - `getGigScheduleEntries(gigId)` — fetch with act participant + org join
   - `updateGigScheduleEntries(gigId, entries[])` — full-replace CRUD (match `updateGigStaffSlots` pattern)
   - `duplicateGigScheduleEntries(sourceGigId, targetGigId, participantIdMap)` — clone with remapped act references
2. Modify `gig.service.ts`:
   - `getGig()` — add schedule entries to the nested select query
   - `updateGig()` — call `updateGigScheduleEntries()` when `schedule_entries` is in payload
   - `duplicateGig()` — build participant ID map, call `duplicateGigScheduleEntries()`
   - Re-export schedule functions for backward compatibility

---

### Step A4: Conflict Detection Utility

**Complexity**: Low
**Dependencies**: Step A2
**Files**:
- `src/utils/scheduleConflicts.ts` (new)
- `src/utils/scheduleConflicts.test.ts` (new)

**Work**:
1. Implement `detectScheduleConflicts(entries)` — returns array of `{entryA, entryB, type: 'act-overlap'}` for same-act time overlaps
2. Write unit tests:
   - No conflicts when entries don't overlap
   - Detects overlap for same act
   - No false positive for different acts at same time
   - Edge case: adjacent entries (end === start) are not conflicts
   - Entries without act_participant_id are excluded from act-overlap detection

---

### Step A5: Desktop Schedule Timeline (Read-Only)

**Complexity**: Medium
**Dependencies**: Step A3
**Files**:
- `src/components/gig/GigScheduleTimeline.tsx` (new)
- `src/components/GigDetailScreen.tsx` (modify)

**Work**:
1. Build `GigScheduleTimeline` component:
   - Accepts `entries: GigScheduleEntry[]` and `conflicts?: ScheduleConflict[]`
   - Vertical timeline layout: time on left, colored activity card on right
   - Activity type icon + badge (from `SCHEDULE_ACTIVITY_CONFIG`)
   - Act name display (from joined participant data)
   - Overlap warning border/icon for conflicting entries
   - Empty state: "No schedule entries" message
2. Add to `GigDetailScreen.tsx`:
   - New section between participants and staff slots
   - Section header: "Schedule" with entry count
   - Render `<GigScheduleTimeline entries={gig.schedule_entries} />`

---

### Step A6: Desktop Schedule Editor

**Complexity**: High
**Dependencies**: Step A5
**Files**:
- `src/components/gig/GigScheduleEditor.tsx` (new)
- `src/components/GigScreen.tsx` (modify)

**Work**:
1. Build `GigScheduleEditor` component:
   - List of entry rows, each with:
     - Activity type select (dropdown of `SCHEDULE_ACTIVITY_TYPES`)
     - Start time input (datetime-local or time picker)
     - End time input
     - Act selector (dropdown filtered to gig's participants with role "Act")
     - Label input (optional text)
     - Notes input (optional text)
     - Remove button
   - "Add Entry" button at bottom
   - Inline conflict warnings (from `detectScheduleConflicts`)
   - Entries sorted by sort_order, then start_time
2. Integrate into `GigScreen.tsx`:
   - Add schedule entries to the gig editor form state
   - Pass current participants (Acts) to the editor for the act dropdown
   - Include schedule entries in the save payload to `updateGig()`

---

### Step A7: Mobile Schedule Display

**Complexity**: Low–Medium
**Dependencies**: Step A3
**Files**:
- `src/components/mobile/MobileGigDetail.tsx` (modify)

**Work**:
1. Add a collapsible "Schedule" section (use the same accordion pattern as Participants/Staff/Financials sections)
2. Render a compact vertical timeline:
   - Time range (formatted for mobile: "6:00 PM – 7:30 PM")
   - Activity type badge
   - Act name (if linked)
   - Compact — no notes display on mobile read view (expandable if needed)
3. In edit mode (Admin/Manager): allow adding/editing/removing schedule entries via an inline form or bottom sheet

---

### Step A8: Gig Duplication Integration

**Complexity**: Low
**Dependencies**: Step A3
**Files**:
- `src/services/gig.service.ts` (already modified in A3 — verify duplication works end-to-end)

**Work**:
1. Verify `duplicateGig()` correctly:
   - Copies all schedule entries from source gig
   - Remaps `act_participant_id` references to the new gig's participants
   - Adjusts timestamps if the duplicate gig has different dates (offset by the date difference)
2. Manual test: duplicate a gig with schedule entries, verify they appear correctly on the copy

---

## Phase B: Staff Mobile Dashboard

### Step B1: Staff Dashboard Data Service

**Complexity**: Medium
**Dependencies**: None (can start in parallel with Phase A)
**Files**:
- `src/services/mobile/staffDashboard.service.ts` (new)

**Work**:
1. Implement `fetchMyUpcomingAssignments()`:
   - Query `gig_staff_assignments` joined through `gig_staff_slots` to `gigs`
   - Join `staff_roles` for role name
   - Left-join `gig_participants` (role='Venue') + `organizations` for venue info
   - Filter: user_id = current user, gig.start in [-24h, +7d], gig.status not Cancelled/Settled, assignment.status != Declined
   - Order by gig.start ASC
   - Return `StaffDashboardGig[]` (see spec for shape)
2. Add IDB caching:
   - Extend `src/utils/idb/store.ts` — add `staff_assignments` object store
   - Bump IDB version in the upgrade handler
   - Add `putStaffAssignments()` and `getStaffAssignments()` functions

---

### Step B2: Routing and Landing Redirect

**Complexity**: Low
**Dependencies**: None
**Files**:
- `src/routes/guards.tsx` (modify)
- `src/routes/screens.tsx` (modify)

**Work**:
1. Update `LandingRedirect` in guards.tsx:
   - Mobile + Staff role → `/dashboard`
   - Mobile + Admin/Manager/Viewer → `/gigs` (unchanged)
2. Update `DashboardRoute` in screens.tsx:
   - Remove the blanket `if (isMobile) return <Navigate to="/gigs" replace />`
   - Render `MobileShell` + `MobileDashboard` on mobile
   - Desktop behavior unchanged
3. Update `MobileShell` and `MobileLayout`:
   - Handle `mobile-dashboard` navigation route
   - Thread `userRole` to `MobileLayout` for conditional nav items

---

### Step B3: Bottom Navigation Update

**Complexity**: Low
**Dependencies**: Step B2
**Files**:
- `src/components/mobile/MobileLayout.tsx` (modify)
- `src/routes/screens.tsx` (modify — MobileShell)

**Work**:
1. Add `userRole` prop to `MobileLayout`
2. Conditionally render nav items based on role:
   - Staff: Dashboard, Scanning, Settings
   - Others: Gigs, Scanning, Settings
3. Add `mobile-dashboard` → `/dashboard` mapping in `MobileShell.onNavigate`
4. Import `LayoutDashboard` icon from lucide-react for the Dashboard nav item

---

### Step B4: Refactor MobileDashboard Component

**Complexity**: High
**Dependencies**: Steps B1, B2
**Files**:
- `src/components/mobile/MobileDashboard.tsx` (major refactor)

**Work**:
1. Replace data source:
   - Remove `packingListService.fetchUpcomingGigs()` calls
   - Use `staffDashboardService.fetchMyUpcomingAssignments()`
   - Cache/restore from IDB `staff_assignments` store
2. Update the header:
   - Title: "My Schedule" (instead of "Gigs")
   - Subtitle: "Next 7 days"
3. Redesign `GigCard` sub-component to `AssignmentCard`:
   - Show assignment-specific info: role name, assignment status badge
   - Confirm/Decline buttons (visible when status is Open, Invited, or Requested)
   - Venue directions and call buttons (existing)
   - "View Details" button → navigate to gig detail
4. Implement Confirm/Decline:
   - Call `updateStaffAssignmentStatus(assignmentId, 'Confirmed', new Date().toISOString())` or `'Declined'`
   - Optimistic UI update
   - Toast feedback
   - Error handling with rollback
5. Offline handling:
   - Show cached assignments when offline
   - Queue Confirm/Decline mutations in sync outbox when offline
   - Show "pending sync" badge on affected cards

---

### Step B5: Integration Testing and Polish

**Complexity**: Low–Medium
**Dependencies**: Steps B3, B4, and ideally Phase A complete

**Work**:
1. Write unit test for landing redirect logic (guards.test.ts):
   - Mobile + Staff → `/dashboard`
   - Mobile + Admin → `/gigs`
   - Desktop + Admin → `/dashboard`
   - Desktop + Viewer → `/gigs`
2. Manual testing per the checklist in spec.md
3. Polish:
   - Loading skeleton for dashboard cards
   - Empty state: "No upcoming assignments" with illustration
   - Error state with retry
   - Verify scroll behavior and safe area insets on iOS
   - Verify bottom nav active state highlights correctly for `/dashboard`

---

## Dependency Graph

```
A1 (migration)
 └─ A2 (types/constants)
     ├─ A3 (service layer)
     │   ├─ A5 (desktop timeline)
     │   │   └─ A6 (desktop editor)
     │   ├─ A7 (mobile schedule display)
     │   └─ A8 (duplication integration)
     └─ A4 (conflict detection)

B1 (dashboard service) ──────────────┐
B2 (routing) ─────────────────────── ├─ B4 (MobileDashboard refactor)
B3 (bottom nav) ──── depends on B2   │   └─ B5 (testing/polish)
                                     │
Phase A (optional) ──────────────────┘ (schedule entries on dashboard cards)
```

**Parallelizable work:**
- Phase A and Phase B (Steps B1, B2, B3) can proceed in parallel
- A4 (conflict detection) and A3 (service layer) can proceed in parallel
- A5 and A7 can proceed in parallel after A3

---

## Complexity Estimates

| Step | Effort | Risk |
|---|---|---|
| A1: Migration | 1h | Low — straightforward DDL, well-established pattern |
| A2: Types & constants | 30min | Low |
| A3: Service layer | 3h | Medium — full-replace pattern has edge cases around participant ID remapping |
| A4: Conflict detection | 1h | Low |
| A5: Desktop timeline | 3h | Low — read-only display |
| A6: Desktop editor | 5h | Medium–High — form state management with dynamic rows, time pickers, and act selectors |
| A7: Mobile schedule display | 2h | Low |
| A8: Duplication integration | 1h | Low — mostly verifying existing duplication flow |
| B1: Dashboard service | 3h | Medium — complex join query; IDB schema version bump |
| B2: Routing changes | 1h | Low — small targeted changes |
| B3: Bottom nav | 1h | Low |
| B4: MobileDashboard refactor | 4h | Medium — component redesign with assignment actions |
| B5: Testing & polish | 3h | Low |
| **Total** | **~28h** | |

---

## Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| IDB version bump breaks existing cached data | Users lose cached gigs/packing lists | Wrap upgrade handler carefully; test with existing data in IDB before migration |
| `act_participant_id` becomes stale if participant is removed | Schedule entry loses its act link | `ON DELETE SET NULL` in FK — UI shows the entry without an act label; acceptable degradation |
| Time picker UX on mobile is awkward | Poor editing experience | Defer mobile schedule editing to v2 if time picker interactions are bad; keep mobile read-only |
| Staff users expect to see schedule on dashboard cards | Dashboard feels incomplete without schedule | Phase A is ordered first so schedule entries are available when dashboard ships |
| RLS policy for schedule entries is too permissive/restrictive | Data access errors | Copy the proven `gig_staff_slots` RLS pattern exactly; test with Staff and Admin roles |

---

## Deliverables Checklist

- [ ] Migration applied to dev database
- [ ] Types regenerated and committed
- [ ] `gigSchedule.service.ts` complete with tests
- [ ] `scheduleConflicts.ts` complete with tests
- [ ] `GigScheduleTimeline.tsx` rendering on desktop gig detail
- [ ] `GigScheduleEditor.tsx` working in desktop gig editor
- [ ] Mobile gig detail shows schedule section
- [ ] Gig duplication includes schedule entries
- [ ] `staffDashboard.service.ts` complete
- [ ] IDB schema upgraded with `staff_assignments` store
- [ ] Mobile landing redirect routes Staff to `/dashboard`
- [ ] Bottom nav is role-conditional
- [ ] MobileDashboard shows assignments with Confirm/Decline
- [ ] Offline caching and sync for dashboard
- [ ] Manual testing checklist passed
