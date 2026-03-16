import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAsset, createAsset, updateAsset, getAssets } from './asset.service';
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

describe('asset.service', () => {
  let mockSupabase: any;
  const mockUser = { id: 'user-1' };

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      then: vi.fn(),
    };

    (createClient as any).mockReturnValue(mockSupabase);
    (requireAuth as any).mockResolvedValue({ supabase: mockSupabase, user: mockUser });
  });

  describe('getAssets', () => {
    it('should fetch assets for an organization', async () => {
      const mockData = [{ id: 'a1', manufacturer_model: 'Model A' }];
      mockSupabase.then.mockImplementation((onFulfilled: any) => onFulfilled({ data: mockData, error: null }));

      const result = await getAssets('org-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('assets');
      expect(mockSupabase.eq).toHaveBeenCalledWith('organization_id', 'org-1');
      expect(result).toEqual(mockData);
    });
  });

  describe('getAsset', () => {
    it('should fetch a single asset', async () => {
      const mockData = { id: 'a1', manufacturer_model: 'Model A' };
      mockSupabase.then.mockImplementation((onFulfilled: any) => onFulfilled({ data: mockData, error: null }));

      const result = await getAsset('a1');

      expect(mockSupabase.from).toHaveBeenCalledWith('assets');
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'a1');
      expect(result).toEqual(mockData);
    });
  });

  describe('createAsset', () => {
    it('should insert a new asset', async () => {
      const assetData = { manufacturer_model: 'Model A', organization_id: 'org-1' };
      const mockResult = { id: 'a1', ...assetData };
      mockSupabase.then.mockImplementation((onFulfilled: any) => onFulfilled({ data: mockResult, error: null }));

      const result = await createAsset(assetData);

      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining(assetData));
      expect(result).toEqual(mockResult);
    });
  });

  describe('updateAsset', () => {
    it('should update an existing asset', async () => {
      const updates = { manufacturer_model: 'Model B' };
      const mockResult = { id: 'a1', ...updates };
      mockSupabase.then.mockImplementation((onFulfilled: any) => onFulfilled({ data: mockResult, error: null }));

      const result = await updateAsset('a1', updates);

      expect(mockSupabase.from).toHaveBeenCalledWith('assets');
      expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining(updates));
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'a1');
      expect(result).toEqual(mockResult);
    });
  });
});
