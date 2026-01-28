# Technical Specification - Consolidate Global Types and Enums

## Technical Context
- **Language**: TypeScript / React
- **Dependencies**: `lucide-react` (for icons)

## Implementation Approach
The goal is to establish `src/utils/supabase/` as the single source of truth for types and constants, that correlate to database objects, which are currently duplicated or scattered across the codebase.

### 1. Establish Constants (`src/utils/supabase/constants.ts`)
Create a new file to hold metadata-rich objects for core enums.

- **`ORGANIZATION_CONFIG`**: A mapping of `OrganizationType` to its label, icon, and tailwind color classes.
- **`USER_ROLE_CONFIG`**: Metadata for `UserRole`.
- **`GIG_STATUS_CONFIG`**: Metadata for `GigStatus`.
- **Derived Types**: Use `keyof typeof ORGANIZATION_CONFIG` etc., to derive the types, ensuring they are always in sync with the config.
- **Helper Functions**: Move `getOrgTypeIcon`, `getOrgTypeColor`, and `getOrgTypeLabel` here.

#### Organization Metadata (Consolidated)
| Type | Label | Icon | Tailwind Color Classes |
| :--- | :--- | :--- | :--- |
| **Production** | Production Company | `Building2` | `bg-purple-100 text-purple-700` |
| **Sound** | Sound Company | `Volume2` | `bg-blue-100 text-blue-700` |
| **Lighting** | Lighting Company | `Lightbulb` | `bg-yellow-100 text-yellow-700` |
| **Staging** | Staging Company | `Warehouse` | `bg-indigo-100 text-indigo-700` |
| **Rentals** | Rental Company | `Warehouse` | `bg-orange-100 text-orange-700` |
| **Venue** | Venue | `MapPin` | `bg-green-100 text-green-700` |
| **Act** | Act | `Music` | `bg-red-100 text-red-700` |
| **Agency** | Agency | `Building2` | `bg-indigo-100 text-indigo-700` |

#### User Role Metadata
- **Admin**: Icon: `Crown`, Color: `bg-purple-100 text-purple-700`
- **Manager**: Icon: `Shield`, Color: `bg-blue-100 text-blue-700`
- **Staff**: Icon: `UserIcon`, Variant: `outline`
- **Viewer**: Icon: `Clock` (pending) or `UserIcon`

#### Gig Status Metadata
| Status | Label | Tailwind Color/Border Classes |
| :--- | :--- | :--- |
| **DateHold** | Date Hold | `bg-gray-100 text-gray-800 border-gray-300` |
| **Proposed** | Proposed | `bg-blue-100 text-blue-800 border-blue-300` |
| **Booked** | Booked | `bg-green-100 text-green-800 border-green-300` |
| **Completed** | Completed | `bg-purple-100 text-purple-800 border-purple-300` |
| **Cancelled** | Cancelled | `bg-red-100 text-red-800 border-red-300` |
| **Settled** | Settled | `bg-indigo-100 text-indigo-800 border-indigo-300` |


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
