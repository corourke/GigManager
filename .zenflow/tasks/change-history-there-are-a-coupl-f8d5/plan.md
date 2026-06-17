# Full SDD workflow

## Configuration
- **Artifacts Path**: {@artifacts_path} → `.zenflow/tasks/{task_id}`

---

## Agent Instructions

---

## Workflow Steps

### [x] Step: Requirements
<!-- chat-id: 71ed1177-b0ce-44b9-8f79-76c44170e61b -->

Create a Product Requirements Document (PRD) based on the feature description.

1. Review existing codebase to understand current architecture and patterns
2. Analyze the feature definition and identify unclear aspects
3. Ask the user for clarifications on aspects that significantly impact scope or user experience
4. Make reasonable decisions for minor details based on context and conventions
5. If user can't clarify, make a decision, state the assumption, and continue

Focus on **what** the feature should do and **why**, not **how** it should be built. Do not include technical implementation details, technology choices, or code-level decisions — those belong in the Technical Specification.

Save the PRD to `{@artifacts_path}/requirements.md`.

### [x] Step: Technical Specification

Create a technical specification based on the PRD in `{@artifacts_path}/requirements.md`.

1. Review existing codebase architecture and identify reusable components
2. Define the implementation approach

Do not include implementation steps, phases, or task breakdowns — those belong in the Planning step.

Save to `{@artifacts_path}/spec.md` with:
- Technical context (language, dependencies)
- Implementation approach referencing existing code patterns
- Source code structure changes
- Data model / API / interface changes
- Verification approach using project lint/test commands

### [x] Step: Planning

Create a detailed implementation plan based on `{@artifacts_path}/spec.md`.

1. Break down the work into concrete tasks
2. Each task should reference relevant contracts and include verification steps
3. Replace the Implementation step below with the planned tasks

Rule of thumb for step size: each step should represent a coherent unit of work (e.g., implement a component, add an API endpoint). Avoid steps that are too granular (single function) or too broad (entire feature).

Important: unit tests must be part of each implementation task, not separate tasks. Each task should implement the code and its tests together, if relevant.

If the feature is trivial and doesn't warrant full specification, update this workflow to remove unnecessary steps and explain the reasoning to the user.

Save to `{@artifacts_path}/plan.md`.

---

## Implementation Steps

### [x] Step: Database Migration

Write and apply the Supabase migration that creates the `activity_log` table, migrates legacy data, and removes the old history tables.

**Files to create**:
- `supabase/migrations/20260615000000_activity_log.sql`

**Migration must perform these steps in order**:

