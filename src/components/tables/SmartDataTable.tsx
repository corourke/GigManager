import React, { useMemo, useState, useCallback, useRef } from 'react';
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Filter,
  MoreHorizontal,
  Settings2,
  X,
  Search,
  Eye,
  Edit,
  Copy,
  Trash2,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { cn } from '../ui/utils';
import { useTableState, SortingState } from '../../utils/hooks/useTableState';
import { EditableCell } from './EditableCell';

export type ColumnType = 'text' | 'number' | 'checkbox' | 'pill' | 'select' | 'date' | 'currency';

export interface RowAction<T> {
  id: 'view' | 'edit' | 'duplicate' | 'delete';
  label?: string;
  icon?: React.ReactNode;
  onClick: (row: T) => void;
  className?: string;
  disabled?: (row: T) => boolean;
}

export interface ColumnDef<T> {
  id: string;
  header: string;
  accessor: keyof T | ((row: T) => any);
  sortable?: boolean;
  filterable?: boolean;
  editable?: boolean;
  required?: boolean;
  optional?: boolean;
  readOnly?: boolean;
  type?: ColumnType;
  options?: { label: string; value: any }[];
  pillConfig?: Record<string, { label: string; color: string }>;
  className?: string;
  render?: (value: any, row: T) => React.ReactNode;
}

