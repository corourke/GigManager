# Technical Specification - Consolidate Global Types and Enums

## Technical Context
- **Language**: TypeScript / React
- **Dependencies**: `lucide-react` (for icons)

## Implementation Approach
The goal is to establish `src/utils/supabase/` as the single source of truth for types and constants that are currently duplicated or scattered across the codebase.

### 1. Establish Constants (`src/utils/supabase/constants.ts`)
Create a new file to hold metadata-rich objects for core enums.

- **`ORGANIZATION_CONFIG`**: A mapping of `OrganizationType` to its label, icon, and tailwind color classes.
- **`USER_ROLE_CONFIG`**: Metadata for `UserRole`.
- **`GIG_STATUS_CONFIG`**: Metadata for `GigStatus`.
- **Derived Types**: Use `keyof typeof ORGANIZATION_CONFIG` etc., to derive the types, ensuring they are always in sync with the config.
- **Helper Functions**: Move `getOrgTypeIcon`, `getOrgTypeColor`, and `getOrgTypeLabel` here.

### 2. Centralize Types (`src/utils/supabase/types.tsx`)
Update the existing types file to provide clean aliases and joined types.

- **Aliases**:
  - `export type User = DbUser;`
  - `export type Organization = DbOrganization;`
  - `export type Invitation = DbInvitation;`
- **Joined Types**:
  - `OrganizationMemberWithUser`: `DbOrganizationMember` + `user: DbUser`.
  - `OrganizationMembership`: `{ organization: Organization; role: UserRole }` (as used in `App.tsx`).

### 3. Refactor App and Components
- **`src/App.tsx`**: Remove local type definitions and import from the new centralized files.
- **`src/utils/org-icons.tsx`**: Delete this file.
- **`src/components/OrganizationSelector.tsx`**: Remove local `TYPE_CONFIG`.
- **`src/components/OrganizationScreen.tsx`**: Remove local `ORG_TYPES`.
- **`src/components/TeamScreen.tsx`**: Use standardized `OrganizationMemberWithUser` and `Invitation`.
- **`src/components/gig/GigParticipantsSection.tsx`**: Remove local `ORGANIZATION_TYPES`.

## Source Code Structure Changes
- **NEW**: `src/utils/supabase/constants.ts`
- **MODIFIED**: `src/utils/supabase/types.tsx`
- **MODIFIED**: `src/App.tsx`
- **MODIFIED**: `src/components/TeamScreen.tsx`
- **MODIFIED**: `src/components/OrganizationSelector.tsx`
- **MODIFIED**: `src/components/OrganizationScreen.tsx`
- **MODIFIED**: `src/components/gig/GigParticipantsSection.tsx`
- **DELETED**: `src/utils/org-icons.tsx`

## Verification Approach
- **Type Checking**: Run `npm run typecheck` to ensure all imports and type assignments are correct.
- **Linting**: Run `npm run lint` (if available) or check for basic syntax issues.
- **Manual Verification**: Briefly check UI components that use these constants (e.g., Organization Selector, Team Screen) to ensure icons and labels still display correctly.
