# Product Requirements Document (PRD) - Robust Tables

## 1. Overview
The goal is to implement a robust, highly-functional, and consistent table system across the GigManager application. The new system will provide advanced sorting, filtering, and column management, along with a seamless in-place editing experience inspired by tools like Coda and Notion.

## 2. Goals
- Provide a unified table component that can be used throughout the application.
- Enhance data discoverability through persistent sorting and multi-criteria filtering.
- Allow users to customize their view by adding or removing columns.
- Implement a "natural" in-place editing experience that minimizes UI disruption.
- Ensure state persistence (filters, sorting, column layout) across page reloads.

## 3. Features

### 3.1. Robust Table Capabilities
- **Sorting**:
  - Click on column headers to cycle through Ascending, Descending, and No Sort.
  - Sorting state must persist across sessions/page invocations.
- **Filtering**:
  - Support for multiple filtering criteria simultaneously.
  - Filtering state must persist across sessions/page invocations.
- **Column Management**:
  - Ability to toggle visibility of optional columns.
  - Column layout (which columns are visible) must persist across sessions/page invocations.

### 3.2. In-place Editing ("Natural Feel")
- **UX Patterns**:
  - Single click to select a cell (shows a blue outline).
  - Double click to enter edit mode.
  - No flickering or formatting changes when switching to edit mode.
- **Field Types**:
  - **Checkboxes**: Direct interaction.
  - **Text Fields**: Cursor placed at the end of text on entry.
  - **Pills (Badges)**: Maintain formatting; cursor placed at the end to add/edit. Backspace to delete pill, select list with search to add a new pill. Use colors from `src/utils/supabase/constants.ts`.
  - **Select Lists**: Dropdown with a search/filter field.
- **Persistence**: Edits should be saved immediately (auto-save) or via a robust update mechanism.

### 3.3. Configuration & Consistency
- **Schema-driven Configuration**:
  - Define fields that are **Required** (must be in table).
  - Define fields that are **Read-only**.
  - Define fields that are **Optional** (can be toggled by user).
- **Action Column**:
  - Configurable actions (Edit, Delete, Duplicate, etc.) per table instance.
- **Uniformity**: Consistent styling and behavior for all tables (main screens and nested tables in Edit screens).

## 4. User Experience (UX)
- Blue outline for selected cells.
- Smooth transitions between viewing and editing states.
- Intuitive sorting and filtering UI (e.g., icons in headers).
- Persistent state should feel seamless to the user.

## 5. Technical Constraints
- Must integrate with existing **Shadcn/ui** and **Tailwind CSS**.
- State persistence using **LocalStorage**.
- Must handle both top-level list screens and nested tables (e.g., inside Gig or Kit edit forms).
- Use **Zod** for any necessary validation during editing.

## 6. Milestones
1. **Requirements & Spec**: Define the behavior and technical approach.
2. **Core Component**: Build the `SmartDataTable` component.
3. **AssetListScreen Implementation**: Perfect the implementation in the Assets list.
4. **App-wide Rollout**: Implement in other screens (Gigs, Kits, etc.) and handle nested cases.
