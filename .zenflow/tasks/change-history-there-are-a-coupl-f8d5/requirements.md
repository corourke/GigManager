# Product Requirements Document: Change History & Activity Log

**Feature**: Change History / Recent Activity  
**Status**: Draft  
**Last Updated**: 2026-06-15

---

## 1. Problem Statement

GigManager needs a unified way to surface meaningful change history across all major entities — gigs, staffing, equipment, and kits — so that:

1. Users can see a **"Recent Activity"** feed on the Dashboard and Calendar showing what has changed across entities they manage or participate in.
2. Users can **review contextual history** within any entity's detail view (e.g., a full change log when viewing a specific gig, asset, or kit).
3. AI agents can **query what transpired** on a particular gig, asset, or kit in a structured, machine-readable way.
4. Teams collaborating across multiple organizations on the same gig can stay aware of each other's significant actions without being overwhelmed by noise.

The existing `gig_status_history` and `asset_status_history` tables solve narrow sub-problems in isolation. This feature replaces them with a unified, coherent design that is non-redundant, forward-looking, and covers the full breadth of meaningful business events.

---

## 2. Goals

- **Informative**: Capture events that carry real meaning to coordinators and collaborators — "staffing confirmed", "kit assigned to gig", "gig rescheduled" — not low-level field mutations.
- **Collaborative**: Show activity from all participating organizations on a shared gig, giving a full picture of who did what.
- **Machine-Readable**: Store enough structured metadata that an AI agent can answer questions like "What changed on the Summer Festival gig this week?" without requiring full-table reconstruction.
- **Non-Redundant**: Events already fully captured by a record's own existence or audit columns (`created_at`, `created_by`, `updated_at`) must not be re-recorded in the activity log. Existing `gig_status_history` and `asset_status_history` tables are replaced by the new unified log, not supplemented.
- **Consolidated**: The result is a single, clean history table with no parallel redundant history tables (except `inventory_tracking`, which tracks physical movements and remains separate).
- **Low Noise**: Avoid recording events that would clutter the feed without adding decision-useful information (e.g., notes edits, tags changes, timezone adjustments).

---

## 3. Out of Scope

- Full audit trail suitable for legal compliance or record reconstruction (not required).
- Per-field diff log showing old vs. new values for every field (only selected, meaningful fields).
- Inline "change highlight" indicators on forms or detail pages — only "recent changes" feeds in overview pages (such as Dashboard and Calendar) are in scope.
- Push notifications or email digests based on activity (future feature).
- General undo/redo system. A targeted **"Revert this change"** action on specific field-change events is **in scope** (see §4 and §8.3); broad undo of relationship or cascading changes is not.

---

## 4. User Stories

### Dashboard — Recent Activity Feed

**US-001**: As a production manager, I want to see a feed of notable and recent changes across all my gigs on the Dashboard, so that important changes don't escape my notice.

**US-002**: As a manager, I want each activity item to tell me who did it, what entity was affected, and when — even if that user belongs to a different organization participating in the same gig.

### Calendar View

**US-003**: As a calendar user, I want to see which gigs have recently had their dates or status changed, so I can visually identify what's moved or updated since I last looked.

### In-Context History Views

**US-004**: As a user viewing a gig's detail page, I want to see a complete chronological history of all significant changes made to that gig (including staffing, participants, kit assignments, and schedule changes), so I can understand what has happened without asking colleagues.

**US-005**: As a user viewing an asset's detail page, I want to see its full status history and any kit membership changes, so I can understand the asset's lifecycle at a glance.

**US-006**: As a user viewing a kit's detail page, I want to see a history of when assets were added or removed from the kit and when it was assigned to gigs, so I can understand how the kit has been used.

### In-Context Revert

**US-009**: As a manager reviewing the history of a gig, I want to be able to revert a specific field change (e.g., a reschedule or status change) directly from the History panel, so I can correct a mistake without having to manually re-edit the record.

### AI Agent Queries

**US-007**: As an AI agent querying the system, I want to retrieve a structured list of events for a specific entity (gig, asset, kit), including event type, actor, timestamp, and a machine-readable description of what changed, so I can summarise history in natural language.

**US-008**: As an AI agent, I want to filter activity by entity type, event category, organization, or time range.

---

## 5. Covered Entities & Events

The following table defines the specific events to capture. Events already fully captured by the record's own `created_at`/`created_by` audit columns (where the record itself IS the event) are deliberately excluded.