1. Create `activity_log` table (spec §2.1):
   - Columns: `id UUID PK`, `organization_id UUID → organizations ON DELETE SET NULL`, `actor_id UUID → users ON DELETE SET NULL`, `event_type TEXT NOT NULL`, `entity_type TEXT NOT NULL`, `entity_id UUID NOT NULL`, `gig_id UUID → gigs ON DELETE CASCADE`, `context JSONB NOT NULL DEFAULT '{}'`, `occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
   - Four indexes: `(gig_id, occurred_at DESC)`, `(entity_type, entity_id, occurred_at DESC)`, `(organization_id, occurred_at DESC)`, `(actor_id, occurred_at DESC)`

2. Enable RLS on `activity_log`. Add two SELECT policies (spec §2.2):
   - `activity_log_select_gig_scoped` — `gig_id IS NOT NULL AND user_has_access_to_gig(gig_id, auth.uid())`
   - `activity_log_select_org_scoped` — `gig_id IS NULL AND organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())`
   - No INSERT / UPDATE / DELETE policies for authenticated users (writes go through RPC only)

3. Create `log_activity` SECURITY DEFINER RPC (spec §2.5) — validates `auth.uid()`, validates gig/org access, inserts row, returns UUID.

4. Migrate `gig_status_history` rows into `activity_log` as `gig.status_changed` events:
   - Resolve `actor_display_name` from `users.first_name || ' ' || users.last_name`; fall back to `'[Historical Record]'`
   - Resolve `organization_id` via intersection of actor's org memberships and gig participants; NULL if ambiguous
   - Set `actor_org_name = '[Historical Record]'`, `context_version = 1`
   - Set `entity_id = gig_id`, `entity_type = 'gig'`

5. Drop trigger `record_gig_status_change` on `gigs`. Drop table `gig_status_history`.

6. Migrate `asset_status_history` rows into `activity_log` as `asset.status_changed` events (analogous pattern; `gig_id = NULL`).

7. Drop trigger `record_asset_status_change` on `assets`. Drop table `asset_status_history`.

**After writing the file**, apply it to the local Supabase instance:
```bash
supabase db push
```
Then regenerate `database.types.ts`:
```bash
supabase gen types typescript --linked > src/utils/supabase/database.types.ts
```

**Verify**: `npm run build` passes (types compile). Check that `database.types.ts` now contains `activity_log` and no longer contains `gig_status_history` or `asset_status_history`.

---

### [x] Step: TypeScript Types, Event Registry & Utilities

Add the TypeScript type layer and create the event registry that is the single source of truth for all 12 event types.

**Files to modify**:
- `src/utils/supabase/types.tsx`

**Files to create**:
- `src/utils/activityLog.events.ts`
- `src/utils/activityLog.utils.ts`
- `src/utils/activityLog.events.test.ts`
- `src/utils/activityLog.utils.test.ts`

**Changes to `types.tsx`** (spec §3.1, §3.2):
- Add: `DbActivityLog`, `StaffingChange`, `ActivityLogContext`, `ActivityLogEntry`
- Remove: `DbAssetStatusHistory`, `DbGigStatusHistory` (tables dropped)

**`activityLog.events.ts`** (spec §3.3):
- Export `ACTIVITY_EVENTS` `as const satisfies Record<string, EventTypeConfig>` with all 12 event types:
  - `gig.status_changed`, `gig.rescheduled`, `gig.renamed`
  - `participant.added`, `participant.removed`
  - `staffing.updated`, `staffing.status_changed`
  - `kit_assignment.added`, `kit_assignment.removed`
  - `asset.status_changed`
  - `kit.asset_added`, `kit.asset_removed`
- Each entry has: `label`, `entityType`, `calendarIndicator: boolean`, `contextKeys`, `format: (ctx) => string`
- Export `ActivityEventType = keyof typeof ACTIVITY_EVENTS`
- Export derived `CALENDAR_INDICATOR_EVENT_TYPES` array (computed from entries where `calendarIndicator === true`)

**`activityLog.utils.ts`** (spec §5.2):
- Export `formatActivityEvent(entry: ActivityLogEntry): string` — delegates to `ACTIVITY_EVENTS[entry.event_type]?.format(entry.context) ?? entry.event_type`

**Unit tests** (`activityLog.events.test.ts`):
- All 12 event type keys are present in `ACTIVITY_EVENTS`
- Each entry has `label`, `entityType`, `calendarIndicator`, `contextKeys`, `format`
- `CALENDAR_INDICATOR_EVENT_TYPES` contains exactly `['gig.status_changed', 'gig.rescheduled']`
- `format` function for `staffing.updated` with a non-empty `changes` array renders correctly

**Unit tests** (`activityLog.utils.test.ts`):
- `formatActivityEvent` calls the correct format function for a known event type
- Returns raw `event_type` string for an unknown event type

**Verify**: `npm run build && npm run test:run`

---

### [x] Step: Activity Log Service

Create the service layer for writing and reading activity log entries.

**Files to create**:
- `src/services/activityLog.service.ts`
- `src/services/activityLog.service.test.ts`

**Public API** (spec §4.1):

```typescript
logActivity(entry: { organization_id, event_type, entity_type, entity_id, gig_id?, context }): Promise<void>
getRecentActivity(options?: { limit?, daysCutoff?, eventTypes? }): Promise<ActivityLogEntry[]>
getEntityActivity(entityType: string, entityId: string): Promise<ActivityLogEntry[]>
getGigActivity(gigId: string): Promise<ActivityLogEntry[]>
```

**Implementation notes**:
- `logActivity`: calls `supabase.rpc('log_activity', { p_organization_id, p_event_type, p_entity_type, p_entity_id, p_gig_id, p_context })`. The `p_context` must include `context_version: 1`, `actor_display_name`, `actor_org_name` (supplied by caller).
- `getRecentActivity`: query `activity_log` ordered by `occurred_at DESC`, limited to `limit` (default 50), filtered `occurred_at >= NOW() - INTERVAL 'X days'`. When `eventTypes` is provided, add `.in('event_type', eventTypes)`. RLS handles visibility.
- `getEntityActivity`: query `WHERE entity_type = ? AND entity_id = ?` ordered `occurred_at DESC`.
- `getGigActivity`: query `WHERE gig_id = ?` ordered `occurred_at DESC`.
- All functions use `requireAuth()` to get the supabase client.
- Callers wrap `logActivity` in try/catch and never re-throw (a logging failure must not break the mutation).

**Unit tests** (`activityLog.service.test.ts`):
- `logActivity` calls `supabase.rpc('log_activity', ...)` with the correct argument shape
- `logActivity` does not throw when the RPC returns an error (error is caught internally — but note: per spec, errors are caught by the *caller's* try/catch, not inside `logActivity` itself; test that RPC errors propagate so callers can catch them)
- `getRecentActivity` without `eventTypes` does not call `.in()` on the query chain
- `getRecentActivity` with `eventTypes` calls `.in('event_type', eventTypes)`
- `getGigActivity` queries by `gig_id`

**Verify**: `npm run build && npm run test:run`

---

### [x] Step: Instrument gig.service.ts

Add activity logging to all mutating functions in `src/services/gig.service.ts`.

**File to modify**:
- `src/services/gig.service.ts`
- `src/services/gig.service.test.ts` (extend existing tests)

**Changes** (spec §4.2):

**`updateGig`**:
- Add a pre-fetch `SELECT status, start, end, title FROM gigs WHERE id = gigId` before the `.update()` call
- After successful update, compare each field to its pre-fetch value; for each that changed, `await logActivity(...)` inside an individual try/catch:
  - `status` changed → `gig.status_changed` with `from_status`, `to_status`, `gig_title`
  - `start` or `end` changed → `gig.rescheduled` with `from: { start, end }`, `to: { start, end }`, `gig_title`
  - `title` changed → `gig.renamed` with `from_title`, `to_title`
- `actor_display_name` / `actor_org_name` resolved from `user` profile + `primary_organization_id` already in scope. Fetch org name via `supabase.from('organizations').select('name').eq('id', primary_organization_id).single()` if not already available.
- Notes, tags, timezone changes do NOT trigger logging.

**`updateGigParticipants`**:
- Before deleting IDs in `idsToDelete`, fetch the org name and role for each: `supabase.from('gig_participants').select('organization_id, role, organizations(name)').in('id', idsToDelete)`
- After each delete, emit `participant.removed` with `organization_name`, `role`, `gig_title`
- After each insert, emit `participant.added` with `organization_name`, `role`, `gig_title` (resolve org name from the inserted data)

**`updateGigStaffSlots`** — collect a `changes: StaffingChange[]` array across the entire function, then emit one `staffing.updated` event after all loops (spec §4.2):
- Deleted slot → push `{ type: 'slot_removed', role: slotRole }`
- Inserted slot → push `{ type: 'slot_added', role: slotRole }`
- Deleted assignment → push `{ type: 'unassigned', role, user_name }` (resolve user name via existing user data or a lookup)
- Inserted assignment → push `{ type: 'assigned', role, user_name, initial_status }`
- After all loops: if `changes.length > 0`, emit `staffing.updated` with `changes`, `change_count: changes.length`, `gig_title`
- To resolve role names: the existing code looks up `staff_roles` inside the loop — use that result for the `role` field in each change entry
- To resolve user names for assignments: batch-fetch `users` for the affected `user_id` values before the assignment loop (one query, not per-row)

**`updateStaffAssignmentStatus`** (line 1380):
- Add `requireAuth()` call at top (currently uses `getSupabase()` without auth context)
- Fetch `SELECT status, slot_id FROM gig_staff_assignments WHERE id = assignmentId` before the update
- Fetch the slot's `gig_id`, `role (via staff_role_id)`, and assigned `user` name
- After update, if status changed: emit `staffing.status_changed` with `user_name`, `role`, `from_status`, `to_status`, `gig_title`

**`updateGigKitAssignments`** (check if this function exists; if not, identify where kit assignments are modified from `gig.service.ts` or `kit.service.ts`):
- Before deleting assignments: fetch `kit_name` via join on `kits`
- Each deleted kit assignment → `kit_assignment.removed` with `kit_name`, `gig_title`
- Each inserted kit assignment → `kit_assignment.added` with `kit_name`, `gig_title`

**Unit tests** (extend `gig.service.test.ts`):
- Mock `activityLog.service` via `vi.mock('./activityLog.service')`
- `updateGig` calls `logActivity` once with `gig.status_changed` when status changes
- `updateGig` calls `logActivity` once with `gig.rescheduled` when start date changes
- `updateGig` calls `logActivity` once with `gig.renamed` when title changes
- `updateGig` does NOT call `logActivity` when only notes change
- `updateGigStaffSlots` calls `logActivity` exactly once per save when changes exist
- `updateGigStaffSlots` does NOT call `logActivity` when no changes exist
- All existing tests continue to pass

**Verify**: `npm run build && npm run test:run`

---

### [x] Step: Instrument asset.service.ts and kit.service.ts

Add activity logging to asset and kit mutations, and remove the now-deleted `getAssetStatusHistory` function.

**Files to modify**:
- `src/services/asset.service.ts`
- `src/services/kit.service.ts`
- `src/services/asset.service.test.ts` (extend)
- `src/services/kit.service.test.ts` (extend)

**`asset.service.ts`** changes (spec §4.3):
- **`updateAsset`**: Fetch `SELECT status, manufacturer_model, category FROM assets WHERE id = assetId` before the update. After successful update, if `status` changed: emit `asset.status_changed` with `asset_model`, `category`, `from_status`, `to_status`.
- **Remove `getAssetStatusHistory`**: Delete this exported function entirely (table dropped). This breaks the call in `AssetDetailScreen.tsx` — that will be fixed in the UI step.
- Update the import of `DbAssetStatusHistory` in `asset.service.ts` header (remove it, as the type is deleted).

**`kit.service.ts`** changes (spec §4.4):
- **`updateKit`**: Before the `kit_assets` delete/insert loop, fetch asset model names for `idsToDelete`:
  - `supabase.from('kit_assets').select('id, asset_id, assets(manufacturer_model)').in('id', idsToDelete)`
  - Also fetch the kit's current `name` if not already available
- Each deleted `kit_asset` → `kit.asset_removed` with `kit_name`, `asset_model`
- Each inserted `kit_asset` → `kit.asset_added` with `kit_name`, `asset_model`, `quantity`
- Resolve asset model for new insertions: passed via `asset_id`; batch-fetch model names before the insert loop

**Unit tests** (extend existing test files):
- Mock `activityLog.service`
- `updateAsset` calls `logActivity` with `asset.status_changed` when status changes
- `updateAsset` does NOT call `logActivity` when status is unchanged
- `updateKit` calls `logActivity` for each added/removed kit asset

**Verify**: `npm run build && npm run test:run`

---

### [x] Step: ActivityFeed Component

Create the reusable `ActivityFeed` component and the `activityLog.utils.ts` formatDate helper needed by the event registry.

**Files to create**:
- `src/components/ActivityFeed.tsx`
- `src/components/ActivityFeed.test.tsx`

**Note**: `activityLog.utils.ts` was already created in the Types step. This step completes the local `formatDate` helper used inside `activityLog.events.ts` for date formatting in `gig.rescheduled` events (e.g., `format(new Date(dateStr), 'dd MMM yyyy HH:mm')`).

**`ActivityFeed.tsx`** (spec §5.1):

```typescript
interface ActivityFeedProps {
  entries: ActivityLogEntry[];
  isLoading: boolean;
}
```

- **Loading state**: 3 skeleton rows matching the existing skeleton pattern in the codebase (e.g., `animate-pulse` div blocks)
- **Empty state**: `<p className="text-muted-foreground text-sm">No recent activity.</p>`
- **Entry rows**: render each `ActivityLogEntry` as a row showing:
  - **Who**: `{entry.context.actor_display_name} · {entry.context.actor_org_name}` (muted / smaller text)
  - **What**: `formatActivityEvent(entry)` — the human-readable summary
  - **When**: relative time using `formatDistanceToNow(new Date(entry.occurred_at), { addSuffix: true })` from `date-fns`
- Uses existing UI primitives: `Card` wrapper for the feed, no extra dependencies
- Phase 2 note: an `onRevert?: (eventId: string) => void` prop will be added later — do not add it now

**Unit tests** (`ActivityFeed.test.tsx`):
- Renders "No recent activity." when `entries` is empty and `isLoading` is false
- Renders skeleton rows when `isLoading` is true
- Renders the formatted event text for a provided entry
- Renders actor name and org name for an entry

**Verify**: `npm run build && npm run test:run`

---

### [x] Step: Dashboard and Calendar Screen Updates

Surface activity data in the Dashboard's Recent Activity feed and the Calendar's change indicators.

**Files to modify**:
- `src/components/Dashboard.tsx`
- `src/components/CalendarScreen.tsx`

**`Dashboard.tsx`** (spec §5.3):
- Add state: `recentActivity: ActivityLogEntry[]`, `activityLoading: boolean`
- Add a second `useEffect` (independent of the stats fetch) that calls `getRecentActivity({ eventTypes: ['gig.status_changed', 'gig.rescheduled', 'gig.renamed', 'participant.added', 'participant.removed'] })`
- Add a "Recent Activity" `Card` section below the existing stats / upcoming-gigs area
- Render `<ActivityFeed entries={recentActivity} isLoading={activityLoading} />`
- Import `ActivityFeed` from `'./ActivityFeed'` and `getRecentActivity` from `'../services/activityLog.service'`

**`CalendarScreen.tsx`** (spec §5.4):
- Add state: `changedGigIds: Set<string>`
- After gigs load, query `activity_log` for distinct `gig_id` values where `event_type IN (CALENDAR_INDICATOR_EVENT_TYPES)` and `occurred_at >= now() - 7 days`. Store the set of IDs.
  - Use `supabase.from('activity_log').select('gig_id').in('event_type', CALENDAR_INDICATOR_EVENT_TYPES).gte('occurred_at', sevenDaysAgo).not('gig_id', 'is', null)`
- In the calendar event title/renderer, if the gig's `id` is in `changedGigIds`, append a small amber indicator (e.g., an amber `·` dot or a small `Badge` with "Changed") after the event title in the custom event component
- Import `CALENDAR_INDICATOR_EVENT_TYPES` from `'../utils/activityLog.events'`

**Verify**: `npm run build && npm run test:run`

---

### [x] Step: Detail Page Updates (Gig, Asset, Kit)

Add contextual history views to the three detail screens.

**Files to modify**:
- `src/components/GigDetailScreen.tsx`
- `src/components/AssetDetailScreen.tsx`
- `src/components/KitDetailScreen.tsx`

**`GigDetailScreen.tsx`** (spec §5.5):
- Add state: `gigActivity: ActivityLogEntry[]`, `activityLoading: boolean`
- In `loadGig`, load `getGigActivity(gigId)` in parallel with `checkAllConflicts` using `Promise.all`
- Import `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` from `'./ui/tabs'` (already imported by `CalendarScreen` — verify it exists in the UI library)
- Wrap the existing gig detail body in a `Tabs` layout with two tabs: **Overview** and **History**
- **Overview** tab: all existing content unchanged
- **History** tab:
  - A static header row derived from `gig.created_at` and `gig.created_by` (show "Gig created" with the date, styled similarly to an activity row but not from `ActivityLogEntry`)
  - `<ActivityFeed entries={gigActivity} isLoading={activityLoading} />`

**`AssetDetailScreen.tsx`** (spec §5.6):
- Remove `statusHistory: DbAssetStatusHistory[]` state and `isLoadingHistory` (repurpose loading state for the new data)
- Add state: `assetActivity: ActivityLogEntry[]`
- Replace `getAssetStatusHistory(assetId)` call with `getEntityActivity('asset', assetId)` from `activityLog.service`
- Replace the existing status-history `<Table>` with `<ActivityFeed entries={assetActivity} isLoading={isLoadingHistory} />`
- Remove imports of `getAssetStatusHistory` and `DbAssetStatusHistory` (both deleted)

**`KitDetailScreen.tsx`** (spec §5.7):
- Add state: `kitActivity: ActivityLogEntry[]`, `activityLoading: boolean`
- Load `getEntityActivity('kit', kitId)` after the kit loads
- Add a "History" `Card` section (after the existing kit assets table or below the kit details)
- Render `<ActivityFeed entries={kitActivity} isLoading={activityLoading} />`

**Verify**: `npm run build && npm run test:run`

---

### [x] Step: Final Verification

Run the full verification suite and confirm no regressions.

```bash
npm run build && npm run test:run
```

- All existing tests pass (gig, asset, kit, purchase, organization, attachment, conflict, inventory, google calendar services)
- All new tests pass (activityLog.events, activityLog.utils, activityLog.service, ActivityFeed)
- Build produces no type errors
- **Results**: 563 tests pass, build succeeds (vite build ✓, tsc --noEmit ✓)

**Checklist**:
- [x] Migration file exists at `supabase/migrations/20260615000000_activity_log.sql`
- [x] `database.types.ts` contains `activity_log`; does not contain `gig_status_history` or `asset_status_history`
- [x] `ACTIVITY_EVENTS` contains exactly 12 entries
- [x] `logActivity` is wrapped in try/catch at every call site (never re-throws) — 9 call sites in gig.service, all guarded
- [x] `ActivityFeed` component renders correctly for loading, empty, and populated states
- [x] `AssetDetailScreen` no longer imports `DbAssetStatusHistory` or `getAssetStatusHistory`
