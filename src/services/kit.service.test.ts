import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getKits, getKit, getDistinctKitValues, deleteKit, createKit, updateKit, duplicateKit, countInventoryItems, maxTreeDepth, getKitsThatWouldCycle, KitComponentTreeNode } from './kit.service';
import { createClient } from '../utils/supabase/client';
import { requireAuth } from '../utils/supabase/auth-utils';

vi.mock('../utils/supabase/client', () => ({
  createClient: vi.fn(),
}));

vi.mock('../utils/supabase/auth-utils', () => ({
  requireAuth: vi.fn(),
}));

vi.mock('./activityLog.service', () => ({
  logActivity: vi.fn().mockResolvedValue({ success: true }),
}));

import { logActivity } from './activityLog.service';

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
        kit_components: [{ id: 'kc-1', quantity: 2, asset_id: 'asset-1', child_kit_id: null, asset: { id: 'asset-1' } }],
      };
      const chain = makeChain({ data: mockKit, error: null });
      mockSupabase.from.mockReturnValue(chain);

      const result = await getKit('kit-1');

      expect(result.id).toBe('kit-1');
      expect(result.kit_components).toHaveLength(1);
      expect(chain.eq).toHaveBeenCalledWith('id', 'kit-1');
      expect(chain.single).toHaveBeenCalled();
    });

    it('propagates Supabase errors when kit is not found', async () => {
      const dbError = { code: 'PGRST116', message: 'Row not found' };
      mockSupabase.from.mockReturnValue(makeChain({ data: null, error: dbError }));

      await expect(getKit('missing-id')).rejects.toMatchObject({ message: 'Row not found' });
    });
  });

  // ─── getKitsThatWouldCycle ────────────────────────────────────────────────

  describe('getKitsThatWouldCycle', () => {
    it('returns the set of candidate kit ids the RPC flags as cyclic', async () => {
      mockSupabase.rpc = vi.fn().mockResolvedValue({
        data: [{ kit_id: 'kit-b' }, { kit_id: 'kit-c' }],
        error: null,
      });

      const result = await getKitsThatWouldCycle('kit-a', ['kit-b', 'kit-c', 'kit-d']);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('kits_that_would_cycle', {
        p_parent_kit_id: 'kit-a',
        p_candidate_kit_ids: ['kit-b', 'kit-c', 'kit-d'],
      });
      expect(result).toEqual(new Set(['kit-b', 'kit-c']));
      expect(result.has('kit-d')).toBe(false);
    });

    it('returns an empty set without calling the RPC when there are no candidates', async () => {
      mockSupabase.rpc = vi.fn();

      const result = await getKitsThatWouldCycle('kit-a', []);

      expect(result.size).toBe(0);
      expect(mockSupabase.rpc).not.toHaveBeenCalled();
    });

    it('propagates Supabase errors', async () => {
      mockSupabase.rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'RPC failed' } });

      await expect(getKitsThatWouldCycle('kit-a', ['kit-b'])).rejects.toMatchObject({ message: 'RPC failed' });
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
      const chain = makeChain({ data: [{ id: 'kit-1' }], error: null });
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

    it('throws when no row was deleted (RLS denied)', async () => {
      mockSupabase.from.mockReturnValue(makeChain({ data: [], error: null }));
      await expect(deleteKit('kit-1')).rejects.toThrow(/permission|not found/i);
    });
  });

  describe('createKit', () => {
    it('inserts a new kit and logs activity', async () => {
      const kitData = { name: 'New Kit', organization_id: 'org-1', components: [] };
      const mockKit = { id: 'k1', name: 'New Kit', organization_id: 'org-1' };
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'kits') return makeChain({ data: mockKit, error: null });
        if (table === 'organizations') return makeChain({ data: { name: 'Acme' }, error: null });
        return makeChain({ data: {}, error: null });
      });
      (requireAuth as any).mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1', email: 'a@b.com' } });

      const result = await createKit(kitData);

      expect(result).toEqual(mockKit);
      expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({
        event_type: 'kit.created',
        entity_id: 'k1'
      }));
    });
  });

  describe('updateKit', () => {
    it('updates kit metadata and logs field changes', async () => {
      const kitId = 'k1';
      const updates = { name: 'Updated Kit' };
      const preKit = { id: 'k1', name: 'Old Kit', organization_id: 'org-1', organization: { name: 'Acme' } };
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'kits') {
          const chain = makeChain({ data: preKit, error: null });
          chain.update = vi.fn().mockReturnValue(makeChain({ data: null, error: null }));
          return chain;
        }
        return makeChain({ data: {}, error: null });
      });
      (requireAuth as any).mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });

      await updateKit(kitId, updates);

      expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({
        event_type: 'kit.updated',
        context: expect.objectContaining({
          field_changes: [{ field: 'name', from: 'Old Kit', to: 'Updated Kit' }]
        })
      }));
    });

    it('adds a mixed asset + sub-kit component in one update, logging both event types', async () => {
      const kitId = 'k1';
      const preKit = { id: 'k1', name: 'Rack', organization_id: 'org-1', organization: { name: 'Acme' } };
      let kitsCallCount = 0;

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'kits') {
          kitsCallCount += 1;
          // 1st call: pre-fetch for diffing/actor info. Later calls: sub-kit name lookups.
          if (kitsCallCount === 1) return makeChain({ data: preKit, error: null });
          return makeChain({ data: { name: 'Mic Kit' }, error: null });
        }
        if (table === 'kit_components') {
          const chain = makeChain({ data: [], error: null }); // no existing components
          chain.insert = vi.fn().mockReturnValue(makeChain({ data: null, error: null }));
          return chain;
        }
        if (table === 'assets') return makeChain({ data: { manufacturer_model: 'LED Par' }, error: null });
        return makeChain({ data: {}, error: null });
      });
      (requireAuth as any).mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });

      await updateKit(kitId, {
        components: [
          { asset_id: 'asset-1', quantity: 2 },
          { child_kit_id: 'subkit-1', quantity: 3 },
        ],
      });

      expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({
        event_type: 'kit.asset_added',
        context: expect.objectContaining({ asset_model: 'LED Par', quantity: 2 }),
      }));
      expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({
        event_type: 'kit.subkit_added',
        context: expect.objectContaining({ subkit_name: 'Mic Kit', quantity: 3 }),
      }));
    });

    it('removes a sub-kit component and logs kit.subkit_removed', async () => {
      const kitId = 'k1';
      const preKit = { id: 'k1', name: 'Rack', organization_id: 'org-1', organization: { name: 'Acme' } };
      let kitsCallCount = 0;

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'kits') {
          kitsCallCount += 1;
          if (kitsCallCount === 1) return makeChain({ data: preKit, error: null });
          return makeChain({ data: { name: 'Mic Kit' }, error: null });
        }
        if (table === 'kit_components') {
          const chain = makeChain({
            data: [{ id: 'kc-1', asset_id: null, child_kit_id: 'subkit-1' }],
            error: null,
          });
          chain.delete = vi.fn().mockReturnValue(makeChain({ data: null, error: null }));
          return chain;
        }
        return makeChain({ data: {}, error: null });
      });
      (requireAuth as any).mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });

      // Empty incoming components list — the one existing sub-kit component gets removed.
      await updateKit(kitId, { components: [] });

      expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({
        event_type: 'kit.subkit_removed',
        context: expect.objectContaining({ subkit_name: 'Mic Kit' }),
      }));
    });

    it('does NOT log kit.updated when tracked fields are unchanged', async () => {
      const kitId = 'k1';
      const updates = { name: 'Old Kit' };
      const preKit = { id: 'k1', name: 'Old Kit', organization_id: 'org-1' };
      
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'kits') return makeChain({ data: preKit, error: null });
        return makeChain({ data: {}, error: null });
      });
      (requireAuth as any).mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });

      await updateKit(kitId, updates);

      expect(logActivity).not.toHaveBeenCalledWith(expect.objectContaining({
        event_type: 'kit.updated'
      }));
    });
  });

  describe('duplicateKit', () => {
    it('logs kit.created for duplicated kit', async () => {
      const kitId = 'k1';
      const originalKit = { id: 'k1', name: 'Original', organization_id: 'org-1', kit_components: [] };
      const mockResult = { id: 'k2', name: 'Original (Copy)', organization_id: 'org-1' };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'kits') {
          const chain = makeChain({ data: originalKit, error: null });
          chain.insert = vi.fn().mockReturnValue(makeChain({ data: mockResult, error: null }));
          return chain;
        }
        if (table === 'organizations') return makeChain({ data: { name: 'Acme' }, error: null });
        return makeChain({ data: {}, error: null });
      });
      (requireAuth as any).mockResolvedValue({ supabase: mockSupabase, user: { id: 'u1' } });

      await duplicateKit(kitId);

      expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({
        event_type: 'kit.created',
        entity_id: 'k2',
        context: expect.objectContaining({
          kit_name: 'Original (Copy)'
        })
      }));
    });
  });
});

