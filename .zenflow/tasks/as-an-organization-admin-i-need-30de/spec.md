# Technical Specification: Organization Editing Enhancements and Multi-Role Support

## Technical Context
- **Frontend**: React, TypeScript, Tailwind CSS, Lucide Icons, Shadcn UI components.
- **Backend**: Supabase (Postgres, RLS, Edge Functions).
- **State Management**: React Hook Form, Custom Auth Context.
- **Data Fetching**: Supabase JS Client, Edge Functions.

## Implementation Approach

### 1. Database Schema Changes (Supabase Migrations)

#### 1.1. Rename Postgres Type and Update Columns
- Rename enum type `organization_type` to `organization_role`.
- In `organizations` table:
    - Rename column `type` to `roles`.
    - Change column type to `organization_role[]` (array).
    - Migration should handle data conversion: `UPDATE organizations SET roles = ARRAY[type]::organization_role[]`.
- In `gig_participants` table:
    - Update column `role` to use the new `organization_role` type (it remains a single value).
- Update RPC `create_gig_complex` to use the new type name.

#### 1.2. Permission Relaxing (RLS)
- Create a new Postgres function `public.user_is_admin(user_uuid uuid)`:
    - Returns `true` if the user has an 'Admin' role in ANY organization.
- Update RLS policy for `organizations` table:
    - Policy "Admins can update their organizations" should be updated to use `public.user_is_admin(auth.uid())`.
    - This allows any admin to update any organization.

### 2. Frontend Changes

#### 2.1. Constants and Types (`src/utils/supabase/`)
- In `constants.ts`:
    - Rename `OrganizationType` to `OrganizationRole`.
    - Rename `ORG_TYPE_CONFIG` to `ORG_ROLE_CONFIG`.
    - Update helper functions (`getOrgTypeIcon`, etc.) to match.
- In `types.tsx`:
    - Update `DbOrganization` to have `roles: OrganizationRole[]`.
    - Update `DbGigParticipant` and related types to use `OrganizationRole`.

#### 2.2. Organization Service (`src/services/organization.service.ts`)
- Update `searchOrganizations` to support filtering by multiple roles (if needed, or just search by name).
- Update `createOrganization` and `updateOrganization` to handle the `roles` array.

#### 2.3. Organization Edit Screen (`src/components/OrganizationScreen.tsx`)
- **Ownership Warning**:
    - Add a check to see if the organization has members (`getOrganizationMembers`).
    - Display the warning Alert at the top if `hasMembers && !isAdminOfThisOrg`.
- **Multi-Role Selection**:
    - Replace the `Select` component for type with a set of `Checkbox` components (one for each `OrganizationRole`).
    - Update `FormData` and validation to handle an array of roles.

#### 2.4. Gig Participants Section (`src/components/gig/GigParticipantsSection.tsx`)
- **Action Buttons**:
    - Add "View" (Eye icon) and "Edit" (Pencil icon) buttons to each participant row.
    - "Edit" button visibility: Only shown if `userIsAdmin` (admin of any org).
- **Navigation**:
    - "Edit" button should navigate to the organization edit route (or set the editing organization in state).
    - "View" button should open a `Dialog` (modal) showing a read-only view of organization details (Name, Roles, Address, Phone, Website, Description).

#### 2.5. Organization Search Debounce (`src/components/OrganizationSelector.tsx`)
- Implement a 1-second debounce for the search input using `useEffect` and `setTimeout`.
- Ensure the loading indicator is shown during the debounce period and the actual search.

### 3. Source Code Structure Changes
- No major structure changes, mostly updating existing components and services.
- May add a small helper component `OrganizationDetailModal` if it gets too complex within `GigParticipantsSection`.

## Verification Approach

### Automated Tests
- Run existing tests: `npm run test:run`.
- Add/Update tests for `GigParticipantsSection` to verify new buttons.
- Update `organization.service.test.ts` if needed.

### Manual Verification
1.  **Permissions**: Log in as an Admin of Org A and attempt to edit Org B.
2.  **Warning**: Verify warning appears for Org B if it has members, and not for Org A.
3.  **Multi-Role**: Edit an organization, select multiple roles, save, and verify they appear as badges in lists.
4.  **Gig Participants**: Go to a gig, verify "View" and "Edit" buttons for each participant.
5.  **Search**: Type in "Add Participant" search box and verify the 1-second delay before results appear.
