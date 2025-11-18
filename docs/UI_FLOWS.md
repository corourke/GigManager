# UI Flows & User Experience

**Purpose**: This document specifies the user interface design, interaction flows, and user experience patterns for the GigManager application. It focuses on HOW users interact with the system and WHAT they see, building on the functional requirements defined in REQUIREMENTS.md.

## Overview

This document describes user flows, screen specifications, and UI patterns. All flows are designed for both web (desktop/tablet) and mobile platforms.

## Authentication & Organization Management

### Flow 1: User Login & Organization Selection

**User Journey:**

1. User visits app → Redirected to `/login`
2. User sees login options:
   - "Sign in with Google" (OAuth)
   - Email/Password form (with Sign Up tab)
   - Other SSO providers if they are enabled in Supabase
3. After authentication:
   - New users create a user profile by authenticating for the first time.
     - If new user and no profile exists → Profile completion screen → organization selection
   - If profile exists (not a new user) → organization selection
4. Organization selection:
   - User is a member of one organization → Redirect to Gig List
   - User is a member of two or more organizations → Show organization picker
   - User is not a member of any organization (is a new user) 
     - Email domain matches an existing orgnizations → add user to that organization as 'Staff'
     - Email domain does not match an existing organization
       - Select an existing organization (possibly using search tools)
       - OR → "Create your first organization" screen
5. User selects organization → Redirect to Gig List


**Screens Required:**
- **Login Screen** (`/login`)
  - Clean, centered interface
  - Tabs (Sign In / Sign Up)
  - Email/password form (then "OR") buttons for other SSO providers (including Google OAuth) as enabled
  - Loading state during authentication
  - Error state with retry option
- **Profile Completion Screen** (for new users)
  - Collect: first name, last name, phone number, email
  - Simple form, single page
  - Auto-populated from OAuth when available
- **Organization Selection Screen** (`/org/switch`)
  - Grid/list of organization cards. 
  - Display organizations that user is a member of.
  - Each card shows: name, type, user's role
  - Search bar to filter organizations
  - "Create New Organization" button
  - Empty state: "You're not yet a member of an organization, choose "

**Mobile Considerations:**
- Biometric authentication option (Face ID/Touch ID)
- Full-screen forms
- Native OAuth redirect handling

### Flow 2: Create New Organization

**User Journey:**
1. User clicks "Create Organization"
2. Screen title: "Create New Organization" with subtitle: "Search for your business or enter details manually"
3. Google Places search interface (optional):
   1. "Find Your Business", "Search for your business on Google to auto-fill organization details"
   2. Search for business name "Search for your business name" prompt text with "Search" button
   3. Select from results to auto-populate fields
   4. Or skip and enter manually

4. Fill organization form:
   - Name (required)
   - Type (required): Production, Sound, Lighting, Staging, Rentals, Venue, Act, Agency
   - Contact info (optional): phone, email, address
   - Description (optional, Markdown)
5. Submit → User automatically becomes Admin
6. Redirect to new organization's dashboard



**Screens Required:**
- **Create Organization Form** (`/org/create`)
  - Search for business via Google Places API matches on partial name, prefer businesses closer to user location and prefer businesses within the entertainment industry.
  - Progressive disclosure: Required fields first, optional expandable
  - Organization type selector (visual with icons)
  - Address fields grouped
  - Markdown editor for description
  - Loading state during submission
  - Validation errors inline

**Mobile Considerations:**
- Multi-step form (Step 1: Basic, Step 2: Contact, Step 3: Details)
- Progress indicator
- Native keyboard types (email, phone, address)

## Gig Management Flows

### Flow 3: View Gig List & Filter

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

### Flow 4: Create a New Gig

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

### Flow 5: View Gig Details

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

### Flow 6: View Gig Calendar

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

### Flow 7: Update Gig Status

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


### Flow 8: Modify Organization Participants to Gig

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

### Flow 9: Link Bids to Gig

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

## Asset Management Flows

### Flow 10: View & Filter Assets

**User Journey:**
1. User navigates to Assets list (`/org/[orgId]/assets`)
2. System loads assets filtered by `organization_id`
3. User can:
   - Search by manufacturer/model, serial number, description
   - Filter by category, sub-category, insurance status
   - Sort by various fields
   - Click asset to view details
4. "New Asset" button prominent

**Screens Required:**
- **Asset List Screen** (`/org/[orgId]/assets`)
  - Search and filter toolbar
  - Table/cards showing: Category, Manufacturer/Model, Serial Number, Replacement Value, Insurance Status
  - Filter by: Category, Sub-category, Insurance Added (boolean)
  - Empty state: "Add your first asset"

### Flow 11: Create New Asset

**User Journey:**
1. User clicks "New Asset" → Navigate to form
2. Fill asset form:
   - Category (required)
   - Manufacturer/Model (required)
   - Serial Number (optional, unique per org if provided)
   - Financial info: Acquisition Date, Vendor, Cost, Replacement Value
   - Insurance: Checkbox for "Added to Insurance Policy"
   - Description (Markdown)
