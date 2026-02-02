import { describe, it, expect, vi, beforeEach } from 'vitest';
import { inviteUserToOrganization } from './organization.service';
import { createClient } from '../utils/supabase/client';

// Mock Supabase client
vi.mock('../utils/supabase/client', () => ({
  createClient: vi.fn(),
}));

describe('organization.service', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockSupabase = {
      rpc: vi.fn(),
    };

    (createClient as any).mockReturnValue(mockSupabase);
  });

  describe('inviteUserToOrganization', () => {
    it('should throw an error when the RPC function is missing (PGRST202)', async () => {
      // Simulate the error reported by the user
      const mockError = {
        code: 'PGRST202',
        message: 'Could not find the function public.invite_user_to_organization in the schema cache',
        details: 'Searched for the function public.invite_user_to_organization...',
        hint: 'Perhaps you meant to call the function public.user_organization_ids'
      };

      mockSupabase.rpc.mockResolvedValue({ data: null, error: mockError });

      try {
        await inviteUserToOrganization('org-1', 'test@example.com', 'Staff');
        // Should not reach here
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error).toBeDefined();
        expect(error.code).toBe('PGRST202');
        expect(error.message).toContain('Could not find the function');
      }
    });

    it('should successfully invite a user when the RPC function exists', async () => {
      const mockResult = {
        user: { id: 'new-user-id', email: 'test@example.com' },
        invitation: { id: 'invitation-id', status: 'pending' }
      };

      mockSupabase.rpc.mockResolvedValue({ data: mockResult, error: null });

      const result = await inviteUserToOrganization(
        'org-1',
        'test@example.com',
        'Staff',
        'John',
        'Doe'
      );

      expect(mockSupabase.rpc).toHaveBeenCalledWith('invite_user_to_organization', {
        p_organization_id: 'org-1',
        p_email: 'test@example.com',
        p_role: 'Staff',
        p_first_name: 'John',
        p_last_name: 'Doe'
      });
      expect(result).toEqual(mockResult);
    });
  });
});
