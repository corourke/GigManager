# Database Specification

## Overview

The database uses PostgreSQL 15+ with Prisma ORM for type-safe database access. All enum types are defined in the Prisma schema as the single source of truth.

## High-Level Entity Diagram

```mermaid
erDiagram
  %% Core organizational structure
  USERS ||--o{ ORGANIZATION_MEMBERS : belongs
  ORGANIZATIONS ||--o{ ORGANIZATION_MEMBERS : has

  %% Gig management and participation
  GIGS ||--o{ GIG_STATUS_HISTORY : has
  GIGS ||--o{ GIG_PARTICIPANTS : links
  ORGANIZATIONS ||--o{ GIG_PARTICIPANTS : participates

  %% Bid management
  GIGS ||--o{ GIG_BIDS : has
  ORGANIZATIONS ||--o{ GIG_BIDS : owns

  %% Staff management
  USERS ||--o{ GIG_STAFF_ASSIGNMENTS : assigned_to
  STAFF_ROLES ||--o{ GIG_STAFF_SLOTS : defines
  GIGS ||--o{ GIG_STAFF_SLOTS : has
  ORGANIZATIONS ||--o{ GIG_STAFF_SLOTS : owns
  GIG_STAFF_SLOTS ||--o{ GIG_STAFF_ASSIGNMENTS : assigned

  %% Equipment management
  ORGANIZATIONS ||--o{ ASSETS : owns
  ORGANIZATIONS ||--o{ KITS : owns
  KITS ||--o{ KIT_ASSETS : contains
  ASSETS ||--o{ KIT_ASSETS : included_in
  GIGS ||--o{ GIG_KIT_ASSIGNMENTS : assigned
  KITS ||--o{ GIG_KIT_ASSIGNMENTS : assigned_to
  ORGANIZATIONS ||--o{ GIG_KIT_ASSIGNMENTS : owns
```

## Enum Types

```prisma
enum OrganizationType {
  Production
  Sound
  Lighting
  Staging
  Rentals
  Venue
  Act
  Agency
}

enum UserRole {
  Admin
  Manager
  Staff
  Viewer
}

enum GigStatus {
  DateHold
  Proposed
  Booked
  Completed
  Cancelled
  Settled
}
```

## Core Tables

### users

User profiles (extends Supabase auth.users)

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key, references auth.users(id) |
| first_name | TEXT | User's first name |
| last_name | TEXT | User's last name |
| email | TEXT | User's email address (unique) |
| phone | TEXT | User's phone number (nullable) |
| avatar_url | TEXT | URL to user's avatar image (nullable) |
| address_line1 | TEXT | Street address (nullable) |
| address_line2 | TEXT | Apartment, suite, etc. (nullable) |
| city | TEXT | City (nullable) |
| state | TEXT | State or province (nullable) |
| postal_code | TEXT | ZIP/postal code (nullable) |
| country | TEXT | Country (nullable) |
| role_hint | TEXT | Default staffing role hint (e.g., "FOH", "Lighting") (nullable) |
| created_at | TIMESTAMPTZ | Record creation timestamp |
| updated_at | TIMESTAMPTZ | Record last update timestamp |

**Notes:**
- Address fields structured to support both US and international addresses
- `created_by` and `updated_by` fields in other models reference User.id but don't maintain reverse relations

### organizations

Companies, venues, acts, and other entities

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Organization name |
| type | OrganizationType | Organization type enum |
| url | TEXT | Organization website URL (nullable) |
| allowed_domains | TEXT | Comma separated list of automatically <br />allowable user email domains. |
| phone_number | TEXT | Organization phone number (nullable) |
| address_line1 | TEXT | Street address (nullable) |
| address_line2 | TEXT | Apartment, suite, etc. (nullable) |
| city | TEXT | City (nullable) |
| state | TEXT | State or province (nullable) |
| postal_code | TEXT | ZIP/postal code (nullable) |
| country | TEXT | Country (nullable) |
| description | TEXT | Organization description (nullable), long text, markdown |
| created_at | TIMESTAMPTZ | Record creation timestamp |
| updated_at | TIMESTAMPTZ | Record last update timestamp |