3. Submit → Asset created
4. Redirect to asset detail or list

**Screens Required:**
- **Create Asset Form** (`/org/[orgId]/assets/new`)
  - Required fields: Category, Manufacturer/Model
  - Financial section: Acquisition Date, Vendor, Cost, Replacement Value
  - Insurance checkbox
  - Description with Markdown editor
  - Mobile: QR/barcode scanner for serial number

### Flow 11A: Bulk import / export Assets

- **Bulk Import**

  - User uploads CSV file in a particular format

  - Checks performed to ensure CSV format and rows are valid. 

  - An error message is shown to the user informing of incorrect column format, or invalid row data and how to fix it. 

  - Either all rows are added to the database or none of the rows.

- **Bulk Export**

  - User sets filters
  - User clicks on 'Download' button and gets a CSV file of all assets.

### Flow 12: Update Asset

**User Journey:**
1. User views asset detail page
2. User clicks "Edit"
3. Form pre-filled with current values
4. User updates fields
5. User saves → Asset updated
6. Redirect to detail page

**UI Screens Needed:**
- Edit asset form (same as create, pre-filled)
- Update confirmation
- Change history (future enhancement)

## Asset Kit Management Flows

### Flow 13: View & Filter Kits

**User Journey:**
1. User navigates to Kits list (`/org/[orgId]/kits`)
2. System loads kits filtered by `organization_id`
3. User can:
   - Search by name, description, or tags
   - Filter by category, tags, template status
   - Sort by various fields
   - Click kit to view details
4. "New Kit" button prominent

**Screens Required:**
- **Kit List Screen** (`/org/[orgId]/kits`)
  - Search and filter toolbar
  - Table/cards showing: Name, Category, Asset Count, Total Value, Template status
  - Filter by: Category, Tags, Template status (boolean)
  - Empty state: "Create your first kit"
  - Quick actions: Duplicate, Edit, Delete

### Flow 14: Create New Kit

**User Journey:**
1. User clicks "New Kit" → Navigate to form
2. Fill kit form:
   - Basic info: Name, Category, Description, Tags, Template status
   - Asset selection: Search and add assets with quantities
3. Submit → Kit created with asset associations
4. Redirect to kit detail or list

**Screens Required:**
- **Create Kit Form** (`/org/[orgId]/kits/new`)
  - Step 1: Basic Info (Name, Category, Description, Tags, Template checkbox)
  - Step 2: Asset Selection
    - Asset search with category/type filters
    - Add assets with quantity inputs
    - Asset list with remove options
    - Total value calculation
  - Mobile: Multi-step form with progress indicator

**Form Fields:**
- **Required:** Name (1-200 chars), at least one asset
- **Optional:** Category, Description (Markdown), Tags, Template status

### Flow 15: View Kit Details

**User Journey:**
1. User clicks kit from list → Navigate to detail page
2. View comprehensive kit information:
   - Header: Name, Category, Template status, Asset count, Total value
   - Description and tags
   - Assets section: List of all assets with quantities and notes
   - Usage section: Gigs this kit is assigned to
3. Actions: Edit kit, Duplicate kit, Delete kit, Assign to gig

**Screens Required:**
- **Kit Detail Screen** (`/org/[orgId]/kits/[kitId]`)
  - Header with key metrics (asset count, total value)
  - Assets table: Asset details, quantity, notes, individual value
  - Gig assignments list
  - Action buttons (Edit, Duplicate, Delete, Assign to Gig)

### Flow 16: Edit Kit

**User Journey:**
1. User views kit detail page
2. User clicks "Edit"
3. Form pre-filled with current values
4. User can:
   - Update basic info (name, category, description, tags)
   - Add/remove assets
   - Change quantities
   - Update asset-specific notes
5. User saves → Kit updated
6. Redirect to detail page

**UI Screens Needed:**
- Edit kit form (similar to create, pre-filled)
- Asset management within edit form
- Save confirmation with impact warning (affects assigned gigs)

### Flow 17: Duplicate Kit

**User Journey:**
1. User views kit detail or clicks "Duplicate" from list
2. System creates copy with "(Copy)" suffix
3. User optionally modifies name and template status
4. Redirect to new kit detail

**UI Screens Needed:**
- Duplicate confirmation modal
- Optional name/template editing
- Success redirect to new kit

### Flow 18: Assign Kit to Gig

**User Journey:**
1. User views gig detail page
2. User clicks "Assign Kit" in equipment section
3. User searches/selects from organization's kits
4. System checks for asset conflicts
5. If conflicts found:
   - Show conflict details
   - User can choose alternative kits or override
6. If no conflicts → Kit assigned to gig
7. Equipment section updates to show assigned kit

**Screens Required:**
- **Kit Assignment Modal** (from gig detail)
  - Kit search/selection
  - Conflict detection display
  - Assignment confirmation
  - Mobile: Bottom sheet interface

**Mobile Considerations:**
- Kit selection in bottom sheet
- Conflict warnings as modal overlays
- Swipe actions for kit management