### 5.1 Gig Events

| Event | Description | Trigger |
|-------|-------------|---------|
| `gig.status_changed` | Gig status changed (e.g., DateHold → Booked) | UPDATE on `gigs` where `status` differs |
| `gig.rescheduled` | Gig start or end date/time changed | UPDATE on `gigs` where `start` or `end` differs |
| `gig.renamed` | Gig title changed | UPDATE on `gigs` where `title` differs |

**Excluded**: `gig.created` — gigs have `created_at` + `created_by`; the record's existence already captures the creation event.  
**Excluded**: Notes, tags, timezone changes — too noisy, no decision value in the feed.

### 5.2 Participant Events

| Event | Description | Trigger |
|-------|-------------|---------|
| `participant.added` | An organization was added as a participant to a gig | INSERT on `gig_participants` |
| `participant.removed` | An organization was removed from a gig | DELETE on `gig_participants` |

**Note**: `gig_participants` has no `created_at`/`created_by` columns, so these events are not intrinsically captured elsewhere.

### 5.3 Staffing Events

| Event | Description | Trigger |
|-------|-------------|---------|
| `staffing.slot_added` | A staff slot (role) was added to a gig | INSERT on `gig_staff_slots` |
| `staffing.slot_removed` | A staff slot was removed from a gig | DELETE on `gig_staff_slots` |
| `staffing.assigned` | A staff member was assigned to a slot | INSERT on `gig_staff_assignments` |
| `staffing.status_changed` | An assignment status changed (e.g., Requested → Confirmed / Declined) | UPDATE on `gig_staff_assignments` where `status` differs |
| `staffing.unassigned` | A staff member was removed from a slot | DELETE on `gig_staff_assignments` |

**Note**: `gig_staff_assignments` records who was assigned but not who did the assigning. The activity log fills this gap with `actor_id`.

### 5.4 Kit Assignment Events

| Event | Description | Trigger |
|-------|-------------|---------|
| `kit_assignment.added` | A kit was assigned to a gig | INSERT on `gig_kit_assignments` |
| `kit_assignment.removed` | A kit was unassigned from a gig | DELETE on `gig_kit_assignments` |

### 5.5 Financial Events

No activity log events. Each `gig_financials` record is itself the business event (a bid, a payment, a contract) and carries its own `created_at`, `created_by`, `updated_at`, `updated_by` columns. The record's existence and `type` field already tell the story. Field-level change tracking for financial records is not in scope.

### 5.6 Asset Events

| Event | Description | Trigger |
|-------|-------------|---------|
| `asset.status_changed` | Asset status changed (e.g., Active → In Repair → Retired) | UPDATE on `assets` where `status` differs |

**Excluded**: `asset.created` — assets have `created_at` + `created_by`.  
**Note**: `asset.status_changed` replaces the existing `asset_status_history` table (see §6).

### 5.7 Kit Events

| Event | Description | Trigger |
|-------|-------------|---------|
| `kit.asset_added` | An asset was added to a kit | INSERT on `kit_assets` |
| `kit.asset_removed` | An asset was removed from a kit | DELETE on `kit_assets` |

**Excluded**: `kit.created` — kits have `created_at` + `created_by`.

### 5.8 Equipment Usage / Inventory Movements

`inventory_tracking` records physical equipment check-in/check-out movements at gigs. This table serves a distinct operational purpose and is **not merged** into the activity log. It remains a separate, independent table.

---

## 6. Consolidation of Existing History Tables

### 6.1 gig_status_history → Replace

`gig_status_history` is populated by an AFTER UPDATE trigger on `gigs` and records `from_status`, `to_status`, `changed_by`, and `changed_at`. The new `activity_log` captures `gig.status_changed` events with equivalent information plus the richer `context` JSONB and unified querying structure.

**Migration approach**: On deployment, migrate existing `gig_status_history` rows into `activity_log` as `gig.status_changed` events, then drop the `gig_status_history` table and its trigger.

**Historical `organization_id` resolution**: `gig_status_history` stores `changed_by` (user ID) but not `organization_id`. During migration, attempt to derive `organization_id` by intersecting the user's org memberships (`organization_members`) with the orgs participating in the gig (`gig_participants`). If the intersection yields exactly one org, use it. If the user belongs to multiple participating orgs (ambiguous) or no longer exists, set `organization_id = NULL`. Migrated rows with NULL `organization_id` are still fully queryable by `gig_id` and `actor_id`.

