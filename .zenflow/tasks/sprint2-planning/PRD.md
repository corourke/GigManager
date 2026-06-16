# Sprint 2 Product Requirements Document

**Sprint**: 2 — Multi-Act Scheduling + Staff Mobile Dashboard
**Status**: Draft — pending Cameron's review
**Date**: 2026-06-15
**References**: [Roadmap](../../../docs/product/development-plan/01_roadmap.md), [Mobile Development](../../../docs/product/development-plan/04_mobile-development.md), [Technical Spec](../../../docs/product/development-plan/03_technical-spec.md)

---

## 1. Background

Sprint 1 delivered PWA baseline, mobile gig browsing (MobileGigList, MobileGigDetail with full inline editing), barcode scanning/inventory mode, and CSV import. Two Sprint 2 items remain unstarted:

1. **Multi-act scheduling** — most gigs have multiple acts with a schedule of performances. No data model, service, or UI exists for this yet.
2. **Staff mobile dashboard** — `MobileDashboard.tsx` exists as a component but is unreachable: `/dashboard` on mobile redirects to `/gigs`, and the landing redirect (`LandingRedirect` in guards.tsx) sends all mobile users to `/gigs`. The component also lacks a staff-specific view for confirming/declining assignments.

---

## 2. Personas

| Persona | Needs from these features |
|---|---|
| **Production Company (Admin/Manager)** | Build a schedule of acts and activities within a gig. View timeline on desktop and mobile. |
| **Venue (Admin/Manager)** | See the schedule for events at their venue. |
| **Act/Band (Admin/Manager)** | See when their set time is, soundcheck time, load-in time. |
| **Staff (any role)** | Glanceable dashboard of upcoming assignments. Confirm/decline assignments from mobile. Quick access to venue directions, contacts, and schedule. |

---

## 3. Feature 1: Multi-Act Scheduling

### 3.1 User Stories

**US-1.1** As a production manager, I want to add schedule entries (load-in, soundcheck, sets, intermissions, load-out) to a gig so that all participants know the timeline.

**US-1.2** As a production manager, I want to associate a schedule entry with a specific act participant so that each act knows their set time and soundcheck slot.

**US-1.3** As a production manager, I want to see a visual timeline of all schedule entries for a gig, ordered by time, so I can verify there are no gaps or overlaps.

**US-1.4** As a production manager, I want to be warned if two schedule entries for the same act overlap in time.

**US-1.5** As a staff member, I want to see the gig schedule on the mobile gig detail screen so I know when things are happening.

**US-1.6** As a production manager, I want to be able to edit and reorder schedule entries after creation.

### 3.2 Acceptance Criteria

**AC-1.1** A new "Schedule" section appears on the desktop gig detail screen (GigDetailScreen) and in the gig editor (GigScreen), below participants and above staff slots.

**AC-1.2** The schedule section displays entries as a vertical timeline sorted by start time, showing: activity type icon/label, start–end time, associated act name (if any), and notes.

**AC-1.3** In edit mode (GigScreen on desktop, MobileGigDetail edit mode on mobile), users with Admin/Manager role can add, edit, reorder, and delete schedule entries.

**AC-1.4** Each schedule entry has:
- Activity type (required): one of Load-In, Soundcheck, Rehearsal, Set, Intermission, Load-Out, Other
- Start time (required)
- End time (required)
- Act participant reference (optional): links to a gig_participant with role "Act"
- Notes (optional)
- Sort order (auto-managed)

**AC-1.5** Visual conflict warning is displayed when two entries for the same act have overlapping time ranges.

**AC-1.6** The schedule is visible (read-only) to all users who can view the gig, including Staff and Viewer roles.

**AC-1.7** Mobile gig detail (MobileGigDetail) shows a read-only schedule section with the same timeline layout, collapsed by default.

**AC-1.8** Schedule entries are included in gig duplication (`duplicateGig`).

### 3.3 Scope Boundaries

**In scope:**
- `gig_schedule_entries` table, types, service layer, and RLS
- Desktop timeline display and schedule editor
- Mobile read-only timeline display
- Per-act overlap detection (client-side)
- Schedule entry CRUD via the existing gig update flow

**Out of scope (future):**
- Staff slot assignment to specific schedule entries (staffing windows)
- Drag-and-drop timeline editor
- Schedule entry templates
- Schedule export (PDF/iCal)
- Google Calendar sync of individual schedule entries (gig-level sync remains)

---

## 4. Feature 2: Staff Mobile Dashboard

### 4.1 User Stories

**US-2.1** As a staff member on mobile, I want a dashboard showing my upcoming gig assignments so I can see what's coming up at a glance.

