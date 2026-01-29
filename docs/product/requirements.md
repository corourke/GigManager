# GigManager Product Requirements

**Purpose**: This document defines the functional requirements, business rules, and high-level features of the GigManager application. It focuses on WHAT the system should do and WHY, not HOW it should be implemented.

**Last Updated**: 2026-01-18

**Gig Manager** is a production and event management platform used by:

- Production companies managing events and performances;
- Sound and lighting companies tracking equipment and staff;
- Event producers coordinating venues, acts, and logistics.

---

## Table of Contents

1. [Overview](#overview)
2. [Major Feature Groups](#major-feature-groups)
3. [CSV Import Feature Requirements](#csv-import-feature-requirements)
4. [Complex Events: Hierarchical Gig Structure](#complex-events-hierarchical-gig-structure)

---

## Overview

This app streamlines the management of gigs (where an act performs at a venue) for operators of sound and lighting companies, and event producers. By centralizing tools for tracking gear inventory, bids/proposals, personnel, venues, loadouts and documentation such as stage plots, we reduce manual errors, save time on preparation, and ensure efficient operations.

### Target Users

- Primary Users (may plan and manage gigs, bids, staffing and equipment.)
  - Production companies
  - Sound/lighting companies
  - Event producers

- Secondary Users (may participate in gig planning)
  - Venues
  - Acts/Performers
  - Talent agencies
  - Equipment rental companies
  - Staging companies

### Key Features

- **Multi-Organization Collaboration:** The different organizations that participate in an event can all share and collaborate on the same gig, with tenants maintaining their own staffing, equipment, and financial information. 
- **Shared Organizations**: Organization profiles are shared so each tenant doesn't have to create them; users can belong to multiple organizations with role-based access control.
- **Gig Management**: Full lifecycle tracking from Date-Hold to Completed/Paid.
- **Asset Inventory**: Track owned assets, group assets into kits, assign equipment to gigs, reporting on conflicts, handle rentals, and export insurance details.
- **Personnel Management**: Create staffings slots on gigs, assign staff to roles, notify staff automatically, and check for conflicts.
- **Mobile Support**: Offline-first with push notifications and biometric authentication.
- **Calendar Integration**: Syncronize gig dates with Google Calendar.
- **Export/Import:** Easy data export and import to/from spreadsheets.

### Key Benefits

- **Improved Coordination**: Collaborative data management across participants improves communication and reduces mistakes and misunderstandings.
- **Efficiency**: Automates notifications, confirmations, checklists, and tracking.
- **Integrated**: Track dates, equipment inventory, acts, venues, proposals, and staff in one place.
- **Risk Mitigation**: Maintain equipment inventory for insurance purposes and avoid double booking.
- **Purpose-built**: Unlike general event tools, this app specializes in coordinating acts, venues, equipment and supporting services.

### User Experience Principles

#### Design Philosophy

- **Multi-Platform First**: Seamless experience across web browsers, mobile browsers, and native mobile apps
- **Organization-Centric**: All data and workflows are scoped to the user's active organization context
- **Progressive Disclosure**: Show essential information first, with advanced options available as needed
- **Offline-Ready**: Core functionality works without internet connection with automatic sync

#### Interface Design

- **Spreadsheet-like Tables**: Familiar data entry patterns for power users (desktop)
- **Card-based Layouts**: Touch-friendly information consumption (mobile)
- **Contextual Actions**: Right-click menus, swipe actions, and floating action buttons
- **Consistent Navigation**: Global navigation with organization switcher, breadcrumbs, and search
- **Mobile-First Design**: Responsive layouts with touch-optimized controls (see [Mobile Features](#10-mobile-features) for details)

### Definitions

- **Organization**: Any business or group of people that participate in the delivery of a gig.
- **User**: A user is someone who can log into the application, and who may be a member of one or more organizations. A user is assigned an application role for each organization they are a member of.
- **Tenants**: A tenant is an organization with users that are using the application, with a private data scope enforced by RLS.
- All event participants are a type of **organization**: 
  - A **Production Company** matches up clients to a venue and one or more bands for an event. They are the prime contractor for the gig and are responsible for coordinating all resources. Data includes name, contacts (staff), contact and bid history, and various notes.
  - A **Sound/Lighting Company** provides sound reinforcement and lighting equipment, including setup and operations.
  - A **Client** is an individual (perhaps booking a private party) or corporate entity that is distinct from any band or venue. We may interact directly with a client, or the client might work primarily with a production company, band or venue. Data includes company name, contact person(s), payment terms, contract history, and preferences.
  - A **Venue** is a place or business where an event (party, reception, dinner, concert) occurs. Can be a bar or restaurant hiring a band directly or through a production company. Data includes address, contact(s), and various notes such as: hours, capacity, stage dimensions, power availability, acoustics notes, and uploaded photos or floor plans.
  - An **Act** is a solo musician, band of musicians, or other performance act. Data includes act name, members, genre, contact info, rider requirements, and historical notes (e.g., preferred setups or past issues).
  - A **Rental Company** provides supplemental equipment as needed.

---

## Major Feature Groups

### 1. Authentication & User Management

#### Authentication & SSO

- **Supabase SSO Support**: All OAuth providers supported by Supabase
- **Email/Password Authentication**: Standard signup with email confirmation
  - Send confirmation email with secure link (email/password signups only)
  - No configurable email confirmation settings

#### User Types & Data Architecture

- **Two User Types**:
  1. **Authenticated Users**: Full Supabase auth.users accounts with complete profiles
  2. **Placeholder Users**: User records without auth.users entries for planning (data-only, no system access)
- **Users Table Linking**: Link users table to supabase auth.users via email column
- **Invitation System**: Use separate `invitations` table to track invited placeholder users
  - **Secure Token Purpose**: Creates secure, one-time-use URLs for invitation acceptance
  - **Token Security**: Prevents unauthorized access to invitation acceptance

#### User Roles (Hierarchical)

- **Admin**: Full organization access, manages users and settings
- **Manager**: Create/edit gigs, assign personnel, manage assets
- **Staff**: View assigned gigs, limited editing
- **Viewer**: Read-only access

**Permissions Per Role**:

| Feature | Admin | Manager | Staff | Viewer |
|---------|-------|---------|-------|--------|
| View all gigs | ✅ | ✅ | Own gigs only | ✅ |
| Create/edit gigs | ✅ | ✅ | ❌ | ❌ |
| Assign staff | ✅ | ✅ | ❌ | ❌ |
| Manage assets | ✅ | ✅ | ❌ | ❌ |
| Invite users | ✅ | ❌ | ❌ | ❌ |
| Change roles | ✅ | ❌ | ❌ | ❌ |
| Delete data | ✅ | ❌ | ❌ | ❌ |

#### User Profile

- **Required Fields**: first_name, last_name, email
- **Optional Fields**: phone, address (line1, line2, city, state, postal_code, country), avatar_url
- **Auto-Completion**: First-time users complete profile after SSO login
- **Profile Editing**: Users can update their profile anytime

#### Team & Invitation Management

- **Invite by Email**: Admin sends invitation to new user with role assignment
- **Invitation Workflow**: 
  1. Admin enters email and selects role
  2. System creates invitation record with secure token
  3. Email sent with invitation link
  4. User clicks link, signs up/logs in, and joins organization
- **Organization Membership**: Display list of team members with roles
- **Role Changes**: Admin can change user roles
- **Remove Members**: Admin can remove users from organization

---

### 2. Organization Management

#### Organization Data

- **Required**: name, type
- **Optional**: url, phone_number, description, address (line1, line2, city, state, postal_code, country), allowed_domains
- **Relationships**: Organizations can participate in multiple gigs

#### Multi-Tenant Architecture

- **Tenant Isolation**: RLS policies enforce organization_id filtering on all queries
- **Shared Organizations**: Organization profiles shared across tenants (any organization can reference any other organization)
- **Organization Membership**: Users belong to one or more organizations with assigned roles
- **Organization Switcher**: Users can switch between organizations they belong to

#### Organization CRUD

- **Create**: Admin can create organizations for their tenant
- **Read**: View organization details, members, and associated gigs
- **Update**: Admin can edit organization details
- **Delete**: Admin can delete organizations (with dependency checks)

---

### 3. Gig Management

#### Gig Data Model

**Basic Fields**:
- **Required**: title, start (datetime), end (datetime), timezone, status
- **Optional**: notes, amount_paid, tags (array)

**Related Entities**:
- **Participants**: Organizations involved (act, venue, clients, production companies, sound/lighting companies)
- **Staff Slots**: Defined roles with optional staff assignments
- **Bids**: Financial proposals to other organizations
- **Kit Assignments**: Equipment packages assigned to gig

#### Gig Participants

- **Purpose**: Track which organizations are involved in a gig
- **Participant Types**: Act, Venue, Client, Production Company, Sound/Lighting Company, Rental Company
- **Multiple Participants**: Gig can have multiple participants of different types

#### Staff Slots & Assignments

- **Staff Slot**: Defined role needed for gig (e.g., "Sound Engineer", "Lighting Tech")
  - Attributes: title, count (how many needed), notes
- **Staff Assignment**: Assignment of specific user to a slot
  - Attributes: user_id, slot_id, status (Invited, Confirmed, Declined, Completed)
- **Unassigned Slots**: Slots can exist without assignments (TBD staffing)
- **Conflict Detection**: Warn when assigning staff to overlapping gigs

#### Bids

- **Purpose**: Track financial proposals for gigs
- **Bid Fields**: organization_id, amount, currency, status (Draft, Sent, Accepted, Rejected), notes
- **Multiple Bids**: Gig can have multiple bids from different organizations

#### Gig CRUD Operations

- **Create**: Manager+ can create gigs
- **Read**: All roles can view gigs (staff see only assigned gigs)
- **Update**: Manager+ can edit gigs
- **Delete**: Admin can delete gigs
- **Duplicate**: Copy gig with all related data (participants, slots, kit assignments)

---

### 4. Equipment Management

#### Assets

**Asset Data**:
- **Required**: category, manufacturer_model, acquisition_date
- **Optional**: sub_category, type, serial_number, vendor, cost, quantity, replacement_value, insurance_policy_added, insurance_class, notes

**Asset Categories**: Sound, Lighting, Video, Staging, Other

**Insurance Tracking**:
- Track which assets are insured
- Export insurance reports with replacement values
- Filter by insurance status

#### Kits (Equipment Packages)

**Kit Data**:
- **Required**: name
- **Optional**: description, notes, category, estimated_value

**Kit-Asset Relationships**:
- Kits contain multiple assets
- Assets can belong to multiple kits
- Track quantity of each asset in kit

**Kit Templates**:
- Create reusable equipment packages
- Quick assignment to gigs
- Easy duplication and modification

#### Kit Assignments

- **Purpose**: Assign equipment packages to gigs
- **Data**: kit_id, gig_id, notes
- **Multiple Assignments**: Gig can have multiple kits assigned

---

### 5. Dashboard, Reporting & Analytics

#### Gig Reports

- **Revenue by Month**: Track income per month
- **Gigs by Status**: Count gigs in each status
- **Gigs by Venue**: Track which venues are busiest
- **Staff Utilization**: Track which staff work most gigs

#### Asset Reports

- **Asset Inventory**: List all assets with values
- **Insurance Report**: Assets with insurance details
- **Asset Utilization**: Which assets are used most often
- **Depreciation**: Track asset values over time

#### Financial Reports

- **Revenue vs. Expenses**: Compare income to costs
- **Outstanding Payments**: Track unpaid gigs
- **Bid Acceptance Rate**: Track proposal success

---

### 6. Data Import/Export

#### CSV Import

- **Import Types**: Gigs, Assets
- **Validation**: Client-side validation before import
- **Error Handling**: Display errors inline, allow correction before import
- **Batch Import**: Import multiple records at once
- **Organization Mapping**: Auto-create organizations if they don't exist (for gig imports)

#### CSV Export

- **Export Types**: Gigs, Assets & Kits
- **Filters**: Export filtered/searched data

---

### 7. Notifications & Reminders

#### Email Notifications

- **Invitation Emails**: When user invited to organization
- **Staff Assignment**: When staff assigned to gig
- **Gig Reminders**: Day before gig starts
- **Status Changes**: When gig status changes

#### In-App Notifications

- **Bell Icon**: Notification count badge
- **Notification List**: View all notifications
- **Mark as Read**: Clear notifications

#### Push Notifications (Mobile)

- **Assignment Notifications**: Staff assignments
- **Gig Reminders**: Upcoming gigs
- **Status Updates**: Gig status changes

---

### 8. Calendar Integration & Scheduling

#### Calendar View

- **Month View**: Display gigs in calendar format
- **Week View**: Detailed weekly schedule
- **Day View**: Hour-by-hour breakdown
- **Filters**: Filter by status, staff, venue, act

#### Calendar Integration

- **Google Calendar Integration**: Direct integration with Google Calendar API

#### Conflict Detection

- **Staff Conflicts**: Warn when staff assigned to overlapping gigs
- **Equipment Conflicts**: Warn when equipment assigned to overlapping gigs
- **Venue Conflicts**: Warn when scheduling multiple gigs at same venue/time

---

### 9. Technical Documentation

#### Attachments & File Management

- **Organization Attachments**: Upload contracts, insurance certificates, W-9s, vendor agreements
- **Gig Attachments**: Upload stage plots, input lists, contracts, riders, production schedules
- **Asset Attachments**: Upload purchase receipts, manuals, warranty documents, calibration certificates
- **Kit Attachments**: Upload packing lists, setup diagrams, transport manifests
- **Supported File Types**: PDFs, images (JPG, PNG), documents (DOC, XLSX), CAD files (DWG, DXF)
- **File Organization**: Tag and categorize attachments for easy retrieval
- **Version Control**: Track document versions and revision history

#### Stage Plots & Technical Documentation

- **Stage Plot Editor**: Interactive editor for creating stage layouts
- **Input Lists**: Track microphone and line assignments
- **Packout Checklists**: Auto-generated from kit assignments
- **Technical Riders**: Document technical requirements for acts

#### Notes & Annotations

- **Rich Text Notes**: Markdown support for formatting notes
- **Private Notes**: Organization-specific notes on shared entities
- **Tagging System**: Categorize notes for easy filtering
- **Search**: Full-text search across all notes and attachments

---

### 10. Mobile Features

#### Mobile-Optimized Interface

- **Touch-Optimized UI**: Minimum 44px touch targets, swipe gestures, bottom sheets
- **Responsive Design**: Adaptive layouts for mobile browsers
- **Card-based Layouts**: Touch-friendly information consumption
- **Bottom Navigation**: Easy thumb access to primary actions

#### Offline Support

- **Offline-First Architecture**: Core functionality works without internet connection
- **Automatic Sync**: Background synchronization when connection restored
- **Sync Indicators**: Visual feedback for sync status
- **Conflict Resolution**: Handle concurrent offline edits

#### Native Features

- **Biometric Authentication**: Face ID, Touch ID, fingerprint authentication
- **Camera Integration**: Scan asset barcodes/QR codes, capture photos
- **Push Notifications**: Real-time alerts for assignments, reminders, status changes
- **Location Services**: GPS for venue check-in, travel distance calculations

#### Progressive Web App (PWA)

- **Installable**: Add to home screen functionality
- **App-like Experience**: Full-screen mode, splash screen
- **Background Sync**: Queue actions when offline
- **Push Notifications**: Web push for real-time updates

---

## CSV Import Feature Requirements

### Overview

CSV import functionality for gigs and assets with client-side validation, immediate import of valid rows, and an error correction interface for invalid rows. For gigs, act/venue columns are automatically mapped to gig_participant rows, and organizations are created if they don't exist.

### User Stories

**As a production manager**, I want to:
- Import my existing gig data from a spreadsheet
- See validation errors before importing
- Fix invalid rows and re-import
- Automatically create organizations that don't exist
- Import gigs with act/venue relationships

**As an equipment manager**, I want to:
- Import my asset inventory from a spreadsheet
- Bulk import equipment with all details
- See any errors and fix them before importing
- Track insurance information during import

### CSV Templates

#### Gig Template Columns

| Column | Required | Type | Example | Notes |
|--------|----------|------|---------|-------|
| title | Yes | string | "Summer Festival" | Event name |
| start | Yes | ISO datetime | "2024-07-15T19:00:00" | Start datetime |
| end | Yes | ISO datetime | "2024-07-15T23:00:00" | End datetime |
| timezone | Yes | IANA timezone | "America/New_York" | Must be valid IANA timezone |
| status | Yes | enum | "Booked" | DateHold, Proposed, Booked, Completed, Cancelled, Settled |
| act | No | string | "The Rock Band" | Organization name (type: Act) |
| venue | No | string | "Madison Square Garden" | Organization name (type: Venue) |
| tags | No | comma-separated | "festival,outdoor,summer" | Converted to array |
| notes | No | string | "Load-in at 2pm" | Free-form text |
| amount_paid | No | number | "5000.00" | Numeric or empty |

#### Asset Template Columns

| Column | Required | Type | Example | Notes |
|--------|----------|------|---------|-------|
| category | Yes | string | "Sound" | Asset category |
| manufacturer_model | Yes | string | "Shure SM58" | Model identifier |
| acquisition_date | Yes | YYYY-MM-DD | "2023-01-15" | Date format |
| sub_category | No | string | "Microphones" | Sub-classification |
| equipment_type | No | string | "Dynamic Microphone" | Maps to 'type' field |
| serial_number | No | string | "SN12345" | Unique identifier |
| vendor | No | string | "B&H Photo" | Purchase source |
| cost_per_item | No | number | "99.99" | Maps to 'cost' field |
| quantity | No | integer | "4" | Defaults to 1 |
| replacement_value_per_item | No | number | "120.00" | Maps to 'replacement_value' |
| insured | No | boolean | "yes" | Maps to 'insurance_policy_added' |
| insurance_category | No | string | "Microphones" | Maps to 'insurance_class' |
| notes | No | string | "Purchased in bulk" | Free-form text |

### Validation Rules

#### Gig Validation

- **Required Fields**: title, start, end, timezone, status
- **Date Validation**: 
  - Start and end must be valid ISO datetime strings
  - End must be after start
- **Status Validation**: Must be valid enum value (DateHold, Proposed, Booked, Completed, Cancelled, Settled)
- **Timezone Validation**: Must be valid IANA timezone
- **Tags**: Comma-separated, converted to array
- **Amount_paid**: Numeric or empty
- **Act/Venue**: 
  - Search organizations table by name (case-insensitive)
  - If not found, create new organization with appropriate type ('Act' or 'Venue')
  - Map to gig_participants table

#### Asset Validation

- **Required Fields**: category, manufacturer_model, acquisition_date
- **Date Validation**: Acquisition_date must be valid date (YYYY-MM-DD format)
- **Numeric Fields**: 
  - Cost_per_item: numeric or empty
  - Replacement_value_per_item: numeric or empty
  - Quantity: positive integer or defaults to 1
- **Boolean Fields**: Insured: parse from text ('yes', 'true', '1', etc.)

### Import Logic

#### Gig Import Process

1. Parse CSV file
2. Validate all rows
3. For each valid row:
   - Search for act organization by name (case-insensitive)
   - If not found, create new organization with type 'Act'
   - Search for venue organization by name (case-insensitive)
   - If not found, create new organization with type 'Venue'
   - Create gig with all basic fields
   - Create gig_participants for act if provided
   - Create gig_participants for venue if provided
   - Always include current organization as a participant
4. Show success count and any errors

#### Asset Import Process

1. Parse CSV file
2. Validate all rows
3. For each valid row:
   - Map CSV columns to database fields:
     - cost_per_item → cost
     - replacement_value_per_item → replacement_value
     - equipment_type → type
     - insured → insurance_policy_added
     - insurance_category → insurance_class
   - Create asset with organization_id from current context
4. Show success count and any errors

### User Interface Requirements

#### Import Screen Components

- **File Upload**: Drag & drop or file picker
- **Import Type Selector**: Radio buttons for "Gigs" or "Assets"
- **Download Template Button**: Generate and download CSV template
- **Parsed Rows Table**: Display all parsed rows with validation status
- **Validation Indicators**: Green checkmark for valid, red X for invalid
- **Error Messages**: Inline error descriptions per row
- **Editable Invalid Rows**: Allow editing invalid rows before import
- **Import Button**: "Import Valid Rows" - disabled if no valid rows
- **Progress Indicator**: Show progress during import
- **Results Summary**: Display success count and error count

#### Error Correction UI

- **Inline Editing**: Click to edit invalid row fields
- **Real-time Validation**: Re-validate on change
- **Organization Autocomplete**: Search existing organizations for act/venue fields
- **Re-import**: After corrections, re-import specific rows

### User Flow

1. User navigates to Gig List or Asset List screen
2. Clicks "Import" button
3. Selects import type (Gigs or Assets)
4. Downloads template (optional) to see expected format
5. Uploads CSV file (drag & drop or file picker)
6. System parses and validates all rows
7. Valid rows displayed in table, ready to import
8. Invalid rows displayed with inline editing capability
9. User fixes invalid rows directly in the UI
10. User clicks "Import Valid Rows" to import all valid rows
11. System shows success/error summary
12. After successful import, user is redirected to list view

### Technical Implementation Notes

- **Parser Library**: Use `papaparse` for CSV parsing
- **Organization Lookup**: Case-insensitive search on organizations.name
- **Auto-Create Organizations**: If act/venue not found, create with type 'Act' or 'Venue'
- **Batch API Calls**: Import rows in batches to avoid overwhelming server
- **UUID Generation**: Auto-generated by database (no duplicate detection)
- **No Duplicate Detection**: Each import creates new records

### Future Enhancements

- **Bulk Edit**: Edit multiple rows at once
- **CSV Export**: Export existing data to CSV format
- **Preview Changes**: Preview before importing
- **Undo/Rollback**: Rollback imports
- **Import Progress**: Cancel in-progress imports
- **Update Existing**: Match by ID or unique fields and update

---

## Complex Events: Hierarchical Gig Structure

### Overview

The hierarchical gig structure enables complex events (festivals, multi-act shows, multi-day events, multi-venue events) where gigs can have parent-child relationships. This allows:
- **Equipment** consistency per stage throughout an event
- **Staffing** that is persistent (same staff for all days) or variable (different staff on different days)
- **Acts** that change for each individual performance
- **Participants** that could be consistent or variable (different companies per stage)
- **Bids** that encompass the whole event or roll up from components

### Key Principles

#### Core Design Philosophy

- **Minimal Schema Changes**: Add only essential columns to maintain simplicity
- **Backward Compatibility**: Existing gigs continue to work without modification
- **Recursive Inheritance**: Use database queries to resolve inheritance, not explicit metadata
- **Child Overrides Parent**: Child values always take precedence over parent values
- **Hierarchical Access**: Users with access to parent gigs automatically access children

#### Inheritance Model

- **Simple Precedence**: Child values override parent values at all levels
- **No Explicit Overrides**: No need for override flags - just define values on child gigs
- **Optional Hierarchy**: Most gigs remain flat (no parent) for simple use cases

### Schema Design

#### Core Schema Changes

```sql
-- Add parent relationship
ALTER TABLE gigs ADD COLUMN parent_gig_id UUID REFERENCES gigs(id);

-- Add depth for performance and validation
ALTER TABLE gigs ADD COLUMN hierarchy_depth INTEGER DEFAULT 0;
```

#### Constraints

- **No Cycles**: Prevent A→B→A relationships through database triggers
- **Date Validation**: Child gig dates must fall within parent date range
- **Max Depth**: Limit hierarchy depth (recommended: 3 levels)

### Inheritance Behavior

#### Value Precedence Rules

- **Participants**: Child participants are added to inherited parent participants
- **Staff Slots**: Child staff slots override parent slots with same role
- **Equipment**: Child equipment assignments override parent assignments for same assets
- **Bids**: All bids from hierarchy are considered (no override logic)

#### Recursive Query Pattern

All inherited data is resolved using recursive CTEs that walk up the hierarchy tree:

```sql
WITH RECURSIVE gig_hierarchy AS (
  SELECT id, parent_gig_id, 0 as depth
  FROM gigs
  WHERE id = $target_gig_id

  UNION ALL

  SELECT g.id, g.parent_gig_id, gh.depth + 1
  FROM gigs g
  JOIN gig_hierarchy gh ON g.id = gh.parent_gig_id
  WHERE g.parent_gig_id IS NOT NULL
)
SELECT ...
FROM related_table rt
JOIN gig_hierarchy gh ON rt.gig_id = gh.id
ORDER BY gh.depth ASC  -- Parent values first
```

### Business Rules

#### Status Propagation

**Default Behavior (Simple)**:
- Parent and child gigs maintain independent statuses
- No automatic cascading of status changes
- Children can complete while parent remains booked

**Optional Advanced Logic (Future)**:
- **Cascade Cancellation**: When parent is cancelled, optionally cancel all children
- **Completion Rules**: Parent can only complete when all children are completed
- **Status Constraints**: Children cannot be booked if parent is cancelled

#### Conflict Resolution

**Staff Conflicts**:
- Prevent double-booking staff across overlapping gigs in same hierarchy
- Allow same staff on non-overlapping gigs within hierarchy
- Warn when staff availability conflicts arise

**Equipment Conflicts**:
- Track equipment usage across hierarchy
- Prevent double-assignment of same equipment to overlapping gigs
- Allow equipment reuse on non-overlapping gigs

#### Access Control

**Row-Level Security**:
- Users can access child gigs if they can access the parent
- Organization membership grants access to entire hierarchies
- Private data (notes, annotations) respects hierarchy boundaries

**Permission Inheritance**:
- Admin role on parent grants admin access to children
- Manager role allows creating child gigs
- Viewer role allows read-only access to hierarchy

### Use Cases

#### Example 1: Multi-Day Music Festival

```
Summer Music Festival (parent_gig_id = null)
├── Main Stage Setup (parent_gig_id = festival.id)
│   ├── Equipment: Full PA system, lighting rig
│   ├── Staff Slots: Stage Manager, Lighting Tech
│   ├── Participants: Venue, Production Company
│   └── Friday Night Concert (parent_gig_id = main_stage.id)
│       ├── Act: Headliner Band
│       └── Staff Assignments: Specific lighting tech for this show
├── Side Stage Setup (parent_gig_id = festival.id)
│   └── [inherits equipment/staff from festival, overrides with smaller setup]
└── VIP Lounge (parent_gig_id = festival.id)
    └── [inherits equipment/staff from festival, overrides with lounge setup]
```

#### Example 2: Wedding with Ceremony + Reception

```
Sarah & John Wedding (parent_gig_id = null)
├── Ceremony at Church (parent_gig_id = wedding.id)
│   ├── Equipment: Basic sound system
│   ├── Staff: sound engineer, musicians
│   └── Participants: sound company, band
└── Reception at Hotel (parent_gig_id = wedding.id)
    ├── Equipment: Full DJ/sound system, DJ lighting
    ├── Staff: DJ, sound engineer, lighting engineer
    └── Participants: Hotel (venue), DJ company, sound company, lighting company
```

### UI/UX Requirements

#### Progressive Disclosure

- **Simple First**: Most users never need hierarchy - keep it hidden until needed
- **Contextual UI**: Show hierarchy features only when creating/editing hierarchical gigs
- **Optional Complexity**: Users can opt into complex features without affecting simple workflows

#### Visual Hierarchy Indicators

- **Parent-Child Relationships**: Clear visual indicators (nesting, indentation, breadcrumbs)
- **Inheritance Status**: Show which values are inherited vs. locally defined
- **Hierarchy Depth**: Visual cues for different levels (colors, icons, indentation)
- **Status Propagation**: Visual indicators for related gig statuses

#### Gig Creation Workflow

**Parent Gig Creation**:
- Standard gig creation form with optional "Create as Parent" toggle
- When enabled, show hierarchy planning section
- Allow defining shared resources (equipment, staff slots, participants)

**Child Gig Creation**:
- Parent selection dropdown (filtered by accessible gigs)
- Pre-populated inherited values
- Clear indication of what can be overridden
- Validation against parent constraints

#### Form Design Patterns

**Inherited Value Display**:
```
[Field Label] (Inherited from "[Parent Gig Name]")
[Value Display - Read-only] [Override Button]
[Override: Editable Input Field - when override enabled]
```

**Hierarchy Navigation**:
- Breadcrumb trail: Festival > Main Stage > Friday Night
- Sibling navigation: Previous/Next child gigs
- Parent jump: Quick access to parent gig details

#### List View Enhancements

**Gig List with Hierarchy**:
- Indented rows for child gigs
- Expandable/collapsible parent rows
- Hierarchy-aware sorting and filtering
- Bulk selection across hierarchies

**Status Overview**:
- Parent gig shows rollup status of children
- Color-coded hierarchy indicators
- Quick status changes with cascade options

### Implementation Phases

#### Phase 1: Core Schema (Database Migration)

1. Add `parent_gig_id` and `hierarchy_depth` to gigs table
2. Create database constraints (no cycles via triggers)
3. Add indexes on `parent_gig_id` for performance

#### Phase 2: Inheritance Logic (Backend)

1. Implement recursive query functions for each entity type
2. Update application data access layer to use effective values
3. Add hierarchy-aware RLS policies
4. Create database views for common hierarchy queries

#### Phase 3: Application Updates (Frontend)

1. Update gig creation/edit forms to support parent selection
2. Modify queries to use inheritance-aware logic
3. Add validation for hierarchy constraints
4. Update permission checks for hierarchical access

#### Phase 4: Advanced Features (Future)

1. Bulk operations across hierarchies
2. Status cascade options
3. Hierarchy templates and presets
4. Advanced reporting across hierarchies

### Performance Optimization

**Query Optimization**:
- Use recursive CTEs efficiently with proper indexing
- Cache frequently accessed hierarchy data
- Implement pagination for large hierarchies
- Consider materialized views for complex aggregations

**Database Indexes**:
- Index on `parent_gig_id` for fast hierarchy traversal
- Composite indexes on `(gig_id, related_entity)` for related tables
- Partial indexes for active hierarchies only

**Caching Strategy**:
- Cache hierarchy structures for frequently accessed gigs
- Invalidate cache when hierarchy changes
- Use Redis/application cache for complex inheritance results

### Testing Requirements

**Unit Tests**:
- Recursive query correctness
- Inheritance resolution logic
- Constraint validation
- Permission inheritance

**Integration Tests**:
- Full hierarchy CRUD operations
- Complex event creation workflows
- Performance under load
- Data consistency across operations

**Edge Cases**:
- Deep hierarchies (3+ levels)
- Circular reference prevention
- Concurrent modifications
- Partial hierarchy access

### Benefits

- **Backward Compatible**: Existing gigs work unchanged (parent_gig_id is nullable)
- **Simple to Implement**: Minimal schema changes
- **Powerful**: Supports complex nested events
- **Flexible**: Easy to extend with more features later
- **Scalable**: Recursive queries with proper indexing perform well

---

## Related Documentation

- [Feature Catalog](./feature-catalog.md) - Implementation status of all features
- [Development Plan](../development/development-plan.md) - Refactoring roadmap
- [AI Coding Guide](../development/ai-agents/coding-guide.md) - Implementation patterns
- [Database Documentation](../technical/database.md) - Schema and RLS policies
- [Tech Stack](../technical/tech-stack.md) - Technology overview
- [UI Workflows](./workflows/) - User interface specifications

---

**Last Updated**: 2026-01-18  
**Maintained By**: Product Team  
**Review Frequency**: Update when requirements change or new features are added
