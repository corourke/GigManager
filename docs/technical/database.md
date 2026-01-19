# Database Specification

**Purpose**: This document provides the complete database schema, Supabase integration details, and data access patterns for the GigManager application.

**Last Updated**: 2026-01-18

---

## Table of Contents

1. [Overview](#overview)
2. [Supabase Integration](#supabase-integration)
3. [High-Level Entity Diagram](#high-level-entity-diagram)
4. [Enum Types](#enum-types)
5. [Core Tables](#core-tables)
6. [Gig Management Tables](#gig-management-tables)
7. [Bid Management](#bid-management)
8. [Staff Management Tables](#staff-management-tables)
9. [Equipment Tables](#equipment-tables)
10. [Row-Level Security (RLS)](#row-level-security-rls)
11. [Authentication](#authentication)
12. [Real-Time Features](#real-time-features)
13. [Testing & Troubleshooting](#testing--troubleshooting)

---

## Overview

The database uses **PostgreSQL 15+** hosted on **Supabase** with Row-Level Security (RLS) for multi-tenant data isolation. All enum types are defined in the Prisma schema as the single source of truth.

**Technology Stack:**
- PostgreSQL 15+ database
- Supabase backend (auth, realtime, storage)
- Direct Supabase client integration (no Prisma ORM in production)
- TypeScript types generated from schema

**Key Features:**
- Multi-tenant architecture with RLS
- Real-time subscriptions via Postgres CDC
- Automatic audit trails (status history, timestamps)
- Hierarchical data structures (nested gigs)
- Flexible participant/role management

---

## Supabase Integration

### What's Implemented

**Database:**
- Complete schema with 16 tables
- Row-Level Security (RLS) policies for data isolation
- Automatic triggers for timestamp updates and status logging
- Seed data for common staff roles

**Authentication:**
- Email/Password authentication (ready to use)
- Google OAuth integration via Supabase Auth
- Multiple providers supported (GitHub, Microsoft, etc.)
- Session management with automatic token refresh
- User profile creation on first login

**Real-Time:**
- Live updates when data changes
- Multi-user sync via Postgres CDC
- Automatic subscriptions for gigs, assets, kits

**API Layer:**
- Direct Supabase client calls from frontend
- Authentication middleware via RLS
- Permission checks (Admin/Manager/Staff/Viewer roles)

### File Structure

```
/
├── src/
│   └── utils/
│       ├── api.tsx                      # API client functions
│       └── supabase/
│           ├── client.tsx               # Supabase client singleton
│           └── types.tsx                # TypeScript types matching schema
└── supabase/
    └── migrations/
        └── *.sql                        # Database migrations
```

---

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

---

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

---

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

---

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

---

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

---

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

---

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

---

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

---

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

---

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

---

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

---

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

---

## Equipment Tables

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

---

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

---

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

---

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

---

## Common Notes

- Each first-class entity owned by the tenant has `organization_id` for RLS and filtering
- All Notes and Description fields store Markdown-formatted text
- The `created_by` and `updated_by` fields throughout the schema store User.id values but don't maintain reverse relations (they're informational only)
- No indexes are created on primary key IDs (UUIDs) - PostgreSQL handles this automatically

---

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

### Role Hierarchy

| Role | Create | Read | Update | Delete |
|------|--------|------|--------|--------|
| **Admin** | ✅ | ✅ | ✅ | ✅ |
| **Manager** | ✅ | ✅ | ✅ | ❌ |
| **Staff** | ❌ | ✅ | ❌ | ❌ |
| **Viewer** | ❌ | ✅ | ❌ | ❌ |

### Data Isolation

- Gigs are scoped to organizations via `gig_participants`
- Only members see their organization's data
- Participants can be from any organization (public directory)
- Annotations are private per organization

---

## Authentication

### Supported Methods

**Email/Password:**
- Built-in Supabase authentication
- No additional setup required
- User profile created on first login

**OAuth Providers:**
- Google OAuth (primary)
- GitHub, Microsoft (optional)
- Configured in Supabase Auth settings

### User Flow

1. User authenticates via Supabase Auth
2. `auth.users` entry created automatically
3. App creates `users` profile record
4. User assigned to organization via `organization_members`
5. Session managed by Supabase with auto-refresh

### Session Management

- Automatic token refresh
- Secure logout functionality
- Session state persisted in local storage
- RLS policies enforce user context

---

## Real-Time Features

### Live Updates

The application uses Supabase Realtime (Postgres CDC) for live data synchronization:

**Gigs:**
- Create/update/delete broadcasts to all connected clients
- Status changes appear instantly
- Inline edits synchronized across users

**Assets & Kits:**
- Inventory updates broadcast in real-time
- Assignment conflicts detected immediately

**Staff Assignments:**
- Assignment status changes synchronized
- Notifications triggered on changes

### Implementation

```typescript
// Automatic subscription to gig changes
supabase
  .channel('gigs')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'gigs' },
    (payload) => {
      // Handle insert/update/delete
    }
  )
  .subscribe()
```

---

## Testing & Troubleshooting

### Testing Your Setup

**1. Test Authentication:**
- Sign in with email/password
- Verify user profile created
- Check organization membership

**2. Test Organization Creation:**
- Create new organization
- Verify added as Admin
- Check organization appears in selection

**3. Test Gig Management:**
- Create new gig
- Edit inline in list view
- Verify changes save

**4. Test Real-Time:**
- Open app in two browser windows
- Create/edit gig in one window
- Watch update in other window (no refresh)

**5. Test Permissions:**
- Invite user with Staff role
- Verify read-only access
- Test Manager permissions
- Confirm Admin full access

### Common Issues

**"Authentication failed":**
- Verify OAuth configured in Supabase
- Check redirect URIs match exactly
- Ensure OAuth consent screen set up

**"Access denied to this organization":**
- User needs entry in `organization_members`
- Check role set correctly
- Verify `organization_id` matches

**Tables not created:**
- Run migration SQL in Supabase SQL Editor
- Check for error messages in logs
- Verify UUID extension enabled

**Real-time not working:**
- Check Realtime enabled (Project Settings > API)
- Verify table has RLS policies
- Check browser console for subscription errors

### Debugging Tools

**Supabase Dashboard:**
- Table Editor: Inspect data directly
- SQL Editor: Run ad-hoc queries
- Logs: View API errors and performance
- Auth: Manage users and sessions

**Browser DevTools:**
- Network tab: Check API requests
- Console: View subscription events
- Application tab: Inspect session storage

---

## Related Documentation

- **Requirements**: See [../product/requirements.md](../product/requirements.md) for feature requirements
- **Workflows**: See [../product/workflows/](../product/workflows/) for UI flows
- **Tech Stack**: See [tech-stack.md](./tech-stack.md) for technology details
- **Setup Guide**: See [setup-guide.md](./setup-guide.md) for installation instructions
- **Coding Guide**: See [../development/ai-agents/coding-guide.md](../development/ai-agents/coding-guide.md) for implementation patterns

---

## Document History

**2026-01-18**: Consolidated DATABASE.md and setup/supabase-integration.md into comprehensive database specification with schema details, Supabase integration guidance, and troubleshooting information.
