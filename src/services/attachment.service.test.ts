import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  uploadAttachment,
  deleteAttachment,
  getAttachmentUrl,
} from './attachment.service';
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

describe('attachment.service', () => {
  let mockSupabase: any;
  let mockStorageBucket: any;
  const mockUser = { id: 'user-1' };
  const orgId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

  beforeEach(() => {
    vi.clearAllMocks();

    mockStorageBucket = {
      upload: vi.fn().mockResolvedValue({ data: { path: 'x' }, error: null }),
      remove: vi.fn().mockResolvedValue({ data: null, error: null }),
      createSignedUrl: vi.fn().mockResolvedValue({
        data: { signedUrl: 'https://signed.example/url' },
        error: null,
      }),
    };

    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      storage: {
        from: vi.fn(() => mockStorageBucket),
      },
      then: vi.fn(),
    };

    (createClient as any).mockReturnValue(mockSupabase);
    (requireAuth as any).mockResolvedValue({ supabase: mockSupabase, user: mockUser });
  });

  describe('uploadAttachment', () => {
    it('uploads under the organization-id prefix (storage RLS path convention)', async () => {
      const file = new File(['data'], 'invoice.pdf', { type: 'application/pdf' });
      mockSupabase.then.mockImplementation((onFulfilled: any) =>
        onFulfilled({ data: { id: 'att-1', file_path: `${orgId}/invoice.pdf` }, error: null })
      );

      await uploadAttachment(orgId, file);

      expect(mockSupabase.storage.from).toHaveBeenCalledWith('attachments');
      expect(mockStorageBucket.upload).toHaveBeenCalledTimes(1);
      const [uploadedPath, uploadedFile] = mockStorageBucket.upload.mock.calls[0];
      // The first path segment must be the org id — storage policies scope access by it
      expect(uploadedPath.split('/')[0]).toBe(orgId);
      expect(uploadedPath.split('/').length).toBeGreaterThan(1);
      expect(uploadedFile).toBe(file);
    });

    it('records the same org-prefixed path in the attachments table', async () => {
      const file = new File(['data'], 'receipt.png', { type: 'image/png' });
      mockSupabase.then.mockImplementation((onFulfilled: any) =>
        onFulfilled({ data: { id: 'att-1' }, error: null })
      );

      await uploadAttachment(orgId, file, 'receipt.png');

      expect(mockStorageBucket.upload).toHaveBeenCalledWith(`${orgId}/receipt.png`, file);
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: orgId,
          file_path: `${orgId}/receipt.png`,
          file_name: 'receipt.png',
          created_by: mockUser.id,
        })
      );
    });

    it('removes the uploaded file if the database insert fails', async () => {
      const file = new File(['data'], 'invoice.pdf', { type: 'application/pdf' });
      mockSupabase.then.mockImplementation((onFulfilled: any) =>
        onFulfilled({ data: null, error: new Error('insert failed') })
      );

      await expect(uploadAttachment(orgId, file, 'invoice.pdf')).rejects.toThrow('insert failed');

      expect(mockStorageBucket.remove).toHaveBeenCalledWith([`${orgId}/invoice.pdf`]);
    });
  });

  describe('getAttachmentUrl', () => {
    it('returns a signed URL for the stored file path', async () => {
      const filePath = `${orgId}/invoice.pdf`;

      const url = await getAttachmentUrl(filePath);

      expect(mockSupabase.storage.from).toHaveBeenCalledWith('attachments');
      expect(mockStorageBucket.createSignedUrl).toHaveBeenCalledWith(filePath, 3600);
      expect(url).toBe('https://signed.example/url');
    });

    it('throws when signed URL creation is denied', async () => {
      mockStorageBucket.createSignedUrl.mockResolvedValue({
        data: null,
        error: new Error('Object not found'),
      });

      await expect(getAttachmentUrl(`${orgId}/missing.pdf`)).rejects.toThrow('Object not found');
    });
  });

  describe('deleteAttachment', () => {
    it('deletes the storage file and the database record', async () => {
      const filePath = `${orgId}/invoice.pdf`;
      mockSupabase.then.mockImplementation((onFulfilled: any) =>
        onFulfilled({ data: { id: 'att-1', file_path: filePath }, error: null })
      );

      const result = await deleteAttachment('att-1');

      expect(mockStorageBucket.remove).toHaveBeenCalledWith([filePath]);
      expect(mockSupabase.delete).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });
  });
});
