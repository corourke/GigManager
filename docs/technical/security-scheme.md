# Security Scheme Analysis - GigManager

## 1. Core Principles
- **Multi-Tenancy**: Data is isolated between organizations.
- **Intersection-Based Gig Access**: Access to a Gig is granted only to members of organizations that are participants in that Gig.
- **Refined Role-Based Access Control (RBAC)**: Access levels within an organization are defined by roles: Admin, Manager, Staff, and Viewer.
- **Row-Level Security (RLS)**: Security is enforced at the database level using PostgreSQL policies.

## 2. Organization Membership & Roles
Users belong to organizations via the `organization_members` table.

| Role | Description |
|------|-------------|
| **Admin** | Full control over the tenancy. Can manage organization settings, members, and all data (CRUD). |
| **Manager** | CRUD all application data (Gigs, Assets, Kits, Bids, Staffing). Can view and edit team member profiles. Cannot manage organization members or roles. |
| **Staff** | Read-only access to organization data. Can edit their own profile. Can view all participating gigs (EXCEPT Bids). Can accept/decline their own staff assignments. Can view equipment and the team. |
| **Viewer** | Read-only access to basic gig information for participating gigs. Can edit their own profile. |

## 3. Gig Access Logic (The Intersection)
Access to a record in the `gigs` table is determined by the `gig_participants` junction table.

**Logic**: `User -> Organization Membership -> Organization Participation -> Gig`

A user `U` can access Gig `G` if:
1. `U` is a member of Organization `O`.
2. `O` is a participant in Gig `G` (entry exists in `gig_participants` for `O.id` and `G.id`).

### Implications for RLS Policies:
- **`gigs` table**: Policy checks if `auth.uid()` belongs to an organization listed in `gig_participants` for that gig.
- **`gig_bids` table**: Only accessible to **Admin** and **Manager** roles of a participating organization.
- **`gig_participants`**: Members can see the participant list.
- **`gig_staff_assignments`**: **Staff** can update assignments where `user_id = auth.uid()`.

## 4. Broader Access Requirements
- **Organization Discovery**: Any authenticated user can read the `organizations` table to find partners/venues.
- **User Discovery**: Users can search for other users within their organization or shared gigs.
- **Public Reference Data**: `staff_roles` are readable by all authenticated users.

## 5. RLS Implementation Strategy

### Helper Functions (SECURITY DEFINER)
- `user_is_member_of_org(org_id, user_id)`
- `user_is_admin_of_org(org_id, user_id)`
- `user_is_admin_or_manager_of_org(org_id, user_id)`
- `user_has_access_to_gig(gig_id, user_id)`
- `get_user_role_in_org(org_id, user_id)`: Returns the `user_role` enum.
