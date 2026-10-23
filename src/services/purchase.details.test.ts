import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createClient } from '../utils/supabase/client';
import { requireAuth } from '../utils/supabase/auth-utils';
import { getPurchaseWithDetails, updatePurchase } from './purchase.service';

vi.mock('../utils/supabase/client', () => ({ createClient: vi.fn() }));
vi.mock('../utils/supabase/auth-utils', () => ({ requireAuth: vi.fn() }));

// #20 batch 7: characterization of the purchase reads and writes not covered elsewhere,
// before the service moves onto the shared base.
function query(result: { data: any; error: any }) {
  const q: any = {};
  for (const m of ['select', 'eq', 'update']) q[m] = vi.fn().mockReturnValue(q);
  q.single = vi.fn().mockResolvedValue(result);
  q.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject);
  return q;
}

describe('getPurchaseWithDetails', () => {
  let supabase: any;
  beforeEach(() => {
    vi.clearAllMocks();
    supabase = { from: vi.fn() };
    (createClient as any).mockReturnValue(supabase);
  });

  it('loads a header with its lines, assets and attachments', async () => {
    const header = query({ data: { id: 'p1', row_type: 'header', vendor: 'Sweetwater' }, error: null });
    const lines = query({ data: [{ id: 'l1' }], error: null });
    const assets = query({ data: [{ id: 'a1' }], error: null });
    const attachments = query({ data: [{ id: 'ea1', attachment: { id: 'f1', name: 'invoice.pdf' } }], error: null });
    supabase.from.mockReturnValueOnce(header).mockReturnValueOnce(lines).mockReturnValueOnce(assets).mockReturnValueOnce(attachments);

    const result = await getPurchaseWithDetails('p1');
    expect(supabase.from.mock.calls.map((c: any[]) => c[0])).toEqual(['purchases', 'purchases', 'assets', 'entity_attachments']);
    expect(lines.eq).toHaveBeenCalledWith('parent_id', 'p1');
    expect(assets.eq).toHaveBeenCalledWith('purchase_id', 'p1');
    expect(attachments.eq).toHaveBeenCalledWith('entity_type', 'purchase');
    expect(result).toEqual({
      id: 'p1', row_type: 'header', vendor: 'Sweetwater',
      items: [{ id: 'l1' }], assets: [{ id: 'a1' }],
      attachments: [{ id: 'f1', name: 'invoice.pdf', entity_attachment_id: 'ea1' }],
    });
    expect(requireAuth).not.toHaveBeenCalled();
  });

  it('a line gets only its attachments', async () => {
    supabase.from
      .mockReturnValueOnce(query({ data: { id: 'l1', row_type: 'item' }, error: null }))
      .mockReturnValueOnce(query({ data: null, error: null }));
    const result = await getPurchaseWithDetails('l1');
    expect(result).toEqual({ id: 'l1', row_type: 'item', attachments: [] });
  });

  it('a failed read rejects with the purchase-details message', async () => {
    supabase.from.mockReturnValueOnce(query({ data: null, error: { message: 'boom' } }));
    await expect(getPurchaseWithDetails('p1')).rejects.toThrow();
  });
});

describe('updatePurchase', () => {
  let supabase: any;
  beforeEach(() => {
    vi.clearAllMocks();
    supabase = { from: vi.fn() };
    (createClient as any).mockReturnValue(supabase);
    (requireAuth as any).mockResolvedValue({ supabase, user: { id: 'u1' } });
  });

  it('saves the changes with a fresh updated_at and returns the row', async () => {
    const q = query({ data: { id: 'p1', vendor: 'B&H' }, error: null });
    supabase.from.mockReturnValue(q);
    const result = await updatePurchase('p1', { vendor: 'B&H' } as any);
    expect(supabase.from).toHaveBeenCalledWith('purchases');
    expect(q.update).toHaveBeenCalledWith({ vendor: 'B&H', updated_at: expect.any(String) });
    expect(q.eq).toHaveBeenCalledWith('id', 'p1');
    expect(result).toEqual({ id: 'p1', vendor: 'B&H' });
  });

  it('rejects when the update fails', async () => {
    supabase.from.mockReturnValue(query({ data: null, error: { message: 'boom' } }));
    await expect(updatePurchase('p1', {} as any)).rejects.toThrow();
  });

  it('rejects when no one is signed in, and writes nothing', async () => {
    (requireAuth as any).mockRejectedValue(new Error('Not authenticated'));
    await expect(updatePurchase('p1', {} as any)).rejects.toThrow();
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
