import { describe, it, expect, vi, beforeEach } from 'vitest';
import { inviteUserToOrganization, createOrganization } from './organization.service';
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
      functions: {
        invoke: vi.fn(),
      },
    };

    (createClient as any).mockReturnValue(mockSupabase);
  });

  describe('inviteUserToOrganization', () => {
    it('should throw an error when the invitation fails', async () => {
      const mockError = new Error('Failed to invite user');
      mockSupabase.functions.invoke.mockResolvedValue({ data: null, error: mockError });

      try {
        await inviteUserToOrganization('org-1', 'test@example.com', 'Staff');
        // Should not reach here
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error).toBeDefined();
        expect(error.message).toContain('Failed to invite user');
      }
    });

    it('should successfully invite a user when the edge function succeeds', async () => {
      const mockResult = {
        user: { id: 'new-user-id', email: 'test@example.com' },
        invitation: { id: 'invitation-id', status: 'pending' },
        email_sent: true
      };

      mockSupabase.functions.invoke.mockResolvedValue({ data: mockResult, error: null });

      const result = await inviteUserToOrganization(
        'org-1',
        'test@example.com',
        'Staff',
        'John',
        'Doe'
      );

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('server/organizations/org-1/invitations', {
        method: 'POST',
        body: {
          email: 'test@example.com',
          role: 'Staff',
          first_name: 'John',
          last_name: 'Doe'
        }
      });
      expect(result).toEqual(mockResult);
    });

    it('should handle resending an invitation', async () => {
      const mockResult = {
        user: { id: 'existing-user-id', email: 'test@example.com' },
        invitation: { id: 'invitation-id', status: 'pending' },
        email_sent: true,
        resend: true
      };

      mockSupabase.functions.invoke.mockResolvedValue({ data: mockResult, error: null });

      const result = await inviteUserToOrganization(
        'org-1',
        'test@example.com',
        'Staff'
      );

      expect(result.resend).toBe(true);
      expect(result).toEqual(mockResult);
    });
  });

  describe('createOrganization', () => {
    const orgData = {
      name: 'Test Org',
      type: 'Act' as const,
    };

    it('should call the edge function with default auto_join: true', async () => {
      const mockOrg = { id: 'org-1', ...orgData };
      mockSupabase.functions.invoke.mockResolvedValue({ data: mockOrg, error: null });

      const result = await createOrganization(orgData);

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('server/organizations', {
        method: 'POST',
        body: {
          name: 'Test Org',
          type: 'Act',
          auto_join: true,
        }
      });
      expect(result).toEqual(mockOrg);
    });

    it('should call the edge function with auto_join: false when specified', async () => {
      const mockOrg = { id: 'org-1', ...orgData };
      mockSupabase.functions.invoke.mockResolvedValue({ data: mockOrg, error: null });

      const result = await createOrganization({ ...orgData, autoJoin: false });

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('server/organizations', {
        method: 'POST',
        body: {
          name: 'Test Org',
          type: 'Act',
          auto_join: false,
        }
      });
      expect(result).toEqual(mockOrg);
    });

    it('should throw an error when creation fails', async () => {
      const mockError = { message: 'Failed to create organization', status: 400 };
      mockSupabase.functions.invoke.mockResolvedValue({ data: null, error: mockError });

      try {
        await createOrganization(orgData);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    });
  });
});
