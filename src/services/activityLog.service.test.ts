import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logActivity, getRecentActivity, getEntityActivity, getGigActivity } from './activityLog.service';
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
  const chainMethods = ['select', 'eq', 'in', 'not', 'gte', 'order', 'limit'];
  chainMethods.forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject);
  return chain;
}

describe('activityLog.service', () => {
  let mockSupabase: any;
  const mockUser = { id: 'user-1' };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = { from: vi.fn(), rpc: vi.fn() };
    (createClient as any).mockReturnValue(mockSupabase);
    (requireAuth as any).mockResolvedValue({ supabase: mockSupabase, user: mockUser });
  });

  describe('logActivity', () => {
    it('calls supabase.rpc with the correct argument shape', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: 'new-id', error: null });

      await logActivity({
        organization_id: 'org-1',
        event_type: 'gig.status_changed',
        entity_type: 'gig',
        entity_id: 'gig-1',
        gig_id: 'gig-1',
        context: {
          context_version: 1,
          actor_display_name: 'Jane Smith',
          actor_org_name: 'Acme',
          from_status: 'Proposed',
          to_status: 'Booked',
        },
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('log_activity', {
        p_organization_id: 'org-1',
        p_event_type: 'gig.status_changed',
        p_entity_type: 'gig',
        p_entity_id: 'gig-1',
        p_gig_id: 'gig-1',
        p_context: expect.objectContaining({ context_version: 1 }),
      });
    });

    it('propagates RPC errors so callers can catch them', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: null, error: new Error('DB error') });

      await expect(
        logActivity({
          organization_id: null,
          event_type: 'asset.status_changed',
          entity_type: 'asset',
          entity_id: 'asset-1',
          context: { context_version: 1, actor_display_name: 'Jane', actor_org_name: 'Acme' },
        })
      ).rejects.toThrow('DB error');
    });

    it('uses null for gig_id when not provided', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: 'new-id', error: null });

      await logActivity({
        organization_id: 'org-1',
        event_type: 'asset.status_changed',
        entity_type: 'asset',
        entity_id: 'asset-1',
        context: { context_version: 1, actor_display_name: 'Jane', actor_org_name: 'Acme' },
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'log_activity',
        expect.objectContaining({ p_gig_id: null })
      );
    });
  });

  describe('getRecentActivity', () => {
    it('does NOT call .in() when eventTypes is not provided', async () => {
      const chain = makeChain({ data: [], error: null });
      mockSupabase.from.mockReturnValue(chain);

      await getRecentActivity();

      expect(chain.in).not.toHaveBeenCalled();
    });

    it('calls .in() with eventTypes when provided', async () => {
      const chain = makeChain({ data: [], error: null });
      mockSupabase.from.mockReturnValue(chain);

      await getRecentActivity({ eventTypes: ['gig.status_changed', 'gig.rescheduled'] });

      expect(chain.in).toHaveBeenCalledWith('event_type', ['gig.status_changed', 'gig.rescheduled']);
    });

    it('returns an empty array when no data', async () => {
      const chain = makeChain({ data: null, error: null });
      mockSupabase.from.mockReturnValue(chain);

      const result = await getRecentActivity();
      expect(result).toEqual([]);
    });
  });

  describe('getGigActivity', () => {
    it('queries activity_log by gig_id', async () => {
      const chain = makeChain({ data: [], error: null });
      mockSupabase.from.mockReturnValue(chain);

      await getGigActivity('gig-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('activity_log');
      expect(chain.eq).toHaveBeenCalledWith('gig_id', 'gig-123');
    });
  });

  describe('getEntityActivity', () => {
    it('queries activity_log by entity_type and entity_id', async () => {
      const chain = makeChain({ data: [], error: null });
      mockSupabase.from.mockReturnValue(chain);

      await getEntityActivity('asset', 'asset-456');

      expect(chain.eq).toHaveBeenCalledWith('entity_type', 'asset');
      expect(chain.eq).toHaveBeenCalledWith('entity_id', 'asset-456');
    });
  });
});
