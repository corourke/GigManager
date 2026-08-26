import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../utils/idb/store', () => ({
  idbStore: {
    getPackingList: vi.fn().mockResolvedValue(null),
    putPackingList: vi.fn(),
    putGigs: vi.fn(),
  },
}))

function createSupabaseMock(tableResponses: Record<string, any>, rpcResponse: any) {
  return {
    from: vi.fn().mockImplementation((table: string) => {
      const response = tableResponses[table] ?? { data: [], error: null };
      const builder: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(response),
        then: (resolve: any, reject?: any) => Promise.resolve(response).then(resolve, reject),
      };
      return builder;
    }),
    rpc: vi.fn().mockResolvedValue(rpcResponse),
  };
}

vi.mock('../../utils/supabase/client', () => ({
  createClient: vi.fn(),
}));

describe('packingListService.fetchGigPackingList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // packingList.service.ts captures `const supabase = createClient()` at
    // module scope, evaluated once on first import — without resetting the
    // module registry, every test after the first would keep reusing the
    // first test's mock client instead of its own.
    vi.resetModules();
  });

  it('gives a nested container sub-kit its own entry with its own flattened assets', async () => {
    // "Rack" (not a container) is assigned to the gig and directly contains
    // "Mic Case" (a container). Scanning Mic Case's own tag should be
    // recognizable, and its assets should resolve to just its own subtree.
    const tableResponses: Record<string, any> = {
      gig_kit_assignments: {
        data: [{ kit_id: 'rack', notes: null, kit: { id: 'rack', name: 'Rack', tag_number: 'RACK-1', is_container: false } }],
        error: null,
      },
      kits: {
        data: [{ id: 'mic-case', name: 'Mic Case', tag_number: 'MIC-CASE-1', is_container: true }],
        error: null,
      },
      kit_flattened_cache: {
        data: [
          { kit_id: 'rack', asset_id: 'mic-1', total_quantity: 2 },
          { kit_id: 'mic-case', asset_id: 'mic-1', total_quantity: 2 },
        ],
        error: null,
      },
      assets: {
        data: [{ id: 'mic-1', manufacturer_model: 'SM58' }],
        error: null,
      },
      inventory_tracking: { data: [], error: null },
      gigs: { data: { title: 'Test Gig' }, error: null },
    };
    const rpcResponse = {
      data: [{ parent_kit_id: 'rack', child_kit_id: 'mic-case', quantity: 1, depth: 1 }],
      error: null,
    };

    const { createClient } = await import('../../utils/supabase/client');
    vi.mocked(createClient).mockReturnValue(createSupabaseMock(tableResponses, rpcResponse) as any);

    const { packingListService } = await import('./packingList.service');
    const result = await packingListService.fetchGigPackingList('gig-1');

    const kitIds = result.kits.map((k: any) => k.kit_id);
    expect(kitIds).toContain('rack');
    expect(kitIds).toContain('mic-case');

    const micCaseEntry = result.kits.find((k: any) => k.kit_id === 'mic-case');
    expect(micCaseEntry?.kit.tag_number).toBe('MIC-CASE-1');
    expect(micCaseEntry?.kit.is_container).toBe(true);
    expect(micCaseEntry?.kit.assets).toEqual([
      { asset_id: 'mic-1', quantity: 2, asset: { id: 'mic-1', manufacturer_model: 'SM58' } },
    ]);

    // Rack's own entry also resolves to the same asset via the flattened cache.
    const rackEntry = result.kits.find((k: any) => k.kit_id === 'rack');
    expect(rackEntry?.kit.assets[0].asset_id).toBe('mic-1');
  });

  it('returns hierarchy edges and per-kit direct (non-flattened) assets, for rendering a true nested tree', async () => {
    // "Rack" (not a container) directly contains both "Mic Case" (a nested
    // sub-kit) and its own direct asset "Cable Snake" — the tree view needs
    // to tell those apart from Mic Case's own assets, which the fully
    // flattened `assets` list (used for scan-cascade) folds together.
    const tableResponses: Record<string, any> = {
      gig_kit_assignments: {
        data: [{ kit_id: 'rack', notes: null, kit: { id: 'rack', name: 'Rack', tag_number: 'RACK-1', is_container: false } }],
        error: null,
      },
      kits: {
        data: [{ id: 'mic-case', name: 'Mic Case', tag_number: 'MIC-CASE-1', is_container: true }],
        error: null,
      },
      kit_flattened_cache: {
        data: [
          { kit_id: 'rack', asset_id: 'mic-1', total_quantity: 2 },
          { kit_id: 'rack', asset_id: 'snake-1', total_quantity: 1 },
          { kit_id: 'mic-case', asset_id: 'mic-1', total_quantity: 2 },
        ],
        error: null,
      },
      kit_components: {
        data: [
          { kit_id: 'rack', asset_id: 'snake-1', quantity: 1, asset: { id: 'snake-1', manufacturer_model: 'Cable Snake' } },
          { kit_id: 'rack', asset_id: null, quantity: 1, asset: null }, // the child_kit_id row for Mic Case — not an asset
          { kit_id: 'mic-case', asset_id: 'mic-1', quantity: 2, asset: { id: 'mic-1', manufacturer_model: 'SM58' } },
        ],
        error: null,
      },
      assets: {
        data: [{ id: 'mic-1', manufacturer_model: 'SM58' }, { id: 'snake-1', manufacturer_model: 'Cable Snake' }],
        error: null,
      },
      inventory_tracking: { data: [], error: null },
      gigs: { data: { title: 'Test Gig' }, error: null },
    };
    const rpcResponse = {
      data: [{ parent_kit_id: 'rack', child_kit_id: 'mic-case', quantity: 1, depth: 1 }],
      error: null,
    };

    const { createClient } = await import('../../utils/supabase/client');
    vi.mocked(createClient).mockReturnValue(createSupabaseMock(tableResponses, rpcResponse) as any);

    const { packingListService } = await import('./packingList.service');
    const result = await packingListService.fetchGigPackingList('gig-1');

    expect(result.hierarchy_edges).toEqual([{ parent_kit_id: 'rack', child_kit_id: 'mic-case' }]);
    expect(result.top_level_kit_ids).toEqual(['rack']);

    const rackEntry = result.kits.find((k: any) => k.kit_id === 'rack');
    // Direct assets: just Cable Snake — Mic Case's own SM58 isn't Rack's direct asset, it belongs to Mic Case's own entry.
    expect(rackEntry?.kit.direct_assets).toEqual([
      { asset_id: 'snake-1', quantity: 1, asset: { id: 'snake-1', manufacturer_model: 'Cable Snake' } },
    ]);
    // The flattened list (unchanged, still used for scan-cascade) still includes both.
    expect(rackEntry?.kit.assets.map((a: any) => a.asset_id).sort()).toEqual(['mic-1', 'snake-1']);

    const micCaseEntry = result.kits.find((k: any) => k.kit_id === 'mic-case');
    expect(micCaseEntry?.kit.direct_assets).toEqual([
      { asset_id: 'mic-1', quantity: 2, asset: { id: 'mic-1', manufacturer_model: 'SM58' } },
    ]);
  });
});