### 6.2 asset_status_history → Replace

`asset_status_history` is populated by a trigger on `assets` and records `from_status`, `to_status`, `changed_by`, and `changed_at`. The `activity_log` captures `asset.status_changed` events with equivalent data.

**Migration approach**: Migrate existing `asset_status_history` rows into `activity_log` as `asset.status_changed` events, then drop the `asset_status_history` table and its trigger.

### 6.3 inventory_tracking → Retain

`inventory_tracking` records gig-scoped check-in/check-out scan events. This is an operational log of physical movements, not a record-change history. It stays separate and is not merged.

---

## 7. Data Requirements

### 7.1 Event Record Structure

Each activity log entry must carry:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | ✅ | Primary key |
| `organization_id` | UUID | ✅ | The tenant whose user performed the action. May be NULL for rows migrated from legacy history tables where this cannot be reliably determined (see §6.1). |
| `actor_id` | UUID | ✅ | The user who performed the action |
| `event_type` | TEXT | ✅ | Machine-readable dot-notation event code (e.g., `gig.rescheduled`) |
| `entity_type` | TEXT | ✅ | Top-level entity class: `gig`, `asset`, `kit`, `staffing`, `participant`, `kit_assignment` |
| `entity_id` | UUID | ✅ | Primary key of the most directly affected record (e.g., the `gig_staff_assignment.id` for a staffing event, the `gig_participant.id` for a participant event) |
| `gig_id` | UUID | ❌ | The parent gig's UUID for any event that is scoped to a gig — regardless of `entity_type`. When `entity_type = 'gig'`, `gig_id` equals `entity_id`. For all other gig-scoped types (staffing, participant, kit_assignment), `entity_id` is the junction record while `gig_id` is the gig itself, enabling efficient "all activity for gig X" queries without joins. Null for non-gig-scoped events (standalone asset/kit changes). |
| `context` | JSONB | ✅ | Machine-readable snapshot of key fields; always includes `actor_display_name` and `actor_org_name` snapshotted at write time (see §7.2); includes complete `from` values for any field that could be reverted |
| `occurred_at` | TIMESTAMPTZ | ✅ | When the event occurred (defaults to NOW()) |

**Multi-tenant access**: `organization_id` records which tenant's member performed the action. Visibility follows the existing gig access model — any user with access to a gig can see all activity on that gig regardless of which org performed it. For non-gig-scoped events (standalone asset/kit changes), visibility is restricted to members of the owning organization.

**Actor name snapshotting**: Actor display name and organization name must be snapshotted into `context` at the moment the event is written. This ensures the history feed renders correctly even if a user's name is later changed or their account is deleted. Do not rely on joining to `users` or `organizations` at query time for display purposes.

### 7.2 Context JSONB Schema

The `context` field carries enough information for a human or AI to understand the event without additional joins, and enough `from` state to support a targeted revert. It must remain minimal and focused — not a full record snapshot.

Every `context` object must include the following standard fields, snapshotted at write time:

```json
{
  "actor_display_name": "Jane Smith",
  "actor_org_name": "Main Stage Productions"
}
```

These allow the feed to render actor attribution without joining to `users` or `organizations`, protecting against deleted accounts and name changes. All examples below omit these fields for brevity but they are always required.

**`gig.status_changed`**:
```json
{
  "actor_display_name": "Jane Smith",
  "actor_org_name": "Main Stage Productions",
  "gig_title": "Corporate Gala",
  "from_status": "Proposed",
  "to_status": "Booked"
}
```

**`gig.rescheduled`**:
```json
{
  "gig_title": "Summer Festival 2024",
  "from": { "start": "2024-06-15T20:00:00Z", "end": "2024-06-15T23:30:00Z" },
  "to":   { "start": "2024-06-22T20:00:00Z", "end": "2024-06-22T23:30:00Z" }
}
```

**`gig.renamed`**:
```json
{
  "from_title": "Corporate Gala",
  "to_title": "Annual Gala 2024"
}
```

**`participant.added`**:
```json
{
  "gig_title": "Summer Festival 2024",
  "organization_name": "Bright Lights Co.",
  "role": "Lighting"
}
```

**`participant.removed`**:
```json
{
  "gig_title": "Summer Festival 2024",
  "organization_name": "Bright Lights Co.",
  "role": "Lighting"
}
```

**`staffing.assigned`**:
```json
{
  "gig_title": "Summer Festival 2024",
  "user_name": "James Osei",
  "role": "Audio Engineer",
  "initial_status": "Requested"
}
```