### Flow 19: Remove Kit from Gig

**User Journey:**
1. User views gig detail → Equipment section
2. User clicks remove on assigned kit
3. System removes kit assignment
4. Equipment section updates

**UI Screens Needed:**
- Remove confirmation (if kit has many assets)
- Undo option (toast notification)

### Flow 20: Conflict Resolution

**User Journey:**
1. User attempts to assign kit to gig
2. System detects conflicts → Shows conflict modal
3. User sees:
   - Which assets are conflicted
   - Which gigs they're assigned to
   - Date/time overlaps
4. User options:
   - Choose different kit
   - Remove conflicting assignments first
   - Override (admin only, with warning)

**Screens Required:**
- **Conflict Resolution Modal**
  - Conflict details table
  - Resolution options
  - Impact warnings
  - Alternative kit suggestions

**Mobile Considerations:**
- Scrollable conflict list
- Clear action buttons
- Progressive disclosure of conflict details

## Personnel Management Flows

### Flow 19: Manage Staff Roles

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

### Flow 23: Assign Staff to Gig

**User Journey:**
1. User views gig detail → Staff section
2. User sees staff need slot (e.g., "FOH Engineer - 1 needed")
3. User clicks "Assign" on slot
4. System shows user search/list (from organization members or global users)
5. User selects user
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

## Common Patterns Across Flows

### List → Detail → Edit Pattern
- Most entities follow: List view → Click item → Detail view → Edit button → Edit form
- Mobile: Often combine detail/edit in one view with inline editing

### Search & Filter Pattern
- Consistent search input placement
- Filter dropdowns/collapsible sections
- Clear filters button
- Results count display

### Create/Edit Form Pattern
- Consistent form layout and validation
- Save/Cancel buttons
- Loading states during submission
- Success redirect or toast notification
- Error handling with inline validation

### Status Management Pattern
- Status badges with color coding
- Status transition dropdowns/modals
- Validation of allowed transitions
- History/logging of changes

## UI Component Guidelines

### shadcn/ui Usage

**Common Components:**
- Button - Actions and form submissions
- Input, Textarea - Form inputs
- Select - Dropdown selections
- Checkbox, RadioGroup - Boolean and single-choice inputs
- Card - Container for content
- Dialog - Modal dialogs
- Table - Data tables
- Badge - Status indicators
- Skeleton - Loading states
- Toast - Notifications

**Example Usage:**
```typescript
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"

export function GigCard({ gig }) {
  return (
    <Card className="p-4">
      <h3 className="font-semibold">{gig.title}</h3>
      <Button onClick={() => router.push(`/gigs/${gig.id}`)}>
        View Details
      </Button>
    </Card>
  )
}
```

### Common UI Patterns

**List Views:**
- Search input with icon
- Filter controls (dropdowns, date pickers)
- Results grid/table
- Empty state with CTA
- Loading skeletons
- Pagination or infinite scroll

**Form Views:**
- Clear form structure with sections
- Inline validation errors
- Loading state on submit button
- Success toast notification
- Cancel button returns to previous page

**Empty States:**
```typescript
<div className="flex flex-col items-center justify-center py-12 text-center">
  <Icon className="h-12 w-12 text-muted-foreground mb-4" />
  <h3 className="text-lg font-semibold mb-2">No gigs found</h3>
  <p className="text-muted-foreground mb-4">
    Get started by creating your first gig.
  </p>
  <Button onClick={handleCreate}>Create Gig</Button>
</div>
```

## Responsive Design Patterns

**Breakpoints:**
- Mobile: 0px - 767px (default, mobile-first)
- Tablet: 768px - 1023px
- Desktop: 1024px+

**Common Patterns:**
```typescript
// Grid that adapts to screen size
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// Hide on mobile, show on desktop
<div className="hidden md:block">

// Stack on mobile, side-by-side on desktop
<div className="flex flex-col md:flex-row gap-4">

// Responsive text sizing
<h1 className="text-2xl md:text-3xl lg:text-4xl">
```

## Form Patterns

### React Hook Form + Zod

All forms use React Hook Form with Zod validation:

```typescript
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { gigFormSchema } from "@/lib/validations/gigs"

export function GigForm() {
  const form = useForm({
    resolver: zodResolver(gigFormSchema),
    defaultValues: {
      title: "",
      status: "DateHold",
      // ...
    },
  })

  const onSubmit = async (data) => {
    const response = await fetch(`/api/orgs/${orgId}/gigs`, {
      method: "POST",
      body: JSON.stringify(data),
    })
    // Handle response
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Input {...form.register("title")} />
      {form.formState.errors.title && (
        <p className="text-red-600 text-sm">
          {form.formState.errors.title.message}
        </p>
      )}
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Saving..." : "Save"}
      </Button>
    </form>
  )
}
```

## Related Documentation

- **Database Schema**: See DATABASE.md for data model
- **Requirements**: See ../REQUIREMENTS.md for feature requirements
- **Tech Stack**: See ../TECH_STACK.md for technology details
