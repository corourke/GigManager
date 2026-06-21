# Technical Specification: Change History / Activity Log

**Feature**: Change History / Recent Activity  
**Status**: Draft  
**Last Updated**: 2026-06-15  
**Based on**: `requirements.md` (same artifacts directory)

---

## 1. Technical Context

| Dimension | Details |
|---|---|
| Language | TypeScript 5 |
| Runtime | Browser (Vite/React 18) + Supabase Edge Functions (Deno) |
| Database | PostgreSQL 17 via Supabase (direct client + RLS) |
| Client | `@supabase/supabase-js` v2 |
| State | React `useState`/`useEffect` — no global store |
| Service layer | `src/services/*.service.ts` — async functions wrapping Supabase queries |
| Auth | `requireAuth()` from `src/utils/supabase/auth-utils.ts` |
| Types | Generated `database.types.ts` + hand-authored `types.tsx` |
| Testing | Vitest, `npm run test:run` |
| Build check | `npm run build && npm run test:run` |

---

## 2. Database Layer

### 2.1 New Table: `activity_log`

```sql
CREATE TABLE public.activity_log (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        REFERENCES public.organizations(id) ON DELETE SET NULL,
  actor_id        UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  event_type      TEXT        NOT NULL,
  entity_type     TEXT        NOT NULL,
  entity_id       UUID        NOT NULL,
  gig_id          UUID        REFERENCES public.gigs(id) ON DELETE CASCADE,
  context         JSONB       NOT NULL DEFAULT '{}',
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Constraints**:
- `event_type` enforced by the service layer (not a DB enum, to avoid costly ALTER TYPE migrations when new event types are added).
- `gig_id` uses `ON DELETE CASCADE` — deleting a gig removes its activity entries.
- `actor_id` uses `ON DELETE SET NULL` — actor display name is snapshotted in `context` so history survives account deletion.

**Indexes**:

```sql
CREATE INDEX idx_activity_log_gig_id   ON public.activity_log (gig_id, occurred_at DESC);
CREATE INDEX idx_activity_log_entity   ON public.activity_log (entity_type, entity_id, occurred_at DESC);
CREATE INDEX idx_activity_log_org_id   ON public.activity_log (organization_id, occurred_at DESC);
CREATE INDEX idx_activity_log_actor_id ON public.activity_log (actor_id, occurred_at DESC);
```

### 2.2 RLS on `activity_log`

RLS is **ENABLED**. **Writes go through a `SECURITY DEFINER` RPC** (§2.5) — no direct-INSERT RLS policy is granted to authenticated users, preventing spoofed events under other organizations or gigs.

**SELECT — gig-scoped rows** (any user with gig access):
```sql
CREATE POLICY "activity_log_select_gig_scoped"
  ON public.activity_log FOR SELECT
  USING (
    gig_id IS NOT NULL
    AND public.user_has_access_to_gig(gig_id, auth.uid())
  );
```

**SELECT — non-gig-scoped rows** (standalone asset/kit; org members only):
```sql
CREATE POLICY "activity_log_select_org_scoped"
  ON public.activity_log FOR SELECT
  USING (
    gig_id IS NULL
    AND organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );
