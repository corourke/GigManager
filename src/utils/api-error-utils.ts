/**
 * Utility functions for handling API errors consistently across services
 */

/**
 * Helper to identify network/connection errors
 */
export const isNetworkError = (err: any): boolean => {
  return (
    err?.message?.includes('Failed to fetch') || 
    err?.code === 'ERR_NETWORK' ||
    err?.name === 'TypeError' ||
    // Supabase error codes for connection issues
    err?.code === 'PGRST301' || // JWT expired or connection issue
    err?.status === 0
  );
};

/**
 * Common error handler for API services
 */
export const handleApiError = (err: any, context: string) => {
  if (isNetworkError(err)) {
    const networkError = new Error(`Network error: Unable to ${context}. Please check your internet connection.`);
    networkError.name = 'NetworkError';
    throw networkError;
  }
  
  console.error(`Error ${context}:`, err);
  throw err;
};
