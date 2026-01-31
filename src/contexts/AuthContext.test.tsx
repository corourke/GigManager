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
  getCompleteUserData: vi.fn(),
}));

describe('AuthContext Hang Reproduction', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
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
    (userService.getCompleteUserData as any).mockReturnValue(hangingPromise);

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
    
    // It should still be loading because the promise hasn't resolved
    expect(result.current.isLoading).toBe(true);
  });

  it('should resolve and set loading to false when user data is fetched', async () => {
    const mockData = {
      profile: { id: 'user-1', email: 'test@example.com' },
      organizations: []
    };
    
    (userService.getCompleteUserData as any).mockResolvedValue(mockData);

    let authChangeHandler: any;
    mockSupabase.auth.onAuthStateChange.mockImplementation((handler: any) => {
      authChangeHandler = handler;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Trigger auth change with session
    await act(async () => {
      authChangeHandler('SIGNED_IN', { user: { id: 'user-1' } });
    });

    // Wait for the setTimeout(0) and the async RPC call
    await vi.waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 1000 });

    expect(result.current.user).toEqual(mockData.profile);
    expect(result.current.organizations).toEqual([]);
  });
});
