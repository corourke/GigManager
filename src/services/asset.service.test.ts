import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAssets, getDistinctAssetValues, getAsset, createAsset, updateAsset } from './asset.service';
import { createClient } from '../utils/supabase/client';
import { requireAuth } from '../utils/supabase/auth-utils';

vi.mock('../utils/supabase/client', () => ({
  createClient: vi.fn(),
}));

vi.mock('../utils/supabase/auth-utils', () => ({
  requireAuth: vi.fn(),
}));

function makeChain(result: { data: any; error: any }) {
  const chain: any = {};
  const chainMethods = [
    'select', 'insert', 'update', 'delete',
    'eq', 'neq', 'in', 'not', 'is', 'or',
    'order', 'limit', 'ilike',
  ];
  chainMethods.forEach(m => { chain[m] = vi.fn().mockReturnValue(chain); });
  chain.single = vi.fn().mockResolvedValue(result);
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  chain.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject);
  return chain;
}

describe('asset.service', () => {
  let mockSupabase: any;
  const mockUser = { id: 'user-1' };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = { from: vi.fn() };
    (createClient as any).mockReturnValue(mockSupabase);
    (requireAuth as any).mockResolvedValue({ supabase: mockSupabase, user: mockUser });
  });

  describe('getAssets', () => {
    it('returns assets for an organization with no filters', async () => {
      const mockAssets = [
        { id: 'asset-1', manufacturer_model: 'Shure SM58', category: 'Microphone' },
        { id: 'asset-2', manufacturer_model: 'DI Box', category: 'Signal Processing' },
      ];
      const chain = makeChain({ data: mockAssets, error: null });
      mockSupabase.from.mockReturnValue(chain);

      const result = await getAssets('org-1');

      expect(result).toHaveLength(2);
      expect(mockSupabase.from).toHaveBeenCalledWith('assets');
      expect(chain.eq).toHaveBeenCalledWith('organization_id', 'org-1');
    });

    it('returns empty array when no assets exist', async () => {
      mockSupabase.from.mockReturnValue(makeChain({ data: null, error: null }));
      const result = await getAssets('org-1');
      expect(result).toEqual([]);
    });

    it('applies category filter when provided', async () => {
      const chain = makeChain({ data: [], error: null });
      mockSupabase.from.mockReturnValue(chain);

      await getAssets('org-1', { category: 'Microphone' });

      expect(chain.eq).toHaveBeenCalledWith('category', 'Microphone');
    });

    it('applies sub_category filter when provided', async () => {
      const chain = makeChain({ data: [], error: null });
      mockSupabase.from.mockReturnValue(chain);

      await getAssets('org-1', { sub_category: 'Condenser' });

      expect(chain.eq).toHaveBeenCalledWith('sub_category', 'Condenser');
    });

    it('applies insurance_added filter when true', async () => {
      const chain = makeChain({ data: [], error: null });
      mockSupabase.from.mockReturnValue(chain);

      await getAssets('org-1', { insurance_added: true });

      expect(chain.eq).toHaveBeenCalledWith('insurance_policy_added', true);
    });

    it('applies purchase_id filter when provided', async () => {
      const chain = makeChain({ data: [], error: null });
      mockSupabase.from.mockReturnValue(chain);

      await getAssets('org-1', { purchase_id: 'purchase-1' });

      expect(chain.eq).toHaveBeenCalledWith('purchase_id', 'purchase-1');
    });

    it('applies search filter using sanitized LIKE pattern via or()', async () => {
      const chain = makeChain({ data: [], error: null });
      mockSupabase.from.mockReturnValue(chain);

      await getAssets('org-1', { search: 'SM58' });

      expect(chain.or).toHaveBeenCalledWith(
        expect.stringContaining('SM58')
      );
    });

    it('sanitizes LIKE metacharacters in the search term', async () => {
      const chain = makeChain({ data: [], error: null });
      mockSupabase.from.mockReturnValue(chain);

      await getAssets('org-1', { search: '50%' });

      expect(chain.or).toHaveBeenCalledWith(expect.stringContaining('50\\%'));
    });

    it('propagates Supabase errors', async () => {
      const dbError = new Error('permission denied');
      mockSupabase.from.mockReturnValue(makeChain({ data: null, error: dbError }));

      await expect(getAssets('org-1')).rejects.toThrow('permission denied');
    });
  });

  describe('getDistinctAssetValues', () => {
    it('returns sorted unique category values', async () => {
      const rawData = [
        { category: 'Microphone' },
        { category: 'Amplifier' },
        { category: 'Microphone' },
        { category: '' },
      ];
      const chain = makeChain({ data: rawData, error: null });
      mockSupabase.from.mockReturnValue(chain);

      const result = await getDistinctAssetValues('org-1', 'category');

      expect(result).toEqual(['Amplifier', 'Microphone']);
    });

    it('filters by category when fetching sub_category values', async () => {
      const chain = makeChain({ data: [], error: null });
      mockSupabase.from.mockReturnValue(chain);

      await getDistinctAssetValues('org-1', 'sub_category', 'Microphone');

      expect(chain.eq).toHaveBeenCalledWith('category', 'Microphone');
    });

    it('does not apply category filter for non sub_category fields', async () => {
      const chain = makeChain({ data: [], error: null });
      mockSupabase.from.mockReturnValue(chain);

      await getDistinctAssetValues('org-1', 'vendor', 'Microphone');

      const eqCalls = chain.eq.mock.calls;
      const categoryFilterApplied = eqCalls.some(
        (call: any[]) => call[0] === 'category' && call[1] === 'Microphone'
      );
      expect(categoryFilterApplied).toBe(false);
    });

    it('returns empty array when no data', async () => {
      mockSupabase.from.mockReturnValue(makeChain({ data: null, error: null }));
      const result = await getDistinctAssetValues('org-1', 'category');
      expect(result).toEqual([]);
    });

    it('propagates Supabase errors', async () => {
      const dbError = new Error('column does not exist');
      mockSupabase.from.mockReturnValue(makeChain({ data: null, error: dbError }));

      await expect(getDistinctAssetValues('org-1', 'category')).rejects.toThrow(
        'column does not exist'
      );
    });
  });

  describe('getAsset', () => {
    it('returns a single asset by id', async () => {
      const mockAsset = { id: 'asset-1', manufacturer_model: 'Shure SM58' };
      const chain = makeChain({ data: mockAsset, error: null });
      mockSupabase.from.mockReturnValue(chain);

      const result = await getAsset('asset-1');

      expect(result).toEqual(mockAsset);
      expect(chain.eq).toHaveBeenCalledWith('id', 'asset-1');
      expect(chain.single).toHaveBeenCalled();
    });

    it('propagates errors when the asset is not found', async () => {
      const dbError = { code: 'PGRST116', message: 'Row not found' };
      mockSupabase.from.mockReturnValue(makeChain({ data: null, error: dbError }));

      await expect(getAsset('missing-id')).rejects.toMatchObject({ message: 'Row not found' });
    });
  });

  describe('createAsset', () => {
    it('should insert a new asset', async () => {
      const assetData = { manufacturer_model: 'Model A', organization_id: 'org-1' };
      const mockResult = { id: 'a1', ...assetData };
      const chain = makeChain({ data: mockResult, error: null });
      mockSupabase.from.mockReturnValue(chain);

      const result = await createAsset(assetData);

      expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining(assetData));
      expect(result).toEqual(mockResult);
    });
  });

  describe('updateAsset', () => {
    it('should update an existing asset', async () => {
      const updates = { manufacturer_model: 'Model B' };
      const mockResult = { id: 'a1', ...updates };
      const chain = makeChain({ data: mockResult, error: null });
      mockSupabase.from.mockReturnValue(chain);

      const result = await updateAsset('a1', updates);

      expect(mockSupabase.from).toHaveBeenCalledWith('assets');
      expect(chain.update).toHaveBeenCalledWith(expect.objectContaining(updates));
      expect(chain.eq).toHaveBeenCalledWith('id', 'a1');
      expect(result).toEqual(mockResult);
    });
  });
});
