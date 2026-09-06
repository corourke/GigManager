import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  inviteUserToOrganization,
  createOrganization,
  addOrganizationContact,
  findOrganizationPersonMatches,
  linkExistingPersonToOrganization,
} from './organization.service';
import { createClient } from '../utils/supabase/client';
import { OrganizationRole } from '../utils/supabase/types';

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
      rpc: vi.fn(),
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
      roles: ['Act'] as OrganizationRole[],
    };

    it('should call the edge function with default auto_join: true', async () => {
      const mockOrg = { id: 'org-1', ...orgData };
      mockSupabase.functions.invoke.mockResolvedValue({ data: mockOrg, error: null });

      const result = await createOrganization(orgData);

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('server/organizations', {
        method: 'POST',
        body: {
          name: 'Test Org',
          roles: ['Act'],
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
          roles: ['Act'],
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

  describe('addOrganizationContact', () => {
    it('creates a contact without requiring email or phone (issue #5)', async () => {
      const mockResult = { user_id: 'user-1', member: { id: 'member-1', role: 'Viewer' } };
      mockSupabase.rpc.mockResolvedValue({ data: mockResult, error: null });

      const result = await addOrganizationContact('org-1', {
        firstName: 'Jane',
        lastName: 'Doe',
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('add_organization_contact', {
        p_organization_id: 'org-1',
        p_email: undefined,
        p_first_name: 'Jane',
        p_last_name: 'Doe',
        p_phone: undefined,
        p_title: undefined,
        p_is_primary: false,
        p_role: undefined,
      });
      expect(result).toEqual(mockResult);
    });

    it('passes an explicit role through for quick-add staff (not just Viewer contacts)', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: { user_id: 'user-2', member: {} }, error: null });

      await addOrganizationContact('org-1', {
        firstName: 'Sam',
        lastName: 'Roadie',
        role: 'Staff',
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'add_organization_contact',
        expect.objectContaining({ p_role: 'Staff' }),
      );
    });

    it('surfaces the friendly duplicate-email error from the RPC', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'A person with this email already exists -- search for them and add them as an existing member instead of creating a new one.' },
      });

      await expect(
        addOrganizationContact('org-1', { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' }),
      ).rejects.toThrow(/already exists/);
    });
  });

  describe('findOrganizationPersonMatches', () => {
    it('searches by name, email, and phone', async () => {
      const mockMatches = [
        { member_id: 'm1', user_id: 'u1', first_name: 'Jane', last_name: 'Doe', email: 'jane@example.com', phone: null, role: 'Viewer', contact_title: null, user_status: 'contact' },
      ];
      mockSupabase.rpc.mockResolvedValue({ data: mockMatches, error: null });

      const result = await findOrganizationPersonMatches('org-1', { search: 'Jane' });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('find_organization_person_matches', {
        p_organization_id: 'org-1',
        p_search: 'Jane',
        p_email: undefined,
        p_phone: undefined,
      });
      expect(result).toEqual(mockMatches);
    });

    it('returns an empty array when the RPC returns null', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

      const result = await findOrganizationPersonMatches('org-1', { search: 'Jane' });

      expect(result).toEqual([]);
    });
  });

  describe('linkExistingPersonToOrganization', () => {
    it('links an existing person by user id instead of creating a new one', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: { user_id: 'u1', member: { id: 'm1' } }, error: null });

      await linkExistingPersonToOrganization('org-1', { userId: 'u1', role: 'Staff' });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('link_existing_person_to_organization', {
        p_organization_id: 'org-1',
        p_user_id: 'u1',
        p_role: 'Staff',
        p_title: undefined,
        p_is_primary: false,
      });
    });
  });
});
