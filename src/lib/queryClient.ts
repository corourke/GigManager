import { QueryClient } from '@tanstack/react-query';

// Single shared QueryClient for the app's server-state layer (Phase 7).
// Defaults are conservative: data is considered fresh for 30s and retried
// once, so screens migrated to useQuery dedupe and cache without surprising
// background refetch storms.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
