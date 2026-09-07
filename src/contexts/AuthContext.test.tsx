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
    localStorage.clear();

    mockSupabase = {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      },
      channel: vi.fn().mockReturnValue({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      }),
      removeChannel: vi.fn().mockResolvedValue({}),
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

  it('restores the previously selected organization from localStorage for a multi-org user (#26)', async () => {
    const org1 = { id: 'org-1', name: 'Org One' };
    const org2 = { id: 'org-2', name: 'Org Two' };
    localStorage.setItem('selectedOrganizationId', 'org-2');

    const mockData = {
      profile: { id: 'user-1', email: 'test@example.com' },
      organizations: [
        { organization: org1, role: 'Admin' },
        { organization: org2, role: 'Viewer' },
      ],
    };
    (userService.getCompleteUserData as any).mockResolvedValue(mockData);

    let authChangeHandler: any;
    mockSupabase.auth.onAuthStateChange.mockImplementation((handler: any) => {
      authChangeHandler = handler;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      // Simulates the org selection resetting on a hard refresh: the fetched
      // membership list has 2+ orgs, so without localStorage restoration this
      // would leave selectedOrganization null and bounce to the org picker.
      authChangeHandler('SIGNED_IN', { user: { id: 'user-1' } });
    });

    await vi.waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 1000 });

    expect(result.current.selectedOrganization?.id).toBe('org-2');
  });

  it('does not restore a stored organization id the user is no longer a member of', async () => {
    const org1 = { id: 'org-1', name: 'Org One' };
    const org2 = { id: 'org-2', name: 'Org Two' };
    localStorage.setItem('selectedOrganizationId', 'org-stale');

    const mockData = {
      profile: { id: 'user-1', email: 'test@example.com' },
      organizations: [
        { organization: org1, role: 'Admin' },
        { organization: org2, role: 'Viewer' },
      ],
    };
    (userService.getCompleteUserData as any).mockResolvedValue(mockData);

    let authChangeHandler: any;
    mockSupabase.auth.onAuthStateChange.mockImplementation((handler: any) => {
      authChangeHandler = handler;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      authChangeHandler('SIGNED_IN', { user: { id: 'user-1' } });
    });

    await vi.waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 1000 });

    expect(result.current.selectedOrganization).toBeNull();
  });

  it('persists the selection when selectOrganization is called, and clears it on logout', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      result.current.selectOrganization({ id: 'org-9', name: 'Org Nine' } as any);
    });
    expect(localStorage.getItem('selectedOrganizationId')).toBe('org-9');

    await act(async () => {
      await result.current.logout();
    });
    expect(localStorage.getItem('selectedOrganizationId')).toBeNull();
  });
});
