# GigManager Requirements & Features

**Purpose**: This document defines the functional requirements, business rules, and high-level features of the GigManager application. It focuses on WHAT the system should do and WHY, not HOW it should be implemented.

**Gig Manager** is a production and event management platform used by:

- Production companies managing events and performances;
- Sound and lighting companies tracking equipment and staff;
- Event producers coordinating venues, acts, and logistics.

## Overview

This app streamlines the management of gigs (where an act performs at a venue) for operators of sound and lighting companies, and event producers. By centralizing tools for tracking gear inventory, bids/proposals, personnel, venues, loadouts and documentation such as stage plots, we reduce manual errors, save time on preparation, and ensure efficient operations.

### Target Users

- Primary Users (may plan and manage gigs)
  - Production companies
  - Sound/lighting companies
  - Event producers

- Secondary Users (may participate in gigs)
  - Venues
  - Acts/Performers
  - Talent agencies
  - Equipment rental companies
  - Staging companies


### Key Features

- **Multi-Organization Collaboration:** The different organizations that participate in an event can all share and collaborate on the same gig, while tenants maintaining their own staffing, equipment, and financial information. 
- **Shared Organizations**: Organization profiles are shared so each tenant doesn't have to create them; users can belong to multiple organizations with role-based access control.
- **Gig Management**: Full lifecycle tracking from Date-Hold to Completed/Paid.
- **Asset Inventory**: Track equipment assigned to gigs and export insurance details.
- **Personnel Management**: Assign staff to roles, notify automatically, and check for conflicts.
- **Mobile Support**: Offline-first with push notifications and biometric authentication.
- **Calendar Integration**: Export to ICS and Google Calendar.
- **Export/Import:** Easy data export and import to/from spreadsheets.

### Key Benefits

- **Improved Coordination**: Collaborative data management across participants improves communication and reduces mistakes and misunderstandings.
- **Efficiency**: Automates notifications, confirmations, checklists, and tracking.
- **Integrated**: Track dates, equipment inventory, acts, venues, proposals, and staff in one place.
- **Risk Mitigation**: Maintain equipment inventory for insurance purposes and avoid double booking.
- **Purpose-built**: Unlike general event tools, this app specializes in coordinating acts, venues, equipment and supporting services

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

#### Mobile Experience
- **Touch-Optimized**: Minimum 44px touch targets, swipe gestures, bottom sheets
- **Native Integration**: Biometric authentication, camera for asset scanning, push notifications
- **Offline Support**: Critical workflows work without connectivity, with sync indicators

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


## Major Feature Groups

### 1. User Management

#### Authentication & SSO
- **Supabase SSO Support**: All OAuth providers supported by Supabase
- **Email/Password Authentication**: Standard signup with email confirmation
  - Send confirmation email with secure link (email/password signups only)
  - No configurable email confirmation settings

#### User Types & Data Architecture
- **Two User Types**:
  1. **Authenticated Users**: Full Supabase auth.users accounts with complete profiles
  2. **Placeholder Users**: User records without auth.users entries for planning (data-only, no system access)
- **Users Table Linking**: Link users table to auth.users via email column
- **Invitation System**: Use separate `invitations` table
  - **Secure Token Purpose**: Creates secure, one-time-use URLs for invitation acceptance
  - **Token Security**: Prevents unauthorized access to invitation acceptance

#### User Roles (Hierarchical)
- **Admin**: Full system access, manages organizations, users, and system settings
  - Can do everything Manager can do
- **Manager**: Can manage gigs, team members, and organization content  
  - Can do everything Member can do
- **Member**: Can be assigned to gigs, view relevant content
- **Viewer**: Read-only access to organization content

#### User Profile Management
- **Basic Profile Fields**:
  - first_name, last_name (required)
  - email (required, unique)
  - phone (optional)
  - avatar_url (optional)
- **Global Requirements**: Same required fields for all users (name and email only)

#### Invitation System & Team Management
- **Team Member Addition Options**:
  1. **Add Existing User**: Directly add authenticated users to organization
  2. **Add New User**: Create placeholder user profile immediately, with option to send invitation later
- **Invitation Flow**:
  - Create placeholder user record when adding new team member
  - User can be assigned to gigs immediately (as placeholder)
  - Send invitation email later to convert placeholder to authenticated user
  - Invitation includes secure token for account creation/acceptance
- **Invitation Features**:
  - Send invitation immediately or later
  - Track invitation status (pending, accepted, expired)
  - Secure token-based acceptance URLs

