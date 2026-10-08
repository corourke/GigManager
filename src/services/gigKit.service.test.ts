import { describe, it, expect, vi, beforeEach } from 'vitest';
import { assignKitToGig, updateGigKitAssignments } from './gigKit.service';
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
    signIn({ from }, { id: 'user-1' });
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

  it('stamps inserted rows with the signed-in user', async () => {
    await updateGigKitAssignments('gig-1', 'org-1', [{ kit_id: 'k-4' }], []);

    const insert = chains.find((c) => c.insert.mock.calls.length > 0);
    expect(insert.insert).toHaveBeenCalledWith({ gig_id: 'gig-1', kit_id: 'k-4', organization_id: 'org-1', notes: null, assigned_by: 'user-1' });
  });
});

// Pinned to current behaviour when the service moved onto base/dataAccess (#20).
describe('assignKitToGig', () => {
  let chain: any;
  const from = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    chain = makeChain(null, { id: 'a-1', kit_id: 'k-1' });
    from.mockReturnValue(chain);
    signIn({ from }, { id: 'user-1' });
  });

  it('inserts the assignment as the signed-in user and returns the row', async () => {
    const row = await assignKitToGig('gig-1', 'k-1', 'org-1', 'front of house');

    expect(from).toHaveBeenCalledWith('gig_kit_assignments');
    expect(chain.insert).toHaveBeenCalledWith({
      gig_id: 'gig-1', kit_id: 'k-1', organization_id: 'org-1', notes: 'front of house', assigned_by: 'user-1',
    });
    expect(row).toEqual({ id: 'a-1', kit_id: 'k-1' });
  });

  it('rejects and writes nothing when no one is signed in', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    (getCurrentUser as any).mockRejectedValue(new Error('Not authenticated'));

    await expect(assignKitToGig('gig-1', 'k-1', 'org-1')).rejects.toThrow('Not authenticated');
    expect(chain.insert).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('words a network failure with its own action', async () => {
    chain.single.mockResolvedValue({ data: null, error: { message: 'Failed to fetch' } });

    await expect(assignKitToGig('gig-1', 'k-1', 'org-1')).rejects.toThrow('Network error: Unable to assign kit to gig.');
  });
});