```

No UPDATE or DELETE policies — the log is append-only.

### 2.3 Migration: Replace `gig_status_history` and `asset_status_history`

New migration file `20260615000000_activity_log.sql` performs in order:

1. Create `activity_log` table + indexes + RLS (§2.1/§2.2).
2. Create `log_activity` SECURITY DEFINER RPC (§2.5).
3. Migrate `gig_status_history` rows into `activity_log` as `gig.status_changed` events.
   - Resolve `organization_id`: find the single org where the actor is a member AND the org participates in the gig; NULL if ambiguous or actor no longer exists.
   - Snapshot `actor_display_name` from `users.first_name || ' ' || users.last_name`; fall back to `'[Historical Record]'` if actor missing.
   - Set `actor_org_name` to `'[Historical Record]'` for all migrated rows.
   - Set `context_version` to `1`.
4. Drop trigger `record_gig_status_change` on `gigs`. Drop table `gig_status_history`.
5. Migrate `asset_status_history` rows into `activity_log` as `asset.status_changed` events (analogous pattern; `gig_id = NULL`).
6. Drop trigger `record_asset_status_change` on `assets`. Drop table `asset_status_history`.

After migration: regenerate `database.types.ts` via `supabase gen types typescript --linked`.

### 2.4 `database.types.ts` Changes

After type regeneration:
- `activity_log` Row/Insert/Update types are added.
- `gig_status_history` and `asset_status_history` table types are removed.

### 2.5 New: `log_activity` SECURITY DEFINER RPC

The `log_activity` Postgres function is the **only write path** into `activity_log`. It:
1. Verifies the caller (`auth.uid()`) matches the supplied `actor_id`.
2. For gig-scoped events, verifies `user_has_access_to_gig(gig_id, auth.uid())`.
3. For non-gig events, verifies the caller is a member of `organization_id`.
4. Inserts the row.

```sql
CREATE OR REPLACE FUNCTION public.log_activity(
  p_organization_id UUID,
  p_event_type      TEXT,
  p_entity_type     TEXT,
  p_entity_id       UUID,
  p_gig_id          UUID,
  p_context         JSONB
) RETURNS UUID
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO public
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_id       UUID;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_gig_id IS NOT NULL AND NOT user_has_access_to_gig(p_gig_id, v_actor_id) THEN
    RAISE EXCEPTION 'Access denied to gig';
  END IF;

  IF p_gig_id IS NULL AND p_organization_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = v_actor_id AND organization_id = p_organization_id
    ) THEN
      RAISE EXCEPTION 'Access denied to organization';
    END IF;
  END IF;

  INSERT INTO activity_log
    (organization_id, actor_id, event_type, entity_type, entity_id, gig_id, context)
  VALUES
    (p_organization_id, v_actor_id, p_event_type, p_entity_type, p_entity_id, p_gig_id, p_context)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
```

The service layer calls this via `supabase.rpc('log_activity', { p_organization_id, p_event_type, ... })`.

**Why service-layer instrumentation rather than DB triggers?** DB triggers cannot access the caller's display name or organization name at write time — information needed to snapshot `actor_display_name` / `actor_org_name` into `context`. Service-layer logging has this context readily available from the `requireAuth()` call already at the top of each service function. This follows the existing pattern for other security-sensitive operations in the codebase.

---

## 3. TypeScript Types

### 3.1 Additions to `src/utils/supabase/types.tsx`

```typescript
export type DbActivityLog = Tables['activity_log']['Row'];

export interface StaffingChange {
  type: 'slot_added' | 'slot_removed' | 'assigned' | 'unassigned';
  role: string;
  user_name?: string;
}

export interface ActivityLogContext {
  context_version: number;           // schema version; always 1 for new rows
  actor_display_name: string;
  actor_org_name: string;
  gig_title?: string;
  from_status?: string;
  to_status?: string;
  from?: { start?: string; end?: string };
  to?: { start?: string; end?: string };
  from_title?: string;
  to_title?: string;
  organization_name?: string;
  role?: string;
  user_name?: string;
  initial_status?: string;
  kit_name?: string;
  asset_model?: string;
  category?: string;
  quantity?: number;
  changes?: StaffingChange[];        // for staffing.updated
  change_count?: number;             // for staffing.updated summary
}

export interface ActivityLogEntry extends Omit<DbActivityLog, 'context'> {
  context: ActivityLogContext;
}
```

**`context_version`** is written as `1` for all new rows. If the context schema ever changes, increment the version and update format functions to handle both versions via a version switch, protecting legacy rows from rendering failures.

### 3.2 Removals from `src/utils/supabase/types.tsx`

- `DbAssetStatusHistory` (table dropped)
- `DbGigStatusHistory` (table dropped)

### 3.3 New: `src/utils/activityLog.events.ts` — Event Registry

This is the **single source of truth** for all 12 captured event types. Adding a new event type means adding one entry here; removing means deleting one entry.

**Staffing events consolidation**: The five previous granular staffing events (`staffing.slot_added`, `staffing.slot_removed`, `staffing.assigned`, `staffing.unassigned`) are batched by `updateGigStaffSlots` into a single `staffing.updated` event per save. `staffing.status_changed` remains separate as it represents a meaningful individual action (a staff member accepting or declining a gig).

```typescript
import type { ActivityLogContext } from '../supabase/types';

interface EventTypeConfig {
  label: string;
  entityType: string;
  calendarIndicator: boolean;
  contextKeys: (keyof ActivityLogContext)[];
  format: (ctx: ActivityLogContext) => string;
}

