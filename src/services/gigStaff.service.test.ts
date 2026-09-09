import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateGigStaffSlots } from './gigStaff.service';
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

// Generic chainable Supabase stub: `.then()` resolves the bare-select shape,
// `.single()`/`.maybeSingle()` resolve their own (possibly different) shape —
// several tables here are queried both ways in a single call.
function makeChain(opts: { data?: any; singleData?: any; maybeSingleData?: any }) {
  const chain: any = {};
  ['select', 'insert', 'update', 'delete', 'eq', 'in', 'is', 'or', 'order', 'limit'].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.single = vi.fn().mockResolvedValue({ data: opts.singleData ?? null, error: null });
  chain.maybeSingle = vi.fn().mockResolvedValue({ data: opts.maybeSingleData ?? null, error: null });
  chain.then = (resolve: any, reject: any) => Promise.resolve({ data: opts.data ?? [], error: null }).then(resolve, reject);
  return chain;
}

describe('updateGigStaffSlots (issue #55 — logs adds even without an explicit activityCtx)', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = { from: vi.fn() };
    (requireAuth as any).mockResolvedValue({
      supabase: mockSupabase,
      user: { id: 'user-1', email: 'jane@example.com', user_metadata: { first_name: 'Jane', last_name: 'Doe' } },
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'gig_participants') return makeChain({ data: [{ organization_id: 'org-1' }] });
      if (table === 'organization_members') return makeChain({ data: [{ organization_id: 'org-1', role: 'Admin' }] });
      if (table === 'gig_staff_slots') return makeChain({ data: [], singleData: { id: 'slot-1' } });
      if (table === 'staff_roles') return makeChain({ data: [], maybeSingleData: null, singleData: { id: 'role-1' } });
      if (table === 'organizations') return makeChain({ singleData: { name: 'Acme' } });
      if (table === 'gigs') return makeChain({ singleData: { title: 'Test Gig' } });
      return makeChain({ data: [] });
    });
  });

  it('derives context and logs staffing.updated (slot_added) when called without activityCtx', async () => {
    await updateGigStaffSlots('gig-1', [
      { organization_id: 'org-1', role: 'FOH Engineer' },
    ]);

    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({
      event_type: 'staffing.updated',
      organization_id: 'org-1',
      context: expect.objectContaining({
        gig_title: 'Test Gig',
        actor_org_name: 'Acme',
        changes: [{ type: 'slot_added', role: 'FOH Engineer' }],
        change_count: 1,
      }),
    }));
  });

  it('does not log when no slots actually change', async () => {
    await updateGigStaffSlots('gig-1', []);
    expect(logActivity).not.toHaveBeenCalled();
  });
});
