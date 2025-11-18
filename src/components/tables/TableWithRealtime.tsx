import React, { useEffect } from 'react';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { useRealtimeList } from '../../utils/hooks/useRealtimeList';

interface TableWithRealtimeProps<T> {
  table: string;
  filters?: Record<string, any>;
  orderBy?: string;
  ascending?: boolean;
  enabled?: boolean;
  children: (data: T[], loading: boolean, refresh: () => void) => React.ReactNode;
  errorComponent?: (error: string, retry: () => void) => React.ReactNode;
  loadingComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
}

/**
 * Wrapper component that provides real-time data management for tables
 */
export default function TableWithRealtime<T extends { id: string }>({
  table,
  filters = {},
  orderBy,
  ascending = true,
  enabled = true,
  children,
  errorComponent,
  loadingComponent,
  emptyComponent,
}: TableWithRealtimeProps<T>) {
  const { data, loading, error, refresh, isSubscribed } = useRealtimeList<T>({
    table,
    filters,
    orderBy,
    ascending,
    enabled,
  });

  // Default loading component
  const defaultLoading = loadingComponent || (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="h-6 w-6 animate-spin text-sky-500 mr-2" />
      <span className="text-gray-600">Loading...</span>
    </div>
  );

  // Default error component
  const defaultError = errorComponent || ((errorMsg: string, retry: () => void) => (
    <Alert className="my-4">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>{errorMsg}</span>
        <Button variant="outline" size="sm" onClick={retry}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  ));

  // Default empty component
  const defaultEmpty = emptyComponent || (
    <div className="text-center py-8 text-gray-500">
      <p>No data available</p>
    </div>
  );

  if (loading && data.length === 0) {
    return <>{defaultLoading}</>;
  }

  if (error) {
    return <>{defaultError(error, refresh)}</>;
  }

  if (data.length === 0) {
    return <>{defaultEmpty}</>;
  }

  return (
    <>
      {/* Real-time subscription indicator (optional debug info) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-400 mb-2">
          Real-time: {isSubscribed ? '🟢 Connected' : '🔴 Disconnected'}
        </div>
      )}

      {children(data, loading, refresh)}
    </>
  );
}
