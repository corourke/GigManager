import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateGigParticipants } from './gigParticipant.service';
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
  ['select', 'insert', 'update', 'delete', 'eq', 'in', 'is', 'or', 'order', 'limit'].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.single = vi.fn().mockResolvedValue(result);
  chain.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject);
  return chain;
}

// gig_participants is queried twice with different expected shapes: a bare
// select (array, for the existing-rows fetch) and an insert().select().single()
// (a single inserted row, for the add path) — so it needs its own two-faced stub.
function makeParticipantsChain() {
  const chain: any = {};
  ['select', 'insert', 'update', 'delete', 'eq', 'in', 'is', 'or', 'order', 'limit'].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.single = vi.fn().mockResolvedValue({ data: { id: 'p-1' }, error: null });
  chain.then = (resolve: any, reject: any) => Promise.resolve({ data: [], error: null }).then(resolve, reject);
  return chain;
}

describe('updateGigParticipants (issue #55 — logs adds even without an explicit activityCtx)', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = { from: vi.fn() };
    signIn(mockSupabase, { id: 'user-1', email: 'jane@example.com', user_metadata: { first_name: 'Jane', last_name: 'Doe' } });
  });

  it('still logs correctly when an explicit activityCtx is passed (gig.service#updateGig path)', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'gig_participants') return makeParticipantsChain();
      if (table === 'organizations') return makeChain({ data: { name: 'Venue Org' }, error: null });
      return makeChain({ data: [], error: null });
    });

    await updateGigParticipants(
      'gig-1',
      [{ organization_id: 'org-2', role: 'Venue' }],
      { organization_id: 'org-9', actor_display_name: 'Bob', actor_org_name: 'Bob Org', gig_title: 'Explicit Gig' }
    );

    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({
      event_type: 'participant.added',
      organization_id: 'org-9',
      context: expect.objectContaining({
        gig_title: 'Explicit Gig',
        actor_org_name: 'Bob Org',
      }),
    }));
  });

  it('returns the database id of every participant, including newly inserted rows (issue #69)', async () => {
    const existingId = '11111111-1111-4111-8111-111111111111';
    const participantsChain = makeParticipantsChain();
    participantsChain.then = (resolve: any, reject: any) =>
      Promise.resolve({ data: [{ id: existingId, organization_id: 'org-1', role: 'Act' }], error: null }).then(resolve, reject);
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'gig_participants') return participantsChain;
      if (table === 'organizations') return makeChain({ data: { name: 'Acme' }, error: null });
      return makeChain({ data: [], error: null });
    });

    const result = await updateGigParticipants(
      'gig-1',
      [
        { id: existingId, organization_id: 'org-1', role: 'Act' },
        { organization_id: 'org-2', role: 'Venue' },
      ],
      { organization_id: 'org-9', actor_display_name: 'Bob', actor_org_name: 'Bob Org', gig_title: 'Gig' }
    );

    // The caller needs the inserted row's id; without it, its next save sends
    // no id for that row and the row is deleted and inserted again.
    expect(result.ids).toEqual([existingId, 'p-1']);
    expect(participantsChain.delete).not.toHaveBeenCalled();
  });
});

