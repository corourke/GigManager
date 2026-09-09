import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getGigExportAggregates, updateGigFinancials } from './gigFinancial.service';
import { createClient } from '../utils/supabase/client';
import { requireAuth } from '../utils/supabase/auth-utils';

vi.mock('../utils/supabase/client', () => ({
  createClient: vi.fn(),
}));

vi.mock('../utils/supabase/auth-utils', () => ({
  requireAuth: vi.fn(),
}));

vi.mock('./activityLog.service', () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

import { logActivity } from './activityLog.service';

// Chainable Supabase query builder stub that resolves to `result` when awaited.
function makeChain(result: { data: any; error: any }) {
  const chain: any = {};
  ['select', 'eq', 'in', 'is', 'or', 'order', 'limit'].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject);
  return chain;
}

describe('getGigExportAggregates', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = { from: vi.fn() };
    (createClient as any).mockReturnValue(mockSupabase);
  });

  function setup({
    participants = [],
    financials = [],
    assignments = [],
  }: { participants?: any[]; financials?: any[]; assignments?: any[] }) {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'gig_participants') return makeChain({ data: participants, error: null });
      if (table === 'gig_financials') return makeChain({ data: financials, error: null });
      if (table === 'gig_staff_assignments') return makeChain({ data: assignments, error: null });
      return makeChain({ data: [], error: null });
    });
  }

  it('returns an empty map when the org participates in no gigs', async () => {
    setup({ participants: [] });
    const result = await getGigExportAggregates('org-1');
    expect(result.size).toBe(0);
  });

  it('aggregates revenue, staff cost/count and non-staff expenses per gig', async () => {
    setup({
      participants: [{ gig_id: 'gig-1' }, { gig_id: 'gig-2' }, { gig_id: 'gig-3' }],
      financials: [
        { gig_id: 'gig-1', type: 'Contract Signed', amount: 4000, staff_assignment_id: null },
        { gig_id: 'gig-1', type: 'Payment Received', amount: 1000, staff_assignment_id: null },
        { gig_id: 'gig-1', type: 'Expense Incurred', amount: 300, staff_assignment_id: null },
        { gig_id: 'gig-1', type: 'Payment Sent', amount: 150, staff_assignment_id: null },
        // staff-linked ledger entry — already counted in costOfStaff, excluded from expenses
        { gig_id: 'gig-1', type: 'Expense Incurred', amount: 900, staff_assignment_id: 'a1' },
        // tracking type — ignored entirely
        { gig_id: 'gig-1', type: 'Invoice Issued', amount: 5000, staff_assignment_id: null },
        { gig_id: 'gig-2', type: 'Bid Accepted', amount: 2000, staff_assignment_id: null },
        { gig_id: 'gig-2', type: 'Deposit Received', amount: 2500, staff_assignment_id: null },
      ],
      assignments: [
        { fee: 500, rate: null, slot: { gig_id: 'gig-1', organization_id: 'org-1' } },
        { fee: null, rate: 200, slot: { gig_id: 'gig-1', organization_id: 'org-1' } },
        { fee: 0, rate: null, slot: { gig_id: 'gig-1', organization_id: 'org-1' } },
      ],
    });

    const result = await getGigExportAggregates('org-1');

    expect(result.get('gig-1')).toEqual({
      revenue: 4000, // max(Contract Signed 4000, received 1000)
      costOfStaff: 700, // 500 + 200 + 0
      expenses: 450, // 300 + 150 (staff-linked 900 excluded)
      staffCount: 3,
    });
    expect(result.get('gig-2')).toEqual({
      revenue: 2500, // max(Bid Accepted 2000, received 2500)
      costOfStaff: 0,
      expenses: 0,
      staffCount: 0,
    });
    // gig-3 has no financials and no staff → absent (caller treats as zero)
    expect(result.has('gig-3')).toBe(false);
  });

  it('counts sub-contractor costs as expenses, regardless of paid/pending status', async () => {
    // FIN_TYPE_GROUPS.cost includes all three Sub-Contract types; unlike
    // getGigProfitabilitySummary this export deliberately doesn't split
    // paid (Settled) from pending (Submitted/Signed) — same "sum everything"
    // treatment as costOfStaff summing assignments regardless of status.
    setup({
      participants: [{ gig_id: 'gig-1' }],
      financials: [
        { gig_id: 'gig-1', type: 'Sub-Contract Submitted', amount: 100, staff_assignment_id: null },
        { gig_id: 'gig-1', type: 'Sub-Contract Signed', amount: 200, staff_assignment_id: null },
        { gig_id: 'gig-1', type: 'Sub-Contract Settled', amount: 300, staff_assignment_id: null },
        // Rejected/Cancelled aren't cost types — excluded entirely
        { gig_id: 'gig-1', type: 'Sub-Contract Rejected', amount: 999, staff_assignment_id: null },
      ],
    });
    const result = await getGigExportAggregates('org-1');
    expect(result.get('gig-1')).toMatchObject({ expenses: 600 });
  });

  it('handles PostgREST returning the embedded slot as a single-element array', async () => {
    setup({
      participants: [{ gig_id: 'gig-1' }],
      assignments: [
        { fee: 250, rate: null, slot: [{ gig_id: 'gig-1', organization_id: 'org-1' }] },
      ],
    });
    const result = await getGigExportAggregates('org-1');
    expect(result.get('gig-1')).toMatchObject({ costOfStaff: 250, staffCount: 1 });
  });

  it('rethrows when a query errors', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'gig_participants') return makeChain({ data: [{ gig_id: 'gig-1' }], error: null });
      return makeChain({ data: null, error: new Error('permission denied') });
    });
    await expect(getGigExportAggregates('org-1')).rejects.toThrow('permission denied');
  });
});

