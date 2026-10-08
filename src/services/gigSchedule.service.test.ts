import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateGigScheduleEntries } from './gigSchedule.service';
import { getCurrentUser, getSupabase } from './base/dataAccess';

vi.mock('./base/dataAccess', () => ({
  getCurrentUser: vi.fn(),
  getSupabase: vi.fn(),
}));

/** Signs `user` in and hands the service `supabase` as the shared client. */
function signIn(supabase: any, user: any) {
  (getSupabase as any).mockReturnValue(supabase);
  (getCurrentUser as any).mockResolvedValue(user);
}

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
    signIn(mockSupabase, { id: 'user-1', email: 'jane@example.com', user_metadata: { first_name: 'Jane', last_name: 'Doe' } });
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
    signIn({ from: makeDb(rows) }, { id: 'user-1', email: 'jane@example.com', user_metadata: { first_name: 'Jane', last_name: 'Doe' } });
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

describe('updateGigScheduleEntries deletes only rows the caller loaded and removed (issue #92)', () => {
  const MINE = '44444444-4444-4444-8444-444444444444';
  const REMOVED = '55555555-5555-4555-8555-555555555555';
  const THEIRS = '66666666-6666-4666-8666-666666666666';
  const mine = { id: MINE, activity_type: 'Load-in', start_time: '2026-09-20T14:00:00.000Z' } as any;
  let calls: Op[][];

  beforeEach(() => {
    vi.clearAllMocks();
    calls = [];
    // gig_schedule_entries holds MINE, REMOVED and THEIRS (added by someone
    // else after this form loaded); an insert answers with the new rows' ids.
    const from = vi.fn((table: string) => {
      const ops: Op[] = [];
      if (table === 'gig_schedule_entries') calls.push(ops);
      const chain: any = {};
      ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'in', 'is', 'or', 'order', 'limit'].forEach((m) => {
        chain[m] = vi.fn((...args: any[]) => { ops.push({ method: m, args }); return chain; });
      });
      const answer = () => {
        if (table !== 'gig_schedule_entries') return { data: [], error: null };
        const insert = ops.find(o => o.method === 'insert');
        if (insert) return { data: insert.args[0].map((_: any, i: number) => ({ id: `new-${i + 1}` })), error: null };
        return { data: [{ id: MINE }, { id: REMOVED }, { id: THEIRS }], error: null };
      };
      chain.then = (resolve: any, reject: any) => Promise.resolve(answer()).then(resolve, reject);
      return chain;
    });
    signIn({ from }, { id: 'user-1', user_metadata: {} });
  });
  const deletedIds = () => calls
    .filter(ops => ops.some(o => o.method === 'delete'))
    .flatMap(ops => ops.find(o => o.method === 'in')?.args[1] ?? []);

  it('leaves a row the form never loaded alone', async () => {
    await updateGigScheduleEntries('gig-1', [mine], undefined, [MINE]);

    expect(deletedIds()).not.toContain(THEIRS);
  });

  it('deletes a row the form loaded and the user removed', async () => {
    await updateGigScheduleEntries('gig-1', [mine], undefined, [MINE, REMOVED]);

    expect(deletedIds()).toEqual([REMOVED]);
  });

  it('returns the id of every saved entry, including inserted ones, in the order sent', async () => {
    const added = { activity_type: 'Doors', start_time: '2026-09-20T13:00:00.000Z' } as any;

    const result = await updateGigScheduleEntries('gig-1', [added, mine], undefined, [MINE]);

    expect(result).toEqual({ ids: ['new-1', MINE] });
  });

  // Pinned to current behaviour when the service moved onto base/dataAccess (#20).
  it('rejects and touches nothing when no one is signed in', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    (getCurrentUser as any).mockRejectedValue(new Error('Not authenticated'));

    await expect(updateGigScheduleEntries('gig-1', [mine], undefined, [MINE, REMOVED])).rejects.toThrow('Not authenticated');
    expect(calls).toEqual([]);
    consoleError.mockRestore();
  });
});
