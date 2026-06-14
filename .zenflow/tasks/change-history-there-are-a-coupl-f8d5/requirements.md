# Product Requirements Document: Change History & Activity Log

**Feature**: Change History / Recent Activity  
**Status**: Draft  
**Last Updated**: 2026-06-14

---

## 1. Problem Statement

GigManager needs a way to surface meaningful change history across core entities so that:

1. Users can see a **"Recent Activity"** feed on the Dashboard and Calendar showing what has changed across gigs they participate in.
2. AI agents can **query what transpired** on a particular gig, asset, or kit in a structured, machine-readable way.
3. Teams collaborating across multiple organizations on the same gig can stay aware of each other's significant actions without being overwhelmed by noise.

The existing `gig_status_history` and `asset_status_history` tables solve a narrow sub-problem. This feature generalises the concept to cover the broader set of meaningful business events across gigs, staffing, participants, kit assignments, financial records, and equipment — but explicitly does NOT aim to be a full transaction log for record reconstruction.

---

## 2. Goals

- **Informative**: Capture events that carry real meaning to coordinators and collaborators — "staffing confirmed", "kit assigned", "bid submitted" — not low-level field mutations.
- **Collaborative**: Show activity from all participating organizations on a shared gig, giving a full picture of who did what.
- **Machine-Readable**: Store enough structured metadata that an AI agent can answer questions like "What changed on the Summer Festival gig this week?" without requiring full-table reconstruction.
- **Non-Redundant**: Where existing history tables (`gig_status_history`, `asset_status_history`, `inventory_tracking`) already capture an event well, the new system should reference or complement them rather than duplicate them.
- **Low Noise**: Avoid recording events that would clutter the feed without adding decision-useful information (e.g., notes edits, internal bookkeeping fields, timezone adjustments).

---

## 3. Out of Scope

- Full audit trail suitable for legal compliance or record reconstruction (not required).
- Per-field diff log showing old vs. new values for every field (explicitly excluded by design; only selected fields).
- Inline "change highlight" indicators directly on gig forms or detail pages — only Dashboard and Calendar feeds are in scope for this feature.
- Push notifications or email digests based on activity (future feature).
- Undo/rollback functionality.

---

## 4. User Stories

### Dashboard — Recent Activity Feed

**US-001**: As a production manager, I want to see a chronological feed of significant recent changes across all my gigs on the Dashboard, so I can quickly identify what needs my attention without opening each gig individually.

**US-002**: As a manager, I want each activity item to tell me who did it, what entity was affected, and when — even if that user belongs to a different organization participating in the same gig.

### Calendar View

**US-003**: As a calendar user, I want to see which gigs have recently had their dates or status changed, so I can visually identify what's moved or updated since I last looked.

### AI Agent Queries

**US-004**: As an AI agent querying the system, I want to retrieve a structured list of events for a specific gig (or asset/kit), including event type, actor, timestamp, and a brief machine-readable description of what changed, so I can summarise gig history in natural language.

**US-005**: As an AI agent, I want to filter activity by organization, entity type, event category, or time range.

---

## 5. Covered Entities & Events

The following table defines the specific events to capture. The goal is the "happy medium" — meaningful business events, not low-level field mutations.

### 5.1 Gig Events

| Event | Description | Trigger |
|-------|-------------|---------|
| `gig.created` | A new gig was created | INSERT on `gigs` |
| `gig.status_changed` | Gig status changed (e.g., DateHold → Booked) | Already tracked in `gig_status_history`; cross-reference only |
| `gig.rescheduled` | Gig start or end date/time changed | UPDATE on `gigs` where `start` or `end` differs |
| `gig.renamed` | Gig title changed | UPDATE on `gigs` where `title` differs |

**Rationale**: Notes edits are excluded (too noisy, high frequency). Tags and timezone changes are minor housekeeping, also excluded.

### 5.2 Participant Events

| Event | Description | Trigger |
|-------|-------------|---------|
| `participant.added` | An organization was added as a participant to a gig | INSERT on `gig_participants` |
| `participant.removed` | An organization was removed from a gig | DELETE on `gig_participants` |

### 5.3 Staffing Events