export const ACTIVITY_EVENTS = {
  'gig.status_changed': {
    label: 'Status Changed',
    entityType: 'gig',
    calendarIndicator: true,
    contextKeys: ['gig_title', 'from_status', 'to_status'],
    format: (ctx) => `Status changed from ${ctx.from_status} to ${ctx.to_status}`,
  },
  'gig.rescheduled': {
    label: 'Rescheduled',
    entityType: 'gig',
    calendarIndicator: true,
    contextKeys: ['gig_title', 'from', 'to'],
    format: (ctx) => `Rescheduled from ${formatDate(ctx.from?.start)} to ${formatDate(ctx.to?.start)}`,
  },
  'gig.renamed': {
    label: 'Renamed',
    entityType: 'gig',
    calendarIndicator: false,
    contextKeys: ['from_title', 'to_title'],
    format: (ctx) => `Renamed from '${ctx.from_title}' to '${ctx.to_title}'`,
  },
  'participant.added': {
    label: 'Participant Added',
    entityType: 'participant',
    calendarIndicator: false,
    contextKeys: ['gig_title', 'organization_name', 'role'],
    format: (ctx) => `${ctx.organization_name} added as ${ctx.role} participant`,
  },
  'participant.removed': {
    label: 'Participant Removed',
    entityType: 'participant',
    calendarIndicator: false,
    contextKeys: ['gig_title', 'organization_name', 'role'],
    format: (ctx) => `${ctx.organization_name} removed as ${ctx.role} participant`,
  },
  'staffing.updated': {
    label: 'Staffing Updated',
    entityType: 'staffing',
    calendarIndicator: false,
    contextKeys: ['gig_title', 'changes', 'change_count'],
    format: (ctx) => {
      if (!ctx.changes?.length) return 'Staffing updated';
      const summary = ctx.changes
        .map(c => {
          if (c.type === 'slot_added') return `${c.role} slot added`;
          if (c.type === 'slot_removed') return `${c.role} slot removed`;
          if (c.type === 'assigned') return `${c.user_name} assigned as ${c.role}`;
          if (c.type === 'unassigned') return `${c.user_name} unassigned from ${c.role}`;
          return c.type;
        })
        .join('; ');
      return `Staffing updated: ${summary}`;
    },
  },
  'staffing.status_changed': {
    label: 'Staffing Status Changed',
    entityType: 'staffing',
    calendarIndicator: false,
    contextKeys: ['gig_title', 'user_name', 'role', 'from_status', 'to_status'],
    format: (ctx) =>
      `${ctx.user_name}'s ${ctx.role} status changed from ${ctx.from_status} to ${ctx.to_status}`,
  },
  'kit_assignment.added': {
    label: 'Kit Assigned',
    entityType: 'kit_assignment',
    calendarIndicator: false,
    contextKeys: ['gig_title', 'kit_name'],
    format: (ctx) => `${ctx.kit_name} kit assigned`,
  },
  'kit_assignment.removed': {
    label: 'Kit Removed',
    entityType: 'kit_assignment',
    calendarIndicator: false,
    contextKeys: ['gig_title', 'kit_name'],
    format: (ctx) => `${ctx.kit_name} kit removed`,
  },
  'asset.status_changed': {
    label: 'Asset Status Changed',
    entityType: 'asset',
    calendarIndicator: false,
    contextKeys: ['asset_model', 'category', 'from_status', 'to_status'],
    format: (ctx) => `Status changed from ${ctx.from_status} to ${ctx.to_status}`,
  },
  'kit.asset_added': {
    label: 'Asset Added to Kit',
    entityType: 'kit',
    calendarIndicator: false,
    contextKeys: ['kit_name', 'asset_model', 'quantity'],
    format: (ctx) => `${ctx.quantity}× ${ctx.asset_model} added to kit`,
  },
  'kit.asset_removed': {
    label: 'Asset Removed from Kit',
    entityType: 'kit',
    calendarIndicator: false,
    contextKeys: ['kit_name', 'asset_model'],
    format: (ctx) => `${ctx.asset_model} removed from kit`,
  },
} as const satisfies Record<string, EventTypeConfig>;

export type ActivityEventType = keyof typeof ACTIVITY_EVENTS;
```

**Derived helpers** (also exported from this file):

```typescript
export const CALENDAR_INDICATOR_EVENT_TYPES = Object.entries(ACTIVITY_EVENTS)
  .filter(([, cfg]) => cfg.calendarIndicator)
  .map(([type]) => type as ActivityEventType);
