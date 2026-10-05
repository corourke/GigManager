# SmartDataTable Technical Documentation

The `SmartDataTable` is a powerful, generic, and type-safe React component designed for handling complex data grids within the GigWrangler platform. It integrates features like sorting, filtering, inline editing, and keyboard navigation while maintaining a consistent design language using **Shadcn/ui** and **Tailwind CSS**.

## Features

- **Type-Safe**: Fully generic implementation that works with any data structure extending `{ id: string }`.
- **Inline Editing**: Supports multiple data types (text, number, currency, date, pills, etc.). A cell stays in edit mode until `onRowUpdate` resolves; if it throws, the edit value reverts.
- **Sorting & Filtering**: Built-in column-level sorting and text-based filtering.
- **Persistent State**: Automatically persists column visibility, column widths, sorting, and filters per `tableId`.
- **Resizable Columns**: Drag a header's edge to resize; widths are saved with the rest of the table state.
- **Keyboard Navigation**: Spreadsheet-like navigation using `Tab`, `Shift+Tab`, `Enter`, and `Shift+Enter`.
- **Responsive & Accessible**: Uses accessible primitives from Radix UI and provides loading skeletons.
- **Customizable Actions**: Supports both custom render props for actions and a standardized `rowActions` array.

## Usage

### Basic Example

```tsx
import { SmartDataTable, ColumnDef } from '@/components/tables/SmartDataTable';

interface User {
  id: string;
  name: string;
  role: 'admin' | 'user';
}

const columns: ColumnDef<User>[] = [
  { id: 'name', header: 'Name', accessor: 'name', sortable: true, filterable: true, editable: true },
  { 
    id: 'role', 
    header: 'Role', 
    accessor: 'role', 
    type: 'pill',
    pillConfig: {
      admin: { label: 'Admin', color: 'bg-purple-100 text-purple-700' },
      user: { label: 'User', color: 'bg-blue-100 text-blue-700' }
    }
  }
];

export function UserTable({ data }) {
  return (
    <SmartDataTable
      tableId="users-list"
      data={data}
      columns={columns}
      onRowUpdate={async (id, updates) => {
        await api.users.update(id, updates);
      }}
    />
  );
}
```

## Options & Configuration

### Props

| Prop | Type | Description |
| :--- | :--- | :--- |
| `tableId` | `string` | Unique identifier used for persisting table state (visibility, filters). |
| `data` | `T[]` | The array of objects to display. Each object must have an `id`. |
| `columns` | `ColumnDef<T>[]` | Configuration for table columns. |
| `onRowUpdate` | `(id, updates) => Promise<void>` | Callback triggered after a cell edit is committed. |
| `onAddRow` | `() => Promise<T>` | Callback to handle inline row creation. Returns the new row. |
| `onAddRowClick` | `() => void` | Custom handler for the "Add Row" button (overrides inline addition). |
| `onFilteredDataChange` | `(data: T[]) => void` | Notifies parent when the visible dataset changes (useful for totals). |
| `rowActions` | `RowAction<T>[]` | Standardized actions (view, edit, delete, duplicate) for each row. |
| `actions` | `(row: T) => ReactNode` | Render prop for custom action buttons per row. |
| `isLoading` | `boolean` | Displays skeleton loaders when true. |
| `onVisibleColumnsChange` | `(columnIds: string[]) => void` | Fires with the visible column ids, in display order, whenever visibility changes (e.g. to export only the shown columns). |
| `emptyMessage` | `string` | Shown when no rows match. Defaults to "No data found". |
| `toolbarLeft` / `toolbarRight` | `ReactNode` | Extra controls in the toolbar: `toolbarLeft` before the row count, `toolbarRight` before the Columns menu. |
| `className` | `string` | Class for the outer wrapper. |

### Column Definition (`ColumnDef<T>`)

- **`id`** / **`header`**: Column key (used for persisted state) and header label.
- **`accessor`**: Key of the data object or a function `(row: T) => any`. When it is a key, edits are sent to `onRowUpdate` under that key; with a function accessor they are sent under the column `id`.
- **`type`**: Controls the editor and renderer. Supported: `text`, `number`, `currency`, `date`, `datetime`, `pill`, `multi-pill`, `select`, `checkbox`.
- **`options`** / **`pillConfig`**: Choices for `select`, `pill` and `multi-pill` columns; `pillConfig` maps each value to a label and badge color.
- **`timezone`**: A time zone, or `(row) => string`, used to display and parse `datetime` values.
- **`sortable`** / **`filterable`**: Show the sort toggle and the filter popover in the header.
- **`required`**: If `true`, the column cannot be hidden via the column settings menu.
- **`optional`**: If `true`, the column is hidden by default but can be enabled by the user.
- **`editable`**: Enables inline editing for this column. **`readOnly`** turns editing off again (useful when a shared column definition is editable elsewhere).
- **`onCellClick`**: `(row: T) => void`. Every click on the cell calls this instead of selecting or editing it, so the column becomes a navigation link (e.g. "click the title to open the gig"); `editable` is ignored.
- **`exportValue`**: `(row: T) => string | number | null | undefined`. Plain value for CSV export (`gigExport.ts`); falls back to `accessor`.
- **`render`**: Custom render function `(value: any, row: T) => React.ReactNode`.
- **`className`**: Class for the column's `<col>` and header cell (body cells don't get it; style them in `render`).

