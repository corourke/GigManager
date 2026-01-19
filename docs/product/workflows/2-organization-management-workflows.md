# Team & Personnel Management Workflows

**Purpose**: This document describes all workflows related to managing staff roles, personnel assignments, and organization directory interactions.

**Last Updated**: 2026-01-18

---

## Overview

These workflows cover staff role definitions, gig staffing needs, personnel assignments and confirmations, organization search, and private annotations for cross-organization collaboration.

---

## Personnel Management Flows

### Flow 21: Manage Staff Roles

**User Journey:**
1. User navigates to Staff Roles management (`/org/[orgId]/staff-roles`)
2. System displays list of existing staff roles (FOH, Lighting, Stage, etc.)
3. User can:
   - Search/filter roles by name
   - Sort by name or creation date
   - Click role to view/edit details
4. "Add New Role" button creates new staff role
5. User fills form: name (unique), description
6. Submit creates new role available for gig staffing

**Database Fields Involved:**
- `staff_roles`: All fields

**Screens Required:**
- **Staff Roles List Screen** (`/org/[orgId]/staff-roles`)
  - Table/cards showing: Role Name, Description, Usage Count
  - Search input and filter options
  - Add/Edit/Delete actions (Admin/Manager only)

**Screens Required:**
- **Create/Edit Staff Role Form**
  - Name field (unique validation)
  - Description field (Markdown)
  - Usage statistics (shows where role is currently used)

**Mobile Considerations:**
- Card-based list view
- Inline editing for simple fields

---

### Flow 22: Define Staff Needs for Gig

**User Journey:**
1. User views gig detail page
2. User navigates to "Staff" section
3. User clicks "Add Staff Need"
4. User enters: role (FOH, Lighting, Stage, etc.), required count, notes
5. System creates `gig_staff_slots` entry
6. Staff need appears as "slot" in list

**UI Screens Needed:**
- Staff needs list (in gig detail)
- Add staff need form/modal
- Role selector (from staff_roles table)
- Count input
- Visual representation (slots filled vs. needed)

---

### Flow 23: Assign Staff to Gig

**User Journey:**
1. User views gig detail → Staff section
2. User sees staff need slot (e.g., "FOH Engineer - 1 needed")
3. User clicks "Assign" on slot
4. System shows user search/list (from organization members)
5. User selects person
6. User optionally enters: rate, fee, notes
7. System creates `gig_staff_assignments` with status "Requested"
8. Assignment appears in slot
9. System sends notification to assigned user

**UI Screens Needed:**
- Staff assignment UI (drag-drop or click-to-assign)
- User search/selector
- Rate/fee inputs
- Assignment status indicators
- Conflict checking (if user already assigned elsewhere)

**Mobile Considerations:**
- Simplified assignment flow
- Quick assign from recent staff

---

### Flow 24: Staff Accept/Decline Assignment

**User Journey:**
1. Staff member receives notification (email/push)
2. Staff clicks notification → Navigate to assignment detail
3. Staff views gig details and assignment info
4. Staff clicks "Accept" or "Decline"
5. System updates `gig_staff_assignments.status` to "Confirmed" or "Declined"
6. Gig manager receives notification of response

**UI Screens Needed:**
- Assignment detail view (staff perspective)
- Accept/Decline buttons
- Gig preview
- Confirmation message

**Mobile Considerations:**
- Push notification → Quick action
- In-app notification center

---

## Organization Directory Flows

### Flow 25: Search Organizations

**User Journey:**
1. User navigates to Organizations directory (`/organizations`)
2. User can search by name, location, type
3. System searches global `organizations` table
4. Results displayed as list/cards
5. User clicks organization → View detail

**UI Screens Needed:**
- Organization search page
- Search input
- Type filter (Production Company, Venue, Act, etc.)
- Results list/cards
- Empty state

**Mobile Considerations:**
- Card-based results
- Map view option (if location data available)

---

### Flow 26: View Organization Details

**User Journey:**
1. User clicks organization from search or gig participant link
2. System loads organization details
3. User sees:
   - Public profile (name, type, address, website, notes)
   - Type-specific fields (capabilities, capacities, requirements)
   - Private annotations (if user's org has created any)
4. User can add private annotation or link to gig

**UI Screens Needed:**
- Organization detail page
- Public profile section
- Private annotations section (tenant-scoped)
- Add annotation button/form
- Link to gig button

---

### Flow 27: Add Private Annotation to Organization

**User Journey:**
1. User views organization detail page
2. User clicks "Add Note" (in private annotations section)
3. User enters: notes (text), optional tags
4. System creates `org_annotations` entry scoped to user's organization
5. Annotation appears in private section (not visible to other tenants)

**UI Screens Needed:**
- Add annotation form/modal
- Tags input (multi-select)
- Annotation list (private section)
- Edit/delete annotation actions

---

## Cross-Platform Considerations

### Web Browser Flows

- **Multi-column layouts**: Sidebar navigation, data tables
- **Mouse interactions**: Hover states, right-click menus
- **Keyboard shortcuts**: Quick actions, navigation
- **Large screens**: More information density, multiple panels

### Mobile Device Flows

- **Single-column layouts**: Stacked cards, full-screen forms
- **Touch interactions**: Swipe gestures, pull-to-refresh, bottom sheets
- **Offline-first**: Cached data, sync indicators, offline mode UI
- **Camera integration**: QR/barcode scanning for assets
- **Push notifications**: Quick actions from notifications
- **Biometric auth**: Face ID/Touch ID for login

---

## Related Documentation

- **Requirements**: See [requirements.md](../requirements.md) for feature requirements (Sections 1-2: User & Organization Management)
- **Database Schema**: See [technical/database.md](../../technical/database.md) for data model
- **Coding Guide**: See [development/ai-agents/coding-guide.md](../../development/ai-agents/coding-guide.md) for implementation patterns
