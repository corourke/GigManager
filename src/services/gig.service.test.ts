import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getGig,
  getGigsForOrganization,
  deleteGig,
  getGigFinancials,
  deleteGigFinancial,
  removeKitFromGig,
  getGigKits,
  getAllGigAccountingSummaries,
  completeStaffAssignment,
} from './gig.service';
import { createClient } from '../utils/supabase/client';
import { requireAuth } from '../utils/supabase/auth-utils';
import { FIN_CATEGORY_CONFIG } from '../utils/supabase/constants';

vi.mock('../utils/supabase/client', () => ({
  createClient: vi.fn(),
}));

vi.mock('../utils/supabase/auth-utils', () => ({
  requireAuth: vi.fn(),
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

  // ─── getAllGigAccountingSummaries ──────────────────────────────────────────

  describe('getAllGigAccountingSummaries', () => {
    function setupMocks({
      participants = [],
      gigs = [],
      financials = [],
      assignments = [],
    }: {
      participants?: any[];
      gigs?: any[];
      financials?: any[];
      assignments?: any[];
    }) {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'gig_participants') return makeChain({ data: participants, error: null });
        if (table === 'gigs') return makeChain({ data: gigs, error: null });
        if (table === 'gig_financials') return makeChain({ data: financials, error: null });
        if (table === 'gig_staff_assignments') return makeChain({ data: assignments, error: null });
        return makeChain({ data: [], error: null });
      });
    }

    it('returns empty array when org has no gigs', async () => {
      setupMocks({ participants: [] });
      const result = await getAllGigAccountingSummaries('org-1');
      expect(result).toEqual([]);
    });

    it('correctly groups financials by gig across multiple gigs', async () => {
      setupMocks({
        participants: [{ gig_id: 'gig-1' }, { gig_id: 'gig-2' }],
        gigs: [
          { id: 'gig-1', title: 'Gig One', status: 'Completed', start: '2026-01-01T00:00:00Z', end: '2026-01-01T23:00:00Z' },
          { id: 'gig-2', title: 'Gig Two', status: 'Booked', start: '2026-06-01T00:00:00Z', end: '2026-06-01T23:00:00Z' },
        ],
        financials: [
          { id: 'f1', gig_id: 'gig-1', type: 'Contract Signed', amount: 1000, paid_at: null, staff_assignment_id: null },
          { id: 'f2', gig_id: 'gig-1', type: 'Payment Received', amount: 500, paid_at: null, staff_assignment_id: null },
          { id: 'f3', gig_id: 'gig-2', type: 'Contract Signed', amount: 2000, paid_at: null, staff_assignment_id: null },
        ],
        assignments: [],
      });

      const result = await getAllGigAccountingSummaries('org-1');

      expect(result).toHaveLength(2);

      const gig1 = result.find(r => r.gigId === 'gig-1')!;
      expect(gig1.contractAmount).toBe(1000);
      expect(gig1.received).toBe(500);
      expect(gig1.outstandingRevenue).toBe(500);

      const gig2 = result.find(r => r.gigId === 'gig-2')!;
      expect(gig2.contractAmount).toBe(2000);
      expect(gig2.received).toBe(0);
    });

    it('uses Contract Signed priority over Bid Accepted and Informal Terms', async () => {
      setupMocks({
        participants: [{ gig_id: 'gig-1' }],
        gigs: [{ id: 'gig-1', title: 'G', status: 'Completed', start: '2026-01-01T00:00:00Z', end: '2026-01-01T23:00:00Z' }],
        financials: [
          { id: 'f1', gig_id: 'gig-1', type: 'Contract Signed', amount: 3000, paid_at: null, staff_assignment_id: null },
          { id: 'f2', gig_id: 'gig-1', type: 'Bid Accepted', amount: 2000, paid_at: null, staff_assignment_id: null },
          { id: 'f3', gig_id: 'gig-1', type: 'Informal Terms', amount: 1000, paid_at: null, staff_assignment_id: null },
        ],
        assignments: [],
      });

      const [result] = await getAllGigAccountingSummaries('org-1');
      expect(result.contractAmount).toBe(3000);
    });

    it('uses Bid Accepted when no Contract Signed exists', async () => {
      setupMocks({
        participants: [{ gig_id: 'gig-1' }],
        gigs: [{ id: 'gig-1', title: 'G', status: 'Booked', start: '2026-06-01T00:00:00Z', end: '2026-06-01T23:00:00Z' }],
        financials: [
          { id: 'f1', gig_id: 'gig-1', type: 'Bid Accepted', amount: 2000, paid_at: null, staff_assignment_id: null },
          { id: 'f2', gig_id: 'gig-1', type: 'Informal Terms', amount: 1000, paid_at: null, staff_assignment_id: null },
        ],
        assignments: [],
      });

      const [result] = await getAllGigAccountingSummaries('org-1');
      expect(result.contractAmount).toBe(2000);
    });

    it('uses Informal Terms when no Contract Signed or Bid Accepted exists', async () => {
      setupMocks({
        participants: [{ gig_id: 'gig-1' }],
        gigs: [{ id: 'gig-1', title: 'G', status: 'Proposed', start: '2026-09-01T00:00:00Z', end: '2026-09-01T23:00:00Z' }],
        financials: [
          { id: 'f1', gig_id: 'gig-1', type: 'Informal Terms', amount: 1500, paid_at: null, staff_assignment_id: null },
        ],
        assignments: [],
      });

      const [result] = await getAllGigAccountingSummaries('org-1');
      expect(result.contractAmount).toBe(1500);
    });

    it('classifies sub-contract costs: Submitted/Signed as expected, Settled as actual, Rejected/Cancelled excluded', async () => {
      setupMocks({
        participants: [{ gig_id: 'gig-1' }],
        gigs: [{ id: 'gig-1', title: 'G', status: 'Completed', start: '2026-01-01T00:00:00Z', end: '2026-01-01T23:00:00Z' }],
        financials: [
          { id: 'f1', gig_id: 'gig-1', type: 'Contract Signed', amount: 5000, paid_at: null, staff_assignment_id: null },
          { id: 'f2', gig_id: 'gig-1', type: 'Sub-Contract Submitted', amount: 400, paid_at: null, staff_assignment_id: null },
          { id: 'f3', gig_id: 'gig-1', type: 'Sub-Contract Signed', amount: 600, paid_at: null, staff_assignment_id: null },
          { id: 'f4', gig_id: 'gig-1', type: 'Sub-Contract Settled', amount: 800, paid_at: '2026-01-10', staff_assignment_id: null },
          { id: 'f5', gig_id: 'gig-1', type: 'Sub-Contract Rejected', amount: 999, paid_at: null, staff_assignment_id: null },
          { id: 'f6', gig_id: 'gig-1', type: 'Sub-Contract Cancelled', amount: 999, paid_at: null, staff_assignment_id: null },
        ],
        assignments: [],
      });

      const [result] = await getAllGigAccountingSummaries('org-1');
      expect(result.expectedSubContractCosts).toBe(1000);
      expect(result.actualCosts).toBe(800);
    });

    it('computes paymentsToMake: Sub-Contract Signed (not settled) + unpaid completed staff', async () => {
      setupMocks({
        participants: [{ gig_id: 'gig-1' }],
        gigs: [{ id: 'gig-1', title: 'G', status: 'Completed', start: '2026-01-01T00:00:00Z', end: '2026-01-01T23:00:00Z' }],
        financials: [
          { id: 'f1', gig_id: 'gig-1', type: 'Contract Signed', amount: 5000, paid_at: null, staff_assignment_id: null },
          { id: 'f2', gig_id: 'gig-1', type: 'Sub-Contract Signed', amount: 1000, paid_at: null, staff_assignment_id: null },
          { id: 'f3', gig_id: 'gig-1', type: 'Sub-Contract Settled', amount: 400, paid_at: '2026-01-10', staff_assignment_id: null },
          { id: 'labor-fin', gig_id: 'gig-1', type: 'Expense Incurred', amount: 200, paid_at: null, staff_assignment_id: 'assign-1' },
        ],
        assignments: [
          {
            id: 'assign-1',
            fee: 200,
            rate: null,
            status: 'Confirmed',
            completed_at: '2026-01-02T00:00:00Z',
            gig_financial_id: 'labor-fin',
            slot: { gig_id: 'gig-1', organization_id: 'org-1' },
          },
        ],
      });

      const [result] = await getAllGigAccountingSummaries('org-1');
      expect(result.paymentsToMake).toBe(800);
    });

    it('derivates paymentHealth as all-clear when no outstanding revenue or payments', async () => {
      setupMocks({
        participants: [{ gig_id: 'gig-1' }],
        gigs: [{ id: 'gig-1', title: 'G', status: 'Settled', start: '2026-01-01T00:00:00Z', end: '2026-01-01T23:00:00Z' }],
        financials: [
          { id: 'f1', gig_id: 'gig-1', type: 'Contract Signed', amount: 1000, paid_at: null, staff_assignment_id: null },
          { id: 'f2', gig_id: 'gig-1', type: 'Payment Received', amount: 1000, paid_at: null, staff_assignment_id: null },
        ],
        assignments: [],
      });

      const [result] = await getAllGigAccountingSummaries('org-1');
      expect(result.paymentHealth).toBe('all-clear');
    });

    it('derivates paymentHealth as revenue-outstanding when revenue outstanding but no payments due', async () => {
      setupMocks({
        participants: [{ gig_id: 'gig-1' }],
        gigs: [{ id: 'gig-1', title: 'G', status: 'Completed', start: '2026-01-01T00:00:00Z', end: '2026-01-01T23:00:00Z' }],
        financials: [
          { id: 'f1', gig_id: 'gig-1', type: 'Contract Signed', amount: 1000, paid_at: null, staff_assignment_id: null },
          { id: 'f2', gig_id: 'gig-1', type: 'Payment Received', amount: 600, paid_at: null, staff_assignment_id: null },
        ],
        assignments: [],
      });

      const [result] = await getAllGigAccountingSummaries('org-1');
      expect(result.paymentHealth).toBe('revenue-outstanding');
    });

    it('derivates paymentHealth as payments-due when payments owed but revenue fully received', async () => {
      setupMocks({
        participants: [{ gig_id: 'gig-1' }],
        gigs: [{ id: 'gig-1', title: 'G', status: 'Completed', start: '2026-01-01T00:00:00Z', end: '2026-01-01T23:00:00Z' }],
        financials: [
          { id: 'f1', gig_id: 'gig-1', type: 'Contract Signed', amount: 1000, paid_at: null, staff_assignment_id: null },
          { id: 'f2', gig_id: 'gig-1', type: 'Payment Received', amount: 1000, paid_at: null, staff_assignment_id: null },
          { id: 'f3', gig_id: 'gig-1', type: 'Sub-Contract Signed', amount: 300, paid_at: null, staff_assignment_id: null },
        ],
        assignments: [],
      });

      const [result] = await getAllGigAccountingSummaries('org-1');
      expect(result.paymentHealth).toBe('payments-due');
    });

    it('derivates paymentHealth as both when both outstanding revenue and payments due', async () => {
      setupMocks({
        participants: [{ gig_id: 'gig-1' }],
        gigs: [{ id: 'gig-1', title: 'G', status: 'Completed', start: '2026-01-01T00:00:00Z', end: '2026-01-01T23:00:00Z' }],
        financials: [
          { id: 'f1', gig_id: 'gig-1', type: 'Contract Signed', amount: 1000, paid_at: null, staff_assignment_id: null },
          { id: 'f2', gig_id: 'gig-1', type: 'Payment Received', amount: 500, paid_at: null, staff_assignment_id: null },
          { id: 'f3', gig_id: 'gig-1', type: 'Sub-Contract Signed', amount: 300, paid_at: null, staff_assignment_id: null },
        ],
        assignments: [],
      });

      const [result] = await getAllGigAccountingSummaries('org-1');
      expect(result.paymentHealth).toBe('both');
    });

    it('propagates Supabase errors from gig_participants query', async () => {
      const dbError = new Error('permission denied');
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'gig_participants') return makeChain({ data: null, error: dbError });
        return makeChain({ data: [], error: null });
      });

      await expect(getAllGigAccountingSummaries('org-1')).rejects.toThrow('permission denied');
    });
  });

  // ─── completeStaffAssignment ──────────────────────────────────────────────

  describe('completeStaffAssignment', () => {
    it('creates the labor financial with a valid fin_category enum value', async () => {
      const assignment = {
        id: 'as-1',
        fee: 200,
        rate: null,
        slot: { gig_id: 'gig-1', organization_id: 'org-1', role_info: { name: 'FOH Engineer' } },
      };
      const financialsChain = makeChain({ data: { id: 'fin-1' }, error: null });
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'gig_financials') return financialsChain;
        return makeChain({ data: assignment, error: null });
      });
      (requireAuth as any).mockResolvedValue({ supabase: mockSupabase, user: { id: 'user-1' } });

      const result = await completeStaffAssignment('as-1');

      expect(result).toEqual({ success: true, financialId: 'fin-1' });
      const inserted = financialsChain.insert.mock.calls[0][0];
      // The database enum rejects anything outside FIN_CATEGORY_CONFIG
      expect(Object.keys(FIN_CATEGORY_CONFIG)).toContain(inserted.category);
    });
  });
});