## User Interactions & Keyboard Shortcuts

The `SmartDataTable` provides a spreadsheet-like experience with rich keyboard support:

- **Selection**: Click a cell to select it (indicated by a blue outline).
- **Type to Edit**: Typing a character while an editable `text`, `number`, `currency`, `select`, `pill`, `multi-pill`, `date` or `datetime` cell is selected enters edit mode (for text and numbers the character becomes the new value; for the pickers it starts the search).
- **Double-Click**: Double-click a cell, or click a cell that is already selected, to enter edit mode.
- **Spacebar**: Toggle checkboxes when a checkbox cell is selected.
- **Navigation** (works both while selecting and while editing; when editing, the change is saved first):
  - `Tab` / `Shift+Tab`: Move to the next/previous cell, wrapping to the next/previous row. Every visible column is visited, editable or not.
  - `Enter` / `Shift+Enter`: Move to the cell below/above.
  - Arrow keys are not handled by the table.
- **Esc**: Cancel the current edit and revert to the previous value.

## Callbacks & Event Handling

### Data Updates
The `onRowUpdate` callback is essential for persistence. It is called with the `id` of the row and a `Partial<T>` containing only the changed field.

```tsx
onRowUpdate={async (id, updates) => {
  // updates will look like { status: 'completed' }
  const { error } = await supabase.from('gigs').update(updates).eq('id', id);
  if (error) throw error;
}}
```

### Row Actions
The `rowActions` prop renders a "…" menu on each row. An action's `id` is one of `view`, `edit`, `duplicate` or `delete`; it picks the default icon and, without a `label`, the label (the capitalized id). `delete` is styled as destructive, and `disabled: (row) => boolean` greys an action out per row. `actions` and `rowActions` can be combined; both render in the last column.

```tsx
const rowActions = [
  { id: 'view', onClick: (row) => navigate(`/gigs/${row.id}`) },
  { id: 'delete', onClick: (row) => handleDelete(row.id), className: 'text-red-500' }
];
```

### Row Addition Patterns
There are two ways to handle row creation:

1. **Inline Addition (`onAddRow`)**:
   Returns a Promise that resolves to the new row object (the caller adds it to `data`). The table selects the first editable cell of the new row, and the row stays visible through active filters until its first cell is saved.
   ```tsx
   onAddRow={async () => {
     const newRow = await api.create({ name: 'New Item' });
     return newRow;
   }}
   ```

2. **Custom Handler (`onAddRowClick`)**:
   Overrides the default inline behavior. Useful if you want to open a modal or navigate to a different screen instead of adding a row inline.
   ```tsx
   onAddRowClick={() => {
     setModalOpen(true);
   }}
   ```

### Filtered Data Changes
The `onFilteredDataChange` callback is useful when you need to calculate totals or display counts for the currently visible (filtered) dataset.

```tsx
onFilteredDataChange={(filteredData) => {
  const total = filteredData.reduce((sum, row) => sum + row.amount, 0);
  setTotal(total);
}}
```

## Advanced Features

### Dynamic Filtering
For columns with `filterable: true`, a filter icon appears in the header. Clicking it opens a popover for text filtering: a row matches when the column's value contains the text, ignoring case (empty values never match). Filters on several columns combine with AND, and a **Clear filters** button appears in the toolbar while any filter is set.

### Sorting
Clicking a sortable header cycles ascending → descending → unsorted. Strings compare with `localeCompare`; empty values sort last.

### Persistence
Table state (hidden columns, column widths, active filters, and sorting) is persisted to local storage by `useTableState` (`src/utils/hooks/useTableState.ts`) under the key `table-state-<tableId>`. This ensures a consistent user experience across sessions; give each table a distinct `tableId`.

## Where it is used

`GigListScreen`, `AssetListScreen`, `KitListScreen`, `TeamScreen` (columns in `team/teamColumns.tsx`), `ModeratorAccessRequestsScreen`, and the developer demo `dev/DevTableDemoScreen`. Tests: `src/components/tables/SmartDataTable.test.tsx` and `EditableCell.test.tsx`.
