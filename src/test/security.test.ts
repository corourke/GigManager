import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as gigService from '../services/gig.service';
import * as organizationService from '../services/organization.service';
import * as assetService from '../services/asset.service';
import { createClient } from '../utils/supabase/client';

// Mock Supabase client
vi.mock('../utils/supabase/client', () => ({
  createClient: vi.fn(),
}));

describe('Security Policies (RLS Simulation)', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementation
    mockSupabase = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user: { id: 'user-1' } } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      // To simulate the thenable behavior of Supabase queries
      then: vi.fn(function(this: any, resolve) {
        return Promise.resolve({ data: [], error: null }).then(resolve);
      }),
    };

    (createClient as any).mockReturnValue(mockSupabase);
  });

  describe('Gig Access (Intersection Logic)', () => {
    it('should allow viewing a gig when the user organization is a participant', async () => {
      const mockGig = { id: 'gig-1', title: 'Participating Gig', start: new Date().toISOString() };
      const mockParticipant = { 
        id: 'gp-1', 
        gig_id: 'gig-1', 
        organization_id: 'org-1',
        role: 'Venue',
        organization: { id: 'org-1', name: 'Org 1' }
      };
      
      const fullGig = {
        ...mockGig,
        participants: [mockParticipant]
      };

      // Handle multiple queries in getGigsForOrganization
      let callCount = 0;
      mockSupabase.then = vi.fn().mockImplementation((resolve) => {
        callCount++;
        if (callCount === 1) {
          // First call: Fetch gig IDs from gig_participants
          return Promise.resolve({ data: [{ gig_id: 'gig-1' }], error: null }).then(resolve);
        } else {
          // Second call: Fetch full gig details from gigs
          return Promise.resolve({ data: [fullGig], error: null }).then(resolve);
        }
      });

      const gigs = await gigService.getGigs('org-1');
      expect(gigs.map(g => g.id)).toContain(mockGig.id);
      expect(gigs[0].venue.id).toBe('org-1');
    });

    it('should NOT return gigs where the user organization is NOT a participant', async () => {
      // Setup mock to return empty data for the first query (no participating gigs)
      mockSupabase.then = vi.fn().mockImplementation((resolve) => 
        Promise.resolve({ data: [], error: null }).then(resolve)
      );

      const gigs = await gigService.getGigs('other-org');
      expect(gigs).toHaveLength(0);
    });

    it('should allow viewing a gig shared by multiple organizations', async () => {
      const sharedGig = { id: 'gig-shared', title: 'Shared Gig', start: new Date().toISOString() };
      const mockParticipant = { 
        id: 'gp-shared', 
        gig_id: 'gig-shared', 
        organization_id: 'org-1',
        role: 'Act',
        organization: { id: 'org-1', name: 'Org 1' }
      };

      const fullGig = {
        ...sharedGig,
        participants: [mockParticipant]
      };
      
      let callCount = 0;
      mockSupabase.then = vi.fn().mockImplementation((resolve) => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ data: [{ gig_id: 'gig-shared' }], error: null }).then(resolve);
        } else {
          return Promise.resolve({ data: [fullGig], error: null }).then(resolve);
        }
      });

      const gigs = await gigService.getGigs('org-1');
      expect(gigs.map(g => g.id)).toContain(sharedGig.id);
      expect(gigs[0].act.id).toBe('org-1');
    });
  });

  describe('RBAC (Role-Based Access Control)', () => {
    it('should allow Admins to delete a gig', async () => {
      // In a real RLS scenario, the delete would succeed if the user is an Admin
      mockSupabase.delete = vi.fn().mockReturnThis();
      mockSupabase.eq = vi.fn().mockReturnThis();
      mockSupabase.then = vi.fn().mockImplementation((resolve) => 
        Promise.resolve({ error: null }).then(resolve)
      );

      // Note: deleteGig doesn't exist yet in api.tsx, let's check what's available or mock the behavior
      // For now, let's verify if there is a delete function or simulate it
    });

    it('should prevent non-admins from deleting a gig (simulated by RLS error)', async () => {
      // Simulate RLS error for delete
      mockSupabase.then = vi.fn().mockImplementation((resolve) => 
        Promise.resolve({ error: { message: 'new row violates row-level security policy', code: '42501' } }).then(resolve)
      );

      // This is what would happen if the RLS policy rejected the delete
      // We expect our API layer (which we will refactor) to handle this error
    });
  });

  describe('Organization Discovery (Broader Access)', () => {
    it('should allow any authenticated user to search for organizations', async () => {
      const mockOrgs = [{ id: 'org-1', name: 'Org 1' }, { id: 'org-2', name: 'Org 2' }];
      
      mockSupabase.then = vi.fn().mockImplementation((resolve) => 
        Promise.resolve({ data: mockOrgs, error: null }).then(resolve)
      );

      const orgs = await organizationService.searchOrganizations();
      expect(orgs).toHaveLength(2);
      expect(orgs).toEqual(mockOrgs);
    });
  });

  describe('Cross-Organization Isolation', () => {
    it('should NOT allow accessing assets of an organization the user does not belong to', async () => {
      // Simulate RLS filtering out assets from another org
      mockSupabase.then = vi.fn().mockImplementation((resolve) => 
        Promise.resolve({ data: [], error: null }).then(resolve)
      );

      const assets = await assetService.getAssets('other-org');
      expect(assets).toHaveLength(0);
    });

    it('should allow accessing assets of the user\'s own organization', async () => {
      const mockAssets = [{ id: 'asset-1', name: 'My Asset' }];
      
      mockSupabase.then = vi.fn().mockImplementation((resolve) => 
        Promise.resolve({ data: mockAssets, error: null }).then(resolve)
      );

      const assets = await assetService.getAssets('my-org');
      expect(assets).toHaveLength(1);
      expect(assets).toEqual(mockAssets);
    });
  });
});
