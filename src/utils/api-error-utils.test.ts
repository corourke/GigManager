import { describe, it, expect } from 'vitest';
import { isNetworkError, handleApiError, handleFunctionsError } from './api-error-utils';

describe('isNetworkError', () => {
  it('detects "Failed to fetch" message', () => {
    expect(isNetworkError({ message: 'Failed to fetch' })).toBe(true);
  });

  it('detects ERR_NETWORK code', () => {
    expect(isNetworkError({ code: 'ERR_NETWORK' })).toBe(true);
  });

  it('detects TypeError name', () => {
    expect(isNetworkError({ name: 'TypeError' })).toBe(true);
  });

  it('detects PGRST301 Supabase connection code', () => {
    expect(isNetworkError({ code: 'PGRST301' })).toBe(true);
  });

  it('detects status 0 (no response)', () => {
    expect(isNetworkError({ status: 0 })).toBe(true);
  });

  it('returns false for a normal 404 server error', () => {
    expect(isNetworkError({ message: 'row not found', status: 404 })).toBe(false);
  });

  it('returns false for a 500 server error', () => {
    expect(isNetworkError({ message: 'internal server error', status: 500 })).toBe(false);
  });

  it('returns false for null', () => {
    expect(isNetworkError(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isNetworkError(undefined)).toBe(false);
  });

  it('returns false for an empty object', () => {
    expect(isNetworkError({})).toBe(false);
  });
});

describe('handleApiError', () => {
  it('wraps network errors as a NetworkError with descriptive message', () => {
    const networkErr = { message: 'Failed to fetch' };
    let caught: Error | undefined;
    try {
      handleApiError(networkErr, 'fetch gigs');
    } catch (e: any) {
      caught = e;
    }
    expect(caught).toBeDefined();
    expect(caught!.name).toBe('NetworkError');
    expect(caught!.message).toContain('fetch gigs');
    expect(caught!.message).toContain('internet connection');
  });

  it('rethrows non-network errors unchanged', () => {
    const dbErr = new Error('duplicate key violation');
    expect(() => handleApiError(dbErr, 'insert record')).toThrow(dbErr);
  });

  it('rethrows Supabase-style error objects unchanged', () => {
    const supabaseErr = { code: '23505', message: 'unique constraint violation', status: 409 };
    expect(() => handleApiError(supabaseErr, 'insert asset')).toThrow();
  });
});

describe('handleFunctionsError', () => {
  it('passes non-FunctionsHttpError through to handleApiError', async () => {
    const err = new Error('Generic error');
    await expect(handleFunctionsError(err, 'call function')).rejects.toThrow('Generic error');
  });

  it('parses error message from a FunctionsHttpError with a JSON body (via context.response)', async () => {
    const body = { error: 'Permission denied', details: 'insufficient role' };
    const mockResponse = {
      // The code checks `typeof response.json === 'function'` before calling clone().json()
      json: () => Promise.resolve(body),
      clone: () => ({ json: () => Promise.resolve(body) }),
      status: 403,
    };
    const functionsErr = {
      name: 'FunctionsHttpError',
      context: { response: mockResponse },
    };

    let caught: Error | undefined;
    try {
      await handleFunctionsError(functionsErr, 'call edge fn');
    } catch (e: any) {
      caught = e;
    }
    expect(caught).toBeDefined();
    expect(caught!.message).toBe('Permission denied');
    expect((caught as any).status).toBe(403);
  });

  it('parses "message" field when "error" field is absent', async () => {
    const body = { message: 'Validation failed' };
    const mockResponse = {
      json: () => Promise.resolve(body),
      clone: () => ({ json: () => Promise.resolve(body) }),
      status: 422,
    };
    const functionsErr = {
      name: 'FunctionsHttpError',
      context: { response: mockResponse },
    };

    await expect(handleFunctionsError(functionsErr, 'call edge fn')).rejects.toThrow(
      'Validation failed'
    );
  });

  it('falls back to handleApiError when JSON body is null', async () => {
    const mockResponse = {
      clone: () => ({ json: () => Promise.resolve(null) }),
      status: 500,
    };
    const functionsErr = {
      name: 'FunctionsHttpError',
      context: { response: mockResponse },
    };

    // Falls through to handleApiError with the original functionsErr (not a network error, so rethrows)
    await expect(handleFunctionsError(functionsErr, 'call edge fn')).rejects.toBeDefined();
  });

  it('falls back when context has no response property', async () => {
    const functionsErr = {
      name: 'FunctionsHttpError',
      context: {}, // no response property
    };

    await expect(handleFunctionsError(functionsErr, 'call edge fn')).rejects.toBeDefined();
  });
});