#### Non-Authenticated User Management
- **Placeholder User Creation**: Create user records (name, email) immediately when adding new team members
  - Can be assigned to gigs for planning purposes
  - Convert to authenticated users via invitation system
  - Data-only access (no system login)

#### Organization User Management
- **Team Management**:
  - Add existing authenticated users directly
  - Add new users (creates placeholder profile) with optional invitation
  - Send invitations later for placeholder users
  - Change user roles
  - Remove users from organizations
- **Account Management**:
  - **Deactivate Account**: Ability to deactivate user accounts
  - Prevent login while preserving data and gig assignments
  - Reactivate accounts when needed

#### Technical Architecture
- **Database Schema**:
  - Keep existing `users` table, link via email
  - Keep existing `invitations` table with secure tokens
  - Add `user_type` field: 'authenticated' | 'placeholder'
  - Add `account_status` field: 'active' | 'inactive' | 'pending'
- **API Updates**: Handle placeholder/authenticated user workflows
- **Backward Compatibility**: Support existing users

#### Integration Points
- **Email System**: For invitations and basic notifications (per-user Google Mail integration)



### User Placeholder Feature

#### Current System Analysis
The current `TeamScreen.tsx` supports two user addition workflows:
1. **Add Existing User**: Search for and add authenticated users who already have accounts
2. **Invite New User**: Send invitation email to create new user account (user doesn't exist until they accept)

#### New Feature: User Placeholders
**Feature Name**: "User Placeholder" with "Pending" user status indicators

**Concept**: When inviting a new user, immediately create a user record that can be assigned to staffing slots, while still sending the invitation email. When the invited user authenticates, the pending user converts to an active authenticated user via a user status update.

#### Required Implementation Changes

##### 1. Database Schema Updates
```sql
-- Add new column to users table
ALTER TABLE users ADD COLUMN user_status TEXT DEFAULT 'active' CHECK (user_status IN ('active', 'inactive', 'pending'));
```

##### 2. API Function Updates

**Modified Function: `inviteUserToOrganization`**

```typescript
// Create user record immediately with user_status = 'pending'
// Add user to organization_members with specified role
// Send invitation email (existing functionality)
// Return both (pending) user and invitation objects
```

**New Function: `convertPendingToActive`**
```typescript
// Called during authentication when pending user accepts invitation
// Update user_status from 'pending' to 'active'
// Link user record to auth.users account
// Mark invitation as accepted
```

##### 3. TeamScreen UI Updates

**Keep Existing Two-Tab Structure:**
- **Add Existing User**: Unchanged (adds authenticated users)
- **Invite New User**: Modified to create user placeholder immediately

**Invite New User Tab Changes:**
- Form: first_name, last_name, email, role (unchanged)
- **Behavior**: Creates user placeholder record immediately + sends invitation
- Can be assigned to gigs right away

**Member List Updates:**
- Show small "Pending" badge/status indicator for placeholder users (perhaps under the 'Last Login' column.)

##### 4. Invitation Flow Updates

**Modified Flow:**
```
Create New User → Add to Organization → Send Email → User Accepts → Convert to Active
```

**Invitation Acceptance:**
- When user clicks invitation link and authenticates:
  - Check for pending invitations, mark invitation as accepted
  - Locate existing placeholder user by email
  - Convert user_status from 'pending' to 'active'
  - Link to auth.users account
  - User is already added to organization (happened when placeholder was created)

#### Implementation Steps

1. **Database Schema**: Add user_status column
2. **API Functions**: Update invite function to create placeholders, add conversion function
3. **TeamScreen UI**: Modify invite tab to 'Create New User' (with 'pending' status)
4. **Invitation System**: Update acceptance flow for placeholder conversion
5. **Authentication**: Handle conversion of 'pending' to 'active' during login/signup

#### Key Technical Details

- **User placeholders** have full user records but user_status = 'pending'
- **Email uniqueness** maintained across all user statuses
- **Organization membership** established when placeholder is created
- **Role assignment** happens during placeholder creation
- **Invitation acceptance** converts pending → active status

### 2. Organizations, Multi-Tenancy and Access Control

- Users can be members of multiple organizations and can switch their active organization context as needed.
- Users can be automatically matched to an organization using their email domain.
- Organizations can restrict membership by specifying allowed email domains (comma-separated list).
- Organizations can be configured with automatic membership approval for users from specified email domains.
- Users can create a new organization during initial login or when switching organizations. 

**Shared Organizations (Global Directory):**

- Organization profiles are shared across all tenants.
- Any user can create a new organization if it doesn't exist.
  - If the user wishes to be a member of the new organization, the role will be **Admin**
  - If the user does not wish to be a member of the new organization, the role will be **Viewer**

- When creating a new organization, basic information can be pulled in from Google Places API.

**Tenant-Private Context:**
- Users work within the data scope of an organization and maintain private, separate data about gigs, equipment, staffing, and bids. 
- Tenants reference shared organizational profiles while keeping the relationships private. 
- Tenants can add private notes, tags (preferred vendor, blocked) to organization profiles.
- All tenant-authored data is isolated using that tenant's `organization_id`
- Roles per tenant (Admin, Manager, Staff, Viewer) control CRUD on tenant-private data

#### Access Control

**User Roles (per organization):**

Members of an organization are assigned one of four application roles that determine access.

- **Admin**: Full admin for that org, manage members, all data within org. (Is only role that can update shared organization data.)
- **Manager**: Create/edit gigs, assign personnel, manage assets
- **Staff**: View assigned gigs, confirm or reject assignments, view checklists and notes
- **Viewer**: Read-only access

#### Organization Management Features

- **Search and Filtering**: Quick search by name, location, or attributes
- **Import/Export**: CSV or Google Contacts sync
- **Organization Switching**: Switch active organization updates session context

#### Acceptance Criteria

- A tenant can switch active organization context; data listings filter by that organization
- A tenant can create a gig and link it to organizations (venue, client, act, etc.) via roles
- Any user can search and view shared organizations; only owners/editors can modify them
- A tenant can attach private notes/tags to a global organization; other tenants cannot see these
- RLS prevents cross-tenant reads/writes for tenant-private tables

### 3. Gig Management

#### Core Features

**Gig Creation:**
- Entry of date, time, venue, client/act, status, type, budget, revenue received
- Staff assigned, equipment from inventory, equipment rentals
- Basic notes and tags
- Google Calendar integration for scheduling

**Status Tracking:**
- Statuses: DateHold, Proposed, Booked, Completed, Cancelled, Settled
- **Status transitions: Any status can transition to any other status (no restrictions)**
- All status changes recorded in `gig_status_history` for auditability
- Automated reminders for staff and rental vendors
- Email/push notifications for upcoming gigs

**Relations Integration:**
- Link gigs to proposals/bids, bands, venues, clients, personnel, and assets
- Holistic views of all gig relationships
- Multiple organizations can participate in a gig with different roles

**Reporting:**
- Generate summaries of past gigs
- Financial overviews for invoicing
- Performance analytics

#### Core Fields

**Required:**
- Title (1-200 characters)
- Start date/time (TIMESTAMPTZ)
- End date/time (TIMESTAMPTZ) - gigs can span midnight, must be after start time
- Timezone (IANA timezone identifier)
- Status (enum)

**Optional:**
- Parent Gig (reference to another gig for hierarchical relationships)
- Tags (TEXT[], array of strings)
- Primary contact (user ID)
- Amount paid (DECIMAL)
- Notes (TEXT, Markdown-formatted)

#### Gig Hierarchy
- Gigs can have parent-child relationships to represent complex events (e.g., multi-day festivals, main event + after-parties)
- Hierarchy depth is tracked for performance and validation (max depth TBD)
- Child gigs inherit certain properties from parent gigs (timezone, tags)
- Status changes can optionally cascade from parent to child gigs

#### Organization Relationships

- Link a gig to one or more organizations via roles:
  - Venue, Client, Act, ProductionCompany, SoundLightingCompany, RentalCompany, Other
- Multiple links of the same role allowed (e.g., multiple rental companies)
- Creates `gig_participants` records automatically

#### Calendar Integration

- One-way export: ICS feed per organization and per user (assigned gigs only)
- Future (MVP+): Google Calendar bi-directional sync with service account

#### Gig Lifecycle Rules

- Booked means client has accepted
- On transition to Booked, send notification to assigned personnel for confirmation
- Transitioning to Booked should check for time conflicts (optional warning, not blocking)

### 4. Personnel Management

As a team lead, I want to assign and track hired personnel for each gig so that I can ensure proper staffing and role coverage.

#### Overview
Assign and track hired personnel for each gig to ensure proper staffing and role coverage.

#### Core Features

**Personnel Database:**
- List of available staff with skills (sound mixing, lighting design, etc.)
- Rates, availability calendars, and certifications
- Contact information and preferences

**Assignment to Gigs:**
- Select and assign positions (e.g., "FOH Engineer," "Stage Tech") per gig
- Conflict checks for overlapping schedules
- Role-based assignments with required counts

**Staff Roles:**
- Enumerated staff roles (FOH, Monitor, Lighting, Stage, etc.)
- Global staff_roles table for consistency
- Enables future staffing template functionality based on gig tags

**Communication Tools:**
- Basic notifications and messaging
- Exportable contact lists for gig-day coordination
- Status tracking (Requested, Confirmed, Declined)

**Performance Tracking:**
- Log notes, ratings, or feedback post-gig
- Historical reference for future hiring decisions

#### Assignment Workflow

1. Define staff needs for gig (role, required count, notes)
2. Create `gig_staff_slots` entries
3. Assign users to slots via `gig_staff_assignments`
4. System sends notification to assigned user
5. User accepts or declines assignment
6. Status updated, gig manager notified

### 5. Asset Inventory Management

As an inventory manager, I want to track assets for packout and insurance so that I can avoid shortages and maintain accurate records. I want to be able to group assets into kits (there can be many kits with different combinations of the same assets) and then assign kits to gigs. 

#### Overview
Track assets for packout and insurance to avoid shortages and maintain accurate records.

#### Core Features

**Inventory Catalog:**
- All assets are scoped to an organization (`organization_id`)
- Serial numbers must be unique (if provided)
- Assets can be filtered by category, sub_category, and search query
- Items with serial numbers, condition, purchase date, value
- Categories (e.g., mics, lights, cables)
- Barcode/QR scanning for quick adds

**Kit Management:**
- Create reusable collections (kits) of equipment that can be assigned to gigs
- Assets can be included in multiple kits
- Kits can contain assets from different categories (e.g., "Small Lighting Setup", "XLR Cable Kit")
- Kit templates for common configurations (e.g., "Wedding DJ Setup", "Concert Front of House")
- Kit versioning and duplication for variations

**Availability Checks:**
- Real-time status (available, in use, maintenance)
- Search by type, location, or condition
- Low stock alerts
- Conflict detection to prevent double-booking equipment across overlapping gigs

**Insurance Reporting:**
- Generate reports on total value, depreciations, item histories
- Export for insurance claims
- Track replacement values

**Integration with Gigs:**
- Assign kits to gigs instead of individual assets
- Automatic warning of asset conflicts when assigning kits
- Usage logging for wear-and-tear tracking
- Packout checklist generation based on assigned kits

#### Core Fields

**Required:**
- Organization ID
- Category (1-50 chars, e.g., "Audio", "Lighting", "Video")
- Manufacturer/model

**Kit Requirements:**
- Name (1-200 characters)
- At least one asset must be assigned to each kit
- Unique constraint: Same asset cannot be added to the same kit multiple times
- Unique constraint: Same kit cannot be assigned to the same gig multiple times

**Optional but Important:**
- Serial number (unique per organization if provided)
- Acquisition date (DATE)
- Cost (DECIMAL(10,2), >= 0)
- Replacement value (DECIMAL(10,2), >= 0, for insurance)
- Sub-category (TEXT)
- Vendor (TEXT)
- Type (TEXT)
- Description (TEXT, Markdown-formatted)
- Insurance policy added (BOOLEAN, default false)

### 6. Bid Tracking

#### Overview
Track bids and proposals for gigs throughout the sales process.

#### Core Features

- Link multiple bids to a gig
- Track amount, date given, result (Pending/Accepted/Rejected/Withdrawn)
- Notes for context and follow-up
- Historical reference for pricing and win rates

## Feature Ideas

These are various feature ideas that need more refinement and description

#### Stage Plots

- Interactive editor for diagramming stage layouts
- Drag-and-drop elements (monitors, lights, instruments)
- Export to PDF/image
- Version control and templates

#### Input Lists

- Customizable tables for channels, instruments, mic types
- Linked to bands for auto-population
- Export and sharing capabilities

#### Packout Checklists

- Auto-generate based on gig details
- Include specific equipment for venue type or band needs
- Checkboxes, quantities, and print/export options
- Offline support for mobile use

- Templates for recurring setups

#### Technical Riders

- Create and manage rider documents
- Version control and sharing
- Template support

## Non-Functional Requirements

### Performance
- App loads in under 2 seconds
- Handles up to 500 gigs/assets without lag
- Efficient database queries with proper indexing
- Pagination for large result sets

### Security
- Role-based access control (Admin, Manager, Staff, Viewer)
- Data encryption at rest and in transit
- Secure authentication (OAuth, JWT)
- Row-Level Security for multi-tenant data isolation
- No sensitive data exposed in error messages or logs
- HTTPS required in production

### Usability
- Responsive design for web and mobile
- Offline support for checklists on mobile
- Native mobile authentication (biometric)
- Intuitive navigation and interactions
- Clear error messages and validation feedback
- Progressive disclosure of complex forms

### Scalability
- Cloud-hosted with auto-scaling capability
- Initial support for 1-10 users per organization
- Connection pooling for database efficiency
- Optimized for growth to 100+ users

### Accessibility
- WCAG AA compliance minimum
- Proper color contrast
- Keyboard navigation support
- Screen reader friendly
- Touch targets minimum 44x44px
- Focus states visible

### Mobile Considerations
- Touch-friendly button sizes (minimum 44x44px)
- Touch-friendly input heights (minimum 44px)
- Full-screen layout optimized for mobile viewport
- Card-based layouts that stack vertically
- Bottom sheets or modals for secondary actions
- Sticky headers or action buttons where appropriate
- Native input types for better mobile keyboard experience
- Progressive disclosure: Show primary fields first

### Data Integrity
- Foreign key constraints prevent orphaned records
- Transactions for multi-step operations
- Audit trails for critical changes (gig status history)
- Automatic timestamps (created_at, updated_at)
- Soft deletes where appropriate

### Technology Constraints
- Database: PostgreSQL (local dev via Homebrew, Supabase for production)
- Frontend: React/Next.js with TypeScript
- No hyperscaler required (Vercel/Render for hosting)

## Competitive Landscape

### Technical Documentation Tools
- **SoundDocs** - Free, open-source web platform specializing in comprehensive event documentation including patch lists, visual stage plots, mic plots, pixel maps, run of shows, production schedules, comms planning, and audio analysis tools. Strong focus on technical production documentation but lacks business operations like gig booking, personnel management, and equipment inventory tracking.
- **BandHelper** - Cross-platform (iOS, Android, Mac, web) band management app with stage plots, input lists, set lists, contact databases, and multi-user collaboration. Comprehensive for band operations but lacks equipment inventory tracking and personnel hiring workflows.
- **Stage Plot Pro**, **StagePlot Guru**, **Stage Plan** - Focus on visual setups and technical specs but lack full gig/personnel/inventory management

### Gig and Venue Management Software
- **Prism.fm** - Comprehensive music venue platform with gig booking, centralized calendars, artist holds, settlements, staff management/scheduling, technical rider handling, and ticketing integration. Strong on venue operations and artist management but lacks technical production tools like stage plots, input lists, and equipment inventory tracking.
- **Opendate** - Venue calendar and booking software with artist discovery features and Spotify integrations for band data. Handles booking workflows and management/agent contacts but lacks personnel position tracking, equipment inventory, and technical configuration tools.
- **My Nightclub Manager** - Closest competitor with staff scheduling, inventory control, and stage plot visualization, but venue-centric

### Personnel and Crew Management
- **CrewCaller Pro** - Focuses on crew assignments, scheduling, notifications, and availability tracking for roles/shifts. Strong on personnel coordination but requires integration with gig management and equipment systems.
- **EventPro** - Venue management software with room/resource scheduling, personnel coordination, and event planning capabilities. Comprehensive for venue operations but lacks technical production tools and equipment inventory.

### Additional Tools
- **Gigwell** - Agent-focused venue booking software with event management and scheduling. Handles client relationships and basic personnel but gaps in inventory and technical production setups.

### Gap Analysis
The competitive landscape shows significant fragmentation. Technical documentation tools like SoundDocs excel at production paperwork but ignore business operations. Gig management platforms like Prism.fm and BandHelper handle scheduling and basic coordination but lack deep technical production capabilities. Venue-specific tools focus on operations but miss the broader production ecosystem. Most organizations currently combine 2-4 different apps to cover their needs, creating workflow inefficiencies and data silos.

### Differentiation

**What makes GigManager unique:**

- **Complete integration**: Seamlessly connects gig management, equipment inventory, personnel coordination, technical documentation, and financial tracking in a single platform
- **Multi-stakeholder collaboration**: Enables all participating organizations (production companies, sound/lighting crews, venues, acts) to share data while maintaining appropriate access controls
- **Technical depth**: Combines business operations with production-specific tools (stage plots, input lists, packout checklists) that general event software lacks
- **Equipment intelligence**: Advanced inventory management with insurance reporting, conflict detection, and auto-generated checklists
- **Offline-first mobile experience**: Full functionality in low-connectivity environments with biometric authentication
- **Open ecosystem**: Shared organization profiles prevent data duplication while maintaining tenant-specific relationships

## Related Documentation

- **Database Schema**: See SPECIFICATIONS/DATABASE.md
- **User Flows**: See SPECIFICATIONS/UI_FLOWS.md
- **Tech Stack**: See TECH_STACK.md
