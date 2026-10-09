import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getGigReturns, writeOffPieces, undoWriteOff, markReturned } from './writeOff.service';
import { createClient } from '../utils/supabase/client';
import { requireAuth } from '../utils/supabase/auth-utils';
import { RETURNED_STATUS } from '../config/inventoryWorkflow';

vi.mock('../utils/supabase/client', () => ({ createClient: vi.fn() }));
vi.mock('../utils/supabase/auth-utils', () => ({ requireAuth: vi.fn() }));

function makeChain(result: { data: any; error: any }) {
  const chain: any = {};
  ['select', 'insert', 'eq', 'in', 'not'].forEach((m) => { chain[m] = vi.fn().mockReturnValue(chain); });
  chain.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject);
  return chain;
}

const rec = (id: string, over: Record<string, unknown> = {}) => ({
  id, manufacturer_model: 'x', tag_number: null, serial_number: null, quantity: 1, status: 'Active', retired_on: null, ...over,
});
const row = (over: Record<string, unknown>) => ({
  id: `r-${Math.random()}`, gig_id: 'gig-1', kit_id: 'foh', asset_id: 'cables', status: 'On Site', location: null,
  quantity: 1, scanned_at: '2026-10-01T10:00:00Z', created_at: '2026-10-01T10:00:00Z', kit: { name: 'FOH' }, ...over,
});

// #185: the gig's "Not returned" list and its write-offs.
describe('writeOff.service (#185)', () => {
  let supabase: any;
  beforeEach(() => {
    vi.clearAllMocks();
    supabase = { from: vi.fn(), rpc: vi.fn() };
    (createClient as any).mockReturnValue(supabase);
    (requireAuth as any).mockResolvedValue({ supabase, user: { id: 'user-1' } });
  });

  it('getGigReturns: what is still out kit by kit, and the write-offs not undone', async () => {
    const tracking = [
      row({ asset_id: 'cables', quantity: 4, scanned_at: '2026-10-01T10:00:00Z' }),
      row({ asset_id: 'cables', quantity: 1, status: 'Not Returned', scanned_at: '2026-10-02T10:00:00Z' }),
      row({ asset_id: 'k12', kit_id: 'pa', kit: { name: 'Main PA' }, status: 'On Site' }),
      row({ asset_id: 'back', status: RETURNED_STATUS }),
    ];
    const queue = [
      makeChain({ data: tracking.map((r) => ({ asset_id: r.asset_id })), error: null }),   // rows at the gig
      makeChain({ data: [{ entity_id: 'gone', context: { note: 'lost at load-out' } }, { entity_id: 'undone', context: {} }], error: null }),
      makeChain({ data: tracking, error: null }),                                         // every row of those records
      makeChain({ data: [rec('cables', { manufacturer_model: 'XLR Cable, 50 ft', quantity: 10 }),
        rec('k12', { manufacturer_model: 'QSC K12.2', tag_number: 'DSL-0101' }), rec('back')], error: null }),
      makeChain({ data: [rec('gone', { manufacturer_model: 'PD-20', tag_number: 'T-9', status: 'Missing', retired_on: '2026-10-09' })], error: null }),
    ];
    supabase.from.mockImplementation(() => queue.shift());

    const r = await getGigReturns('org-1', 'gig-1');
    expect(r.notReturned.map((e) => [e.record.id, e.kitName, e.quantity, e.status])).toEqual([
      ['k12', 'Main PA', 1, 'On Site'],
      ['cables', 'FOH', 1, 'Not Returned'],
    ]);
    expect(r.writtenOff).toEqual([{ record: expect.objectContaining({ id: 'gone' }), quantity: 1, note: 'lost at load-out' }]);
  });

  it('getGigReturns: nothing tracked at the gig asks for nothing more', async () => {
    supabase.from.mockImplementation(() => makeChain({ data: [], error: null }));
    await expect(getGigReturns('org-1', 'gig-1')).resolves.toEqual({ notReturned: [], writtenOff: [] });
    expect(supabase.from).toHaveBeenCalledTimes(2);
  });

  it('writeOffPieces and undoWriteOff call the RPCs', async () => {
    supabase.rpc.mockResolvedValue({ data: 'missing-1', error: null });
    await expect(writeOffPieces({ assetId: 'cables', quantity: 1, gigId: 'gig-1', kitId: 'foh', stillOut: 2, note: 'n' })).resolves.toBe('missing-1');
    expect(supabase.rpc).toHaveBeenCalledWith('write_off_pieces', {
      p_asset_id: 'cables', p_quantity: 1, p_gig_id: 'gig-1', p_kit_id: 'foh', p_still_out: 2, p_note: 'n',
    });
    await undoWriteOff('missing-1');
    expect(supabase.rpc).toHaveBeenLastCalledWith('undo_write_off', { p_asset_id: 'missing-1' });
  });

  it('a refused write-off throws', async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: { message: 'Permission denied' } });
    await expect(undoWriteOff('x')).rejects.toBeTruthy();
  });

  it('markReturned writes a return row in the kit\'s bucket', async () => {
    const chain = makeChain({ data: null, error: null });
    supabase.from.mockReturnValue(chain);
    await markReturned({ organizationId: 'org-1', gigId: 'gig-1', kitId: 'foh', assetId: 'cables', quantity: 3 });
    expect(supabase.from).toHaveBeenCalledWith('inventory_tracking');
    expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({
      organization_id: 'org-1', gig_id: 'gig-1', kit_id: 'foh', asset_id: 'cables', status: RETURNED_STATUS, quantity: 3, scanned_by: 'user-1',
    }));
  });
});
