import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createClient } from '../utils/supabase/client';
import { countChildGigs } from './gig.service';

vi.mock('../utils/supabase/client', () => ({ createClient: vi.fn() }));

// #20 batch 6: characterization of the child-gig count before gig.service moves onto the shared base.
describe('countChildGigs', () => {
  let q: any;
  let supabase: any;
  const result = (r: any) => { q.then = (resolve: any, reject: any) => Promise.resolve(r).then(resolve, reject); };

  beforeEach(() => {
    vi.clearAllMocks();
    q = { select: vi.fn(() => q), eq: vi.fn(() => q) };
    supabase = { from: vi.fn(() => q) };
    (createClient as any).mockReturnValue(supabase);
  });

  it("counts the gigs whose parent is this one, without reading them", async () => {
    result({ count: 3, error: null });
    expect(await countChildGigs('g1')).toBe(3);
    expect(supabase.from).toHaveBeenCalledWith('gigs');
    expect(q.select).toHaveBeenCalledWith('id', { count: 'exact', head: true });
    expect(q.eq).toHaveBeenCalledWith('parent_gig_id', 'g1');
  });

  it('reads no count as none', async () => {
    result({ count: null, error: null });
    expect(await countChildGigs('g1')).toBe(0);
  });

  it('rejects when the count fails', async () => {
    result({ count: null, error: { message: 'boom' } });
    await expect(countChildGigs('g1')).rejects.toThrow();
  });
});