| Event | Description | Trigger |
|-------|-------------|---------|
| `staffing.slot_added` | A staff slot (role) was added to a gig | INSERT on `gig_staff_slots` |
| `staffing.slot_removed` | A staff slot was removed from a gig | DELETE on `gig_staff_slots` |
| `staffing.assigned` | A staff member was assigned to a slot | INSERT on `gig_staff_assignments` |
| `staffing.status_changed` | An assignment status changed (e.g., Requested → Confirmed / Declined) | UPDATE on `gig_staff_assignments` where `status` differs |
| `staffing.unassigned` | A staff member was removed from a slot | DELETE on `gig_staff_assignments` |

### 5.4 Kit Assignment Events

| Event | Description | Trigger |
|-------|-------------|---------|
| `kit_assignment.added` | A kit was assigned to a gig | INSERT on `gig_kit_assignments` |
| `kit_assignment.removed` | A kit was unassigned from a gig | DELETE on `gig_kit_assignments` |

### 5.5 Financial Events

| Event | Description | Trigger |
|-------|-------------|---------|
| `financial.record_added` | A new financial record was added (bid, payment, invoice, etc.) | INSERT on `gig_financials` |
| `financial.record_updated` | A financial record was updated (amount, status, or payment date changed) | UPDATE on `gig_financials` where `amount`, `type`, or `paid_at` differs |
| `financial.record_deleted` | A financial record was deleted | DELETE on `gig_financials` |

**Rationale**: Financial records represent significant business events. Notes-only edits on financial records are excluded.

### 5.6 Asset Events

| Event | Description | Trigger |
|-------|-------------|---------|
| `asset.created` | A new asset was added to the inventory | INSERT on `assets` |
| `asset.status_changed` | Asset status changed (Active → Retired, etc.) | Already tracked in `asset_status_history`; cross-reference only |
| `asset.retired` | Asset was retired or disposed of | UPDATE on `assets` where `status` → 'Retired' (or equivalent) |

**Rationale**: `asset_status_history` already captures status changes. This feature primarily records the creation event and links to the existing history.

### 5.7 Kit Events

| Event | Description | Trigger |
|-------|-------------|---------|
| `kit.created` | A new kit was created | INSERT on `kits` |
| `kit.asset_added` | An asset was added to a kit | INSERT on `kit_assets` |
| `kit.asset_removed` | An asset was removed from a kit | DELETE on `kit_assets` |

### 5.8 Equipment Usage Events

**Note**: Equipment check-in/check-out events are already captured in `inventory_tracking`. The activity log does NOT duplicate these records. Instead, summary-level events may be surfaced from `inventory_tracking` when queried.

---

## 6. Data Requirements

### 6.1 Event Record Structure

Each activity log entry must carry:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | ✅ | Primary key |
| `organization_id` | UUID | ✅ | The tenant whose user performed the action |
| `actor_id` | UUID | ✅ | The user who performed the action |
| `event_type` | TEXT | ✅ | Machine-readable dot-notation event code (e.g., `gig.rescheduled`) |
| `entity_type` | TEXT | ✅ | Top-level entity type: `gig`, `asset`, `kit`, `financial`, `staffing`, `participant`, `kit_assignment` |
| `entity_id` | UUID | ✅ | Primary key of the affected record |
| `gig_id` | UUID | ❌ | Denormalized reference to the related gig (null for non-gig-scoped events like standalone asset changes) |
| `context` | JSONB | ✅ | Machine-readable snapshot of key fields relevant to this event (see §6.2) |
| `occurred_at` | TIMESTAMPTZ | ✅ | When the event occurred (defaults to NOW()) |

**Multi-tenant access**: The `organization_id` records WHO performed the action. Visibility follows the existing gig access pattern — any user who has access to the gig can see all activity on that gig, regardless of which organization's member performed it. For non-gig-scoped events (e.g., standalone kit/asset changes), visibility is restricted to members of the owning organization.

### 6.2 Context JSONB Schema

The `context` field carries enough information for a human or AI to understand the event without additional joins. It must be kept minimal and focused. Examples:

**`gig.rescheduled`**:
```json
{
  "gig_title": "Summer Festival 2024",
  "from": { "start": "2024-06-15T20:00:00Z", "end": "2024-06-15T23:30:00Z" },
  "to": { "start": "2024-06-22T20:00:00Z", "end": "2024-06-22T23:30:00Z" }
}
```

**`gig.status_changed`**:
```json
{
  "gig_title": "Corporate Gala",
  "from_status": "Proposed",
  "to_status": "Booked"
}
```

