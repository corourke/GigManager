# Gig Management Workflows

**Purpose**: This document describes all workflows related to creating, viewing, editing, and managing gigs (events).

**Last Updated**: 2026-01-18

---

## Overview

These workflows cover the complete gig lifecycle: browsing gigs, creating new gigs, viewing details, managing participants, handling bids, and updating status.

---

## Flow 3: View Gig List & Filter

**User Journey:**
1. User navigates to Gigs list (`/org/[orgId]/gigs`)
2. System loads gigs filtered by organization (via gig_participants)
3. Gigs displayed in **spreadsheet-like table** (desktop) or cards (mobile)
4. User can:
   - Search by title
   - Filter by status, date range
   - Sort by date
   - Edit inline (title, date, status)
   - Click row/card to view details
5. "Add New Gig" row at bottom (desktop) or FAB (mobile)


**Screens Required:**
- **Gig List Screen** (`/org/[orgId]/gigs`)
  
  **Desktop View:**
  - Toolbar: Search input, status filter, date range picker, sort dropdown
  - Table columns: Row Actions | Title | Date | Time | Status | Venue | Act | Tags
  - Inline editing: Click cells to edit directly
  - Alternating row colors for readability
  - Hover states on rows
  - "Add New Gig" row at bottom
  
  **Mobile View:**
  - Search bar sticky at top
  - Filter button opens bottom sheet
  - Card-based list (stack vertically)
  - Each card shows: Title, Date/Time, Status badge, Venue/Act, Tags preview
  - Swipe actions: Right = Quick status change, Left = Edit/Delete
  - Floating action button (FAB) for "New Gig"
  - Pull-to-refresh

**States to Design:**
- **Default**: Table/cards loaded with gigs
- **Loading**: Skeleton loaders
- **Empty (filtered)**: "No gigs found" with clear filters button
- **Empty (no gigs)**: "Create your first gig" with large CTA
- **Inline Edit**: Cell in edit mode with save/cancel
- **Search Results**: Filtered list with result count

**Inline Editing Capabilities:**
- **Title**: Text input, auto-save on blur
- **Date**: Date picker popup
- **Time**: Time picker modal
- **Status**: Dropdown with color-coded options
- **Venue/Act**: Search/select from organization directory
- **Tags**: Multi-select tag editor

---

## Flow 4: Create a New Gig

**User Journey:**
1. User clicks "New Gig" → Navigate to create form
2. Fill gig form:
   - **Section 1: Basic Info** - Title, Start/End Date/Time, Timezone, Status
   - **Section 2: Participants** - Role, Organization, Notes
     - Automatically adds current organization as a participant with the current organization type as the role.
   - Section 3: Staff
   - Section 4: Equipment
   - **Section 5: Additional** - Tags, Notes (Markdown), Amount Paid
3. Submit → Creates gig with status history
4. Redirect to gig detail page


**Screens Required:**
- **Create Gig Form** (`/org/[orgId]/gigs/new`)
  
  **Desktop View:**
  - Single-column form, centered
  - Sections with visual separation
  - Required fields marked with asterisk
  - Date/time pickers inline
  - Organization selector: Searchable dropdown with type filter
  - Tags input: Multi-select with autocomplete
  - Markdown editor with preview toggle
  - Actions: "Create Gig" (primary) and "Cancel" (secondary) buttons
  
  **Mobile View:**
  - Multi-step form with progress indicator
  - Step 1: Basic Info
  - Step 2: Participants
  - Step 3: Additional
  - Native date/time pickers
  - Bottom sheet for organization selection
  - Sticky "Next"/"Back" or "Create"/"Cancel" buttons

**Form Fields:**

**Required:**
- Title (1-200 chars)
- Start Date/Time (TIMESTAMPTZ)
- End Date/Time (TIMESTAMPTZ, must be after start)
- Timezone (IANA identifier)
- Status (default: DateHold)

**Optional:**

- Venue (organization selector, filtered by Venue type)
- Act (organization selector, filtered by Act type)
- Other Participants (multi-select organizations with role assignment)
- Tags (multi-select, autocomplete)
- Notes (Markdown editor)
- Amount Paid (currency input)

