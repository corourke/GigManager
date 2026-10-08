import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateGigKitAssignments } from './gigKit.service';
import { requireAuth } from '../utils/supabase/auth-utils';

vi.mock('../utils/supabase/client', () => ({
  createClient: vi.fn(),
}));

vi.mock('../utils/supabase/auth-utils', () => ({
  requireAuth: vi.fn(),
}));

function makeChain(data: any, singleData: any) {
  const chain: any = {};
  ['select', 'insert', 'update', 'delete', 'eq', 'in', 'is', 'or', 'order', 'limit'].forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.single = vi.fn().mockResolvedValue({ data: singleData, error: null });
  chain.then = (resolve: any, reject: any) => Promise.resolve({ data, error: null }).then(resolve, reject);
  return chain;
}

describe('updateGigKitAssignments deletes only rows the caller loaded and removed (issue #92)', () => {
  const MINE = '44444444-4444-4444-8444-444444444444';
  const REMOVED = '55555555-5555-4555-8555-555555555555';
  const THEIRS = '66666666-6666-4666-8666-666666666666';
  let chains: any[];

  beforeEach(() => {
    vi.clearAllMocks();
    chains = [];
    // The gig holds MINE, REMOVED and THEIRS (assigned by someone else after
    // this form loaded); an insert answers with the new row's id.
    const from = vi.fn(() => {
      const c = makeChain([{ id: MINE, kit_id: 'k-1' }, { id: REMOVED, kit_id: 'k-2' }, { id: THEIRS, kit_id: 'k-3' }], { id: 'new-1' });
      chains.push(c);
      return c;
    });
    (requireAuth as any).mockResolvedValue({ supabase: { from }, user: { id: 'user-1' } });
  });
  const deletedIds = () => chains
    .filter((c) => c.delete.mock.calls.length > 0)
    .flatMap((c) => c.in.mock.calls.map((call: any[]) => call[1]).flat());

  it('leaves a row the form never loaded alone', async () => {
    await updateGigKitAssignments('gig-1', 'org-1', [{ id: MINE, kit_id: 'k-1' }], [MINE]);

    expect(deletedIds()).not.toContain(THEIRS);
  });

  it('deletes a row the form loaded and the user removed', async () => {
    await updateGigKitAssignments('gig-1', 'org-1', [{ id: MINE, kit_id: 'k-1' }], [MINE, REMOVED]);

    expect(deletedIds()).toEqual([REMOVED]);
  });

  it('returns the id of every saved row, including inserted ones', async () => {
    const result = await updateGigKitAssignments('gig-1', 'org-1', [{ id: MINE, kit_id: 'k-1' }, { kit_id: 'k-4' }], [MINE]);

    expect(result).toEqual({ success: true, ids: [MINE, 'new-1'] });
  });
});
