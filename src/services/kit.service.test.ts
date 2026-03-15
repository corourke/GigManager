import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getKits, getKit, getDistinctKitValues, deleteKit } from './kit.service';
import { createClient } from '../utils/supabase/client';

vi.mock('../utils/supabase/client', () => ({
  createClient: vi.fn(),
}));

function makeChain(result: { data: any; error: any }) {
  const chain: any = {};
  const chainMethods = [
    'select', 'insert', 'update', 'delete',
    'eq', 'neq', 'in', 'not', 'is', 'or',
    'order', 'limit',
  ];
  chainMethods.forEach(m => { chain[m] = vi.fn().mockReturnValue(chain); });
  chain.single = vi.fn().mockResolvedValue(result);
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  chain.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject);
  return chain;
}

describe('kit.service', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = { from: vi.fn() };
    (createClient as any).mockReturnValue(mockSupabase);
  });

  // ─── getKits ──────────────────────────────────────────────────────────────

  describe('getKits', () => {
    it('returns kits for an organization with no filters', async () => {
      const mockKits = [
        { id: 'kit-1', name: 'PA System', category: 'Audio' },
        { id: 'kit-2', name: 'Lighting Rig', category: 'Lighting' },
      ];
      const chain = makeChain({ data: mockKits, error: null });
      mockSupabase.from.mockReturnValue(chain);

      const result = await getKits('org-1');

      expect(result).toHaveLength(2);
      expect(mockSupabase.from).toHaveBeenCalledWith('kits');
      expect(chain.eq).toHaveBeenCalledWith('organization_id', 'org-1');
    });

    it('returns empty array when no kits exist', async () => {
      mockSupabase.from.mockReturnValue(makeChain({ data: null, error: null }));
      const result = await getKits('org-1');
      expect(result).toEqual([]);
    });

    it('applies category filter when provided', async () => {
      const chain = makeChain({ data: [], error: null });
      mockSupabase.from.mockReturnValue(chain);

      await getKits('org-1', { category: 'Audio' });

      expect(chain.eq).toHaveBeenCalledWith('category', 'Audio');
    });

    it('applies search filter using sanitized LIKE via or()', async () => {
      const chain = makeChain({ data: [], error: null });
      mockSupabase.from.mockReturnValue(chain);

      await getKits('org-1', { search: 'PA' });

      expect(chain.or).toHaveBeenCalledWith(expect.stringContaining('PA'));
    });

    it('sanitizes LIKE metacharacters in search', async () => {
      const chain = makeChain({ data: [], error: null });
      mockSupabase.from.mockReturnValue(chain);

      await getKits('org-1', { search: '50%' });

      expect(chain.or).toHaveBeenCalledWith(expect.stringContaining('50\\%'));
    });

    it('propagates Supabase errors', async () => {
      const dbError = new Error('permission denied');
      mockSupabase.from.mockReturnValue(makeChain({ data: null, error: dbError }));

      await expect(getKits('org-1')).rejects.toThrow('permission denied');
    });
  });

  // ─── getKit ───────────────────────────────────────────────────────────────

  describe('getKit', () => {
    it('returns a single kit with its assets', async () => {
      const mockKit = {
        id: 'kit-1',
        name: 'PA System',
        kit_assets: [{ id: 'ka-1', quantity: 2, asset: { id: 'asset-1' } }],
      };
      const chain = makeChain({ data: mockKit, error: null });
      mockSupabase.from.mockReturnValue(chain);

      const result = await getKit('kit-1');

      expect(result.id).toBe('kit-1');
      expect(result.kit_assets).toHaveLength(1);
      expect(chain.eq).toHaveBeenCalledWith('id', 'kit-1');
      expect(chain.single).toHaveBeenCalled();
    });

    it('propagates Supabase errors when kit is not found', async () => {
      const dbError = { code: 'PGRST116', message: 'Row not found' };
      mockSupabase.from.mockReturnValue(makeChain({ data: null, error: dbError }));

      await expect(getKit('missing-id')).rejects.toMatchObject({ message: 'Row not found' });
    });
  });

  // ─── getDistinctKitValues ─────────────────────────────────────────────────

  describe('getDistinctKitValues', () => {
    it('returns sorted unique category values, deduplicated and with blanks removed', async () => {
      const rawData = [
        { category: 'Lighting' },
        { category: 'Audio' },
        { category: 'Lighting' },  // duplicate
        { category: '' },           // blank — should be filtered
      ];
      const chain = makeChain({ data: rawData, error: null });
      mockSupabase.from.mockReturnValue(chain);

      const result = await getDistinctKitValues('org-1', 'category');

      expect(result).toEqual(['Audio', 'Lighting']); // sorted, deduped
    });

    it('queries the correct org and excludes nulls', async () => {
      const chain = makeChain({ data: [], error: null });
      mockSupabase.from.mockReturnValue(chain);

      await getDistinctKitValues('org-1', 'category');

      expect(chain.eq).toHaveBeenCalledWith('organization_id', 'org-1');
      expect(chain.not).toHaveBeenCalledWith('category', 'is', null);
    });

    it('returns empty array when data is null', async () => {
      mockSupabase.from.mockReturnValue(makeChain({ data: null, error: null }));
      const result = await getDistinctKitValues('org-1', 'category');
      expect(result).toEqual([]);
    });

    it('propagates Supabase errors', async () => {
      const dbError = new Error('query failed');
      mockSupabase.from.mockReturnValue(makeChain({ data: null, error: dbError }));

      await expect(getDistinctKitValues('org-1', 'category')).rejects.toThrow('query failed');
    });
  });

  // ─── deleteKit ────────────────────────────────────────────────────────────

  describe('deleteKit', () => {
    it('deletes a kit by id and returns success', async () => {
      const chain = makeChain({ data: null, error: null });
      mockSupabase.from.mockReturnValue(chain);

      const result = await deleteKit('kit-1');

      expect(result).toEqual({ success: true });
      expect(mockSupabase.from).toHaveBeenCalledWith('kits');
      expect(chain.delete).toHaveBeenCalled();
      expect(chain.eq).toHaveBeenCalledWith('id', 'kit-1');
    });

    it('propagates Supabase errors on delete', async () => {
      const dbError = new Error('foreign key constraint violated');
      mockSupabase.from.mockReturnValue(makeChain({ data: null, error: dbError }));

      await expect(deleteKit('kit-1')).rejects.toThrow('foreign key constraint violated');
    });
  });
});
