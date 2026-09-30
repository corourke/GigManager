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

// A fake Supabase client that answers from the table's rows, like PostgREST
// would. Selecting a column that doesn't exist fails, as it does against the
// real database (issue #103).
type Op = { method: string; args: any[] };
function makeDb(rows: {
  gigs?: any;
  gig_participants?: any[];
  organization_members?: any[];
  organizations?: Record<string, string>;
  membersError?: any;
}) {
  const answer = (table: string, ops: Op[]) => {
    const has = (m: string) => ops.find(o => o.method === m);
    const select = String(has('select')?.args[0] ?? '');
    if (table === 'gigs') {
      if (select.includes('primary_organization_id')) {
        return { data: null, error: { code: '42703', message: 'column gigs.primary_organization_id does not exist' } };
      }
      return { data: rows.gigs ?? null, error: null };
    }
    if (table === 'gig_participants') return { data: rows.gig_participants ?? [], error: null };
    if (table === 'organization_members') {
      if (rows.membersError) return { data: null, error: rows.membersError };
      const ids: string[] = has('in')?.args[1] ?? [];
      return { data: (rows.organization_members ?? []).filter(m => ids.includes(m.organization_id)), error: null };
    }
    if (table === 'organizations') {
      const id = has('eq')?.args[1];
      const names = rows.organizations ?? {};
      return { data: id in names ? { name: names[id] } : null, error: null };
    }
    return { data: [], error: null };
  };
  return vi.fn((table: string) => {
    const ops: Op[] = [];
    const chain: any = {};
    ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'in', 'is', 'or', 'order', 'limit'].forEach((m) => {
      chain[m] = vi.fn((...args: any[]) => { ops.push({ method: m, args }); return chain; });
    });
    chain.single = vi.fn(() => Promise.resolve(answer(table, ops)));
    chain.then = (resolve: any, reject: any) => Promise.resolve(answer(table, ops)).then(resolve, reject);
    return chain;
  });
}

describe('updateGigScheduleEntries activity log organization (issue #103)', () => {
  const baseRows = {
    gigs: { title: 'Test Gig' },
    gig_participants: [{ organization_id: 'org-venue' }, { organization_id: 'org-prod' }],
    organization_members: [
      { organization_id: 'org-venue', role: 'Staff' },
      { organization_id: 'org-prod', role: 'Admin' },
      { organization_id: 'org-elsewhere', role: 'Manager' },
    ],
    organizations: { 'org-venue': 'Venue Co', 'org-prod': 'Prod Co' },
  };
  const newEntry = { activity_type: 'Load-in', label: null, start_time: '2026-09-20T14:00:00.000Z' } as any;

  const useDb = (rows: Parameters<typeof makeDb>[0]) => {
    (requireAuth as any).mockResolvedValue({
      supabase: { from: makeDb(rows) },
      user: { id: 'user-1', email: 'jane@example.com', user_metadata: { first_name: 'Jane', last_name: 'Doe' } },
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs against the user's Admin/Manager org among the gig's participants", async () => {
    useDb(baseRows);

    await updateGigScheduleEntries('gig-1', [newEntry]);

    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({
      event_type: 'schedule_entry.added',
      organization_id: 'org-prod',
      gig_id: 'gig-1',
      context: expect.objectContaining({
        gig_title: 'Test Gig',
        actor_org_name: 'Prod Co',
        actor_display_name: 'Jane Doe',
        schedule_changes: [{ activity_type: 'Load-in', label: null, start_time: '2026-09-20T14:00:00.000Z' }],
        change_count: 1,
      }),
    }));
  });

  it('logs against the org the caller passes in activityCtx', async () => {
    useDb(baseRows);

    await updateGigScheduleEntries('gig-1', [newEntry], { organization_id: 'org-venue', actor_org_name: 'Venue Co' });

    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({
      organization_id: 'org-venue',
      context: expect.objectContaining({ gig_title: 'Test Gig', actor_org_name: 'Venue Co' }),
    }));
  });

  it('does not log with a null organization when the membership query fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    useDb({ ...baseRows, membersError: { code: '500', message: 'boom' } });

    await updateGigScheduleEntries('gig-1', [newEntry]);

    expect(logActivity).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
