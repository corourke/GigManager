# Technical Specification - UI Improvements and Bug Fixes

## Context
- **Language**: TypeScript / React 18
- **UI Components**: Shadcn/ui, Tailwind CSS, Radix UI
- **Backend**: Supabase (PostgreSQL)

## Implementation Approach

### 1. Gig List Navigation & Row Actions
- **Issue**: Row menu "Edit" opens time dialog instead of Edit screen. Row menu is inconsistent with other lists.
- **Approach**:
  - Update `src/App.tsx` navigation handlers:
    - `handleViewGig` -> Renamed to `handleEditGig` (goes to `create-gig` route).
    - New `handleViewGig` (goes to `gig-detail` route).
  - Update `GigListScreen.tsx` to use these handlers.
  - Modify `GigTable.tsx` to move actions from a dropdown menu at the start to individual buttons (View, Edit, Duplicate, Trash) at the end of the row.
  - Apply similar standardization to `TeamScreen.tsx` (View, Edit) and `AssetListScreen.tsx` (View, Edit, Duplicate, Trash).

### 2. Gig List Spreadsheet Experience
- **Issue**: Tabbing between columns is missing. Styling is jarring. Modal date/time editing is a regression.
- **Approach**:
  - **Keyboard Navigation**:
    - Update `EditableTableCell.tsx` to handle `Tab` (forward) and `Shift+Tab` (backward).
    - These events will trigger `onSave` and then call a new prop `onNavigate` to focus the next/previous cell.
    - Update `GigTable.tsx` to track the "active" cell and handle navigation logic.
  - **Cell Styling**:
    - Update `EditableTableCell.tsx` to use subtle shading (e.g., `bg-sky-50`) instead of heavy outlines.
    - Ensure padding and width are consistent between read/edit modes to prevent layout shifts.
  - **Select & Tags**:
    - Update `EditableTableCell.tsx` and `TagsInput.tsx` to ensure `Tab` or `Enter` selects the current value/tag before moving to the next cell.
  - **Date/Time Inline Editing**:
    - Replace the `TimeEditDialog` approach with an inline date/time picker similar to `GigBasicInfoSection.tsx`.

### 3. Compact Detail Screens
- **Issue**: "View" action should show a compact read-only screen with actions in the upper right.
- **Approach**:
  - Update `GigDetailScreen.tsx`, `AssetScreen.tsx`, and `TeamScreen.tsx` (or create a detail view if missing) to match the layout of `KitDetailScreen.tsx`.
  - Buttons (Edit, Duplicate, Trash) will be placed in the header area.

### 4. Global UI Fixes
- **User Avatar Menu**: Update `AppHeader.tsx` to ensure "Edit Profile" is always present.
- **Team RLS Error**: Add an `INSERT` policy to the `users` table in a new migration to allow Admins/Managers to create "pending" users during invitation.

## Source Code Structure Changes
- **Modified Files**:
  - `src/App.tsx`: Navigation logic.
  - `src/components/GigListScreen.tsx`: Gig list orchestration.
  - `src/components/tables/GigTable.tsx`: Gig table implementation.
  - `src/components/tables/EditableTableCell.tsx`: Inline editing logic and styling.
  - `src/utils/hooks/useInlineEdit.ts`: Keyboard event handling.
  - `src/components/AppHeader.tsx`: Avatar menu.
  - `src/components/TeamScreen.tsx`: Team list and actions.
  - `src/components/AssetListScreen.tsx`: Asset list and actions.
- **New Files**:
  - `supabase/migrations/20260131000000_fix_users_insert_policy.sql`: RLS fix.

## Verification Approach
- **Automated Tests**: Run existing tests using `npm test` to ensure no regressions.
- **Manual Verification**:
  - Verify tabbing through all columns in the Gig List.
  - Verify row actions are at the end for all lists.
  - Verify "View" screens are compact and have buttons in the upper right.
  - Verify "Edit Profile" is always visible in the header.
  - Verify team member invitation works without RLS errors.
