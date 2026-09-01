import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getPurchases,
  createPurchase,
  createPurchaseTransaction,
  scanInvoice,
  importPurchases,
  reclassifyExpenseAsAsset,
  deletePurchase,
  shouldPromptForLedgerEntry,
  computeAssetFieldChanges,
  purchaseLineLedgerAmount,
  buildPurchaseLineLedgerPayload,
  createLedgerEntryForPurchaseLine,
  reconcileLedgerForLineGigChange,
  removeLedgerEntriesForPurchaseLine,
  assignGigToPurchaseChildren,
} from './purchase.service';
import { createClient } from '../utils/supabase/client';
import { requireAuth } from '../utils/supabase/auth-utils';
import {
  getGigFinancialsByPurchaseId,
  createGigFinancial,
  updateGigFinancial,
  deleteGigFinancial,
} from './gigFinancial.service';

// Mock Supabase client
vi.mock('../utils/supabase/client', () => ({
  createClient: vi.fn(),
}));

// Mock Auth utils
vi.mock('../utils/supabase/auth-utils', () => ({
  requireAuth: vi.fn(),
}));

// Mock the gig-financial primitives the ledger-lifecycle helpers delegate to.
vi.mock('./gigFinancial.service', () => ({
  getGigFinancialsByPurchaseId: vi.fn(),
  createGigFinancial: vi.fn(),
  updateGigFinancial: vi.fn(),
  deleteGigFinancial: vi.fn(),
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

describe('purchase → gig ledger lifecycle', () => {
  const mockedGetByPurchase = getGigFinancialsByPurchaseId as unknown as ReturnType<typeof vi.fn>;
  const mockedCreate = createGigFinancial as unknown as ReturnType<typeof vi.fn>;
  const mockedUpdate = updateGigFinancial as unknown as ReturnType<typeof vi.fn>;
  const mockedDelete = deleteGigFinancial as unknown as ReturnType<typeof vi.fn>;

  const line = (over: Partial<any> = {}) => ({
    id: 'line-1',
    row_type: 'item',
    line_amount: 200,
    item_price: null,
    quantity: null,
    purchase_date: '2026-02-01',
    description: 'Van rental',
    vendor: 'U-Haul',
    category: 'Travel',
    ...over,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('purchaseLineLedgerAmount', () => {
    it('uses line_amount when present', () => {
      expect(purchaseLineLedgerAmount({ line_amount: 200, item_price: 5, quantity: 3 })).toBe(200);
    });
    it('falls back to item_price × quantity', () => {
      expect(purchaseLineLedgerAmount({ line_amount: null, item_price: 5, quantity: 3 })).toBe(15);
    });
    it('treats a missing quantity as 1', () => {
      expect(purchaseLineLedgerAmount({ line_amount: null, item_price: 7, quantity: null })).toBe(7);
    });
  });

  describe('buildPurchaseLineLedgerPayload', () => {
    it('builds an Expense Incurred payload linked to the purchase line', () => {
      const payload = buildPurchaseLineLedgerPayload(line(), 'gig-1', 'org-1');
      expect(payload).toMatchObject({
        gig_id: 'gig-1',
        organization_id: 'org-1',
        date: '2026-02-01',
        amount: 200,
        type: 'Expense Incurred',
        description: 'Van rental',
        purchase_id: 'line-1',
      });
      expect(payload.paid_at).toBeTruthy();
    });
  });

  describe('createLedgerEntryForPurchaseLine — dedup guard', () => {
    it('creates a ledger row when the line has none', async () => {
      mockedGetByPurchase.mockResolvedValue([]);
      mockedCreate.mockResolvedValue({ id: 'fin-1', gig_id: 'gig-1', purchase_id: 'line-1', amount: 200 });

      const res = await createLedgerEntryForPurchaseLine(line(), 'gig-1', 'org-1');

      expect(mockedCreate).toHaveBeenCalledTimes(1);
      expect(res).toEqual({ created: true, financial: { id: 'fin-1', gig_id: 'gig-1', purchase_id: 'line-1', amount: 200 } });
    });

    it('does NOT create a second row when one already exists (double-count guard)', async () => {
      mockedGetByPurchase.mockResolvedValue([{ id: 'fin-1', gig_id: 'gig-1', purchase_id: 'line-1', amount: 200 }]);

      const res = await createLedgerEntryForPurchaseLine(line(), 'gig-1', 'org-1');

      expect(mockedCreate).not.toHaveBeenCalled();
      expect(res.created).toBe(false);
      expect(res.financial.id).toBe('fin-1');
    });

    it('realigns an existing row that sits on a different gig instead of creating a new one', async () => {
      mockedGetByPurchase.mockResolvedValue([{ id: 'fin-1', gig_id: 'gig-OLD', purchase_id: 'line-1', amount: 200 }]);
      mockedUpdate.mockResolvedValue({ id: 'fin-1', gig_id: 'gig-1', purchase_id: 'line-1', amount: 200 });

      const res = await createLedgerEntryForPurchaseLine(line(), 'gig-1', 'org-1');

      expect(mockedCreate).not.toHaveBeenCalled();
      expect(mockedUpdate).toHaveBeenCalledWith('fin-1', { gig_id: 'gig-1' });
      expect(res.created).toBe(false);
      expect(res.financial.gig_id).toBe('gig-1');
    });
  });

  describe('reconcileLedgerForLineGigChange', () => {
    it('is a noop for non-item rows', async () => {
      const res = await reconcileLedgerForLineGigChange({
        item: line({ row_type: 'asset' }), previousGigId: null, newGigId: 'gig-1', organizationId: 'org-1',
      });
      expect(res).toEqual({ action: 'noop' });
      expect(mockedGetByPurchase).not.toHaveBeenCalled();
    });

    it('reports needs-entry when a first gig link has no ledger row yet', async () => {
      mockedGetByPurchase.mockResolvedValue([]);
      const res = await reconcileLedgerForLineGigChange({
        item: line(), previousGigId: null, newGigId: 'gig-1', organizationId: 'org-1',
      });
      expect(res).toEqual({ action: 'needs-entry', gigId: 'gig-1' });
    });

    it('reports exists (no duplicate) when a ledger row already covers the target gig', async () => {
      mockedGetByPurchase.mockResolvedValue([{ id: 'fin-1', gig_id: 'gig-1', amount: 200 }]);
      const res = await reconcileLedgerForLineGigChange({
        item: line(), previousGigId: null, newGigId: 'gig-1', organizationId: 'org-1',
      });
      expect(res).toEqual({ action: 'exists', financialIds: ['fin-1'] });
      expect(mockedCreate).not.toHaveBeenCalled();
    });

    it('MOVES the stranded ledger row when a line is reassigned from gig A to gig B', async () => {
      mockedGetByPurchase.mockResolvedValue([{ id: 'fin-1', gig_id: 'gig-A', amount: 200 }]);
      mockedUpdate.mockResolvedValue({ id: 'fin-1', gig_id: 'gig-B' });

      const res = await reconcileLedgerForLineGigChange({
        item: line(), previousGigId: 'gig-A', newGigId: 'gig-B', organizationId: 'org-1',
      });

      expect(mockedUpdate).toHaveBeenCalledWith('fin-1', { gig_id: 'gig-B' });
      expect(res).toEqual({ action: 'moved', financialIds: ['fin-1'], toGigId: 'gig-B' });
    });

    it('moves every stranded row when the historical double-count bug left more than one', async () => {
      mockedGetByPurchase.mockResolvedValue([
        { id: 'fin-1', gig_id: 'gig-A', amount: 200 },
        { id: 'fin-2', gig_id: 'gig-A', amount: 200 },
      ]);
      mockedUpdate.mockResolvedValue({});

      const res = await reconcileLedgerForLineGigChange({
        item: line(), previousGigId: 'gig-A', newGigId: 'gig-B', organizationId: 'org-1',
      });

      expect(mockedUpdate).toHaveBeenCalledTimes(2);
      expect(res).toMatchObject({ action: 'moved', toGigId: 'gig-B' });
      expect((res as any).financialIds).toEqual(['fin-1', 'fin-2']);
    });

    it('asks the caller to confirm removal when a line is cleared of its gig', async () => {
      mockedGetByPurchase.mockResolvedValue([
        { id: 'fin-1', gig_id: 'gig-A', amount: 120 },
        { id: 'fin-2', gig_id: 'gig-A', amount: 80 },
      ]);

      const res = await reconcileLedgerForLineGigChange({
        item: line(), previousGigId: 'gig-A', newGigId: null, organizationId: 'org-1',
      });

      expect(res).toEqual({
        action: 'confirm-remove',
        financialIds: ['fin-1', 'fin-2'],
        fromGigId: 'gig-A',
        amount: 200,
      });
      expect(mockedDelete).not.toHaveBeenCalled();
    });

    it('is a noop when clearing a line that never had a ledger row', async () => {
      mockedGetByPurchase.mockResolvedValue([]);
      const res = await reconcileLedgerForLineGigChange({
        item: line(), previousGigId: 'gig-A', newGigId: null, organizationId: 'org-1',
      });
      expect(res).toEqual({ action: 'noop' });
    });
  });

  describe('removeLedgerEntriesForPurchaseLine', () => {
    it('deletes each linked ledger entry', async () => {
      mockedDelete.mockResolvedValue({ success: true });
      const res = await removeLedgerEntriesForPurchaseLine(['fin-1', 'fin-2']);
      expect(mockedDelete).toHaveBeenCalledTimes(2);
      expect(mockedDelete).toHaveBeenNthCalledWith(1, 'fin-1');
      expect(mockedDelete).toHaveBeenNthCalledWith(2, 'fin-2');
      expect(res).toEqual({ removed: 2 });
    });
  });
});

describe('assignGigToPurchaseChildren (header → gig cascade)', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      then: vi.fn(),
    };
    (createClient as any).mockReturnValue(mockSupabase);
    (requireAuth as any).mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });
  });

  it('sets the header gig, cascades to unlinked lines, and skips lines already on another gig', async () => {
    const children = [
      { id: 'c1', gig_id: null, row_type: 'item' },
      { id: 'c2', gig_id: null, row_type: 'asset' },
      { id: 'c3', gig_id: 'gig-OTHER', row_type: 'item' }, // must not be stolen
    ];
    // first await → children query; subsequent awaits → updatePurchase results
    mockSupabase.then.mockImplementation((onFulfilled: any) => onFulfilled({ data: children, error: null }));

    const res = await assignGigToPurchaseChildren('header-1', 'gig-1', 'org-1');

    // header + c1 + c2 updated; c3 left alone
    expect(res.updated).toBe(3);
    expect(res.failed).toBe(0);
    expect(res.newlyLinkedItemIds).toEqual(['c1']); // only row_type 'item' among the newly linked
  });

  it('reports failures without throwing', async () => {
    const children = [{ id: 'c1', gig_id: null, row_type: 'item' }];
    let call = 0;
    mockSupabase.then.mockImplementation((onFulfilled: any, onRejected: any) => {
      call += 1;
      if (call === 1) return onFulfilled({ data: children, error: null }); // children query
      return Promise.reject(new Error('RLS')).catch(onRejected); // both updatePurchase calls fail
    });

    const res = await assignGigToPurchaseChildren('header-1', 'gig-1', 'org-1');
    expect(res.failed).toBeGreaterThan(0);
  });
});
