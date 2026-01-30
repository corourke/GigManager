import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { createClient } from '../utils/supabase/client';
import * as userService from '../services/user.service';

// Mock Supabase client
vi.mock('../utils/supabase/client', () => ({
  createClient: vi.fn(),
}));

// Mock user service
vi.mock('../services/user.service', () => ({
  getUserProfile: vi.fn(),
  getUserOrganizations: vi.fn(),
}));

describe('AuthContext', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    mockSupabase = {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
    };

    (createClient as any).mockReturnValue(mockSupabase);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  it('should reset isRefreshing and isLoading after a timeout if refreshProfile hangs', async () => {
    // Simulate a hanging refreshProfile by making the services never resolve
    (userService.getUserProfile as any).mockReturnValue(new Promise(() => {}));
    (userService.getUserOrganizations as any).mockReturnValue(new Promise(() => {}));

    // Setup onAuthStateChange to trigger refreshProfile
    let authChangeHandler: any;
    mockSupabase.auth.onAuthStateChange.mockImplementation((handler: any) => {
      authChangeHandler = handler;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // Trigger INITIAL_SESSION with a user
    // We don't await this because we expect it to hang
    act(() => {
      authChangeHandler('INITIAL_SESSION', { user: { id: 'user-1' } });
    });

    // Still loading because refreshProfile is "hanging"
    expect(result.current.isLoading).toBe(true);

    // Fast-forward 15 seconds (the timeout we added)
    act(() => {
      vi.advanceTimersByTime(16000);
    });

    // Should now be finished loading due to safety timeout
    expect(result.current.isLoading).toBe(false);
  });

  it('should allow subsequent login attempts after a timeout', async () => {
    // Setup onAuthStateChange capture
    let authChangeHandler: any;
    mockSupabase.auth.onAuthStateChange.mockImplementation((handler: any) => {
      authChangeHandler = handler;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    // 1. First attempt hangs
    (userService.getUserProfile as any).mockReturnValue(new Promise(() => {}));
    
    act(() => {
      authChangeHandler('INITIAL_SESSION', { user: { id: 'user-1' } });
    });

    // Fast-forward to clear the hang
    act(() => {
      vi.advanceTimersByTime(16000);
    });
    expect(result.current.isLoading).toBe(false);

    // 2. Second attempt succeeds
    const mockProfile = { id: 'user-1', email: 'test@example.com' };
    const mockOrgs = [{ organization: { id: 'org-1', name: 'Org 1' }, role: 'Admin' }];
    
    (userService.getUserProfile as any).mockResolvedValue(mockProfile);
    (userService.getUserOrganizations as any).mockResolvedValue(mockOrgs);

    await act(async () => {
      await authChangeHandler('SIGNED_IN', { user: { id: 'user-1' } });
    });

    expect(result.current.user).toEqual(mockProfile);
    expect(result.current.organizations).toEqual(mockOrgs);
    expect(result.current.isLoading).toBe(false);
  });
});
