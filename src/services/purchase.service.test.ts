import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPurchases, createPurchase, createPurchaseTransaction, scanInvoice, importPurchases } from './purchase.service';
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
      expect(result.id).toBe('h1');
    });
  });

  describe('scanInvoice', () => {
    it('should invoke the ai-scan edge function', async () => {
      const mockFile = new File(['test'], 'invoice.pdf', { type: 'application/pdf' });
      const mockResult = { vendor: 'Amazon', items: [] };
      mockSupabase.functions.invoke.mockResolvedValue({ data: mockResult, error: null });

      const result = await scanInvoice(mockFile);

      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('ai-scan', expect.any(Object));
      expect(result).toEqual(mockResult);
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
});
