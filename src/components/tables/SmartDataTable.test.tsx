import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SmartDataTable, ColumnDef, RowAction } from './SmartDataTable';
import { TableCell } from '../ui/table';

// Mock the useTableState hook since it uses localStorage
vi.mock('../../utils/hooks/useTableState', () => ({
  useTableState: vi.fn((tableId: string) => ({
    sorting: null,
    filters: {},
    columnVisibility: {},
    toggleSorting: vi.fn(),
    setFilter: vi.fn(),
    removeFilter: vi.fn(),
    toggleColumnVisibility: vi.fn(),
  })),
}));

// Mock EditableCell to simplify testing of SmartDataTable itself
vi.mock('./EditableCell', () => ({
  EditableCell: ({ value, onSave, onSelect, isSelected }: any) => (
    <TableCell 
      data-testid="editable-cell" 
      onClick={onSelect}
      className={isSelected ? 'selected' : ''}
    >
      <input 
        data-testid="cell-input"
        defaultValue={value} 
        onBlur={(e) => onSave(e.target.value)} 
      />
    </TableCell>
  ),
}));

interface TestData {
  id: string;
  name: string;
  age: number;
  status: string;
}

const columns: ColumnDef<TestData>[] = [
  { id: 'name', header: 'Name', accessor: 'name', sortable: true, filterable: true, editable: true },
  { id: 'age', header: 'Age', accessor: 'age', sortable: true, type: 'number' },
  { id: 'status', header: 'Status', accessor: 'status', filterable: true },
];

const data: TestData[] = [
  { id: '1', name: 'Alice', age: 30, status: 'Active' },
  { id: '2', name: 'Bob', age: 25, status: 'Inactive' },
  { id: '3', name: 'Charlie', age: 35, status: 'Active' },
];

