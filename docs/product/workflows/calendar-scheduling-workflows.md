# Calendar Integration & Scheduling Workflows

**Purpose**: This document describes calendar views, ICS export, Google Calendar integration, and conflict detection workflows for GigManager.

**Last Updated**: 2026-01-18

---

## Overview

These workflows cover how users view gigs in calendar format, export events to external calendar applications, integrate with Google Calendar, and detect scheduling conflicts. Most calendar features are **planned** but not yet implemented.

---

## Flow 1: Calendar View - Month/Week/Day

**User Journey:**

1. User navigates to Gigs → Calendar View (`/gigs/calendar`)
2. User sees calendar interface with three view options:
   - **Month View** (default): Grid showing entire month with gig indicators
   - **Week View**: Detailed 7-day schedule with time slots
   - **Day View**: Hour-by-hour breakdown of single day
3. Calendar displays:
   - Gigs as colored blocks (color by status: Booked=green, DateHold=yellow, Cancelled=red)
   - Multi-day gigs span multiple cells
   - Click on gig to see quick preview
   - Click "View Details" to open full gig screen
4. User can:
   - Navigate between months/weeks/days (arrows or date picker)
   - Toggle view type (Month/Week/Day buttons)
   - Apply filters (status, venue, staff, act)
   - Click empty date to create new gig
5. Gig preview shows:
   - Title
   - Start/end time
   - Venue
   - Act
   - Status
   - Assigned staff count
   - Quick actions: Edit, Duplicate, Delete

**Screens Required:**
- **Calendar Screen** (`/gigs/calendar`)
  - View type toggle (Month/Week/Day)
  - Navigation controls (prev/next, today button, date picker)
  - Filter panel (collapsible)
  - Calendar grid
  - Gig preview popover
  - "Create Gig" button

**Current Implementation Status:**
- ⏸️ Not implemented - only list view exists

**Data Requirements:**
- Query `gigs` filtered by date range
- Include: title, start, end, status, venue, act, staff assignments
- Support pagination for large datasets (month view loads current month only)

**Mobile Considerations:**
- Default to Week view on mobile (Month view too cramped)
- Swipe left/right to navigate weeks
- Tap gig for preview (bottom sheet)
- Floating "+" button to create gig

---

## Flow 2: Calendar Filters & Search

**User Journey:**

1. User is on Calendar View
2. User clicks "Filters" button → Filter panel expands
3. User applies filters:
   - **Status**: Multi-select (Booked, DateHold, Proposed, Cancelled, Completed, Settled)
   - **Venue**: Autocomplete search for venues
   - **Act**: Autocomplete search for acts
   - **Staff**: Multi-select from organization members
   - **Tags**: Multi-select from existing tags
4. Calendar updates in real-time as filters are applied
5. Active filters shown as removable chips above calendar
6. "Clear All Filters" button to reset
7. User can save filter presets:
   - "My Assigned Gigs" (staff filter for current user)
   - "Upcoming Booked" (status=Booked, future dates only)
   - "All Confirmed" (status=Booked or Completed)

**Screens Required:**
- Filter panel (slide-out or modal)
- Filter chip display
- Preset management dialog

**Current Implementation Status:**
- ⏸️ Not implemented
- ✅ Similar filter logic exists in Gig List screen

