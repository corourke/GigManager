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

  it('derives context and logs participant.added when called without activityCtx (e.g. GigParticipantsSection autosave)', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'gig_participants') return makeParticipantsChain();
      if (table === 'gigs') return makeChain({ data: { title: 'Test Gig', primary_organization_id: 'org-1' }, error: null });
      if (table === 'organizations') return makeChain({ data: { name: 'Acme' }, error: null });
      return makeChain({ data: [], error: null });
    });

    await updateGigParticipants('gig-1', [
      { organization_id: 'org-2', role: 'Venue' },
    ]);

    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({
      event_type: 'participant.added',
      organization_id: 'org-1',
      context: expect.objectContaining({
        gig_title: 'Test Gig',
        actor_org_name: 'Acme',
        role: 'Venue',
      }),
    }));
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
});