**Notes:**

- Organizations are editable only by their Admin members (via `OrganizationMember` with `Admin` role)
- Ownership/editing permissions controlled via `OrganizationMember` with Admin role
- All authenticated users may read organizations, but only Admin members can modify
- The `description` field is a long text in markdown format.

### organization_members

User memberships in organizations with roles

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| organization_id | UUID | Reference to organizations.id |
| user_id | UUID | Reference to users.id |
| role | UserRole | RBAC role within organization: Admin, Manager, Staff, Viewer |
| created_at | TIMESTAMPTZ | Record creation timestamp |

**Notes:**
- Only Admin members can modify organization records


## Gig Management Tables

### gigs

Main gig records with status, dates, and details

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| parent_gig_id | UUID | Reference to gigs.id for hierarchical relationships (nullable) |
| hierarchy_depth | INTEGER | Depth level in gig hierarchy (default 0) |
| title | TEXT | Gig title/name |
| start | TIMESTAMPTZ | Start date and time of the gig |
| end | TIMESTAMPTZ | End date and time of the gig (gigs can span midnight) |
| timezone | TEXT | IANA timezone identifier (e.g., "America/New_York") |
| status | GigStatus | Gig status enum: <br />DateHold, Proposed, Booked, Completed, Cancelled, Settled |
| tags | TEXT[] | Array of tags for categorization (multi-select) |
| notes | TEXT | Long text field for freeform notes (Markdown-formatted, nullable) |
| amount_paid | DECIMAL(10,2) | Total revenue collected for this gig (nullable) |
| created_by | UUID | Reference to users.id (informational only, no relation) |
| updated_by | UUID | Reference to users.id (informational only, no relation) |
| created_at | TIMESTAMPTZ | Record creation timestamp |
| updated_at | TIMESTAMPTZ | Record last update timestamp |

**Notes:**
- Gigs are shared (participated in) by multiple organizations so there is no 'owning' organization.
- Gigs link to organizations via `gig_participants` with a `role` using OrganizationType enum values
- Gig status transitions are recorded in `gig_status_history` for auditability
- Any status can transition to any other status (no restrictions)
- Gigs can span midnight, so we use full DateTime for both start and end
- The "gig date" shown in UI is derived from the start DateTime
- `parent_gig_id` enables hierarchical relationships between gigs (e.g., main event with sub-events)
- `hierarchy_depth` tracks the depth level in the hierarchy for performance and validation
- `created_by` and `updated_by` are stored as User.id values but don't maintain reverse relations

### gig_status_history

Automatic audit log of status changes. Shared across all tenants.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| gig_id | UUID | Reference to gigs.id |
| from_status | GigStatus | Previous status (nullable if initial status) |
| to_status | GigStatus | New status |
| changed_by | UUID | Reference to users.id (informational only) |
| changed_at | TIMESTAMPTZ | Status change timestamp |

**Notes:**
- `changed_by` is stored as User.id but doesn't maintain a reverse relation
- All status transitions are recorded for auditability

### gig_participants

Organizations participating in a gig (venue, act, production, etc.) Note that this information is shared across all tenants.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| organization_id | UUID | Reference to organizations.id (the participating organization) |
| gig_id | UUID | Reference to gigs.id |
| role | OrganizationType | Participant role using OrganizationType enum values |
| notes | TEXT | Long text field for freeform notes (Markdown-formatted, nullable) |

**Notes:**
- `role` uses the same OrganizationType enum values: Production, Sound, Lighting, Staging, Rentals, Venue, Act, Agency
- Both `gig_id` and `organization_id` are foreign keys

## Bid Management

### gig_bids

