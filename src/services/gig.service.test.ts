import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getGig,
  getGigsForOrganization,
  deleteGig,
  getGigFinancials,
  deleteGigFinancial,
  removeKitFromGig,
  getGigKits,
} from './gig.service';
import { createClient } from '../utils/supabase/client';

vi.mock('../utils/supabase/client', () => ({
  createClient: vi.fn(),
}));

// googleCalendar.service is called by deleteGigFromAllCalendars; stub it out
vi.mock('./googleCalendar.service', () => ({
  syncGigToCalendar: vi.fn().mockResolvedValue(undefined),
  deleteGigFromCalendar: vi.fn().mockResolvedValue(undefined),
}));

// Helper: build a chainable Supabase query builder that resolves to `result`
function makeChain(result: { data: any; error: any }) {
  const chain: any = {};
  const chainMethods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'in', 'not', 'is', 'or',
    'order', 'limit', 'lte', 'gte',
  ];
  chainMethods.forEach(m => { chain[m] = vi.fn().mockReturnValue(chain); });
  chain.single = vi.fn().mockResolvedValue(result);
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  // Make the chain thenable so it resolves when awaited directly
  chain.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject);
  return chain;
}

describe('gig.service', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = { from: vi.fn() };
    (createClient as any).mockReturnValue(mockSupabase);
  });

  // ─── getGig ───────────────────────────────────────────────────────────────

  describe('getGig', () => {
    it('returns a processed gig with staff_slots when found', async () => {
      const rawGig = {
        id: 'gig-1',
        title: 'Test Gig',
        start: '2026-03-15T20:00:00.000Z',
        end: '2026-03-16T01:00:00.000Z',
        participants: [],
        staff_slots: [
          {
            id: 'slot-1',
            role_info: { name: 'Sound Engineer' },
            required_count: 2,
            assignments: [
              { id: 'assign-1', user_id: 'user-1', user: { id: 'user-1', email: 'a@b.com' } },
            ],
          },
        ],
        kit_assignments: [],
        financials: [],
      };

      mockSupabase.from.mockReturnValue(makeChain({ data: rawGig, error: null }));

      const result = await getGig('gig-1');

      expect(result.id).toBe('gig-1');
      expect(result.staff_slots[0].role).toBe('Sound Engineer');
      expect(result.staff_slots[0].count).toBe(2);
      expect(result.staff_slots[0].staff_assignments[0].user_id).toBe('user-1');
    });

    it('queries the gigs table with the correct id', async () => {
      const chain = makeChain({ data: { id: 'gig-1', title: 'G', staff_slots: [], participants: [] }, error: null });
      mockSupabase.from.mockReturnValue(chain);

      await getGig('gig-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('gigs');
      expect(chain.eq).toHaveBeenCalledWith('id', 'gig-1');
      expect(chain.single).toHaveBeenCalled();
    });

    it('throws when gig is not found (null data)', async () => {
      mockSupabase.from.mockReturnValue(makeChain({ data: null, error: null }));

      await expect(getGig('missing-id')).rejects.toThrow('Gig not found');
    });

    it('propagates Supabase errors via handleApiError', async () => {
      const dbError = new Error('relation does not exist');
      mockSupabase.from.mockReturnValue(makeChain({ data: null, error: dbError }));

      await expect(getGig('gig-1')).rejects.toThrow('relation does not exist');
    });
  });

  // ─── getGigsForOrganization ────────────────────────────────────────────────

  describe('getGigsForOrganization', () => {
    it('returns an empty array when the org has no gig participants', async () => {
      mockSupabase.from.mockReturnValue(makeChain({ data: [], error: null }));

      const result = await getGigsForOrganization('org-1');

      expect(result).toEqual([]);
    });

    it('fetches gig IDs from gig_participants then loads gig details', async () => {
      const participantChain = makeChain({ data: [{ gig_id: 'gig-1' }], error: null });
      const gigChain = makeChain({
        data: [
          {
            id: 'gig-1',
            title: 'Festival',
            participants: [
              { role: 'Venue', organization: { id: 'venue-org', name: 'The Venue' } },
              { role: 'Act', organization: { id: 'act-org', name: 'The Band' } },
            ],
          },
        ],
        error: null,
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'gig_participants') return participantChain;
        if (table === 'gigs') return gigChain;
        return makeChain({ data: [], error: null });
      });

      const result = await getGigsForOrganization('org-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('gig-1');
      // Venue and act are mapped for UI convenience
      expect(result[0].venue?.name).toBe('The Venue');
      expect(result[0].act?.name).toBe('The Band');
    });

    it('propagates errors from the gig_participants query', async () => {
      const dbError = new Error('connection refused');
      mockSupabase.from.mockReturnValue(makeChain({ data: null, error: dbError }));

      await expect(getGigsForOrganization('org-1')).rejects.toThrow('connection refused');
    });
  });

  // ─── deleteGig ────────────────────────────────────────────────────────────

  describe('deleteGig', () => {
    it('deletes the gig from the database', async () => {
      // gig_sync_status returns empty → no calendar deletions needed
      const syncStatusChain = makeChain({ data: [], error: null });
      const gigDeleteChain = makeChain({ data: null, error: null });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'gig_sync_status') return syncStatusChain;
        if (table === 'gigs') return gigDeleteChain;
        return makeChain({ data: [], error: null });
      });

      const result = await deleteGig('gig-1');

      expect(result).toEqual({ success: true });
      expect(gigDeleteChain.delete).toHaveBeenCalled();
      expect(gigDeleteChain.eq).toHaveBeenCalledWith('id', 'gig-1');
    });

    it('propagates Supabase errors on delete', async () => {
      const dbError = new Error('foreign key constraint');
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'gig_sync_status') return makeChain({ data: [], error: null });
        return makeChain({ data: null, error: dbError });
      });

      await expect(deleteGig('gig-1')).rejects.toThrow('foreign key constraint');
    });
  });

  // ─── getGigFinancials ─────────────────────────────────────────────────────

  describe('getGigFinancials', () => {
    it('returns financials for a gig', async () => {
      const mockFins = [
        { id: 'fin-1', amount: 500, gig_id: 'gig-1' },
        { id: 'fin-2', amount: 250, gig_id: 'gig-1' },
      ];
      const chain = makeChain({ data: mockFins, error: null });
      mockSupabase.from.mockReturnValue(chain);

      const result = await getGigFinancials('gig-1');

      expect(result).toHaveLength(2);
      expect(mockSupabase.from).toHaveBeenCalledWith('gig_financials');
      expect(chain.eq).toHaveBeenCalledWith('gig_id', 'gig-1');
    });

    it('filters by organizationId when provided', async () => {
      const chain = makeChain({ data: [], error: null });
      mockSupabase.from.mockReturnValue(chain);

      await getGigFinancials('gig-1', 'org-1');

      expect(chain.eq).toHaveBeenCalledWith('organization_id', 'org-1');
    });

    it('returns empty array when there are no financials', async () => {
      mockSupabase.from.mockReturnValue(makeChain({ data: null, error: null }));
      const result = await getGigFinancials('gig-1');
      expect(result).toEqual([]);
    });
  });

  // ─── deleteGigFinancial ───────────────────────────────────────────────────

  describe('deleteGigFinancial', () => {
    it('deletes the financial record by id', async () => {
      const chain = makeChain({ data: null, error: null });
      mockSupabase.from.mockReturnValue(chain);

      const result = await deleteGigFinancial('fin-1');

      expect(result).toEqual({ success: true });
      expect(mockSupabase.from).toHaveBeenCalledWith('gig_financials');
      expect(chain.eq).toHaveBeenCalledWith('id', 'fin-1');
    });

    it('propagates errors on delete', async () => {
      const dbError = new Error('not found');
      mockSupabase.from.mockReturnValue(makeChain({ data: null, error: dbError }));

      await expect(deleteGigFinancial('fin-1')).rejects.toThrow('not found');
    });
  });

  // ─── removeKitFromGig ─────────────────────────────────────────────────────

  describe('removeKitFromGig', () => {
    it('deletes the kit assignment by id', async () => {
      const chain = makeChain({ data: null, error: null });
      mockSupabase.from.mockReturnValue(chain);

      const result = await removeKitFromGig('assignment-1');

      expect(result).toEqual({ success: true });
      expect(mockSupabase.from).toHaveBeenCalledWith('gig_kit_assignments');
      expect(chain.eq).toHaveBeenCalledWith('id', 'assignment-1');
    });

    it('propagates errors on delete', async () => {
      const dbError = new Error('constraint violation');
      mockSupabase.from.mockReturnValue(makeChain({ data: null, error: dbError }));

      await expect(removeKitFromGig('assignment-1')).rejects.toThrow('constraint violation');
    });
  });

  // ─── getGigKits ───────────────────────────────────────────────────────────

  describe('getGigKits', () => {
    it('returns kit assignments for a gig', async () => {
      const mockAssignments = [
        { id: 'assign-1', gig_id: 'gig-1', kit: { id: 'kit-1', name: 'PA System' } },
      ];
      const chain = makeChain({ data: mockAssignments, error: null });
      mockSupabase.from.mockReturnValue(chain);

      const result = await getGigKits('gig-1');

      expect(result).toHaveLength(1);
      expect(chain.eq).toHaveBeenCalledWith('gig_id', 'gig-1');
    });

    it('filters by organizationId when provided', async () => {
      const chain = makeChain({ data: [], error: null });
      mockSupabase.from.mockReturnValue(chain);

      await getGigKits('gig-1', 'org-1');

      expect(chain.eq).toHaveBeenCalledWith('organization_id', 'org-1');
    });

    it('returns empty array when data is null', async () => {
      mockSupabase.from.mockReturnValue(makeChain({ data: null, error: null }));
      const result = await getGigKits('gig-1');
      expect(result).toEqual([]);
    });
  });
});