```

**To add a new event type**: add one entry to `ACTIVITY_EVENTS`. TypeScript's `ActivityEventType` union ensures compile-time checking of all usages.

**To remove an event type**: delete its entry. The TypeScript compiler flags remaining usages.

> **Phase 2 — Revert**: A `revertible` flag will be added to `EventTypeConfig` and a `revertActivityLogEvent` service function will be implemented. This is deferred to allow the core activity log to ship first. The `log_activity` RPC and append-only log schema are already designed to support this: revert will write a new log entry with `reverted_event_id` in `context` rather than modifying any existing row.

---

## 4. Service Layer

### 4.1 New: `src/services/activityLog.service.ts`

Public API:

```typescript
export async function logActivity(entry: {
  organization_id: string | null;
  event_type: ActivityEventType;
  entity_type: string;
  entity_id: string;
  gig_id?: string | null;
  context: ActivityLogContext;
}): Promise<void>

export async function getRecentActivity(options?: {
  limit?: number;      // default 50
  daysCutoff?: number; // default 30
  eventTypes?: ActivityEventType[]; // optional filter
}): Promise<ActivityLogEntry[]>

export async function getEntityActivity(
  entityType: string,
  entityId: string
): Promise<ActivityLogEntry[]>

export async function getGigActivity(gigId: string): Promise<ActivityLogEntry[]>
```

**`logActivity` implementation**:
- Calls `supabase.rpc('log_activity', { p_organization_id, p_event_type, p_entity_type, p_entity_id, p_gig_id, p_context })`.
- The RPC validates caller access and inserts atomically.
- `actor_display_name` and `actor_org_name` are resolved by the caller from data already in scope — no extra DB round-trip inside `logActivity`.
- Always **awaited** with try/catch at each call site. Errors are caught, logged to console, and do not re-throw — a logging failure must never break the triggering mutation.

```typescript
// Call site pattern (in gig.service.ts, etc.):
try {
  await logActivity({ event_type: 'gig.status_changed', ... });
} catch (e) {
  console.error('Activity log failed:', e);
}
```

**`getRecentActivity` implementation**:
- Single Supabase query on `activity_log`, ordered `occurred_at DESC`, limited to 50, filtered `>= NOW() - INTERVAL '30 days'`. RLS handles visibility automatically.
- The optional `eventTypes` filter allows the Dashboard to request only high-signal events without building a separate endpoint.

**`getGigActivity` implementation**:
- Query `activity_log WHERE gig_id = ?` ordered `occurred_at DESC`. Returns all event types (full granularity for the Gig detail History tab).

### 4.2 Modified: `src/services/gig.service.ts`

**`updateGig`**: Add a minimal pre-fetch (`SELECT status, start, end, title WHERE id = gigId`) before the `.update()` call. After the update succeeds, for each changed field emit the corresponding event via a try/catch `await logActivity(...)` call:
- `status` changed → `gig.status_changed`
- `start` or `end` changed → `gig.rescheduled`
- `title` changed → `gig.renamed`

Context always includes `context_version: 1`, `actor_display_name`, `actor_org_name`, `gig_title`, plus event-specific fields. `actor_display_name` and `actor_org_name` come from the user profile and `primary_organization_id` already resolved during the auth/permission check at the top of the function.

**`updateGigParticipants`**: After computing `idsToDelete` and iterating new participants:
- Each deleted participant → `participant.removed` (fetch org name before deleting).
- Each inserted participant → `participant.added`.

**`updateGigStaffSlots`**: Collect all changes across the entire batch (slots and assignments), then emit a **single** `staffing.updated` event with a `changes` array containing every individual change. Emit nothing if no actual changes occurred.

Implementation approach:
```typescript
const changes: StaffingChange[] = [];
// ... existing diff logic ...
// For each deleted slot:    changes.push({ type: 'slot_removed', role: slotRole });
// For each inserted slot:   changes.push({ type: 'slot_added',   role: slotRole });
// For each deleted assignment: changes.push({ type: 'unassigned', role, user_name });
// For each inserted assignment: changes.push({ type: 'assigned',  role, user_name });
// After all loops:
if (changes.length > 0) {
  try {
    await logActivity({
      event_type: 'staffing.updated',
      entity_type: 'staffing',
      entity_id: gigId,  // gig is the entity for batch staffing events
      gig_id: gigId,
      context: { context_version: 1, actor_display_name, actor_org_name, gig_title, changes, change_count: changes.length },
    });
  } catch (e) { console.error('Activity log failed:', e); }
}
```

Batch-fetch existing assignment statuses **before** the loop (one query) to enable comparison; do not query inside the loop.

**`updateStaffAssignmentStatus`** (line 1380): Fetch old status before the update. After the update, if the status changed, emit `staffing.status_changed` with `from_status` / `to_status`.

**`updateGigKitAssignments`**:
- Deleted assignments → `kit_assignment.removed` (fetch kit name before deleting).
- Inserted assignments → `kit_assignment.added`.

### 4.3 Modified: `src/services/asset.service.ts`

**`updateAsset`**: Fetch `status` before mutation. After update, if status changed → `asset.status_changed`.

**Remove**: `getAssetStatusHistory` function (table dropped). Update call site in `AssetDetailScreen.tsx`.

### 4.4 Modified: `src/services/kit.service.ts`

**`updateKit`**: Before the `kit_assets` delete/insert loop, fetch the `asset_id` values for the IDs to be deleted (to resolve model names for context). After all updates:
- Each deleted `kit_asset` → `kit.asset_removed`.
- Each inserted `kit_asset` → `kit.asset_added`.

---

## 5. UI Components

### 5.1 New: `src/components/ActivityFeed.tsx`

Props:
```typescript
interface ActivityFeedProps {
  entries: ActivityLogEntry[];
  isLoading: boolean;
}
```

Renders:
- Loading state: skeleton rows (3 rows, matching existing skeleton patterns in the codebase).
- Empty state: muted text "No recent activity."
- Entry rows: **who** (`actor_display_name · actor_org_name`), **what** (`formatActivityEvent(entry)`), **when** (relative time via `date-fns` `formatDistanceToNow`).

Uses existing UI primitives: `Card`, `Button`, `Badge`, `Loader2` from `./ui/*`.

> **Phase 2 — Revert**: An optional `onRevert?: (eventId: string) => void` prop will be added. When provided, a "Revert" ghost button appears on hover for eligible event types. Not included in Phase 1.

### 5.2 New: `src/utils/activityLog.utils.ts`

Thin wrapper that delegates to the registry:

```typescript
import { ACTIVITY_EVENTS, type ActivityEventType } from './activityLog.events';
import type { ActivityLogEntry } from '../supabase/types';

export function formatActivityEvent(entry: ActivityLogEntry): string {
  const cfg = ACTIVITY_EVENTS[entry.event_type as ActivityEventType];
  return cfg ? cfg.format(entry.context) : entry.event_type;
}
```

Pure function (no DB calls, no React) — fully unit-testable. Adding a new event type automatically adds its formatting via the registry entry's `format` function; there is no secondary switch statement to update.

### 5.3 Modified: `src/components/Dashboard.tsx`

- Add `recentActivity: ActivityLogEntry[]` and `activityLoading: boolean` state.
- After stats load, trigger a non-blocking fetch using `getRecentActivity()` (independent `useEffect`). Pass `eventTypes: ['gig.status_changed', 'gig.rescheduled', 'gig.renamed', 'participant.added', 'participant.removed']` to the Dashboard feed — high-signal events only. Granular `staffing.updated` and equipment events appear only in detail History tabs.
- Add a "Recent Activity" `Card` section below the existing stats and upcoming-gigs area.
- Render `<ActivityFeed entries={recentActivity} isLoading={activityLoading} />`.

### 5.4 Modified: `src/components/CalendarScreen.tsx`

- Add `changedGigIds: Set<string>` state.
- After gigs load, query `activity_log` for `gig_id` values with `event_type IN (CALENDAR_INDICATOR_EVENT_TYPES)` and `occurred_at >= NOW() - INTERVAL '7 days'`. Store as a `Set<string>`.
- Extend the calendar event renderer: if the event's `id` is in `changedGigIds`, append a small amber dot after the event title.

### 5.5 Modified: `src/components/GigDetailScreen.tsx`

- Add `gigActivity: ActivityLogEntry[]` and `activityLoading: boolean` state.
- Load `getGigActivity(gigId)` in parallel with the existing conflict check.
- Introduce a `Tabs` layout wrapping the gig detail body (`Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` from `./ui/tabs`). Tabs: **Overview** (existing content) and **History**.
- History tab renders:
  - A synthetic "Created" header derived from `gig.created_at` / `gig.created_by` (styled header row, not an `ActivityLogEntry`).
  - `<ActivityFeed entries={gigActivity} isLoading={activityLoading} />`

### 5.6 Modified: `src/components/AssetDetailScreen.tsx`

- Replace `getAssetStatusHistory(assetId)` with `getEntityActivity('asset', assetId)`.
- Remove `statusHistory: DbAssetStatusHistory[]` state; add `assetActivity: ActivityLogEntry[]`.
- Replace the existing status-history table with `<ActivityFeed entries={assetActivity} isLoading={isLoadingHistory} />`.
- Remove imports of `getAssetStatusHistory` and `DbAssetStatusHistory`.

### 5.7 Modified: `src/components/KitDetailScreen.tsx`

- Add `kitActivity: ActivityLogEntry[]` and `activityLoading: boolean` state.
- Load `getEntityActivity('kit', kitId)` after kit loads.
- Add a "History" section with `<ActivityFeed entries={kitActivity} isLoading={activityLoading} />`.

---

## 6. Phase 2: Revert

The revert feature (US-009) is deferred. The current design is intentionally forward-compatible:

- The log is **append-only** — no entries are ever modified.
- The `log_activity` RPC is the sole write path, making it straightforward to add a `revert_activity_event` RPC alongside it.
- The `context` JSONB includes `from` values for all field-change events (`gig.status_changed`, `gig.rescheduled`, `gig.renamed`, `staffing.status_changed`), so the inverse mutation data is already captured.
- Revert entries will write `reverted_event_id` into their context, maintaining a complete audit chain.
- The `revertible` flag in `EventTypeConfig` will be added to `activityLog.events.ts` at Phase 2 time.
- `revertActivityLogEvent` will be a standalone service function that makes **direct Supabase calls** (not calling through `gig.service.ts`) to avoid the circular import that would otherwise arise.

---

## 7. Source Code Structure Changes

### New files
- `supabase/migrations/20260615000000_activity_log.sql` — table, indexes, RLS, `log_activity` RPC, data migration, drop legacy tables
- `src/utils/activityLog.events.ts` — event type registry (add/remove event types here)
- `src/services/activityLog.service.ts` — service layer
- `src/utils/activityLog.utils.ts` — formatting utilities
- `src/components/ActivityFeed.tsx` — reusable feed component

### Modified files
- `src/utils/supabase/database.types.ts` — regenerated
- `src/utils/supabase/types.tsx` — add `DbActivityLog`, `ActivityLogEntry`, `ActivityLogContext`, `StaffingChange`; remove `DbAssetStatusHistory`, `DbGigStatusHistory`
- `src/services/gig.service.ts`
- `src/services/asset.service.ts`
- `src/services/kit.service.ts`
- `src/components/Dashboard.tsx`
- `src/components/CalendarScreen.tsx`
- `src/components/GigDetailScreen.tsx`
- `src/components/AssetDetailScreen.tsx`
- `src/components/KitDetailScreen.tsx`

---

## 8. Verification Approach

```bash
npm run build && npm run test:run
```

**Unit tests alongside each implementation task**:

| Module | Tests |
|---|---|
| `activityLog.events.ts` | All 12 event types present; each entry has required fields; `CALENDAR_INDICATOR_EVENT_TYPES` contains the correct members |
| `activityLog.utils.ts` | `formatActivityEvent` delegates to registry for all event types; returns raw `event_type` for unknown types; `staffing.updated` with a `changes` array renders correctly |
| `activityLog.service.ts` | `logActivity` calls `supabase.rpc('log_activity', ...)` with correct shape; errors are caught and do not re-throw; `getRecentActivity` applies `eventTypes` filter when provided |
| `gig.service.ts` | `updateGig` calls `logActivity` when status/dates/title change; does NOT call it when only notes/tags change; `updateGigStaffSlots` emits exactly one `staffing.updated` event per save when changes exist; emits nothing when no changes |
| `ActivityFeed.tsx` | Renders entries with correct formatted text; shows loading and empty states |

All existing tests in `gig.service.test.ts`, `asset.service.test.ts`, and `kit.service.test.ts` must continue to pass (logging calls will be mocked with `vi.mock('../services/activityLog.service')`).
