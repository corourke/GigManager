# Technical Specification - Robust Tables

## 1. Technical Context
- **Framework**: React 18.3.1
- **Styling**: Tailwind CSS 4.0
- **UI Components**: Shadcn/ui (Radix UI)
- **Icons**: Lucide React
- **Validation**: Zod
- **Persistence**: Browser LocalStorage

## 2. Implementation Approach

### 2.1. Core Components
- **`SmartDataTable`**: The main component that takes data, column definitions, and handles state for sorting, filtering, and column visibility.
- **`EditableCell`**: A wrapper for table cells that manages the view/edit state transition.
- **`TableHeader`**: Enhanced with sorting icons and context menus for filtering/column management.
- **`ActionColumn`**: A specialized column for row actions.

### 2.2. State Management & Persistence
- A custom hook `useTableState` will manage:
  - `sorting`: `{ columnId: string, direction: 'asc' | 'desc' | null }`
  - `filters`: `Record<string, any>`
  - `visibleColumns`: `string[]`
- `LocalStorage` will be used to persist these states keyed by a `tableId`.

### 2.3. Column Definition Interface
```typescript
interface ColumnDef<T> {
  id: string;
  header: string;
  accessor: keyof T | ((row: T) => any);
  type: 'text' | 'number' | 'checkbox' | 'pill' | 'select' | 'date';
  required?: boolean; // Always visible, cannot be removed
  readOnly?: boolean; // Cannot be edited
  optional?: boolean; // Can be hidden by user
  options?: { label: string; value: any; color?: string }[]; // For select and pills
  validation?: z.ZodTypeAny;
  className?: string;
}
```

### 2.4. In-place Editing Logic
- **Selection**: Single click on a cell sets `selectedCell` state `{ rowId, columnId }`. This adds a blue outline (`ring-2 ring-blue-500`).
- **Activation**: Double click (or Enter when selected) sets `editingCell` state.
- **Deactivation**: `Esc` to cancel, `Enter` or clicking outside to save.
- **Flicker-free**: The `EditableCell` will ensure the viewing value and editing input have matching dimensions and padding.

### 2.5. Field Specifics
- **Text/Number**: Standard `input` with focus and cursor at the end.
- **Checkbox**: Radix UI `Checkbox` component.
- **Pills**: Use `Badge` component. Edit mode will show a searchable select or a tagged input.
- **Select**: `Command` component from Shadcn for searchable dropdowns.

## 3. Source Code Structure Changes
- New directory: `src/components/tables/`
  - `SmartDataTable.tsx`
  - `EditableCell.tsx`
  - `TableFilters.tsx`
  - `ColumnManager.tsx`
- New hook: `src/hooks/useTableState.ts`
- New utility: `src/utils/tablePersistence.ts`

## 4. Delivery Phases

### Phase 1: Infrastructure
- Implement `useTableState` and persistence logic.
- Create basic `SmartDataTable` structure with sorting and column visibility.

### Phase 2: In-place Editing
- Implement `EditableCell` with support for Text and Checkbox.
- Add "Coda/Notion" selection behavior (blue outline).

### Phase 3: Advanced Fields
- Add support for Pills (with colors from `constants.ts`) and Searchable Selects.
- Implement multi-criteria filtering UI.

### Phase 4: Integration
- Replace table in `AssetListScreen`.
- Verify performance and UX.
- Plan rollout to other screens.

## 5. Verification Approach
- **Linting**: `npm run lint`
- **Testing**:
  - Unit tests for `useTableState` (persistence and state transitions).
  - Component tests for `EditableCell` (edit mode triggers, save/cancel).
  - Integration tests in `AssetListScreen.test.tsx`.