**`staffing.assigned`**:
```json
{
  "gig_title": "Summer Festival 2024",
  "user_name": "James Osei",
  "role": "Audio Engineer",
  "status": "Requested"
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

**`participant.added`**:
```json
{
  "gig_title": "Summer Festival 2024",
  "organization_name": "Bright Lights Co.",
  "role": "Lighting"
}
```

**`kit_assignment.added`**:
```json
{
  "gig_title": "Summer Festival 2024",
  "kit_name": "Small Lighting Setup"
}
```

**`financial.record_added`**:
```json
{
  "gig_title": "Summer Festival 2024",
  "type": "Contract Signed",
  "amount": 18000.00,
  "currency": "USD"
}
```

**`asset.created`**:
```json
{
  "manufacturer_model": "DiGiCo SD12 Console",
  "category": "Audio",
  "acquisition_date": "2024-06-01"
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

### 6.3 Retention Policy

Retain all activity log records indefinitely by default. The volume of meaningful business events (as defined in §5) is expected to be low relative to storage capacity. A pruning policy may be added in the future if needed.

---

## 7. User Interface Requirements

### 7.1 Dashboard — Recent Activity Feed

- Display a chronological list of the most recent activity events across all gigs the current user has access to, filtered to the last 30 days or the last 50 events (whichever is smaller).
- Each entry shows:
  - **Who**: Actor's display name and their organization name (e.g., "James Osei · Bright Lights Co.")
  - **What**: A human-readable summary derived from the event type and context (e.g., "confirmed as Audio Engineer on Summer Festival 2024")
  - **When**: Relative timestamp (e.g., "2h ago"), with absolute timestamp on hover
- Events are grouped by recency (Today, Yesterday, This Week, Older) if more than a few items are shown.
- Clicking an activity item navigates to the relevant gig or entity page.
- The feed includes gig status changes, schedule changes (reschedules), and participant additions as priority events; staffing confirmations and financial records are included but may be visually de-emphasised.

### 7.2 Calendar View

- Gigs that have had a status change or date change in the last 7 days are visually marked with a subtle indicator (e.g., a dot or badge).
- On hover or tap, a tooltip shows the most recent relevant change (e.g., "Rescheduled 2h ago by Jane Smith").

---

## 8. Non-Functional Requirements

- **Performance**: Activity log queries must not add noticeable latency to page loads. The feed should be precomputed or efficiently queried with appropriate indexes.
- **Write Efficiency**: Event capture must not meaningfully slow down the primary write operations (gig updates, assignment changes, etc.). Triggers or application-level writes should be used appropriately.
- **Correctness**: Activity records must accurately reflect who performed an action (actor attribution) and when.
- **Consistency**: Events must be recorded atomically with the operations that produce them (within the same database transaction where possible).
- **Extensibility**: The design should make it straightforward to add new event types in the future without schema changes.

---

## 9. Success Criteria

- The Dashboard Recent Activity feed is populated with real, meaningful events from the database.
- An AI agent can fetch a structured JSON list of activity for a given gig and produce a coherent natural-language summary of what occurred.
- Existing `gig_status_history` and `asset_status_history` data is either incorporated or clearly cross-referenced — no duplication.
- The implementation passes all existing tests and lint checks.
- Users report that the feed shows useful, non-noisy information (qualitative acceptance criteria for future review).

---

## 10. Design Decisions & Assumptions

| Decision | Rationale |
|----------|-----------|
| Single unified `activity_log` table (not per-entity tables) | Simplifies querying for feeds; avoids UNION across many tables; consistent schema for AI consumption |
| Dot-notation `event_type` text field (not enum) | Allows new event types to be added without migrations; still machine-readable and indexable |
| `gig_id` denormalized on all records | Enables fast "all activity for gig X" queries without joins through junction tables |
| `gig_status_history` is NOT replaced | It's already in place and working; the activity log will record the same events but reference the existing table as complementary, not redundant |
| Notes field edits excluded | Notes are frequently edited for minor corrections; recording every edit would dominate the feed with low-value noise |
| Retention: indefinite | Expected event volume is low for meaningful events; no business case for pruning at this stage |
| Cross-org visibility on shared gigs | Users confirmed full collaborative visibility (all participating org actions visible); aligns with GigManager's collaborative multi-tenant model |
| Calendar: date and status changes only | User confirmed calendar should surface date and status changes only (not staffing or financial events) |
