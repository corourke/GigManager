# SmartDataTable Technical Documentation

The `SmartDataTable` is a powerful, generic, and type-safe React component designed for handling complex data grids within the GigManager platform. It integrates features like sorting, filtering, inline editing, and keyboard navigation while maintaining a consistent design language using **Shadcn/ui** and **Tailwind CSS**.

## Features

- **Type-Safe**: Fully generic implementation that works with any data structure extending `{ id: string }`.
- **Inline Editing**: Supports multiple data types (text, number, currency, date, pills, etc.) with optimistic UI updates.
- **Sorting & Filtering**: Built-in column-level sorting and text-based filtering.
- **Persistent State**: Automatically persists column visibility, sorting, and filters per `tableId`.
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

### Column Definition (`ColumnDef<T>`)

- **`accessor`**: Key of the data object or a function `(row: T) => any`.
- **`type`**: Controls the editor and renderer. Supported: `text`, `number`, `currency`, `date`, `datetime`, `pill`, `multi-pill`, `select`, `checkbox`.
- **`required`**: If `true`, the column cannot be hidden via the column settings menu.
- **`optional`**: If `true`, the column is hidden by default but can be enabled by the user.
- **`editable`**: Enables inline editing for this column.
- **`render`**: Custom render function `(value: any, row: T) => React.ReactNode`.

## User Interactions & Keyboard Shortcuts

The `SmartDataTable` provides a spreadsheet-like experience with rich keyboard support:

- **Selection**: Click a cell to select it (indicated by a blue outline).
- **Type to Edit**: Start typing while a cell is selected to immediately enter edit mode.
- **Double-Click**: Enter edit mode on a selected cell.
- **Spacebar**: Toggle checkboxes when a checkbox cell is selected.
- **Navigation**: 
  - `Tab` / `Shift+Tab`: Move focus to the next/previous editable cell (wraps rows).
  - `Enter` / `Shift+Enter`: Commit change and move to the cell below/above.
  - `Arrow Keys`: Navigate between cells when in selection mode (if implemented by the container).
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
The `rowActions` prop provides a consistent UI for common operations:

```tsx
const rowActions = [
  { id: 'view', onClick: (row) => navigate(`/gigs/${row.id}`) },
  { id: 'delete', onClick: (row) => handleDelete(row.id), className: 'text-red-500' }
];
```

### Row Addition Patterns
There are two ways to handle row creation:

1. **Inline Addition (`onAddRow`)**:
   Returns a Promise that resolves to the new row object. The table will automatically enter edit mode for the first editable cell of the new row.
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
The table includes a built-in filter engine. For columns with `filterable: true`, a search icon appears in the header. Clicking it opens a popover for text-based filtering.

### Persistence
Table state (which columns are hidden, active filters, and sorting) is persisted to local storage (via `useTableState`) using the `tableId` as a key. This ensures a consistent user experience across sessions.

### Keyboard Shortcuts
- **Tab / Shift+Tab**: Move focus to the next/previous editable cell.
- **Enter**: Commit change and move to the cell below.
- **Esc**: Cancel current edit.