**`staffing.status_changed`**:
```json
{
  "gig_title": "Summer Festival 2024",
  "user_name": "James Osei",
  "role": "Audio Engineer",
  "from_status": "Requested",
  "to_status": "Confirmed"
}
```

**`staffing.unassigned`**:
```json
{
  "gig_title": "Summer Festival 2024",
  "user_name": "James Osei",
  "role": "Audio Engineer"
}
```

**`kit_assignment.added`**:
```json
{
  "gig_title": "Summer Festival 2024",
  "kit_name": "Small Lighting Setup"
}
```

**`asset.status_changed`**:
```json
{
  "asset_model": "DiGiCo SD12 Console",
  "category": "Audio",
  "from_status": "Active",
  "to_status": "In Repair"
}
```

**`kit.asset_added`**:
```json
{
  "kit_name": "Small Lighting Setup",
  "asset_model": "LD Systems Moving Head",
  "quantity": 4
}
```

**`kit.asset_removed`**:
```json
{
  "kit_name": "Small Lighting Setup",
  "asset_model": "LD Systems Moving Head"
}
```

### 7.3 Retention Policy

Retain all activity log records indefinitely by default. The volume of meaningful business events is expected to be low relative to storage capacity. A pruning policy may be added in the future if needed.

---

## 8. User Interface Requirements

### 8.1 Dashboard — Recent Activity Feed

- Display a chronological list of the most recent activity events across all gigs and entities the current user has access to, capped at the last 30 days or last 50 events (whichever is smaller).
- Each entry shows:
  - **Who**: Actor's display name and their organization name (e.g., "James Osei · Bright Lights Co.")
  - **What**: A human-readable summary derived from `event_type` and `context` (e.g., "confirmed as Audio Engineer on Summer Festival 2024")
  - **When**: Relative timestamp (e.g., "2h ago") with absolute timestamp on hover
- Events may be grouped by recency (Today, Yesterday, This Week, Older) when the list is long enough to warrant it.
- Clicking an activity item navigates to the relevant entity page.
- Priority events (gig status changes, reschedules, participant additions) are shown prominently; staffing confirmations and kit assignments may be visually de-emphasised.

### 8.2 Calendar View

- Gigs that have had a status change or date change within the last 7 days are marked with a subtle visual indicator (e.g., a dot or badge on the calendar event).
- On hover or tap, a tooltip shows the most recent relevant change (e.g., "Rescheduled 2h ago by Jane Smith").

### 8.3 Gig Detail Page — History Panel

- The gig detail page includes a "History" tab or collapsible section showing all activity events associated with that gig (via `gig_id`).
- Events are shown in reverse-chronological order.
- The panel opens with a synthetic pinned header showing "Created on [date] by [name]" sourced directly from `gigs.created_at` and `gigs.created_by` — not from the activity log (since `gig.created` is not logged).
- Covers all event types scoped to the gig: status changes, reschedules, renames, participant changes, staffing changes, kit assignments.
- Each row shows: timestamp, actor name + org, and a human-readable event description.
- For revertible event types (`gig.status_changed`, `gig.rescheduled`, `gig.renamed`, `staffing.status_changed`), each row includes a **"Revert"** action that restores the `from` state stored in the event's `context`. Revert is only available to users who have edit permission on the gig (Admin or Manager role). The revert itself produces a new activity log entry so it is auditable.

### 8.4 Asset Detail Page — History Section

- The asset detail page includes a history section showing all `asset.status_changed` events for that asset, replacing the prior `asset_status_history` display.
- Shows: timestamp, actor, from_status → to_status.

### 8.5 Kit Detail Page — History Section

- The kit detail page includes a history section showing `kit.asset_added` and `kit.asset_removed` events, plus `kit_assignment.added/removed` events linking the kit to gigs.
- Shows: timestamp, actor, and a human-readable description of the change.

---

## 9. Non-Functional Requirements

- **Performance**: Activity log queries must not add noticeable latency to page loads. The feed and in-context history panels must be efficiently queried with appropriate indexes on `gig_id`, `entity_type`, `entity_id`, `actor_id`, and `occurred_at`.
- **Write Efficiency**: Event capture must not meaningfully slow down primary write operations. Trigger-based capture and/or application-level writes within the same transaction are both acceptable.
- **Correctness**: Activity records must accurately reflect who performed an action (`actor_id`) and when (`occurred_at`).
- **Consistency**: Events must be recorded atomically with the operations that produce them (within the same database transaction where possible).
- **Extensibility**: New event types can be added without schema changes — the dot-notation `event_type` text field and JSONB `context` field are designed to accommodate this.