describe('SmartDataTable', () => {
  const onRowUpdate = vi.fn();
  const onAddRow = vi.fn();
  const onFilteredDataChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with data', () => {
    render(
      <SmartDataTable
        tableId="test-table"
        data={data}
        columns={columns}
      />
    );

    // Check for display values since they are inside inputs in our mock
    expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Bob')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Charlie')).toBeInTheDocument();
    
    // Check for headers
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Age')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <SmartDataTable
        tableId="test-table"
        data={data}
        columns={columns}
        isLoading={true}
      />
    );

    // Skeleton components should be rendered
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows empty message when no data', () => {
    render(
      <SmartDataTable
        tableId="test-table"
        data={[]}
        columns={columns}
        emptyMessage="No items found"
      />
    );

    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('calls onRowUpdate when a cell is edited', async () => {
    render(
      <SmartDataTable
        tableId="test-table"
        data={data}
        columns={columns}
        onRowUpdate={onRowUpdate}
      />
    );

    const inputs = screen.getAllByTestId('cell-input');
    fireEvent.change(inputs[0], { target: { value: 'Alice Updated' } });
    fireEvent.blur(inputs[0]);

    await waitFor(() => {
      expect(onRowUpdate).toHaveBeenCalledWith('1', { name: 'Alice Updated' });
    });
  });

  it('calls onAddRow when add button is clicked', async () => {
    const user = userEvent.setup();
    onAddRow.mockResolvedValue({ id: '4', name: '', age: 0, status: '' });

    render(
      <SmartDataTable
        tableId="test-table"
        data={data}
        columns={columns}
        onAddRow={onAddRow}
      />
    );

    const addButton = screen.getByRole('button', { name: /add row/i });
    await user.click(addButton);

    expect(onAddRow).toHaveBeenCalled();
  });

  it('renders row actions correctly', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const rowActions: RowAction<TestData>[] = [
      { id: 'delete', onClick: onDelete, label: 'Delete Row' }
    ];

    render(
      <SmartDataTable
        tableId="test-table"
        data={data}
        columns={columns}
        rowActions={rowActions}
      />
    );

    const deleteButtons = screen.getAllByTitle('Delete Row');
    expect(deleteButtons).toHaveLength(3);

    await user.click(deleteButtons[0]);
    expect(onDelete).toHaveBeenCalledWith(data[0]);
  });

  it('displays correct row count', () => {
    render(
      <SmartDataTable
        tableId="test-table"
        data={data}
        columns={columns}
      />
    );

    expect(screen.getByText('3 rows')).toBeInTheDocument();
  });

  it('calls onFilteredDataChange when data is rendered', () => {
    render(
      <SmartDataTable
        tableId="test-table"
        data={data}
        columns={columns}
        onFilteredDataChange={onFilteredDataChange}
      />
    );

    expect(onFilteredDataChange).toHaveBeenCalledWith(data);
  });

  it('toggles column visibility via dropdown', async () => {
    const user = userEvent.setup();
    
    const { useTableState } = await import('../../utils/hooks/useTableState');
    const mockUseTableState = vi.mocked(useTableState);
    const toggleColumnVisibility = vi.fn();
    
    // For this test, make Age optional so it appears in the dropdown
    const optionalColumns: ColumnDef<TestData>[] = [
      ...columns.slice(0, 1),
      { ...columns[1], optional: true },
      ...columns.slice(2)
    ];

    mockUseTableState.mockReturnValue({
      sorting: null,
      filters: {},
      columnVisibility: {},
      toggleSorting: vi.fn(),
      setFilter: vi.fn(),
      removeFilter: vi.fn(),
      toggleColumnVisibility,
    } as any);

    render(
      <SmartDataTable
        tableId="test-table"
        data={data}
        columns={optionalColumns}
      />
    );

    const columnsButton = screen.getByRole('button', { name: /columns/i });
    await user.click(columnsButton);

    // Find the Age menu item
    const ageMenuItem = screen.getByText('Age');
    await user.click(ageMenuItem);

    expect(toggleColumnVisibility).toHaveBeenCalledWith('age');
  });

  it('calls setFilter when typing in filter input', async () => {
    const user = userEvent.setup();
    const { useTableState } = await import('../../utils/hooks/useTableState');
    const mockUseTableState = vi.mocked(useTableState);
    const setFilter = vi.fn();

    mockUseTableState.mockReturnValue({
      sorting: null,
      filters: {},
      columnVisibility: {},
      toggleSorting: vi.fn(),
      setFilter,
      removeFilter: vi.fn(),
      toggleColumnVisibility: vi.fn(),
    } as any);

    render(
      <SmartDataTable
        tableId="test-table"
        data={data}
        columns={columns}
      />
    );

    // Open filter popover for Name column
    const filterButton = screen.getByLabelText('Filter Name');
    await user.click(filterButton);

    const filterInput = await screen.findByPlaceholderText('Search...');
    await user.type(filterInput, 'Ali');

    // It should be called for each character
    expect(setFilter).toHaveBeenCalledWith('name', 'A');
    expect(setFilter).toHaveBeenCalledWith('name', 'l');
    expect(setFilter).toHaveBeenCalledWith('name', 'i');
  });

  it('calls toggleSorting when clicking a sortable column header', async () => {
    const user = userEvent.setup();
    const { useTableState } = await import('../../utils/hooks/useTableState');
    const mockUseTableState = vi.mocked(useTableState);
    const toggleSorting = vi.fn();

    mockUseTableState.mockReturnValue({
      sorting: null,
      filters: {},
      columnVisibility: {},
      toggleSorting,
      setFilter: vi.fn(),
      removeFilter: vi.fn(),
      toggleColumnVisibility: vi.fn(),
    } as any);

    render(
      <SmartDataTable
        tableId="test-table"
        data={data}
        columns={columns}
      />
    );

    const nameHeader = screen.getByText('Name');
    await user.click(nameHeader);

    expect(toggleSorting).toHaveBeenCalledWith('name');
  });

  it('handles keyboard navigation with Tab', async () => {
    const user = userEvent.setup();
    render(
      <SmartDataTable
        tableId="test-table"
        data={data}
        columns={columns}
      />
    );

    const cells = screen.getAllByTestId('editable-cell');
    
    // Select first cell
    await user.click(cells[0]);
    expect(cells[0]).toHaveClass('selected');

    // Tab to next cell
    await user.keyboard('{Tab}');
    
    // In our test environment, we need to verify if setSelectedCell was called.
    // Since we can't easily check internal state, we check if the next cell is selected.
    // The component's moveSelection logic updates selectedCell state.
    
    await waitFor(() => {
      expect(cells[1]).toHaveClass('selected');
    });
  });
});