**US-2.2** As a staff member, I want to confirm or decline an assignment directly from the mobile dashboard without navigating to the full gig detail.

**US-2.3** As a staff member, I want quick-action buttons for directions to the venue and calling the venue from the dashboard cards.

**US-2.4** As a staff member, I want the mobile app to land on the dashboard (not the full gig list) so I see what's relevant to me first.

**US-2.5** As an Admin/Manager on mobile, I want the landing page to continue going to the full gig list, since I need the broader view.

### 4.2 Acceptance Criteria

**AC-2.1** A new `/dashboard` route on mobile renders the staff mobile dashboard instead of redirecting to `/gigs`.

**AC-2.2** The `LandingRedirect` guard routes mobile Staff users to `/dashboard` and mobile Admin/Manager users to `/gigs` (preserving current behavior for non-staff).

**AC-2.3** The dashboard shows gig cards for the user's assignments in the next 7 days, sorted by start time (nearest first).

**AC-2.4** Each dashboard card displays:
- Gig title
- Date and time (formatted for readability)
- Status badge (gig status)
- Assignment status badge (Open, Invited, Requested, Confirmed, Declined)
- Role name (from the staff slot's staff_role)
- Venue name (if available)
- Action buttons: Directions, Call Venue
- Confirm/Decline buttons (visible when assignment status is Open, Invited, or Requested)

**AC-2.5** Tapping Confirm on an assignment updates `gig_staff_assignments.status` to "Confirmed" and sets `confirmed_at`. Tapping Decline sets status to "Declined". Both provide toast feedback.

**AC-2.6** A "View All Gigs" button at the bottom navigates to `/gigs`.

**AC-2.7** The dashboard supports offline mode: shows cached data from IndexedDB when offline, with an offline badge.

**AC-2.8** The bottom navigation bar adds a "Dashboard" tab (or the existing "Gigs" tab splits into Dashboard and Gigs, depending on role). The dashboard tab is active when on `/dashboard`.

**AC-2.9** Pull-to-refresh or a refresh button reloads the dashboard data.

### 4.3 Scope Boundaries

**In scope:**
- Wiring `MobileDashboard.tsx` into routing for Staff users
- New staff-specific data fetching (assignments for the current user)
- Confirm/Decline assignment actions from the dashboard
- Role-based landing redirect (Staff → dashboard, Admin/Manager → gigs)
- Bottom nav update to include Dashboard

**Out of scope (future):**
- Push notifications for new assignments or schedule changes
- Geofenced "On Site" check-in
- Document viewer (stage plots, riders)
- Contact list beyond venue phone

---

## 5. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Schedule entry CRUD latency | < 500ms per operation |
| Dashboard load time (online) | < 1s on 4G |
| Dashboard load time (cached) | < 200ms from IndexedDB |
| Offline resilience | Dashboard and schedule display from cache; mutations queue for sync |
| Touch targets | All interactive elements >= 44x44px |
| Accessibility | Schedule timeline navigable via screen reader; assignment actions have aria labels |

---

## 6. Relationship to Gig Hierarchy (Sprint 4)

The roadmap places **Hierarchical Gig Structure** in Sprint 4 ([Hierarchy Foundations](../../../docs/product/development-plan/05_hierarchy-foundations.md), [Hierarchy UI](../../../docs/product/development-plan/06_hierarchy-ui.md)). This section clarifies how multi-act scheduling relates to it and documents the design decisions made here that affect that future work.

### 6.1 Problem Space Comparison

| | Multi-Act Scheduling (Sprint 2) | Gig Hierarchy (Sprint 4) |
|---|---|---|
| **Problem** | A single gig has a timeline of activities: load-in, soundcheck, multiple sets, intermissions, load-out. | A complex event (festival, multi-day tour) comprises multiple distinct gigs that share participants, equipment, and financials. |
| **Granularity** | Time slots *within* one gig | Parent-child *relationships between* gigs |
| **Example** | "Friday Night at The Venue" has: 6pm load-in, 7pm soundcheck (Opener), 7:30pm soundcheck (Headliner), 8pm Set (Opener), 9pm Set (Headliner), 11pm load-out | "Summer Festival" has sub-gigs "Main Stage Friday", "Main Stage Saturday", "Side Stage Friday" — each of which is its own gig with its own schedule, staff, and kit assignments |
| **Data model** | `gig_schedule_entries` — child rows of a single gig | `gigs.parent_gig_id` — self-referential FK already in schema, plus recursive CTE functions (not yet deployed) |
| **Inheritance** | None — entries belong to exactly one gig | Participants, equipment, and staff inherit down the tree; children can override |

### 6.2 Overlap: Where They Touch

**Acts appear in both features, but at different levels:**
- In multi-act scheduling, an Act is a `gig_participant` with role "Act" — schedule entries link to it via `act_participant_id` to say "this time slot is for this act."
- In gig hierarchy, a child gig might *be* a single act's performance, inheriting venue and production participants from the parent. The child gig would then have its own schedule entries for soundcheck, set, etc.

**These features are complementary, not competing.** A flat gig (no parent) can have schedule entries. A hierarchical child gig can also have schedule entries. The schedule is always scoped to one gig; hierarchy is about relationships between gigs.

**The realistic production company workflow with both features:**
1. Create master gig "Summer Festival" (parent).
2. Create child gigs "Main Stage Friday", "Main Stage Saturday" (children inherit venue, production crew).
3. Each child gig gets its own `gig_schedule_entries` — load-in, soundcheck per act, sets, intermissions, load-out.

### 6.3 Compatibility Assessment

**Multi-act scheduling does NOT supplant gig hierarchy.** They solve different problems:
- Scheduling handles the *intra-gig* timeline (what happens when during a single event).
- Hierarchy handles the *inter-gig* structure (how events compose into larger events).

**Multi-act scheduling does NOT defer gig hierarchy.** Nothing in Sprint 2 changes the gig hierarchy timeline. `parent_gig_id` and `hierarchy_depth` columns are already in the schema and remain untouched. The recursive CTE functions (`get_gig_hierarchy`, `get_effective_participants`, `get_effective_kits`) are still undeployed and can be added in Sprint 4 without conflict.

**Multi-act scheduling IS compatible with gig hierarchy.** The `gig_schedule_entries` table is keyed on `gig_id` — it works identically whether that gig is a root, a child, or a standalone flat gig. No schema changes are needed in Sprint 4 to make scheduling work within hierarchical gigs.

### 6.4 Design Decisions That Enable Future Hierarchy

1. **`gig_schedule_entries` references `gig_id`, not a hierarchy-aware composite key.** Each gig owns its own schedule. When hierarchy lands, child gigs get their own independent schedules — there is no schedule inheritance to design around.

2. **`act_participant_id` references `gig_participants(id)`, not `organizations.id`.** This keeps act linkage scoped to the specific gig. In a hierarchy, a child gig has its own `gig_participants` rows (possibly inherited via `get_effective_participants`), so schedule entries can reference the child's participant record directly. No ambiguity about which level of the hierarchy the act reference belongs to.

3. **No `organization_id` on `gig_schedule_entries`.** RLS traverses through `gig_id` → `gig_participants` → `organization_members`. When hierarchy adds inherited participants, the RLS policy will naturally work because the participant join already covers both direct and (future) inherited participants.

4. **Schedule duplication uses a participant ID map.** The `duplicateGigScheduleEntries` function remaps `act_participant_id` using a map from old to new IDs. This same pattern will work when creating child gigs from templates or copying schedules across a hierarchy.

### 6.5 What Sprint 4 Will Need to Address (Not Sprint 2's Problem)

- **Schedule inheritance**: Should a child gig inherit its parent's schedule entries? Recommendation: no — schedules are specific to each gig's time window. A parent "Festival" schedule (if any) would be a meta-schedule; each child "Stage Friday" has its own actual schedule. This can be revisited in Sprint 4.
- **Cross-gig schedule conflict detection**: Are two child gigs' schedules conflicting if they share a resource (same act performing at overlapping times on different stages)? This requires hierarchy-aware conflict detection not present in Sprint 2's per-gig overlap check.
- **Aggregate timeline view**: Showing a timeline across all child gigs (e.g., full festival timeline) requires a hierarchy-aware query. Sprint 2's `GigScheduleTimeline` component only renders entries for a single gig.

---

## 7. Open Questions

1. **Bottom nav real estate**: Currently 3 tabs (Gigs, Scanning, Settings). Adding Dashboard makes 4. Should Staff see Dashboard + Scanning + Settings (hiding full Gigs tab), or should all 4 be visible? Recommend: role-conditional tabs — Staff sees Dashboard/Scanning/Settings, Admin/Manager sees Gigs/Scanning/Settings.
2. **Activity type extensibility**: Should activity types be an enum in the database, or a text field with a suggested list in the UI? Enum is safer for consistency; text allows custom types. Recommend: database enum for v1, can be relaxed later.
3. **Schedule entry times vs gig times**: Should schedule entries be constrained to fall within the gig's start/end window? Recommend: warn but don't block, since load-in often starts before the official gig start time.