**Organization Selector Component:**

For Venue and Act fields, design a searchable organization selector:

- Search input with debouncing (300ms)
- Loading state while searching
- Results list showing:
  - Organization name
  - Organization type badge
  - Location (city, state) if available
- "No results" state
- Selected organization displayed with remove option
- Can search by name or type filter

**States to Design:**
- **Default**: Form ready for input
- **Loading**: Disable inputs, show spinner on submit button
- **Validation Errors**: Inline errors below fields, red borders
- **Success**: Brief toast before redirect
- **Organization Search**: Loading spinner, no results state

---

## Flow 5: View Gig Details

**User Journey:**
1. User clicks gig from list → Navigate to detail page
2. View comprehensive gig information:
   - Header: Title, Status badge, Date/Time
   - Participants section: Venue, Act, Other organizations
   - Staff section: Positions needed, assignments with status
   - Bids section: Bid history, amounts, results
   - Notes section: Markdown-rendered notes
   - Status History: Timeline of status changes
3. Actions available (based on role):
   - Edit gig (Admin/Manager)
   - Change status (Admin/Manager)
   - Add/remove participants (Admin/Manager)
   - Add/assign staff (Admin/Manager)
   - Delete gig (Admin only)

**Screens Required:**
- **Gig Detail Screen** (`/org/[orgId]/gigs/[gigId]`)
  - Page header with title and status
  - Tabbed interface or sections:
    - Overview (date, time, location, notes)
    - Participants (list with roles)
    - Staff (slots and assignments)
    - Bids (bid history)
    - History (status change timeline)
  - Action buttons in header (Edit, Change Status, Delete)
  - Mobile: Collapsible sections instead of tabs

---

## Flow 6: View Gig Calendar

**User Journey:**
1. User navigates to Calendar view (`/org/[orgId]/gigs/calendar`)
2. System loads gigs for visible date range
3. Gigs displayed as calendar events
4. User clicks event → Navigate to gig detail
5. User can navigate months/weeks


**UI Screens Needed:**
- Calendar component (month/week/day views)
- Event rendering (color by status)
- Date navigation
- Empty calendar state

**Mobile Considerations:**
- Touch-friendly calendar
- Swipe between months
- Agenda view option

---

## Flow 7: Update Gig Status

**User Journey:**
1. User views gig detail page
2. User clicks status badge or "Change Status" button
3. System shows status transition options (all statuses available)
4. User selects new status
5. Status updated, history logged
6. If transition to "Booked" → Send notifications to assigned staff


**UI Screens Needed:**
- Status badge/indicator
- Status transition dropdown/modal
- Transition validation (all transitions allowed)
- Success confirmation
- Error handling

---

## Flow 8: Modify Organization Participants to Gig

**User Journey:**
1. User views gig detail page
2. User clicks "Add Participant" or "Link Organization"
3. User searches organization directory (global)
4. User selects organization and role (Venue, Client, Act, etc.)
5. System creates `gig_participants` entry
6. Participant appears in gig detail

**UI Screens Needed:**
- Participant list (in gig detail)
- Add participant button/modal
- Organization search/selector
- Role selector (dropdown)
- Remove participant action

**Mobile Considerations:**
- Bottom sheet for participant selection
- Quick-add from recent organizations

---

## Flow 9: Link Bids to Gig

**User Journey:**
1. User views gig detail page
2. User navigates to "Bids" section
3. User clicks "Add Bid"
4. User enters: amount, date given, result (Pending/Accepted/Rejected/Withdrawn), notes
5. System creates `gig_bids` entry
6. Bid appears in list

**UI Screens Needed:**
- Bids list (in gig detail)
- Add bid form/modal
- Currency input for amount
- Result selector
- Bid history view

---

## Related Documentation

- **Requirements**: See [requirements.md](../requirements.md) for feature requirements (Section 3: Gig Management)
- **Database Schema**: See [technical/database.md](../../technical/database.md) for data model
- **Coding Guide**: See [development/ai-agents/coding-guide.md](../../development/ai-agents/coding-guide.md) for implementation patterns