Bid tracking for gigs

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| organization_id | UUID | Reference to organizations.id (the owning organization) |
| gig_id | UUID | Reference to gigs.id |
| amount | DECIMAL(10,2) | Bid/proposal amount |
| date_given | DATE | Date the bid was given |
| result | TEXT | Bid result: Pending, Accepted, Rejected, Withdrawn (nullable) |
| notes | TEXT | Notes about the bid (nullable, Markdown-formatted) |
| created_by | UUID | Reference to users.id (informational only, no relation) |
| created_at | TIMESTAMPTZ | Record creation timestamp |

**Notes:**
- `created_by` is stored as User.id but doesn't maintain a reverse relation

## Staff Management Tables

### staff_roles

Global staff role choices (FOH, Lighting, etc.)

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Staff role name (e.g., "FOH", "Lighting", "Stage", "CameraOp") (unique) |
| description | TEXT | Description of the staff role and responsibilities (nullable) |
| created_at | TIMESTAMPTZ | Record creation timestamp |

**Notes:**
- Staff roles are enumerated in this table to support future staffing template functionality
- Templates can be created for different gig types based on gig tags

### gig_staff_slots

Staff positions needed for a gig

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| organization_id | UUID | Reference to organizations.id (the owning organization) |
| gig_id | UUID | Reference to gigs.id |
| staff_role_id | UUID | Reference to staff_roles.id (enumerated staff role for template support) |
| required_count | INTEGER | Number of people needed for this role |
| notes | TEXT | Notes about this staff need (nullable, Markdown-formatted) |
| created_at | TIMESTAMPTZ | Record creation timestamp |
| updated_at | TIMESTAMPTZ | Record last update timestamp |

**Notes:**
- Staff roles are enumerated via reference to staff_roles table
- This enables future staffing template functionality

### gig_staff_assignments

Actual staff assigned to positions

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| slot_id | UUID | Reference to gig_staff_slots.id |
| user_id | UUID | Reference to users.id |
| status | TEXT | Assignment status (e.g., "Confirmed", "Requested", "Declined") |
| rate | DECIMAL(10,2) | Hourly or daily rate for this assignment (nullable) |
| fee | DECIMAL(10,2) | Total fee for this assignment (nullable) |
| notes | TEXT | Notes about this assignment (nullable, Markdown-formatted) |
| assigned_at | TIMESTAMPTZ | Assignment timestamp |
| confirmed_at | TIMESTAMPTZ | Confirmation timestamp (nullable) |

**Notes:**
- There is no direct relation between Gig and User, only through GigStaffSlots and GigStaffAssignments.
- There is no direct relation between Gig and GigStaffAssignments (only through GigStaffSlots)

## Equipment

### assets

Equipment and asset management

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| organization_id | UUID | Reference to organizations.id (tenant that owns this asset) |
| acquisition_date | DATE | Date asset was acquired |
| vendor | TEXT | Vendor from which asset was purchased (nullable) |
| cost | DECIMAL(10,2) | Purchase cost of asset (nullable) |
| category | TEXT | Asset category (e.g., "Audio", "Lighting", "Video") |
| sub_category | TEXT | Asset sub-category (nullable) |
| insurance_policy_added | BOOLEAN | Whether asset has been added to insurance policy (default false) |
| manufacturer_model | TEXT | Manufacturer and model information |
| type | TEXT | Asset type (nullable) |
| serial_number | TEXT | Asset serial number (nullable) |
| description | TEXT | Long text description of asset (Markdown-formatted, nullable) |
| replacement_value | DECIMAL(10,2) | Replacement value for insurance purposes (nullable) |
| created_by | UUID | Reference to users.id (informational only, no relation) |
| updated_by | UUID | Reference to users.id (informational only, no relation) |
| created_at | TIMESTAMPTZ | Record creation timestamp |
| updated_at | TIMESTAMPTZ | Record last update timestamp |

