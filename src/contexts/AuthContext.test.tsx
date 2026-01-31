import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { createClient } from '../utils/supabase/client';
import * as userService from '../services/user.service';

// Mock Supabase client
vi.mock('../utils/supabase/client', () => ({
  createClient: vi.fn(),
}));

// Mock user service to simulate database hang
vi.mock('../services/user.service', () => ({
  getUserProfile: vi.fn(),
  getUserOrganizations: vi.fn(),
}));

describe('AuthContext Hang Reproduction', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      },
    };

    (createClient as any).mockReturnValue(mockSupabase);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  it('should remain in isLoading state if refreshProfile hangs indefinitely', async () => {
    // Simulate a hanging database call (infinite recursion)
    // This promise never resolves
    const hangingPromise = new Promise(() => {});
    (userService.getUserProfile as any).mockReturnValue(hangingPromise);
    (userService.getUserOrganizations as any).mockReturnValue(hangingPromise);

    let authChangeHandler: any;
    mockSupabase.auth.onAuthStateChange.mockImplementation((handler: any) => {
      authChangeHandler = handler;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Initial state
    expect(result.current.isLoading).toBe(true);

    // Trigger auth change with session
    await act(async () => {
      // This will trigger refreshProfile which will hang
      authChangeHandler('SIGNED_IN', { user: { id: 'user-1' } });
    });
  });

  it('should recover from a hang after a timeout', async () => {
    vi.useFakeTimers();
    
    // Simulate a hanging database call
    const hangingPromise = new Promise(() => {});
    (userService.getUserProfile as any).mockReturnValue(hangingPromise);
    (userService.getUserOrganizations as any).mockReturnValue(hangingPromise);

    let authChangeHandler: any;
    mockSupabase.auth.onAuthStateChange.mockImplementation((handler: any) => {
      authChangeHandler = handler;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Initial state
    expect(result.current.isLoading).toBe(true);

    // Trigger auth change with session
    await act(async () => {
      authChangeHandler('SIGNED_IN', { user: { id: 'user-1' } });
    });

    // Still loading initially
    expect(result.current.isLoading).toBe(true);

    // Advance timers by 5 seconds (or whatever timeout we choose)
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    // Should now be false due to timeout safety
    expect(result.current.isLoading).toBe(false);
    
    vi.useRealTimers();
  });
});
