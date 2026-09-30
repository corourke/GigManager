import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateGigParticipants } from './gigParticipant.service';
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
    (requireAuth as any).mockResolvedValue({
      supabase: mockSupabase,
      user: { id: 'user-1', email: 'jane@example.com', user_metadata: { first_name: 'Jane', last_name: 'Doe' } },
    });
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
    (requireAuth as any).mockResolvedValue({
      supabase: { from: db.from },
      user: { id: 'user-1', email: 'jane@example.com', user_metadata: { first_name: 'Jane', last_name: 'Doe' } },
    });
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

    await updateGigParticipants('gig-1', [incoming[1]]);

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
