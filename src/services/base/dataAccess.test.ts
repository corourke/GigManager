import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createClient } from '../../utils/supabase/client';
import { requireAuth } from '../../utils/supabase/auth-utils';
import {
  listRecords,
  getRecord,
  createRecord,
  updateRecord,
  deleteRecord,
  getCurrentUser,
  getSession,
} from './dataAccess';

vi.mock('../../utils/supabase/client', () => ({
  createClient: vi.fn(),
}));

vi.mock('../../utils/supabase/auth-utils', () => ({
  requireAuth: vi.fn(),
}));

function makeChain(result: { data: any; error: any }) {
  const chain: any = {};
  const chainMethods = ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'in', 'ilike', 'gt', 'gte', 'lt', 'lte', 'is', 'order', 'limit'];
  chainMethods.forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.single = vi.fn().mockResolvedValue(result);
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  chain.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject);
  return chain;
}

describe('dataAccess', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = { from: vi.fn() };
    (createClient as any).mockReturnValue(mockSupabase);
  });

  describe('listRecords', () => {
    it('selects everything with no options', async () => {
      const chain = makeChain({ data: [{ id: '1' }], error: null });
      mockSupabase.from.mockReturnValue(chain);

      const result = await listRecords('organizations');

      expect(mockSupabase.from).toHaveBeenCalledWith('organizations');
      expect(chain.select).toHaveBeenCalledWith('*');
      expect(result).toEqual([{ id: '1' }]);
    });

    it('returns [] rather than null when the query has no rows', async () => {
      mockSupabase.from.mockReturnValue(makeChain({ data: null, error: null }));
      expect(await listRecords('organizations')).toEqual([]);
    });

    it('applies each typed filter with its operator', async () => {
      const chain = makeChain({ data: [], error: null });
      mockSupabase.from.mockReturnValue(chain);

      await listRecords('organizations', {
        select: 'id, name',
        filters: [
          { column: 'organization_id', operator: 'eq', value: 'org-1' },
          { column: 'status', operator: 'in', value: ['active', 'pending'] },
        ],
        order: { column: 'name', ascending: false },
        limit: 10,
      });

      expect(chain.select).toHaveBeenCalledWith('id, name');
      expect(chain.eq).toHaveBeenCalledWith('organization_id', 'org-1');
      expect(chain.in).toHaveBeenCalledWith('status', ['active', 'pending']);
      expect(chain.order).toHaveBeenCalledWith('name', { ascending: false });
      expect(chain.limit).toHaveBeenCalledWith(10);
    });

    it('normalizes a thrown Supabase error through handleApiError', async () => {
      mockSupabase.from.mockReturnValue(makeChain({ data: null, error: { message: 'boom' } }));
      await expect(listRecords('organizations')).rejects.toThrow('boom');
    });
  });

  describe('getRecord', () => {
    it('fetches a single row by id', async () => {
      const chain = makeChain({ data: { id: '1', name: 'Widget' }, error: null });
      mockSupabase.from.mockReturnValue(chain);

      const result = await getRecord('organizations', '1');

      expect(chain.eq).toHaveBeenCalledWith('id', '1');
      expect(result).toEqual({ id: '1', name: 'Widget' });
    });

    it('returns null when nothing matches', async () => {
      mockSupabase.from.mockReturnValue(makeChain({ data: null, error: null }));
      expect(await getRecord('organizations', 'missing')).toBeNull();
    });
  });

  describe('createRecord', () => {
    it('inserts and returns the created row', async () => {
      const chain = makeChain({ data: { id: '1' }, error: null });
      mockSupabase.from.mockReturnValue(chain);

      const result = await createRecord('organizations', { name: 'New' });

      expect(chain.insert).toHaveBeenCalledWith({ name: 'New' });
      expect(result).toEqual({ id: '1' });
    });
  });

  describe('updateRecord', () => {
    it('updates by id and returns the updated row', async () => {
      const chain = makeChain({ data: { id: '1', name: 'Updated' }, error: null });
      mockSupabase.from.mockReturnValue(chain);

      const result = await updateRecord('organizations', '1', { name: 'Updated' });

      expect(chain.update).toHaveBeenCalledWith({ name: 'Updated' });
      expect(chain.eq).toHaveBeenCalledWith('id', '1');
      expect(result).toEqual({ id: '1', name: 'Updated' });
    });
  });

  describe('deleteRecord', () => {
    it('deletes by id', async () => {
      const chain = makeChain({ data: null, error: null });
      mockSupabase.from.mockReturnValue(chain);

      await deleteRecord('organizations', '1');

      expect(chain.delete).toHaveBeenCalled();
      expect(chain.eq).toHaveBeenCalledWith('id', '1');
    });

    it('throws on a delete error', async () => {
      mockSupabase.from.mockReturnValue(makeChain({ data: null, error: { message: 'nope' } }));
      await expect(deleteRecord('organizations', '1')).rejects.toThrow('nope');
    });
  });

  describe('getCurrentUser / getSession', () => {
    it('resolve through the existing requireAuth() path', async () => {
      const user = { id: 'user-1' };
      const session = { user, access_token: 'tok' };
      (requireAuth as any).mockResolvedValue({ supabase: mockSupabase, session, user });

      expect(await getCurrentUser()).toEqual(user);
      expect(await getSession()).toEqual(session);
    });

    it('propagates the not-authenticated error', async () => {
      (requireAuth as any).mockRejectedValue(new Error('Not authenticated'));
      await expect(getCurrentUser()).rejects.toThrow('Not authenticated');
    });
  });
});