interface SmartDataTableProps<T extends { id: string }> {
  tableId: string;
  data: T[];
  columns: ColumnDef<T>[];
  onRowUpdate?: (id: string, updates: Partial<T>) => Promise<void>;
  onFilteredDataChange?: (data: T[]) => void;
  actions?: (row: T) => React.ReactNode;
  rowActions?: RowAction<T>[];
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function SmartDataTable<T extends { id: string }>({
  tableId,
  data,
  columns,
  onRowUpdate,
  onFilteredDataChange,
  actions,
  rowActions,
  isLoading = false,
  emptyMessage = 'No data found',
  className,
}: SmartDataTableProps<T>) {
  const {
    sorting,
    filters,
    columnVisibility,
    toggleSorting,
    setFilter,
    removeFilter,
    toggleColumnVisibility,
  } = useTableState(tableId);

  // Filter and sort data
  const processedData = useMemo(() => {
    let result = [...data];

    // Apply filters
    Object.entries(filters).forEach(([columnId, filterValue]) => {
      if (!filterValue) return;

      const column = columns.find((c) => c.id === columnId);
      if (!column) return;

      result = result.filter((row) => {
        const val = typeof column.accessor === 'function' 
          ? column.accessor(row) 
          : row[column.accessor];
        
        if (val === null || val === undefined) return false;
        
        const searchStr = String(filterValue).toLowerCase();
        return String(val).toLowerCase().includes(searchStr);
      });
    });

    // Apply sorting
    if (sorting) {
      const column = columns.find((c) => c.id === sorting.columnId);
      if (column) {
        result.sort((a, b) => {
          const valA = typeof column.accessor === 'function' 
            ? column.accessor(a) 
            : a[column.accessor];
          const valB = typeof column.accessor === 'function' 
            ? column.accessor(b) 
            : b[column.accessor];

          if (valA === valB) return 0;
          if (valA === null || valA === undefined) return 1;
          if (valB === null || valB === undefined) return -1;

          const modifier = sorting.direction === 'asc' ? 1 : -1;
          
          if (typeof valA === 'string' && typeof valB === 'string') {
            return valA.localeCompare(valB) * modifier;
          }
          
          return (valA < valB ? -1 : 1) * modifier;
        });
      }
    }

    return result;
  }, [data, columns, sorting, filters]);

  // Notify parent of filtered data changes
  React.useEffect(() => {
    if (onFilteredDataChange) {
      onFilteredDataChange(processedData);
    }
  }, [processedData, onFilteredDataChange]);

  const visibleColumns = useMemo(() => {
    return columns.filter((col) => {
      if (col.required) return true;
      if (columnVisibility[col.id] === false) return false;
      return !col.optional || columnVisibility[col.id] === true;
    });
  }, [columns, columnVisibility]);

  // Selected cell state for blue outline
  const [selectedCell, setSelectedCell] = useState<{ rowId: string; colId: string } | null>(null);

  const handleCellSave = useCallback(async (rowId: string, columnId: string, newValue: any) => {
    if (onRowUpdate) {
      const column = columns.find(c => c.id === columnId);
      if (column) {
        const updateKey = typeof column.accessor === 'string' ? column.accessor : columnId;
        await onRowUpdate(rowId, { [updateKey]: newValue } as Partial<T>);
      }
    }
  }, [onRowUpdate, columns]);

  const tableContainerRef = useRef<HTMLDivElement>(null);

  const moveSelection = useCallback((direction: 'next' | 'prev' | 'up' | 'down') => {
    if (!selectedCell) return false;

    const rowIndex = processedData.findIndex(r => r.id === selectedCell.rowId);
    const colIndex = visibleColumns.findIndex(c => c.id === selectedCell.colId);

    if (rowIndex === -1 || colIndex === -1) return false;

    let nextRowIndex = rowIndex;
    let nextColIndex = colIndex;

    if (direction === 'next') {
      if (colIndex < visibleColumns.length - 1) {
        nextColIndex = colIndex + 1;
      } else if (rowIndex < processedData.length - 1) {
        nextRowIndex = rowIndex + 1;
        nextColIndex = 0;
      }
    } else if (direction === 'prev') {
      if (colIndex > 0) {
        nextColIndex = colIndex - 1;
      } else if (rowIndex > 0) {
        nextRowIndex = rowIndex - 1;
        nextColIndex = visibleColumns.length - 1;
      }
    } else if (direction === 'down') {
      if (rowIndex < processedData.length - 1) {
        nextRowIndex = rowIndex + 1;
      }
    } else if (direction === 'up') {
      if (rowIndex > 0) {
        nextRowIndex = rowIndex - 1;
      }
    }

    if (nextRowIndex !== rowIndex || nextColIndex !== colIndex) {
      setSelectedCell({
        rowId: processedData[nextRowIndex].id,
        colId: visibleColumns[nextColIndex].id
      });
      // Re-focus container to ensure continued navigation
      // Use a slightly longer delay to ensure it happens after any other focus events (like popover close)
      setTimeout(() => {
        if (tableContainerRef.current) {
          tableContainerRef.current.focus();
        }
      }, 10);
      return true;
    }
    return false;
  }, [selectedCell, processedData, visibleColumns]);

  const handleTableKeyDown = (e: React.KeyboardEvent) => {
    if (!selectedCell) return;

    if (e.key === 'Tab') {
      if (moveSelection(e.shiftKey ? 'prev' : 'next')) {
        e.preventDefault();
      }
    } else if (e.key === 'Enter') {
      if (moveSelection(e.shiftKey ? 'up' : 'down')) {
        e.preventDefault();
      }
    }
  };

  // Helper to render row actions
  const renderRowActions = (row: T) => {
    if (!rowActions) return null;

    return (
      <div className="flex justify-end gap-1">
        {rowActions.map((action) => {
          const Icon = action.icon || {
            view: <Eye className="h-4 w-4" />,
            edit: <Edit className="h-4 w-4" />,
            duplicate: <Copy className="h-4 w-4" />,
            delete: <Trash2 className="h-4 w-4" />,
          }[action.id];

          const baseClass = {
            view: "text-gray-500 hover:text-sky-600",
            edit: "text-gray-500 hover:text-sky-600",
            duplicate: "text-gray-500 hover:text-sky-600",
            delete: "text-gray-500 hover:text-red-600",
          }[action.id];

          return (
            <Button
              key={action.id}
              variant="ghost"
              size="sm"
              className={cn("h-8 w-8 p-0", baseClass, action.className)}
              onClick={() => action.onClick(row)}
              disabled={action.disabled?.(row)}
              title={action.label || action.id.charAt(0).toUpperCase() + action.id.slice(1)}
            >
              {Icon}
            </Button>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.slice(0, 5).map((_, i) => (
                  <TableHead key={i}><Skeleton className="h-4 w-24" /></TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i}>
                  {columns.slice(0, 5).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            {processedData.length} {processedData.length === 1 ? 'row' : 'rows'}
          </p>
          {Object.keys(filters).length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => Object.keys(filters).forEach(removeFilter)}
              className="h-7 px-2 text-xs"
            >
              Clear filters
              <X className="ml-1 h-3 w-3" />
            </Button>
          )}
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="ml-auto flex h-8 gap-2">
              <Settings2 className="h-4 w-4" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {columns
              .filter((col) => !col.required)
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={columnVisibility[column.id] !== false && (!column.optional || columnVisibility[column.id] === true)}
                    onCheckedChange={() => toggleColumnVisibility(column.id)}
                  >
                    {column.header}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div 
        ref={tableContainerRef}
        className="rounded-md border bg-white shadow-sm overflow-hidden outline-none focus:ring-1 focus:ring-sky-100"
        tabIndex={0}
        onKeyDown={handleTableKeyDown}
      >
        <Table className="table-fixed w-full border-collapse">
          <colgroup>
            {visibleColumns.map((column) => (
              <col key={column.id} className={column.className} />
            ))}
            {(actions || rowActions) && <col className="w-[120px]" />}
          </colgroup>
          <TableHeader>
            <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
              {visibleColumns.map((column) => (
                <TableHead key={column.id} className={cn("p-0 group border-r last:border-r-0 whitespace-normal", column.className)}>
                  <div className="flex items-center gap-2 w-full h-full px-4 py-3">
                    <span 
                      className={cn(
                        "font-semibold text-gray-700",
                        column.sortable && "cursor-pointer select-none flex items-center gap-1"
                      )}
                      onClick={() => column.sortable && toggleSorting(column.id)}
                    >
                      {column.header}
                      {column.sortable && (
                        <span className="text-muted-foreground">
                          {sorting?.columnId === column.id ? (
                            sorting.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronsUpDown className="h-4 w-4 transition-opacity" />
                          )}
                        </span>
                      )}
                    </span>
                    
                    {column.filterable && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className={cn(
                              "h-6 w-6 p-0 transition-opacity", 
                              filters[column.id] && "text-sky-600"
                            )}
                          >
                            <Filter className="h-3 w-3" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-60 p-2" align="start">
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium px-2 py-1">Filter {column.header}</h4>
                            <div className="relative">
                              <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                              <Input
                                placeholder={`Search...`}
                                value={filters[column.id] || ''}
                                onChange={(e) => setFilter(column.id, e.target.value)}
                                className="pl-8 h-8 text-sm"
                                autoFocus
                              />
                            </div>
                            {filters[column.id] && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => removeFilter(column.id)}
                                className="w-full h-8 text-xs justify-start"
                              >
                                <X className="mr-2 h-3 w-3" />
                                Clear filter
                              </Button>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </TableHead>
              ))}
              {(actions || rowActions) && <TableHead className="w-[120px] text-right px-4">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {processedData.length > 0 ? (
              processedData.map((row) => (
                <TableRow key={row.id} className="group hover:bg-sky-50/30 transition-colors">
                  {visibleColumns.map((column) => {
                    const value = typeof column.accessor === 'function' 
                      ? column.accessor(row) 
                      : row[column.accessor];
                    
                    const isSelected = selectedCell?.rowId === row.id && selectedCell?.colId === column.id;

                    return (
                      <EditableCell
                        key={column.id}
                        value={value}
                        column={column}
                        row={row}
                        onSave={(newValue) => handleCellSave(row.id, column.id, newValue)}
                        isSelected={isSelected}
                        onSelect={() => {
                          setSelectedCell({ rowId: row.id, colId: column.id });
                          tableContainerRef.current?.focus();
                        }}
                        onNavigate={moveSelection}
                      />
                    );
                  })}
                  {(actions || rowActions) && (
                    <TableCell className="text-right px-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        {actions && actions(row)}
                        {renderRowActions(row)}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={visibleColumns.length + (actions ? 1 : 0)} className="h-32 text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
