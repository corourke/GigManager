import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import React from 'react';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { createClient } from './utils/supabase/client';
import * as userService from './services/user.service';

// Mock Supabase client
vi.mock('./utils/supabase/client', () => ({
  createClient: vi.fn(),
}));

// Mock user service
vi.mock('./services/user.service', () => ({
  getUserProfile: vi.fn(),
  getUserOrganizations: vi.fn(),
}));

describe('App Login and Refresh Reproduction', () => {
  let mockSupabase: any;

  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
        signInWithPassword: vi.fn(),
        signOut: vi.fn(),
      },
    };

    (createClient as any).mockReturnValue(mockSupabase);
  });

  it('should handle login and then refresh', async () => {
    let authChangeHandler: any;
    mockSupabase.auth.onAuthStateChange.mockImplementation((handler: any) => {
      authChangeHandler = handler;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    // Mock successful profile and orgs fetch
    // IMPORTANT: Note that the real RPC returns an ARRAY, so we should mock that if we want to see the bug!
    const mockUser = {
      id: 'd0a35726-0993-40b4-b41d-c61806a4670e',
      email: 'cameron.orourke@gmail.com',
      first_name: 'Cameron',
      last_name: "O'Rourke",
    };
    
    (userService.getUserProfile as any).mockResolvedValue([mockUser]); // Array!
    (userService.getUserOrganizations as any).mockResolvedValue([
        {
            organization: { id: 'org-1', name: 'Test Org' },
            role: 'Admin'
        }
    ]);

    const { unmount } = render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    // 1. Initial load (no session)
    await act(async () => {
      authChangeHandler('INITIAL_SESSION', null);
    });

    // Should show Login screen
    expect(screen.getByText(/Sign in with Email/i)).toBeDefined();

    // 2. Simulate Login
    await act(async () => {
      authChangeHandler('SIGNED_IN', { user: { id: 'd0a35726-0993-40b4-b41d-c61806a4670e' } });
    });

    // After login, it should fetch profile/orgs and eventually show dashboard or org-selection
    // But since profile is an ARRAY, it might go to profile-completion!
    await waitFor(() => {
        expect(screen.queryByText(/Sign in with Email/i)).toBeNull();
    });

    // If my theory is correct, it shows "Welcome to Gig Manager!" (profile completion)
    // because user.first_name is undefined (on the array)
    expect(screen.getByText(/Welcome to Gig Manager/i)).toBeDefined();

    // 3. Simulate Refresh
    unmount();
    
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    await act(async () => {
        const newHandler = mockSupabase.auth.onAuthStateChange.mock.calls[1][0];
        newHandler('INITIAL_SESSION', { user: { id: 'd0a35726-0993-40b4-b41d-c61806a4670e' } });
    });

    // Should also show profile completion or spinner if it hangs
    await waitFor(() => {
        expect(screen.getByText(/Welcome to Gig Manager/i)).toBeDefined();
    });
  });
});