// A fake Supabase client that records every chain and answers from the
// table's rows, like PostgREST would. Selecting a column that doesn't exist
// fails, as it does against the real database (issue #103).
type Op = { method: string; args: any[] };
function makeDb(rows: {
  gigs?: any;
  gig_participants?: any[];
  organization_members?: any[];
  organizations?: Record<string, string>;
  gigsError?: any;
}) {
  const calls: Array<{ table: string; ops: Op[] }> = [];
  const answer = (table: string, ops: Op[]) => {
    const has = (m: string) => ops.find(o => o.method === m);
    const select = String(has('select')?.args[0] ?? '');
    if (table === 'gigs') {
      if (select.includes('primary_organization_id')) {
        return { data: null, error: { code: '42703', message: 'column gigs.primary_organization_id does not exist' } };
      }
      if (rows.gigsError) return { data: null, error: rows.gigsError };
      return { data: rows.gigs ?? null, error: null };
    }
    if (table === 'gig_participants') {
      if (has('insert')) return { data: { id: 'p-new' }, error: null };
      return { data: rows.gig_participants ?? [], error: null };
    }
    if (table === 'organization_members') {
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
  const from = vi.fn((table: string) => {
    const ops: Op[] = [];
    calls.push({ table, ops });
    const chain: any = {};
    ['select', 'insert', 'update', 'delete', 'eq', 'in', 'is', 'or', 'order', 'limit'].forEach((m) => {
      chain[m] = vi.fn((...args: any[]) => { ops.push({ method: m, args }); return chain; });
    });
    chain.single = vi.fn(() => Promise.resolve(answer(table, ops)));
    chain.then = (resolve: any, reject: any) => Promise.resolve(answer(table, ops)).then(resolve, reject);
    return chain;
  });
  return { from, calls };
}

describe('updateGigParticipants activity log organization (issue #103)', () => {
  const VENUE_ROW = '22222222-2222-4222-8222-222222222222';
  const PROD_ROW = '33333333-3333-4333-8333-333333333333';
  const existing = [
    { id: VENUE_ROW, organization_id: 'org-venue', role: 'Venue' },
    { id: PROD_ROW, organization_id: 'org-prod', role: 'Production' },
  ];
  const incoming = [
    { id: VENUE_ROW, organization_id: 'org-venue', role: 'Venue' as const },
    { id: PROD_ROW, organization_id: 'org-prod', role: 'Production' as const },
    { organization_id: 'org-act', role: 'Act' as const },
  ];
  const baseRows = {
    gigs: { title: 'Test Gig' },
    gig_participants: existing,
    organization_members: [
      { organization_id: 'org-venue', role: 'Viewer' },
      { organization_id: 'org-prod', role: 'Manager' },
      { organization_id: 'org-elsewhere', role: 'Admin' },
    ],
    organizations: { 'org-venue': 'Venue Co', 'org-prod': 'Prod Co', 'org-act': 'The Act' },
  };
  let db: ReturnType<typeof makeDb>;

  const useDb = (rows: Parameters<typeof makeDb>[0]) => {
    db = makeDb(rows);
    signIn({ from: db.from }, { id: 'user-1', email: 'jane@example.com', user_metadata: { first_name: 'Jane', last_name: 'Doe' } });
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs against the user's Admin/Manager org among the gig's participants when the caller passes no org", async () => {
    useDb(baseRows);

    const result = await updateGigParticipants('gig-1', incoming);

    expect(result.success).toBe(true);
    expect(logActivity).toHaveBeenCalledTimes(1);
    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({
      event_type: 'participant.added',
      organization_id: 'org-prod',
      context: expect.objectContaining({
        gig_title: 'Test Gig',
        actor_org_name: 'Prod Co',
        actor_display_name: 'Jane Doe',
        organization_name: 'The Act',
        role: 'Act',
      }),
    }));
  });

  it('logs against the org the caller passes in activityCtx', async () => {
    useDb(baseRows);

    await updateGigParticipants('gig-1', incoming, { organization_id: 'org-venue', actor_org_name: 'Venue Co' });

    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({
      event_type: 'participant.added',
      organization_id: 'org-venue',
      context: expect.objectContaining({ gig_title: 'Test Gig', actor_org_name: 'Venue Co' }),
    }));
    expect(db.calls.some(c => c.table === 'organization_members')).toBe(false);
  });

  it('logs removals against the acting org too', async () => {
    useDb(baseRows);

    await updateGigParticipants('gig-1', [incoming[1]], undefined, [VENUE_ROW, PROD_ROW]);

    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({
      event_type: 'participant.removed',
      organization_id: 'org-prod',
      context: expect.objectContaining({ gig_title: 'Test Gig', actor_org_name: 'Prod Co', role: 'Venue' }),
    }));
  });

  it('does not log with a null organization when the lookup query fails, and still saves', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    useDb({ ...baseRows, gigsError: { code: '500', message: 'boom' } });

    const result = await updateGigParticipants('gig-1', incoming);

    expect(result.success).toBe(true);
    expect(result.ids).toEqual([VENUE_ROW, PROD_ROW, 'p-new']);
    expect(logActivity).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

describe('updateGigParticipants deletes only rows the caller loaded and removed (issue #92)', () => {
  const MINE = '44444444-4444-4444-8444-444444444444';
  const REMOVED = '55555555-5555-4555-8555-555555555555';
  const THEIRS = '66666666-6666-4666-8666-666666666666';
  const ctx = { organization_id: 'org-1', actor_display_name: 'Jane', actor_org_name: 'Org 1', gig_title: 'Gig' };
  const mine = { id: MINE, organization_id: 'org-1', role: 'Production' as const };
  let db: ReturnType<typeof makeDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = makeDb({
      gig_participants: [
        { id: MINE, organization_id: 'org-1', role: 'Production' },
        { id: REMOVED, organization_id: 'org-2', role: 'Venue' },
        // Added by someone else after this form loaded.
        { id: THEIRS, organization_id: 'org-3', role: 'Act' },
      ],
      organizations: { 'org-2': 'Venue Co', 'org-3': 'The Act' },
    });
    signIn({ from: db.from }, { id: 'user-1', user_metadata: {} });
  });
  const deletedIds = () => db.calls
    .filter(c => c.table === 'gig_participants' && c.ops.some(o => o.method === 'delete'))
    .flatMap(c => c.ops.find(o => o.method === 'in')?.args[1] ?? []);

  it('leaves a row the form never loaded alone', async () => {
    await updateGigParticipants('gig-1', [mine], ctx, [MINE]);

    expect(deletedIds()).not.toContain(THEIRS);
    expect(logActivity).not.toHaveBeenCalledWith(expect.objectContaining({ entity_id: THEIRS }));
  });

  it('deletes a row the form loaded and the user removed', async () => {
    await updateGigParticipants('gig-1', [mine], ctx, [MINE, REMOVED]);

    expect(deletedIds()).toEqual([REMOVED]);
  });

  it('deletes nothing when the caller passes no loaded ids', async () => {
    await updateGigParticipants('gig-1', [mine], ctx);

    expect(deletedIds()).toEqual([]);
  });

  // Pinned to current behaviour when the service moved onto base/dataAccess (#20).
  it('rejects and touches nothing when no one is signed in', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    (getCurrentUser as any).mockRejectedValue(new Error('Not authenticated'));

    await expect(updateGigParticipants('gig-1', [mine], ctx, [MINE, REMOVED])).rejects.toThrow('Not authenticated');
    expect(db.from).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
