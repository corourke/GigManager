# Technical Specification - Phase 1: Security & Core Infrastructure

## 1. Technical Context
- **Language**: TypeScript / React 18
- **Backend**: Supabase (PostgreSQL 15)
- **Infrastructure**: Row-Level Security (RLS), React Context API

## 2. Implementation Approach

### 2.1. Enable RLS & PostgreSQL Policies
- **Objective**: Move security logic from the application layer to the database.
- **Complexity**: Access to gigs is determined by the intersection of a user's organizational membership (`organization_members`) and the organizations participating in a gig (`gig_participants`).
- **Actions**:
    - Enable RLS for all tables in `supabase/schema.sql`.
    - Implement policies based on organization membership.
    - **Gig Access Policy**: A user can see a gig IF they are a member of an organization that is a participant in that gig.
    - **Broader Access**: Certain operations (like searching for organizations to add as participants) will require authenticated access beyond membership boundaries.
    - Use existing helper functions (`user_is_member_of_org`, etc.) to prevent recursion and simplify policy logic.
    - **Target Tables**: `users`, `organizations`, `organization_members`, `gigs`, `gig_participants`, `gig_staff_slots`, `gig_staff_assignments`, `gig_bids`, `assets`, `kits`, `kit_assets`, `gig_kit_assignments`.

### 2.2. Security Verification & Testing
- **Objective**: Ensure the complex RLS logic is correctly implemented and cannot be bypassed.
- **Actions**:
    - Create a suite of security tests in `src/test/security.test.ts`.
    - Test scenarios:
        - User A (Org 1) cannot see Gig X (Org 2).
        - User A (Org 1) can see Gig Y (Org 1 participant).
        - User A (Org 1) can see Gig Z (Org 1 and Org 2 participants).
        - Verify "Broader Access" operations (e.g., searching for organizations) work for authenticated users.
        - Verify that deleting a membership correctly revokes access.

### 2.2. Implement `AuthContext`
- **Objective**: Centralize authentication and organization state.
- **Actions**:
    - Create `src/contexts/AuthContext.tsx`.
    - **State**: `user`, `session`, `organizations`, `selectedOrganization`, `isLoading`.
    - **Methods**: `login`, `logout`, `refreshProfile`, `selectOrganization`.
    - Integrate with Supabase `onAuthStateChange`.
    - Refactor `App.tsx` to use `AuthContext` instead of local state.

### 2.3. Refactor `api.tsx` into Modular Services
- **Objective**: Break down the 3,300+ line "god file" into maintainable modules.
- **Actions**:
    - Create `src/services/` directory.
    - Split `api.tsx` into:
        - `src/services/user.service.ts`: Profile management, user search.
        - `src/services/organization.service.ts`: Org creation, membership, team management.
        - `src/services/gig.service.ts`: Gig CRUD, status history, participants.
        - `src/services/equipment.service.ts`: Assets and kits management.
        - `src/services/staff.service.ts`: Staff roles, slots, and assignments.
    - Maintain consistent error handling and network error detection (moved to a shared utility).

## 3. Source Code Structure Changes
- **New Files**:
    - `src/contexts/AuthContext.tsx`
    - `src/services/user.service.ts`
    - `src/services/organization.service.ts`
    - `src/services/gig.service.ts`
    - `src/services/equipment.service.ts`
    - `src/services/staff.service.ts`
    - `src/utils/api-error-utils.ts` (shared error handling)
- **Modified Files**:
    - `supabase/schema.sql` (RLS and policies)
    - `src/App.tsx` (Integration with `AuthContext`)
    - All components currently importing from `utils/api.tsx` (updated imports)
- **Deleted Files**:
    - `src/utils/api.tsx` (once fully refactored)

## 4. Data Model / API / Interface Changes
- No changes to the database schema (columns/tables), only access control (RLS).
- Transition from a single `api` import to domain-specific services.

## 5. Verification Approach
- **Linting**: Run `npm run lint` to ensure no broken imports or type errors.
- **Type Checking**: Run `npm run typecheck` (or `tsc --noEmit`).
- **Unit Testing**: Run `npm test` to ensure existing tests pass.
- **Manual Verification**:
    - Verify authentication flow (login/logout).
    - Verify organization selection and data isolation.
    - Verify RLS by attempting to access data from a different organization (manual SQL check or component-level check).