**Notes:**
- `created_by` and `updated_by` are stored as user.id values but don't maintain reverse relations
- `description` is a long text field that can contain Markdown-formatted content
- Assets are owned by a tenant organization via `organization_id` for RLS and filtering

### kits

Reusable collections of equipment assets

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| organization_id | UUID | Reference to organizations.id (tenant that owns this kit) |
| name | TEXT | Kit name (e.g., "Small Lighting Setup", "XLR Cable Kit") |
| category | TEXT | Kit category for organization (e.g., "Lighting", "Audio", "Cables") |
| description | TEXT | Kit description (Markdown-formatted, nullable) |
| tags | TEXT[] | Array of tags for categorization and filtering |
| created_by | UUID | Reference to users.id (informational only, no relation) |
| updated_by | UUID | Reference to users.id (informational only, no relation) |
| created_at | TIMESTAMPTZ | Record creation timestamp |
| updated_at | TIMESTAMPTZ | Record last update timestamp |

**Notes:**
- Kits are owned by a tenant organization via `organization_id` for RLS and filtering
- Tags enable flexible categorization and filtering

### kit_assets

Junction table linking kits to their constituent assets

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| kit_id | UUID | Reference to kits.id |
| asset_id | UUID | Reference to assets.id |
| quantity | INTEGER | Number of this asset required in the kit (default 1) |
| notes | TEXT | Notes about this asset in the kit context (nullable) |
| created_at | TIMESTAMPTZ | Record creation timestamp |

**Notes:**
- Composite unique constraint on (kit_id, asset_id) prevents duplicate assets in same kit
- Quantity allows specifying multiples of the same asset type (e.g., 2 mains, 2 subs)
- Notes can specify usage context (e.g., "Main Left", "Backup Cable")

### gig_kit_assignments

Junction table linking gigs to assigned kits

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| organization_id | UUID | Reference to organizations.id (tenant that owns this assignment) |
| gig_id | UUID | Reference to gigs.id |
| kit_id | UUID | Reference to kits.id |
| notes | TEXT | Notes about kit assignment (nullable) |
| assigned_by | UUID | Reference to users.id (who assigned the kit) |
| assigned_at | TIMESTAMPTZ | When the kit was assigned to the gig |

**Notes:**

- Scoped to organization via `organization_id` for tenant isolation
- Composite unique constraint on (gig_id, kit_id) prevents duplicate kit assignments
- Assignment timestamp enables audit trail of when kits were added to gigs
- `organization_id` should match the kit's organization_id

## Common Notes

- Each first-class entity owned by the tenant has `organization_id` for RLS and filtering
- All Notes and Description fields store Markdown-formatted text
- The `created_by` and `updated_by` fields throughout the schema store User.id values but don't maintain reverse relations (they're informational only)
- No indexes are created on primary key IDs (UUIDs) - PostgreSQL handles this automatically

## Row-Level Security (RLS)

### Access Control Requirements

- Users can only see gigs where there is an intersection of their organizational membership (via `organization_members`) and organizational participation with the gig (via `gig_participants`)
- RLS policies must be implemented on all tables
- Ensure data isolation between organizations
- Admin users have broader access within their organization

### RLS Policy Rules

**SELECT:**
- Users can read records where organization_id = the current organization context
- Organizations are readable by all authenticated users
- Annotations are only visible to the creating organization

**INSERT:**
- Users can create records for their organization
- Role must be Admin or Manager for most entities
- Staff can create limited records (assignments, notes)

**UPDATE:**
- Users can update records belonging to their organization
- Role permissions enforced (Admin-only for org settings)
- Staff can update assigned gig status and notes

**DELETE:**
- Admin/Manager roles can delete records for their organization
- Staff and Viewer roles cannot delete
- Cascading deletes maintain referential integrity

## Related Documentation

- **Requirements**: See REQUIREMENTS.md for feature requirements
- **Tech Stack**: See TECH_STACK.md for technology details
