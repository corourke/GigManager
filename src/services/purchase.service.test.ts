import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPurchases, createPurchase, createPurchaseTransaction, scanInvoice, importPurchases, reclassifyExpenseAsAsset, deletePurchase, shouldPromptForLedgerEntry, computeAssetFieldChanges } from './purchase.service';
import { createClient } from '../utils/supabase/client';
import { requireAuth } from '../utils/supabase/auth-utils';

// Mock Supabase client
vi.mock('../utils/supabase/client', () => ({
  createClient: vi.fn(),
}));

// Mock Auth utils
vi.mock('../utils/supabase/auth-utils', () => ({
  requireAuth: vi.fn(),
}));

describe('purchase.service', () => {
  let mockSupabase: any;
  const mockUser = { id: 'user-1' };

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      rpc: vi.fn(),
      functions: {
        invoke: vi.fn(),
      },
      then: vi.fn(),
    };

    (createClient as any).mockReturnValue(mockSupabase);
    (requireAuth as any).mockResolvedValue({ supabase: mockSupabase, user: mockUser });
  });

  describe('getPurchases', () => {
    it('should fetch purchases for an organization', async () => {
      const mockData = [{ id: 'p1', vendor: 'Amazon' }];
      mockSupabase.then.mockImplementation((onFulfilled: any) => onFulfilled({ data: mockData, error: null }));

      const result = await getPurchases('org-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('purchases');
      expect(mockSupabase.eq).toHaveBeenCalledWith('organization_id', 'org-1');
      expect(result).toEqual(mockData);
    });

    it('should apply filters correctly', async () => {
      mockSupabase.then.mockImplementation((onFulfilled: any) => onFulfilled({ data: [], error: null }));

      await getPurchases('org-1', { gig_id: 'gig-1', vendor: 'test' });

      expect(mockSupabase.eq).toHaveBeenCalledWith('gig_id', 'gig-1');
      expect(mockSupabase.ilike).toHaveBeenCalledWith('vendor', '%test%');
    });
  });

  describe('createPurchase', () => {
    it('should insert a new purchase', async () => {
      const purchaseData = { vendor: 'Apple', organization_id: 'org-1' };
      const mockResult = { id: 'p1', ...purchaseData };
      mockSupabase.then.mockImplementation((onFulfilled: any) => onFulfilled({ data: mockResult, error: null }));

      const result = await createPurchase(purchaseData);

      expect(mockSupabase.insert).toHaveBeenCalledWith(purchaseData);
      expect(result).toEqual(mockResult);
    });
  });

  describe('createPurchaseTransaction', () => {
    it('should call the atomic RPC', async () => {
      const header = { organization_id: 'org-1', vendor: 'Sweetwater' };
      const items = [{ description: 'Cable' }];
      const assets = [{ manufacturer_model: 'SM58' }];
      
      mockSupabase.rpc.mockResolvedValue({ data: { id: 'h1' }, error: null });

      const result = await createPurchaseTransaction(header, items, assets);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('create_purchase_transaction_v1', {
        p_header: header,
        p_items: items,
        p_assets: assets
      });
      expect(result?.id).toBe('h1');
    });
  });

  describe('scanInvoice', () => {
    it('should invoke the ai-scan edge function with the file and organization id', async () => {
      const mockFile = new File(['test'], 'invoice.pdf', { type: 'application/pdf' });
      const mockResult = { vendor: 'Amazon', items: [] };
      mockSupabase.functions.invoke.mockResolvedValue({ data: mockResult, error: null });

      const result = await scanInvoice(mockFile, 'org-1');

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('ai-scan', expect.any(Object));
      const body = mockSupabase.functions.invoke.mock.calls[0][1].body as FormData;
      // The edge function requires organization_id to enforce org membership
      expect(body.get('organization_id')).toBe('org-1');
      expect(body.get('file')).toBe(mockFile);
      expect(result).toEqual(mockResult);
    });
  });

  describe('reclassifyExpenseAsAsset', () => {
    it('should call reclassify_expense_as_asset RPC and return asset_id', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: { asset_id: 'asset-1' }, error: null });

      const result = await reclassifyExpenseAsAsset('item-1');

      expect(mockSupabase.rpc).toHaveBeenCalledWith('reclassify_expense_as_asset', { p_purchase_item_id: 'item-1' });
      expect(result).toEqual({ asset_id: 'asset-1' });
    });

    it('should throw when RPC returns an error', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'DB error' } });

      await expect(reclassifyExpenseAsAsset('item-1')).rejects.toThrow();
    });
  });

  describe('importPurchases', () => {
    it('should group rows by header and call createPurchaseTransaction', async () => {
      const rows = [
        {
          data: {
            source: '0',
            acquisition_date: '2024-03-19',
            vendor: 'Amazon',
            total_inv_amount: '100.00',
            category: 'Electronics'
          }
        },
        {
          data: {
            source: '1',
            acquisition_date: '2024-03-19',
            vendor: 'Amazon',
            manufacturer_model: 'Cable',
            item_price: '50.00',
            quantity: '2',
            category: 'Electronics'
          }
        }
      ];

      mockSupabase.rpc.mockResolvedValue({ data: { id: 'h1' }, error: null });

      const result = await importPurchases('org-1', rows);

      expect(mockSupabase.rpc).toHaveBeenCalledTimes(1);
      expect(result.successCount).toBe(3);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('deletePurchase', () => {
    it('deletes a purchase and returns success', async () => {
      mockSupabase.then.mockImplementation((onFulfilled: any) => onFulfilled({ data: [{ id: 'p1' }], error: null }));
      const result = await deletePurchase('p1');
      expect(result).toEqual({ success: true });
    });

    it('throws when no row was deleted (RLS denied)', async () => {
      mockSupabase.then.mockImplementation((onFulfilled: any) => onFulfilled({ data: [], error: null }));
      await expect(deletePurchase('p1')).rejects.toThrow(/permission|not found/i);
    });
  });

  describe('shouldPromptForLedgerEntry', () => {
    it('returns true for expense item being assigned a gig for the first time', () => {
      expect(shouldPromptForLedgerEntry('item', null, 'gig-1')).toBe(true);
    });

    it('returns false for asset lines', () => {
      expect(shouldPromptForLedgerEntry('asset', null, 'gig-1')).toBe(false);
    });

    it('returns false for re-assignment (already had a gig)', () => {
      expect(shouldPromptForLedgerEntry('item', 'gig-old', 'gig-new')).toBe(false);
    });

    it('returns false when clearing gig (newGigId is null)', () => {
      expect(shouldPromptForLedgerEntry('item', null, null)).toBe(false);
    });

    it('returns false for header row type', () => {
      expect(shouldPromptForLedgerEntry('header', null, 'gig-1')).toBe(false);
    });
  });

  describe('computeAssetFieldChanges', () => {
    const asset = {
      manufacturer_model: 'SM58',
      description: 'SM58',
      category: 'Audio',
      sub_category: 'Microphones',
      quantity: 1,
      item_price: 100,
      item_cost: 105,
      vendor: 'Sweetwater',
      acquisition_date: '2024-01-01',
    };

    it('returns no changes when the line matches the asset', () => {
      const changes = computeAssetFieldChanges(
        { description: 'SM58', category: 'Audio', sub_category: 'Microphones', quantity: 1, item_price: 100, item_cost: 105, vendor: 'Sweetwater', purchase_date: '2024-01-01' },
        asset
      );
      expect(changes).toEqual([]);
    });

    it('detects a quantity change (the bundle-of-2 case)', () => {
      const changes = computeAssetFieldChanges({ quantity: 2 }, asset);
      expect(changes).toEqual([{ field: 'quantity', label: 'Quantity', from: 1, to: 2 }]);
    });

    it('maps description to both manufacturer_model and description', () => {
      const changes = computeAssetFieldChanges({ description: 'SM58 Beta' }, asset);
      expect(changes.map(c => c.field)).toEqual(['manufacturer_model', 'description']);
      expect(changes.every(c => c.to === 'SM58 Beta')).toBe(true);
    });

    it('maps purchase_date to acquisition_date', () => {
      const changes = computeAssetFieldChanges({ purchase_date: '2024-06-01' }, asset);
      expect(changes).toEqual([{ field: 'acquisition_date', label: 'Acquisition Date', from: '2024-01-01', to: '2024-06-01' }]);
    });

    it('treats empty string and null as equal (no spurious change)', () => {
      const changes = computeAssetFieldChanges({ category: '' }, { ...asset, category: null });
      expect(changes).toEqual([]);
    });

    it('ignores fields not present on the line snapshot', () => {
      const changes = computeAssetFieldChanges({ item_price: 100 }, asset);
      expect(changes).toEqual([]);
    });
  });
});
