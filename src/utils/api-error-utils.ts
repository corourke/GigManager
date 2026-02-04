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

/**
 * Specifically handle errors from Supabase Functions
 * Attempts to parse the error message from the response body
 */
export const handleFunctionsError = async (error: any, context: string) => {
  if (error && error.name === 'FunctionsHttpError' && error.context) {
    let customError: Error | null = null;
    try {
      // In some versions context is the Response, in others it's an object containing it
      const response = error.context instanceof Response ? error.context : (error.context as any).response;
      
      if (response) {
        let body;
        if (typeof response.json === 'function') {
          // Use clone() to avoid draining the stream
          body = await response.clone().json().catch(() => null);
        }

        if (body && (body.error || body.message)) {
          const errorMessage = body.error || body.message;
          customError = new Error(errorMessage);
          (customError as any).status = response.status;
          (customError as any).details = body.details;
          (customError as any).hint = body.hint;
          (customError as any).code = body.code;
        }
      }
    } catch (e) {
      console.error('Error parsing functions error body:', e);
    }

    if (customError) {
      return handleApiError(customError, context);
    }
  }
  return handleApiError(error, context);
};

