# Sprint 2 Cross-Review

**Reviewer**: Claude (cross-review, fresh eyes — no context from implementation session)
**Date**: 2026-06-16
**Branch**: `sprint2-implementation` (uncommitted working-tree changes on top of `main`)
**Scope**: All modified and new files in the Sprint 2 implementation

---

## Summary

The implementation covers both spec features (multi-act scheduling + staff mobile dashboard) and is broadly well-executed. The code follows existing codebase patterns, the migration matches the spec exactly, types are correctly generated, and tests pass. There are **3 bugs** (one significant), **2 security/auth gaps**, **1 missing offline sync handler**, and several minor issues.

---

## 1. Spec Compliance

### 1.1 Multi-Act Scheduling — Implemented

| Spec Item | Status | Notes |
|---|---|---|
| A1: Migration (table, indexes, RLS, enum) | **Done** | Matches spec exactly |
| A2: Types and constants | **Done** | `ScheduleActivityType` derived from const array (better than spec's approach) |
| A3: Service layer (CRUD, duplication) | **Done** | Full-replace pattern, duplication with participant ID mapping and date offset |
| A4: Conflict detection | **Done** | Pure function + 6 unit tests (all pass) |
| A5: Desktop timeline (read-only) | **Done** | `GigScheduleTimeline.tsx` with conflict highlighting |
| A6: Desktop editor | **Done** | `GigScheduleEditor.tsx` with auto-save debounce |
| A7: Mobile schedule display | **Done** | Collapsible section in `MobileGigDetail` |
| A8: Gig duplication integration | **Done** | In `duplicateGig()` with participant ID remapping |
| `getGig()` includes schedule entries | **Done** | Nested select with act participant join |
| `updateGig()` handles schedule_entries | **Done** | Delegates to `updateGigScheduleEntries` |

### 1.2 Staff Mobile Dashboard — Implemented

| Spec Item | Status | Notes |
|---|---|---|
| B1: Staff dashboard data service | **Done** | `staffDashboard.service.ts` with assignment query |
| B2: Routing / landing redirect | **Done** | Staff → `/dashboard`, Admin/Manager → `/gigs` |
| B3: Bottom nav update | **Done** | Role-conditional nav items |
| B4: MobileDashboard refactor | **Done** | Assignment cards with Confirm/Decline |
| B5: Tests | **Partial** | Guards tests pass (6 tests); no integration tests for dashboard service |
| IDB caching for assignments | **Done** | New `staff_assignments` store, version bump to 3 |
| Offline Confirm/Decline queueing | **Partial** | Queues to outbox, but **no sync handler registered** (see Bug #3) |

### 1.3 Spec Deviations

1. **Spec says `SCHEDULE_ACTIVITY_CONFIG` uses `TruckIcon` for Load-Out** (section 1.4). Implementation correctly uses `'Truck'` for both Load-In and Load-Out. The spec's `TruckIcon` was a naming error — good fix.

2. **Spec says activity config colors use `bg-X-100 text-X-700`**. Implementation adds `border-X-300` to each — a practical enhancement for badge rendering with `variant="outline"`. Acceptable deviation.

3. **Spec section 2.5 says "Title: 'My Schedule'"**. Implementation matches.

4. **Spec section 2.4 recommends role-conditional nav**. Implementation matches the recommended approach exactly.

---

## 2. Bugs

### Bug #1 (Significant): `DashboardRoute` renders `MobileDashboard` for Viewer role on mobile

**File**: `src/routes/screens.tsx:185-195`

The `DashboardRoute` function now renders `MobileDashboard` for ALL mobile users before the `Viewer` role check:

```tsx
if (isMobile) {
  return (
    <MobileShell active="mobile-dashboard">
      <MobileDashboard ... />
    </MobileShell>
  );
}
// Viewers can't access the dashboard (endpoint excludes them) — send to gigs.
if (userRole === 'Viewer') return <Navigate to="/gigs" replace />;
```

A mobile Viewer who manually navigates to `/dashboard` will see the staff dashboard instead of being redirected to `/gigs`. The `LandingRedirect` guard correctly sends mobile Viewers to `/gigs`, so this only fires if they type the URL directly — low probability but still a bug.

**Fix**: Add a Viewer check before the mobile block, or add `if (userRole === 'Viewer') return <Navigate to="/gigs" replace />;` inside the `if (isMobile)` block.

### Bug #2 (Minor): Conflict detection uses temp IDs that may not match entry IDs

**File**: `src/components/gig/GigScheduleEditor.tsx:152-169`

When building the conflict set for highlighting, new entries without IDs get `crypto.randomUUID()`:

```tsx
.map(e => ({
  ...e,
  id: e.id || crypto.randomUUID(),
  ...
}))
```

Then on line 205:
```tsx
const hasConflict = conflictIds.has(tempId);  // tempId = entry.id || `new-${i}`
```

The `tempId` used for display uses `new-${i}`, but the conflict detection used `crypto.randomUUID()`. These will never match for new (unsaved) entries, so **conflict warnings will not display for entries that haven't been saved yet**.

**Fix**: Use the same ID strategy in both places. Either assign `tempId = entry.id || \`new-${i}\`` in both the conflict builder and the render loop, or assign stable temp IDs to new entries at creation time.

### Bug #3 (Functional): No offline sync handler for `STAFF_ASSIGNMENT_UPDATE`

**File**: `src/services/mobile/offlineSync.service.ts`

`MobileDashboard` queues `STAFF_ASSIGNMENT_UPDATE` items to the outbox when offline (lines 112, 140), and the `OutboxItem` type was correctly extended to include this type. However, **no `registerSyncHandler('STAFF_ASSIGNMENT_UPDATE', ...)` call exists** in `offlineSync.service.ts`.

When the device comes back online, `processOutbox` will call `syncItem`, which will hit:
```tsx
if (!handler) {
  console.warn('Unknown outbox item type:', item.type);
  return;
}
```

The item will be silently discarded (removed from outbox since `syncItem` won't throw), and the Confirm/Decline action will be **lost**. The user will see their optimistic update locally but the server will never receive it.

**Fix**: Register a sync handler:
```tsx
registerSyncHandler('STAFF_ASSIGNMENT_UPDATE', async (payload: any) => {
  await updateStaffAssignmentStatus(payload.assignmentId, payload.status);
});
```

---

## 3. Security & Auth

### 3.1 RLS Policies — Correct

The migration's RLS policies match the `gig_staff_slots` pattern exactly:
- **SELECT**: Any member of any participating organization can read schedule entries.
- **INSERT/UPDATE/DELETE**: Only Admin or Manager of a participating organization.

This is correct. Staff and Viewer members can read but not modify, matching AC-1.6 ("read-only to all users who can view the gig").

One subtlety: the `FOR ALL` policy combines INSERT, UPDATE, DELETE, and SELECT into a single policy with both `USING` and `WITH CHECK`. PostgreSQL evaluates `USING` for SELECT/UPDATE/DELETE and `WITH CHECK` for INSERT/UPDATE. Since both clauses are identical and more restrictive than the SELECT-only policy, the SELECT-only policy takes precedence for reads (Postgres is permissive by default). This is correct behavior.

### 3.2 Gap: `fetchMyUpcomingAssignments` does not filter by organization membership

**File**: `src/services/mobile/staffDashboard.service.ts:40-62`

The query filters by `user_id = auth.uid()` and relies on RLS to restrict results. This is fine — RLS on `gig_staff_assignments` already ensures only the user's own assignments are returned. However, the query does **not** filter by `selectedOrganization`. If a user belongs to multiple organizations, they'll see assignments across all orgs on one dashboard.

**Assessment**: This is actually desirable for a staff member (see all upcoming work regardless of which org context they're in), and matches the PRD's "My Schedule" framing. But it should be a documented decision, not an accident — the spec doesn't address this.

### 3.3 Gap: No authorization check on Confirm/Decline in `MobileDashboard`

The dashboard calls `updateStaffAssignmentStatus(assignmentId, 'Confirmed')` directly. The underlying function updates `gig_staff_assignments` by ID with no server-side check that the authenticated user owns that assignment. Authorization relies entirely on Supabase RLS for the `gig_staff_assignments` table.

**Assessment**: This is fine IF the RLS policy on `gig_staff_assignments` restricts UPDATE to the assignment's own `user_id`. I could not verify this from the diff alone — the `gig_staff_assignments` RLS policies are in an earlier migration. Worth confirming.

---

## 4. Code Quality

### 4.1 N+1 Query in `fetchMyUpcomingAssignments`

**File**: `src/services/mobile/staffDashboard.service.ts:69-103`

The function fetches all assignments in one query, then for each assignment, makes TWO additional queries (venue participant + schedule entries) in a sequential loop:

```tsx
for (const a of assignments) {
  const { data: venueParticipants } = await supabase ...  // query per assignment
  const { data: scheduleEntries } = await supabase ...     // query per assignment
}
```

For a staff member with 5 assignments in the next 7 days, this is 1 + 5 + 5 = 11 queries. The spec's target is "dashboard load time < 1s on 4G" — 11 sequential round-trips could breach that.

**Recommendation**: Batch the venue and schedule queries. After the initial assignment fetch, collect all unique `gig_id`s, then do two batch queries:
```tsx
const gigIds = [...new Set(assignments.map(a => a.slot.gig.id))];
const { data: allVenues } = await supabase.from('gig_participants').select(...).in('gig_id', gigIds).eq('role', 'Venue');
const { data: allSchedule } = await supabase.from('gig_schedule_entries').select(...).in('gig_id', gigIds);
```

### 4.2 Date filtering is client-side, not in the query

**File**: `src/services/mobile/staffDashboard.service.ts:75-76`

The assignment query fetches ALL non-declined assignments for the user, then filters by date range in JavaScript:

```tsx
if (gig.start < past24h || gig.start > plus7d) continue;
if (gig.status === 'Cancelled' || gig.status === 'Settled') continue;
```

This means the query returns the user's entire assignment history. For a long-tenured staff member, this could be hundreds of rows fetched and discarded.

**Recommendation**: Add `.gte('slot.gig.start', past24h)` and `.lte('slot.gig.start', plus7d)` filters to the Supabase query, and `.not('slot.gig.status', 'in', '(Cancelled,Settled)')`. (Note: filtering on nested joins requires the `!inner` modifier, which is already in use.)

### 4.3 `updateGigScheduleEntries` sends N individual queries instead of batching

**File**: `src/services/gigSchedule.service.ts:58-81`

The update function loops through entries individually:

```tsx
for (let i = 0; i < entries.length; i++) {
  if (entry.id && existingIds.includes(entry.id)) {
    await supabase.from(...).update(entryData).eq('id', entry.id);
  } else {
    await supabase.from(...).insert({ gig_id: gigId, ...entryData });
  }
}
```

For a gig with 10 schedule entries, this is 1 (fetch existing) + 1 (delete) + 10 (individual upserts) = 12 queries. The spec's target is "schedule entry CRUD < 500ms per operation."

**Recommendation**: Separate into a batch upsert (collect all entries, use `.upsert()` with `onConflict: 'id'`) and a batch delete. This reduces to 3 queries regardless of entry count.

### 4.4 `GigScheduleEditor` auto-saves on every keystroke (debounced)

**File**: `src/components/gig/GigScheduleEditor.tsx:95-101`

Every field change triggers `debouncedSave` with a 1500ms delay. This means typing a label like "Opening Set" fires a save attempt after 1500ms of idle time, potentially mid-word. Combined with the N individual queries in `updateGigScheduleEntries`, this could generate a lot of server traffic.

**Assessment**: This is a UX choice — auto-save is user-friendly. The 1500ms debounce is reasonable. But the combination of auto-save + N+1 writes means a gig with 10 entries triggers ~12 queries every time the user pauses typing. Consider either increasing the debounce or batching the writes (see 4.3).

### 4.5 `GigScheduleEditor` manages its own data fetching independently from `GigScreen`

The editor calls `getGigScheduleEntries(gigId)` to load its own data (line 86) and `updateGigScheduleEntries` to save, independent of the parent `GigScreen`'s form state. This means:
- The editor doesn't participate in `GigScreen`'s save flow — it saves independently.
- If the user edits schedule entries and also edits gig title, two independent save operations fire.

**Assessment**: This is a pragmatic choice that avoids threading schedule state through the complex `GigScreen` form. It works, but the user may be confused by the "Unsaved" indicator on the schedule section when the rest of the gig saves via a different mechanism. Document this design decision.

---

## 5. Gig Hierarchy Compatibility (Spec Section 1.11)

The implementation **fully honours** the hierarchy compatibility commitments:

| Commitment | Verified |
|---|---|
| `gig_schedule_entries.gig_id` is a simple FK, not hierarchy-aware | **Yes** — migration line 15: `gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE` |
| `act_participant_id` → `gig_participants(id)`, not `organizations(id)` | **Yes** — migration line 20: `REFERENCES gig_participants(id) ON DELETE SET NULL` |
| No `organization_id` on `gig_schedule_entries` | **Yes** — not present in the table definition |
| RLS traverses through `gig_id` → `gig_participants` → `organization_members` | **Yes** — matches exactly |
| `detectScheduleConflicts` is per-gig only | **Yes** — accepts `entries[]` with no gig grouping |
| `GigScheduleTimeline` accepts `entries[]` with no gig context | **Yes** — pure display component |
| Schedule duplication uses a `participantIdMap` | **Yes** — `duplicateGigScheduleEntries` takes `Map<string, string>` |
| `parent_gig_id` and `hierarchy_depth` are untouched | **Yes** — not mentioned anywhere in the diff |
| No recursive CTE functions created | **Yes** |

**No hierarchy compatibility issues found.**

---

## 6. Test Coverage

### 6.1 What's Tested

- **Schedule conflict detection** (`scheduleConflicts.test.ts`): 6 tests covering no-overlap, overlap, different acts, adjacent entries, null act_participant_id, multiple conflicts. All pass.
- **Landing redirect logic** (`guards.test.tsx`): 6 tests covering mobile Staff → dashboard, mobile Admin → gigs, mobile Manager → gigs, desktop Admin → dashboard, desktop Viewer → gigs, desktop Manager → dashboard. All pass.

### 6.2 What's Missing

| Gap | Risk | Priority |
|---|---|---|
| `DashboardRoute` for mobile Viewer (Bug #1) | Low (requires manual URL entry) | Should add a test case |
| `GigScheduleEditor` save/load cycle | Medium — auto-save with debounce is tricky | Unit test with mocked service |
| `MobileDashboard` confirm/decline flow | Medium — optimistic update + rollback | Integration test |
| `fetchMyUpcomingAssignments` query correctness | Medium — complex joins + client-side filtering | Integration test against Supabase |
| `duplicateGigScheduleEntries` participant remapping | Low — straightforward mapping | Unit test |
| `updateGigScheduleEntries` full-replace logic (delete + upsert) | Medium — edge case: all entries deleted | Unit test |
| `GigScheduleTimeline` rendering | Low — pure display | Snapshot test |
| IDB version upgrade path (v2 → v3) | Medium — could lose cached data | Manual test |
| Desktop Viewer / Staff role: `MobileGigDetail` schedule edit mode | Low | N/A — not implemented (read-only on mobile, per spec recommendation) |

### 6.3 Test Quality

The existing tests are well-structured:
- `scheduleConflicts.test.ts` uses a `makeEntry` helper for clean test data construction.
- `guards.test.tsx` properly mocks `useAppShell` and `useAuth`, and uses `MemoryRouter` to capture navigation.
- Edge cases are covered: adjacent entries (end === start), null `act_participant_id`.

One note: `guards.test.tsx` doesn't test the `desktop + Staff` combination. The current code sends desktop Staff to `/dashboard` (same as Admin/Manager), which is correct but untested.

---

## 7. Minor Issues

1. **`GigScheduleEditor` missing `useCallback` deps**: The `loadEntries` function (line 83) is called in a `useEffect` (line 79) but isn't memoized with `useCallback`. Not a bug due to how React closures work here, but ESLint's `react-hooks/exhaustive-deps` rule would flag it.

2. **`GigScheduleTimeline` icon map missing `TruckIcon`**: The `ICON_MAP` (line 17-24) maps string names to Lucide components. The constants use `'Truck'` for both Load-In and Load-Out, which correctly maps to the imported `Truck` component. The spec originally mentioned `TruckIcon` for Load-Out — the implementation correctly uses `Truck` for both (Lucide doesn't export `TruckIcon`).

3. **`database.types.ts` diff appears to be a manual edit**: The generated types include `gig_schedule_entries` table definition. This was likely generated with `supabase gen types typescript --linked` after applying the migration. The implementation plan specifies this as part of step A1's stop gate. It looks correctly generated — no manual edits visible.

4. **IDB upgrade handler fix**: The diff changes `if (oldVersion === 1 && transaction)` to `if (oldVersion < 2 && transaction)`. This is a correctness fix — the original code would skip the v1→v2 migration if the database was created fresh at v2. Not a Sprint 2 issue per se, but a good opportunistic fix.

5. **`MobileDashboard` still accepts `onViewGig` prop**: The component signature includes `onViewGig: (gigId: string) => void` but the new implementation doesn't use it — the "Packing List" button was replaced by "View Gig Details" which uses `onViewGigDetail` instead. The unused prop should be removed from both the component interface and the call site in `DashboardRoute`.

---

## 8. Recommendations Summary

### Must Fix (before merge)

1. **Bug #1**: Add Viewer role guard in `DashboardRoute` for mobile path (`screens.tsx`).
2. **Bug #3**: Register `STAFF_ASSIGNMENT_UPDATE` sync handler in `offlineSync.service.ts`.
3. **Bug #2**: Fix conflict highlighting for unsaved entries in `GigScheduleEditor`.

### Should Fix (before merge or immediately after)

4. Remove unused `onViewGig` prop from `MobileDashboard`.
5. Add a test for `DashboardRoute` with mobile Viewer role.
6. Add a test for desktop + Staff landing redirect.

### Consider (future iteration)

7. Batch the venue + schedule queries in `fetchMyUpcomingAssignments` (N+1 → 3 queries).
8. Move date/status filtering into the Supabase query instead of client-side.
9. Batch the individual upserts in `updateGigScheduleEntries` into a single `.upsert()`.
10. Verify RLS on `gig_staff_assignments` restricts UPDATE to the assignment's `user_id`.

---

## 9. Files Reviewed

### New files
- `supabase/migrations/20260616000000_add_gig_schedule_entries.sql`
- `src/services/gigSchedule.service.ts`
- `src/services/mobile/staffDashboard.service.ts`
- `src/utils/scheduleConflicts.ts`
- `src/utils/scheduleConflicts.test.ts`
- `src/routes/guards.test.tsx`
- `src/components/gig/GigScheduleEditor.tsx`
- `src/components/gig/GigScheduleTimeline.tsx`

### Modified files
- `src/components/GigDetailScreen.tsx`
- `src/components/GigScreen.tsx`
- `src/components/mobile/MobileDashboard.tsx`
- `src/components/mobile/MobileGigDetail.tsx`
- `src/components/mobile/MobileLayout.tsx`
- `src/routes/guards.tsx`
- `src/routes/screens.tsx`
- `src/services/gig.service.ts`
- `src/utils/idb/store.ts`
- `src/utils/supabase/constants.ts`
- `src/utils/supabase/database.types.ts`
- `src/utils/supabase/types.tsx`

### Planning docs (from `sprint2-planning` branch)
- `.zenflow/tasks/sprint2-planning/PRD.md`
- `.zenflow/tasks/sprint2-planning/spec.md`
- `.zenflow/tasks/sprint2-planning/implementation-plan.md`
