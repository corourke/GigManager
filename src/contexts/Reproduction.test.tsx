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

// Mock user service
vi.mock('../services/user.service', () => ({
  getUserProfile: vi.fn(),
  getUserOrganizations: vi.fn(),
}));

describe('Login and Refresh Reproduction', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
        signInWithPassword: vi.fn(),
        signOut: vi.fn(),
      },
    };

    (createClient as any).mockReturnValue(mockSupabase);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  it('should handle login and then refresh without hanging', async () => {
    let authChangeHandler: any;
    mockSupabase.auth.onAuthStateChange.mockImplementation((handler: any) => {
      authChangeHandler = handler;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    // Mock successful profile and orgs fetch
    (userService.getUserProfile as any).mockResolvedValue({
      id: 'd0a35726-0993-40b4-b41d-c61806a4670e',
      email: 'cameron.orourke@gmail.com',
      first_name: 'Cameron',
      last_name: '"O\'Rourke"',
    });
    (userService.getUserOrganizations as any).mockResolvedValue([]);

    const { result, unmount } = renderHook(() => useAuth(), { wrapper });

    // 1. Initial state (no session)
    expect(result.current.isLoading).toBe(true);
    
    await act(async () => {
      authChangeHandler('INITIAL_SESSION', null);
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.user).toBe(null);

    // 2. Simulate Login
    await act(async () => {
      // In reality, LoginScreen calls signInWithPassword, then onAuthStateChange fires
      authChangeHandler('SIGNED_IN', { user: { id: 'd0a35726-0993-40b4-b41d-c61806a4670e' } });
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.user?.email).toBe('cameron.orourke@gmail.com');

    // 3. Simulate Refresh (Unmount and Remount)
    unmount();
    
    // Create a new hook with a new AuthProvider (simulating page reload)
    const { result: result2 } = renderHook(() => useAuth(), { wrapper });
    
    expect(result2.current.isLoading).toBe(true);

    // On refresh, Supabase usually fires INITIAL_SESSION with a session
    // FOLLOWED by SIGNED_IN or TOKEN_REFRESHED sometimes
    await act(async () => {
        const newHandler = mockSupabase.auth.onAuthStateChange.mock.calls[1][0];
        // Trigger multiple events rapidly
        const p1 = newHandler('INITIAL_SESSION', { user: { id: 'd0a35726-0993-40b4-b41d-c61806a4670e' } });
        const p2 = newHandler('SIGNED_IN', { user: { id: 'd0a35726-0993-40b4-b41d-c61806a4670e' } });
        await Promise.all([p1, p2]);
    });

    expect(result2.current.isLoading).toBe(false);
    expect(result2.current.user?.email).toBe('cameron.orourke@gmail.com');
  });
});