**Mobile Considerations:**
- Filter panel as bottom sheet
- One filter category at a time
- "Apply" button (don't filter in real-time on mobile)

---

## Flow 3: ICS Export (Individual & Bulk)

**User Journey:**

**Individual Gig Export:**
1. User views a gig (detail screen or calendar preview)
2. User clicks "Export to Calendar" button
3. System generates `.ics` file with gig details:
   - Event title (gig title)
   - Start/end datetime (with timezone)
   - Location (venue name and address)
   - Description (gig notes, act info, staff assignments)
   - Organizer (current user email)
4. Browser downloads `.ics` file
5. User double-clicks file → Opens in default calendar app (Outlook, Apple Calendar, etc.)
6. Calendar app imports event

**Bulk Export:**
1. User is on Calendar View or Gig List
2. User selects multiple gigs (checkboxes)
3. User clicks "Export Selected to Calendar"
4. System generates `.ics` file with all selected gigs
5. Browser downloads file
6. User imports into calendar app

**Automatic Organization Feed:**
1. User navigates to Settings → Calendar Integration
2. User clicks "Get Organization Calendar Feed"
3. System displays webcal:// URL (ICS feed endpoint)
4. User copies URL → Pastes into calendar app (subscribe to calendar)
5. Calendar app automatically syncs all organization gigs
6. Updates propagate as gigs are created/modified/deleted

**Screens Required:**
- Export button on gig detail screen
- Bulk export button on calendar/list screens
- Calendar Integration settings screen
- Feed URL display with copy button

**Current Implementation Status:**
- ⏸️ Not implemented
- ✅ Gig data model has all required fields (title, start, end, timezone, venue)

**Technical Requirements:**
- Generate `.ics` files following RFC 5545 standard
- Include VTIMEZONE for proper timezone handling
- Support recurring events (for hierarchical gigs)
- Generate unique UID per gig (use gig.id)
- Update SEQUENCE number when gig is modified

**Mobile Considerations:**
- "Share" button instead of download
- Native share sheet (iOS/Android)
- Option to add directly to device calendar

---

## Flow 4: Google Calendar Integration

**User Journey:**

**Setup:**
1. User navigates to Settings → Integrations
2. User clicks "Connect Google Calendar"
3. OAuth flow: User authorizes GigManager to access Google Calendar
4. System stores refresh token
5. User selects which Google Calendar to sync to (dropdown)
6. User configures sync settings:
   - Sync direction: One-way (GigManager → Google) or Two-way
   - Auto-sync frequency: Real-time, Hourly, Daily
   - Which gig types to sync (filter by status)

**Automatic Sync (One-way):**
1. User creates/updates/deletes a gig in GigManager
2. System automatically creates/updates/deletes corresponding Google Calendar event
3. Event includes:
   - Title, start/end time, location (venue)
   - Description with gig details
   - Color coding by status
   - Link back to GigManager

**Two-way Sync (Future Enhancement):**
1. User edits event in Google Calendar (change time/date)
2. GigManager detects change via webhook
3. System prompts user: "Gig [Title] was modified in Google Calendar. Apply changes?"
4. User confirms → Gig updated in GigManager
5. Conflict detection: Warn if change creates staff/equipment conflicts

**Screens Required:**
- **Calendar Integration Settings** (`/settings/integrations/calendar`)
  - Google account connection status
  - Sync settings (direction, frequency, filters)
  - "Disconnect" button
  - Sync log (recent syncs, errors)

**Current Implementation Status:**
- ⏸️ Not implemented
- 🔧 Requires Google Calendar API integration

**Technical Requirements:**
- OAuth 2.0 with Google (use Supabase Auth Google provider)
- Google Calendar API v3
- Webhook handling for two-way sync
- Conflict resolution logic
- Error handling (rate limits, network failures)

**Mobile Considerations:**
- Mobile OAuth flow (in-app browser)
- Sync status notification
- Background sync (PWA service worker)

---

## Flow 5: Conflict Detection

**User Journey:**

**Staff Conflicts:**
1. User assigns staff member to a gig slot
2. System checks for overlapping assignments:
   - Query `gig_staff_assignments` for same user
   - Check if gig date/time ranges overlap
3. If conflict found:
   - Display warning: "John Doe is already assigned to [Other Gig] from 7:00 PM - 11:00 PM"
   - Show conflict severity: ⚠️ Partial Overlap or 🔴 Full Overlap
   - Allow user to:
     - Cancel assignment
     - Proceed anyway (override)
     - View conflicting gig details
4. User resolves conflict:
   - Reassign different staff member
   - Adjust gig times to eliminate overlap
   - Mark conflict as "acknowledged" and proceed

**Equipment Conflicts:**
1. User assigns kit to a gig
2. System checks for overlapping kit assignments:
   - Query `gig_kit_assignments` for same kit
   - Check for date/time overlap
3. If conflict found:
   - Display warning: "Kit [Name] is already assigned to [Other Gig] on the same dates"
   - Show list of conflicting assets
   - Suggest alternatives: "Similar kits available: [Kit B], [Kit C]"
4. User resolves conflict:
   - Use different kit
   - Adjust gig times
   - Create new kit with available assets
   - Override (if equipment can be shared, e.g., non-overlapping time slots)

**Venue Conflicts:**
1. User selects venue for a gig
2. System checks for other gigs at same venue with overlapping times
3. If conflict found:
   - Display warning: "Venue [Name] is already booked for [Other Gig] on this date"
   - Show venue capacity (if multi-event venue)
4. User resolves conflict:
   - Choose different venue
   - Adjust gig times
   - Override (if venue supports multiple simultaneous events)

**Screens Required:**
- **Conflict Warning Dialog**
  - Conflict type icon (staff/equipment/venue)
  - Conflicting gig details
  - Severity indicator
  - Resolution options (Cancel, View Details, Override)
- **Conflict Resolution Panel** (within Create/Edit Gig screen)
  - List all conflicts
  - Suggestions for resolution
  - Override checkboxes with confirmation

**Current Implementation Status:**
- ⏸️ Not implemented
- ✅ Data model supports conflict detection (overlapping date ranges)

**Technical Requirements:**
- Query optimization for conflict detection (indexed on start/end dates)
- Real-time validation during form input
- Batch conflict check when importing multiple gigs
- Configurable conflict rules (allow/warn/block)

**Mobile Considerations:**
- Bottom sheet for conflict warnings
- Tap to view conflicting gig
- Simplified resolution options

---

## Common UI Components

### Calendar Grid (Month View)
- 7-column layout (Sun-Sat or Mon-Sun based on locale)
- Date cells with:
  - Date number (large, top-left)
  - Gig indicators (colored bars or dots)
  - "More" link if >3 gigs on one day
- Color-coded by status
- Hover/click for gig preview
- Drag-and-drop to reschedule (future enhancement)

### Week/Day View
- Time slots (15-minute or 30-minute increments)
- Gig blocks with:
  - Title
  - Time range
  - Venue (small text)
  - Status color
- Overlapping gigs shown side-by-side
- Scroll to current time (auto-scroll)

### Date Picker
- Month/year navigation
- "Today" quick button
- Visual indicators for days with gigs
- Keyboard shortcuts (arrow keys, Enter)

### Conflict Indicator
- ⚠️ Warning icon (yellow for partial overlap)
- 🔴 Error icon (red for full overlap)
- Tooltip with conflict details
- Link to conflicting gig

---

## Related Documentation

- [Requirements: Calendar Integration & Scheduling](../requirements.md#8-calendar-integration--scheduling)
- [Feature Catalog: Calendar Integration & Scheduling](../feature-catalog.md#8-calendar-integration--scheduling)
- [Gig Management Workflows](./gig-management-workflows.md) - Related gig creation/editing
- [Team Management Workflows](./team-management-workflows.md) - Staff assignment workflows

---

**Last Updated**: 2026-01-18  
**Status**: Planning Document - Features not yet implemented