// ─── updateGigFinancials (issue #55 — add-only history events) ────────────

function makeFullChain(result: { data: any; error: any }) {
  const chain: any = {};
  ['select', 'insert', 'update', 'delete', 'eq', 'in', 'is', 'or', 'order', 'limit'].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.single = vi.fn().mockResolvedValue(result);
  chain.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject);
  return chain;
}

describe('updateGigFinancials', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = { from: vi.fn() };
    (requireAuth as any).mockResolvedValue({
      supabase: mockSupabase,
      user: { id: 'user-1', email: 'jane@example.com', user_metadata: { first_name: 'Jane', last_name: 'Doe' } },
    });
  });

  it('logs financial.added when a new record is inserted', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'gig_financials') return makeFullChain({ data: [], error: null });
      if (table === 'organizations') return makeFullChain({ data: { name: 'Acme' }, error: null });
      if (table === 'gigs') return makeFullChain({ data: { title: 'Test Gig' }, error: null });
      return makeFullChain({ data: [], error: null });
    });

    await updateGigFinancials('gig-1', 'org-1', [
      { amount: 250, date: '2026-01-01', type: 'Expense Incurred' },
    ]);

    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({
      event_type: 'financial.added',
      organization_id: 'org-1',
      gig_id: 'gig-1',
      context: expect.objectContaining({
        gig_title: 'Test Gig',
        actor_org_name: 'Acme',
        financial_changes: [{ amount: 250, fin_type: 'Expense Incurred' }],
        change_count: 1,
      }),
    }));
  });

  it('does NOT log when only updating an existing record', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'gig_financials') return makeFullChain({ data: [{ id: '11111111-1111-1111-1111-111111111111' }], error: null });
      return makeFullChain({ data: [], error: null });
    });

    await updateGigFinancials('gig-1', 'org-1', [
      { id: '11111111-1111-1111-1111-111111111111', amount: 300, date: '2026-01-01', type: 'Payment Received' },
    ]);

    expect(logActivity).not.toHaveBeenCalled();
  });
});
