import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '../supabase/client';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface UseRealtimeListOptions<T> {
  table: string;
  select?: string;
  filters?: Record<string, any>;
  orderBy?: string;
  ascending?: boolean;
  enabled?: boolean;
}

interface RealtimeListState<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  isSubscribed: boolean;
}

/**
 * Hook for managing real-time list data with Supabase subscriptions
 */
export function useRealtimeList<T extends { id: string }>({
  table,
  select = '*',
  filters = {},
  orderBy,
  ascending = true,
  enabled = true,
}: UseRealtimeListOptions<T>) {
  const [state, setState] = useState<RealtimeListState<T>>({
    data: [],
    loading: true,
    error: null,
    isSubscribed: false,
  });

  const channelRef = useRef<RealtimeChannel | null>(null);
  const mountedRef = useRef(true);

  // Build filter string for subscription
  const buildFilterString = useCallback(() => {
    const filterParts = Object.entries(filters).map(([key, value]) => `${key}=eq.${value}`);
    return filterParts.join(',');
  }, [filters]);

  // Subscribe to real-time changes
  const subscribe = useCallback(async () => {
    if (!enabled || !mountedRef.current) return;

    try {
      const supabase = createClient();
      const filterString = buildFilterString();

      const channel = supabase
        .channel(`${table}_changes`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table,
            ...(filterString && { filter: filterString }),
          },
          (payload: RealtimePostgresChangesPayload<T>) => {
            if (!mountedRef.current) return;

            setState(prevState => {
              const currentData = [...prevState.data];

              switch (payload.eventType) {
                case 'INSERT':
                  // Add new item if it doesn't exist
                  if (payload.new && !currentData.find(item => item.id === payload.new.id)) {
                    return {
                      ...prevState,
                      data: [...currentData, payload.new as T],
                    };
                  }
                  return prevState;

                case 'UPDATE':
                  // Update existing item
                  if (payload.new) {
                    const index = currentData.findIndex(item => item.id === payload.new.id);
                    if (index !== -1) {
                      currentData[index] = payload.new as T;
                      return {
                        ...prevState,
                        data: [...currentData],
                      };
                    }
                  }
                  return prevState;

                case 'DELETE':
                  // Remove deleted item
                  if (payload.old) {
                    return {
                      ...prevState,
                      data: currentData.filter(item => item.id !== payload.old.id),
                    };
                  }
                  return prevState;

                default:
                  return prevState;
              }
            });
          }
        )
        .subscribe((status) => {
          if (!mountedRef.current) return;

          setState(prevState => ({
            ...prevState,
            isSubscribed: status === 'SUBSCRIBED',
            error: status === 'SUBSCRIPTION_ERROR' ? 'Failed to subscribe to real-time updates' : null,
          }));
        });

      channelRef.current = channel;

      return channel;
    } catch (error) {
      console.error('Error setting up real-time subscription:', error);
      setState(prevState => ({
        ...prevState,
        error: 'Failed to set up real-time subscription',
        isSubscribed: false,
      }));
    }
  }, [table, buildFilterString, enabled]);

  // Load initial data
  const loadData = useCallback(async () => {
    if (!enabled || !mountedRef.current) return;

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const supabase = createClient();
      let query = supabase.from(table).select(select);

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      // Apply ordering
      if (orderBy) {
        query = query.order(orderBy, { ascending });
      }

      const { data, error } = await query;

      if (error) throw error;

      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          data: data || [],
          loading: false,
          error: null,
        }));
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error.message || 'Failed to load data',
        }));
      }
    }
  }, [table, select, filters, orderBy, ascending, enabled]);

  // Optimistic update for immediate UI feedback
  const optimisticUpdate = useCallback((itemId: string, updates: Partial<T>) => {
    setState(prevState => ({
      ...prevState,
      data: prevState.data.map(item =>
        item.id === itemId ? { ...item, ...updates } : item
      ),
    }));
  }, []);

  // Handle conflicts (server state differs from optimistic update)
  const handleConflict = useCallback((serverData: T[]) => {
    setState(prevState => ({
      ...prevState,
      data: serverData,
    }));
  }, []);

  // Refresh data manually
  const refresh = useCallback(() => {
    loadData();
  }, [loadData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, []);

  // Initial data load and subscription setup
  useEffect(() => {
    loadData();
    subscribe();

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [loadData, subscribe]);

  return {
    // State
    ...state,

    // Actions
    refresh,
    optimisticUpdate,
    handleConflict,

    // Subscription status
    isSubscribed: state.isSubscribed,
  };
}
