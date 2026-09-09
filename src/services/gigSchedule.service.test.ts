import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateGigScheduleEntries } from './gigSchedule.service';
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

function makeChain(result: { data: any; error: any }) {
  const chain: any = {};
  ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'in', 'is', 'or', 'order', 'limit'].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.single = vi.fn().mockResolvedValue(result);
  chain.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject);
  return chain;
}

describe('updateGigScheduleEntries (issue #55 — add-only history events)', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = { from: vi.fn() };
    (requireAuth as any).mockResolvedValue({
      supabase: mockSupabase,
      user: { id: 'user-1', email: 'jane@example.com', user_metadata: { first_name: 'Jane', last_name: 'Doe' } },
    });
  });

  it('logs schedule_entry.added when a new entry is inserted', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'gig_schedule_entries') return makeChain({ data: [], error: null });
      if (table === 'gigs') return makeChain({ data: { title: 'Test Gig', primary_organization_id: 'org-1' }, error: null });
      if (table === 'organizations') return makeChain({ data: { name: 'Acme' }, error: null });
      return makeChain({ data: [], error: null });
    });

    await updateGigScheduleEntries('gig-1', [
      { activity_type: 'Load-in', label: null, start_time: '2026-09-20T14:00:00.000Z' } as any,
    ]);

    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({
      event_type: 'schedule_entry.added',
      organization_id: 'org-1',
      gig_id: 'gig-1',
      context: expect.objectContaining({
        gig_title: 'Test Gig',
        actor_org_name: 'Acme',
        schedule_changes: [{ activity_type: 'Load-in', label: null, start_time: '2026-09-20T14:00:00.000Z' }],
        change_count: 1,
      }),
    }));
  });

  it('does NOT log when only updating an existing entry', async () => {
    const existingId = '11111111-1111-1111-1111-111111111111';
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'gig_schedule_entries') return makeChain({ data: [{ id: existingId }], error: null });
      return makeChain({ data: [], error: null });
    });

    await updateGigScheduleEntries('gig-1', [
      { id: existingId, activity_type: 'Load-in', start_time: '2026-09-20T14:00:00.000Z' } as any,
    ]);

    expect(logActivity).not.toHaveBeenCalled();
  });
});
