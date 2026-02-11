import { useState, useEffect } from 'react';

export interface SortingState {
  columnId: string;
  direction: 'asc' | 'desc';
}

export interface TableState {
  sorting: SortingState | null;
  filters: Record<string, any>;
  columnVisibility: Record<string, boolean>;
}

/**
 * Hook to manage table state (sorting, filtering, column visibility)
 * with LocalStorage persistence.
 * 
 * @param tableId Unique identifier for the table to persist state
 * @param initialState Initial values for the state
 */
export function useTableState(tableId: string, initialState?: Partial<TableState>) {
  const storageKey = `table-state-${tableId}`;

  const [state, setState] = useState<TableState>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
    if (saved) {
      try {
        return {
          sorting: null,
          filters: {},
          columnVisibility: {},
          ...initialState,
          ...JSON.parse(saved),
        };
      } catch (e) {
        console.error(`Failed to parse saved table state for ${tableId}`, e);
      }
    }
    return {
      sorting: null,
      filters: {},
      columnVisibility: {},
      ...initialState,
    };
  });

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(state));
    }
  }, [storageKey, state]);

  const setSorting = (sorting: SortingState | null) => {
    setState(prev => ({ ...prev, sorting }));
  };

  const toggleSorting = (columnId: string) => {
    setState(prev => {
      if (prev.sorting?.columnId === columnId) {
        if (prev.sorting.direction === 'asc') {
          return { ...prev, sorting: { columnId, direction: 'desc' } };
        }
        return { ...prev, sorting: null };
      }
      return { ...prev, sorting: { columnId, direction: 'asc' } };
    });
  };

  const setFilters = (filters: Record<string, any>) => {
    setState(prev => ({ ...prev, filters }));
  };

  const setFilter = (columnId: string, value: any) => {
    setState(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        [columnId]: value,
      },
    }));
  };

  const removeFilter = (columnId: string) => {
    setState(prev => {
      const newFilters = { ...prev.filters };
      delete newFilters[columnId];
      return { ...prev, filters: newFilters };
    });
  };

  const setColumnVisibility = (columnVisibility: Record<string, boolean>) => {
    setState(prev => ({ ...prev, columnVisibility }));
  };

  const toggleColumnVisibility = (columnId: string) => {
    setState(prev => ({
      ...prev,
      columnVisibility: {
        ...prev.columnVisibility,
        [columnId]: prev.columnVisibility[columnId] === false,
      },
    }));
  };

  const resetState = () => {
    setState({
      sorting: null,
      filters: {},
      columnVisibility: {},
      ...initialState,
    });
  };

  return {
    ...state,
    setSorting,
    toggleSorting,
    setFilters,
    setFilter,
    removeFilter,
    setColumnVisibility,
    toggleColumnVisibility,
    resetState,
  };
}
