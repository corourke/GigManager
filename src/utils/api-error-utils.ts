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
 * Unwraps a Supabase FunctionsHttpError's response body into a proper Error
 * with a meaningful `.message`, without throwing — the original error is
 * returned unchanged if it isn't a FunctionsHttpError or has no parseable
 * body. Edge function error bodies in this app consistently put the specific,
 * actionable reason (e.g. Google's own error message) in `details`, with
 * `error` reserved for a generic, route-level label ("Failed to create/update
 * event") — so `details` is preferred over `error` when both are present.
 */
export const unwrapFunctionsError = async (error: any): Promise<any> => {
  if (!(error && error.name === 'FunctionsHttpError' && error.context)) {
    return error;
  }

  try {
    // In some versions context is the Response, in others it's an object containing it
    // Be resilient: check if context itself looks like a Response
    let response = null;
    if (error.context instanceof Response || (error.context && typeof error.context.clone === 'function')) {
      response = error.context;
    } else if (error.context?.response) {
      response = error.context.response;
    }

    if (!response) return error;

    let body;
    if (typeof response.json === 'function') {
      // Use clone() to avoid draining the stream
      const cloned = response.clone();
      try {
        body = await cloned.json();
      } catch (e) {
        body = await cloned.text().catch(() => null);
      }
    }

    if (!body) return error;

    const errorMessage = typeof body === 'string'
      ? body
      : (body.details || body.error || body.message || 'Unknown function error');

    const customError: any = new Error(errorMessage);
    customError.status = response.status;

    if (typeof body === 'object') {
      customError.details = body.details || body.error;
      customError.hint = body.hint;
      customError.code = body.code;
      customError.error_description = body.error_description;
    }

    return customError;
  } catch (e) {
    console.error('Error parsing functions error body:', e);
    return error;
  }
};

/**
 * Specifically handle errors from Supabase Functions
 * Attempts to parse the error message from the response body
 */
export const handleFunctionsError = async (error: any, context: string) => {
  const unwrapped = await unwrapFunctionsError(error);
  return handleApiError(unwrapped, context);
};

