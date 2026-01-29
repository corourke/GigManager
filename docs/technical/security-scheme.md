# Security Scheme Analysis - GigManager

## 1. Core Principles
- **Multi-Tenancy**: Data is isolated between organizations.
- **Intersection-Based Gig Access**: Access to a Gig is granted only to members of organizations that are participants in that Gig.
- **Role-Based Access Control (RBAC)**: Access levels within an organization are defined by roles: Admin, Manager, Staff, and Viewer.
- **Row-Level Security (RLS)**: Security is enforced at the database level using PostgreSQL policies.

## 2. Organization Membership & Roles
Users belong to organizations via the `organization_members` table.

| Role | Description |
|------|-------------|
| **Admin** | Full access to organization settings, members, and all data. Can delete records. |
| **Manager** | Can create and update most records (Gigs, Assets, Kits). Cannot delete records. |
| **Staff** | Read-only access to organization data. Can see assignments. |
| **Viewer** | Read-only access. |

## 3. Gig Access Logic (The Intersection)
Access to a record in the `gigs` table is NOT direct. It is determined by the `gig_participants` junction table.

**Logic**: `User -> Organization Membership -> Organization Participation -> Gig`

A user `U` can access Gig `G` if:
1. `U` is a member of Organization `O`.
2. `O` is a participant in Gig `G` (entry exists in `gig_participants` for `O.id` and `G.id`).

### Implications for RLS Policies:
- **`gigs` table**: Policy must check if `auth.uid()` belongs to an organization listed in `gig_participants` for that gig.
- **`gig_participants` table**: Policy must allow members of the participating organizations to see the participant list for that gig.
- **`gig_staff_slots`, `gig_staff_assignments`, `gig_bids`, `gig_kit_assignments`**: These are related to Gigs. Access follows the same intersection logic, with additional role-based checks (e.g., only Admin/Manager can see Bids).

## 4. Broader Access Requirements
Certain operations require access beyond the strict intersection:
- **Organization Discovery**: Any authenticated user can read the `organizations` table to find partners/venues to add as participants to a gig.
- **User Discovery**: Users can search for other users to invite to their organization or assign to a gig (restricted to users within the same organization or shared gigs).
- **Public Reference Data**: `staff_roles` are readable by all authenticated users.

## 5. RLS Implementation Strategy

### Helper Functions (SECURITY DEFINER)
To avoid circular dependencies and recursion:
- `user_is_member_of_org(org_id, user_id)`
- `user_is_admin_of_org(org_id, user_id)`
- `user_is_admin_or_manager_of_org(org_id, user_id)`
- `user_has_access_to_gig(gig_id, user_id)`: Checks the intersection logic.

### Policy Examples

#### Organizations
- **SELECT**: `true` (Allow discovery)
- **UPDATE**: `user_is_admin_of_org(id, auth.uid())`

#### Gigs
- **SELECT**: `user_has_access_to_gig(id, auth.uid())`
- **INSERT**: `user_is_admin_or_manager_of_any_org(auth.uid())` (Simplified, usually tied to a specific org)
- **UPDATE**: `user_has_access_to_gig(id, auth.uid()) AND user_is_admin_or_manager_of_org(participating_org_id, auth.uid())`

#### Assets / Kits
- **SELECT**: `user_is_member_of_org(organization_id, auth.uid())`
- **INSERT/UPDATE**: `user_is_admin_or_manager_of_org(organization_id, auth.uid())`