---

## 10. Success Criteria

- The Dashboard Recent Activity feed is populated with real, meaningful events from the live database.
- Gig, Asset, and Kit detail pages each display their history from the unified activity log.
- An AI agent can fetch a structured list of activity for a given entity and produce a coherent natural-language summary.
- `gig_status_history` and `asset_status_history` are replaced by the unified `activity_log` with no data loss (historical rows migrated in).
- `inventory_tracking` is unchanged.
- The implementation passes all existing tests and lint checks.

---

## 11. Revert Capability

A targeted **"Revert this change"** action is in scope for field-change events where the `from` state is stored in `context` and restoring it requires no complex cascade logic.

### In-scope revertible events

| Event | Revert action |
|-------|---------------|
| `gig.status_changed` | Set `gigs.status` to `context.from_status` |
| `gig.rescheduled` | Set `gigs.start` / `gigs.end` to `context.from.start` / `context.from.end` |
| `gig.renamed` | Set `gigs.title` to `context.from_title` |
| `staffing.status_changed` | Set `gig_staff_assignments.status` to `context.from_status` |

### Out-of-scope revert cases

- **Relationship deletions** (`participant.removed`, `staffing.unassigned`, `kit_assignment.removed`) — require re-inserting a deleted record, which involves uniqueness constraints and potential state conflicts. Not in scope for this feature.
- **Cascading changes** — any revert that would need to undo side effects of the original change.

### Revert behaviour

- Reverting creates a new activity log entry of the same `event_type` (e.g., a new `gig.status_changed` event), so the revert itself is fully auditable as a first-class history item.
- The revert entry's `context` must include `"reverted_event_id": "<uuid>"` referencing the original event being reversed, so the chain of changes is traceable.
- Permission: Admin or Manager role on the gig (via the existing `user_can_manage_gig` access model) only.
- No hard time limit on when a revert can be performed, but the UI must show a warning when any activity log event on the same `gig_id` (for gig-scoped events) or `entity_id` (for entity-scoped events) was recorded after the event being reverted. This signals that subsequent changes may conflict with or depend on the state being restored.
- Reverting `gig.rescheduled` must run the same scheduling conflict checks as a normal date update (equipment double-booking, staff conflicts). If conflicts are detected, the revert must be blocked or the user presented with an explicit confirmation of the conflict before proceeding.

**Design implication**: Always store complete `from` values in `context` for any field that changes. This is a low-cost constraint that enables revert with no additional schema overhead.

---

## 12. Design Decisions & Assumptions

| Decision | Rationale |
|----------|-----------|
| Single unified `activity_log` table | Simplifies querying for feeds and in-context history; avoids UNION across tables; consistent schema for AI consumption |
| Dot-notation `event_type` text field (not enum) | New event types added without migrations; still machine-readable and indexable |
| `gig_id` is not redundant with `entity_id` | When `entity_type = 'gig'` they are equal, but for all other gig-scoped types `entity_id` is the junction record (e.g., `gig_staff_assignment.id`) while `gig_id` is always the parent gig — enabling efficient cross-entity "all activity for gig X" queries without traversal |
| `gig_status_history` and `asset_status_history` replaced | No value in maintaining parallel history tables; the unified log covers the same events with richer structure; existing rows are migrated on deploy |
| `inventory_tracking` kept separate | Operational log of physical movements, not record-change history; different semantics and query patterns |
| Financial events excluded | Each `gig_financials` row IS the business event; `created_at`/`created_by` already capture authorship; a separate activity entry would be pure duplication |
| `*.created` events excluded for entities with `created_by` | `created_at` + `created_by` on the base record captures creation; redundant to log separately. History panels display a synthetic "Created by X on [date]" header sourced directly from the record, not the activity log |
| Notes / tags / timezone excluded | High edit frequency, low decision value; would dominate the feed with noise |
| Cross-org visibility on shared gigs | Full collaborative history — all participating org actions visible to anyone with gig access |
| Calendar: date and status changes only | Scoped to changes that affect scheduling awareness |
| Retention: indefinite | Expected event volume is low; no current business case for pruning |
| `context` always stores `from` values | Preserves future undo/revert capability at no additional cost |