describe('countInventoryItems / maxTreeDepth', () => {
  const asset = (quantity: number): KitComponentTreeNode => ({
    clientKey: `asset-${Math.random()}`,
    type: 'asset',
    quantity,
    asset: {},
    children: [],
  });

  const kit = (name: string, isContainer: boolean, quantity: number, children: KitComponentTreeNode[]): KitComponentTreeNode => ({
    clientKey: `kit-${name}`,
    type: 'kit',
    quantity,
    kit: { id: name, name, category: null, is_container: isContainer },
    children,
  });

  // Direct: one loose asset (×4), a non-container "Lighting Kit" (transparent —
  // its own asset plus a container "Mic Case" nested inside it), and a
  // container "Road Case" (counts as one, no drilling — even though it has
  // its own nested non-container kit with more assets underneath).
  const tree: KitComponentTreeNode[] = [
    asset(4),
    kit('Lighting Kit', false, 1, [
      asset(2),
      kit('Mic Case', true, 1, [asset(3)]),
    ]),
    kit('Road Case', true, 1, [
      asset(5),
      kit('Inner Frame', false, 1, [asset(2)]),
    ]),
  ];

  it('counts a container sub-kit as one item and does not drill into it, while a non-container sub-kit is transparent', () => {
    // 4 (loose asset) + [2 (Lighting Kit's own asset) + 1 (Mic Case, a
    // container, counts as one)] + [1 (Road Case, a container, counts as
    // one — its own nested kit/assets are not drilled into)] = 8
    expect(countInventoryItems(tree)).toBe(8);
  });

  it('counts fully-flattened total quantity ignoring container boundaries entirely, for comparison', () => {
    const totalFlattened = (nodes: KitComponentTreeNode[]): number =>
      nodes.reduce((sum, n) => sum + (n.type === 'asset' ? n.quantity : totalFlattened(n.children)), 0);
    // 4 + (2 + 3) + (5 + 2) = 16 — everything drilled into, no container ever stops recursion.
    expect(totalFlattened(tree)).toBe(16);
  });

  it('finds the deepest sub-kit nesting level, regardless of container status', () => {
    // Lighting Kit (depth 1) -> Mic Case (depth 2); Road Case (depth 1) -> Inner Frame (depth 2).
    expect(maxTreeDepth(tree)).toBe(2);
  });

  it('returns 0 for a flat kit with no nested sub-kits', () => {
    expect(maxTreeDepth([asset(1), asset(2)])).toBe(0);
  });

  it('returns 0 items for an empty tree', () => {
    expect(countInventoryItems([])).toBe(0);
  });
});
