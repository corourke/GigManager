import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createClient } from '../utils/supabase/client';

vi.mock('../utils/supabase/client', () => ({
  createClient: vi.fn(),
}));

vi.mock('../config/inventoryWorkflow', () => ({
  SCANNING_MODES: [
    { id: 'pack-out', label: 'Pack-Out', resultingStatus: 'Checked Out', description: '', locationLabel: 'Staging Area' },
    { id: 'load-truck', label: 'Load Truck', resultingStatus: 'In Transit', description: '', locationLabel: 'Truck' },
    { id: 'load-in', label: 'Load-In', resultingStatus: 'On Site', description: '', locationLabel: 'Venue Area' },
    { id: 'load-out', label: 'Load-Out', resultingStatus: 'In Transit', description: '', locationLabel: 'Truck' },
    { id: 'unload', label: 'Unload', resultingStatus: 'In Warehouse', description: '', locationLabel: 'Warehouse' },
  ],
  RETURNED_STATUS: 'In Warehouse',
}));

function makeQueryChain(result: { data: any; error: any }) {
  const chain: any = {};
  const methods = [
    'select', 'insert', 'update', 'upsert', 'delete',
    'eq', 'neq', 'in', 'not', 'is', 'or', 'gte', 'lte',
    'order', 'limit',
  ];
  methods.forEach((m) => { chain[m] = vi.fn().mockReturnValue(chain); });
  chain.single = vi.fn().mockResolvedValue(result);
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  chain.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject);
  return chain;
}

describe('inventoryManagement.service', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = { from: vi.fn() };
    (createClient as any).mockReturnValue(mockSupabase);
  });

  describe('getLocationSuggestions', () => {
    it('merges DB locations with SCANNING_MODES defaults and deduplicates', async () => {
      const { getLocationSuggestions } = await import('./inventoryManagement.service');

      const chain = makeQueryChain({ data: [{ location: 'Truck' }, { location: 'Custom Spot' }], error: null });
      mockSupabase.from.mockReturnValue(chain);

      const result = await getLocationSuggestions('org-1');

      expect(result).toContain('Truck');
      expect(result).toContain('Custom Spot');
      expect(result).toContain('Staging Area');
      expect(result).toContain('Venue Area');
      expect(result).toContain('Warehouse');

      const truckCount = result.filter((r) => r === 'Truck').length;
      expect(truckCount).toBe(1);
    });

    it('returns sorted deduplicated list when DB returns empty', async () => {
      const { getLocationSuggestions } = await import('./inventoryManagement.service');

      const chain = makeQueryChain({ data: [], error: null });
      mockSupabase.from.mockReturnValue(chain);

      const result = await getLocationSuggestions('org-1');

      expect(result).toEqual([...result].sort());

      const unique = new Set(result);
      expect(unique.size).toBe(result.length);
    });

    it('returns only SCANNING_MODES defaults when no DB records exist', async () => {
      const { getLocationSuggestions } = await import('./inventoryManagement.service');

      const chain = makeQueryChain({ data: null, error: null });
      mockSupabase.from.mockReturnValue(chain);

      const result = await getLocationSuggestions('org-1');

      expect(result).toContain('Staging Area');
      expect(result).toContain('Truck');
      expect(result).toContain('Venue Area');
      expect(result).toContain('Warehouse');
    });
  });

  describe('createManualTrackingRecord', () => {
    it('inserts a single kit-level record for container kits (isContainerKit=true)', async () => {
      const { createManualTrackingRecord } = await import('./inventoryManagement.service');

      const mockRecord = {
        id: 'tracking-1',
        organization_id: 'org-1',
        gig_id: 'gig-1',
        kit_id: 'kit-1',
        asset_id: null,
        status: 'On Site',
        location: 'Venue Area',
        notes: null,
        scanned_at: '2026-01-01T00:00:00Z',
        scanned_by: 'user-1',
        created_at: '2026-01-01T00:00:00Z',
      };

      const chain = makeQueryChain({ data: mockRecord, error: null });
      mockSupabase.from.mockReturnValue(chain);

      const result = await createManualTrackingRecord({
        organizationId: 'org-1',
        gigId: 'gig-1',
        kitId: 'kit-1',
        status: 'On Site',
        location: 'Venue Area',
        createdBy: 'user-1',
        isContainerKit: true,
      });

      expect(result).toHaveLength(1);
      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ kit_id: 'kit-1', asset_id: null, status: 'On Site' })
      );
    });

    it('inserts kit-level + per-asset records for logical kits (isContainerKit=false)', async () => {
      const { createManualTrackingRecord } = await import('./inventoryManagement.service');

      const mockRecords = [
        { id: 't-1', organization_id: 'org-1', gig_id: 'gig-1', kit_id: 'kit-1', asset_id: null, status: 'On Site', scanned_at: '', scanned_by: '', created_at: '' },
        { id: 't-2', organization_id: 'org-1', gig_id: 'gig-1', kit_id: 'kit-1', asset_id: 'asset-1', status: 'On Site', scanned_at: '', scanned_by: '', created_at: '' },
        { id: 't-3', organization_id: 'org-1', gig_id: 'gig-1', kit_id: 'kit-1', asset_id: 'asset-2', status: 'On Site', scanned_at: '', scanned_by: '', created_at: '' },
      ];

      const chain = makeQueryChain({ data: mockRecords, error: null });
      mockSupabase.from.mockReturnValue(chain);

      const result = await createManualTrackingRecord({
        organizationId: 'org-1',
        gigId: 'gig-1',
        kitId: 'kit-1',
        status: 'On Site',
        createdBy: 'user-1',
        isContainerKit: false,
        assetIds: ['asset-1', 'asset-2'],
      });

      expect(result).toHaveLength(3);
      expect(chain.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ asset_id: null }),
          expect.objectContaining({ asset_id: 'asset-1' }),
          expect.objectContaining({ asset_id: 'asset-2' }),
        ])
      );
    });

    it('inserts only one asset-level record when assetId is provided', async () => {
      const { createManualTrackingRecord } = await import('./inventoryManagement.service');

      const mockRecord = {
        id: 't-1', organization_id: 'org-1', gig_id: 'gig-1', kit_id: 'kit-1', asset_id: 'asset-1',
        status: 'Checked Out', scanned_at: '', scanned_by: '', created_at: '',
      };

      const chain = makeQueryChain({ data: mockRecord, error: null });
      mockSupabase.from.mockReturnValue(chain);

      const result = await createManualTrackingRecord({
        organizationId: 'org-1',
        gigId: 'gig-1',
        kitId: 'kit-1',
        assetId: 'asset-1',
        status: 'Checked Out',
        createdBy: 'user-1',
      });

      expect(result).toHaveLength(1);
      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({ asset_id: 'asset-1' })
      );
    });
  });

  describe('getAssetTrackingSummary', () => {
    it('clears the gig title once the asset\'s latest record is returned to the warehouse', async () => {
      const { getAssetTrackingSummary } = await import('./inventoryManagement.service');

      const chain = makeQueryChain({
        data: [
          // Latest record for asset-1 (order by scanned_at desc means this row comes first).
          { asset_id: 'asset-1', gig_id: 'gig-1', status: 'In Warehouse', location: 'Warehouse', scanned_at: '2026-01-02T00:00:00Z', gig: { title: 'Test Gig' } },
          { asset_id: 'asset-1', gig_id: 'gig-1', status: 'Checked Out', location: 'Staging Area', scanned_at: '2026-01-01T00:00:00Z', gig: { title: 'Test Gig' } },
          // asset-2 is still actively out — its gig title should stay.
          { asset_id: 'asset-2', gig_id: 'gig-1', status: 'On Site', location: 'Venue Area', scanned_at: '2026-01-01T00:00:00Z', gig: { title: 'Test Gig' } },
        ],
        error: null,
      });
      mockSupabase.from.mockReturnValue(chain);

      const result = await getAssetTrackingSummary('org-1');

      expect(result.get('asset-1')).toEqual({ status: 'In Warehouse', location: 'Warehouse', gigTitle: null });
      expect(result.get('asset-2')).toEqual({ status: 'On Site', location: 'Venue Area', gigTitle: 'Test Gig' });
    });
  });

  describe('getKitTrackingSummary', () => {
    it('clears the gig title/id once the kit\'s latest record is returned to the warehouse', async () => {
      const { getKitTrackingSummary } = await import('./inventoryManagement.service');

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'kits') {
          return makeQueryChain({
            data: [{ id: 'kit-1', is_container: true, kit_components: [] }],
            error: null,
          });
        }
        return makeQueryChain({
          data: [
            { kit_id: 'kit-1', asset_id: null, gig_id: 'gig-1', status: 'In Warehouse', location: 'Warehouse', scanned_at: '2026-01-02T00:00:00Z', gig: { title: 'Test Gig' } },
          ],
          error: null,
        });
      });

      const result = await getKitTrackingSummary('org-1');

      const summary = result.get('kit-1');
      expect(summary?.status).toBe('In Warehouse');
      expect(summary?.gigTitle).toBeNull();
      expect(summary?.gigId).toBeNull();
    });

    it('keeps the gig title/id for a kit still actively checked out', async () => {
      const { getKitTrackingSummary } = await import('./inventoryManagement.service');

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'kits') {
          return makeQueryChain({
            data: [{ id: 'kit-1', is_container: true, kit_components: [] }],
            error: null,
          });
        }
        return makeQueryChain({
          data: [
            { kit_id: 'kit-1', asset_id: null, gig_id: 'gig-1', status: 'On Site', location: 'Venue Area', scanned_at: '2026-01-02T00:00:00Z', gig: { title: 'Test Gig' } },
          ],
          error: null,
        });
      });

      const result = await getKitTrackingSummary('org-1');

      const summary = result.get('kit-1');
      expect(summary?.gigTitle).toBe('Test Gig');
      expect(summary?.gigId).toBe('gig-1');
    });
  });

  describe('getActiveGigsWithTracking', () => {
    // Regression: a kit's kit_components rows can be a mix of asset_id rows
    // and child_kit_id (sub-kit) rows. The old query embedded assets
    // directly off kit_components, and a sub-kit row resolves to a null
    // asset — reading `.id` off it threw, which handleApiError's
    // isNetworkError misclassified as a network error and silently broke
    // this function for any kit with a nested sub-kit.
    it('does not crash for a non-container kit with a mix of direct assets and nested sub-kits, and flattens its assets via the cache', async () => {
      const { getActiveGigsWithTracking } = await import('./inventoryManagement.service');

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'gig_participants') {
          return makeQueryChain({ data: [{ gig_id: 'gig-1' }], error: null });
        }
        if (table === 'gigs') {
          return makeQueryChain({
            data: [{ id: 'gig-1', title: 'Test Gig', start: '2026-09-01T00:00:00Z', end: '2026-09-01T04:00:00Z', status: 'Booked' }],
            error: null,
          });
        }
        if (table === 'gig_kit_assignments') {
          return makeQueryChain({
            data: [
              { gig_id: 'gig-1', kit_id: 'kit-1', kit: { id: 'kit-1', name: 'Full Rack', is_container: false, tag_number: null } },
              { gig_id: 'gig-1', kit_id: 'kit-2', kit: { id: 'kit-2', name: 'Road Case', is_container: true, tag_number: null } },
            ],
            error: null,
          });
        }
        if (table === 'kit_flattened_cache') {
          // Only kit-1 (non-container) should ever be queried — kit-2 is a container.
          return makeQueryChain({
            data: [
              { kit_id: 'kit-1', asset_id: 'asset-1', asset: { id: 'asset-1', manufacturer_model: 'DI Box', tag_number: null, status: 'Active' } },
              { kit_id: 'kit-1', asset_id: 'asset-2', asset: { id: 'asset-2', manufacturer_model: 'LED Par', tag_number: null, status: 'Active' } },
            ],
            error: null,
          });
        }
        if (table === 'inventory_tracking') {
          return makeQueryChain({ data: [], error: null });
        }
        return makeQueryChain({ data: [], error: null });
      });

      const result = await getActiveGigsWithTracking('org-1');

      expect(result).toHaveLength(1);
      const kitAssignments = result[0].kit_assignments;
      const fullRack = kitAssignments.find((a) => a.kit_id === 'kit-1')!;
      const roadCase = kitAssignments.find((a) => a.kit_id === 'kit-2')!;

      expect(fullRack.kit.assets.map((a) => a.asset_id).sort()).toEqual(['asset-1', 'asset-2']);
      expect(fullRack.kit.assets.find((a) => a.asset_id === 'asset-1')?.asset.manufacturer_model).toBe('DI Box');
      // Container kits aren't flattened here — they're tracked as one sealed unit.
      expect(roadCase.kit.assets).toEqual([]);
    });

    it('returns an empty array when the org has no gig participants', async () => {
      const { getActiveGigsWithTracking } = await import('./inventoryManagement.service');
      mockSupabase.from.mockReturnValue(makeQueryChain({ data: [], error: null }));

      const result = await getActiveGigsWithTracking('org-1');
      expect(result).toEqual([]);
    });
  });

  describe('getInventoryConflictFlags', () => {
    it('returns empty set when there are no gig assignments', async () => {
      const { getInventoryConflictFlags } = await import('./inventoryManagement.service');

      const participantChain = makeQueryChain({ data: [], error: null });
      mockSupabase.from.mockReturnValue(participantChain);

      const result = await getInventoryConflictFlags('org-1');

      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(0);
    });

    it('flags kit IDs that appear in overlapping gigs', async () => {
      const { getInventoryConflictFlags } = await import('./inventoryManagement.service');

      const callResults: any[] = [
        { data: [{ gig_id: 'gig-1' }, { gig_id: 'gig-2' }], error: null },
        {
          data: [
            { id: 'gig-1', start: '2026-06-01T00:00:00Z', end: '2026-06-03T00:00:00Z', timezone: 'UTC' },
            { id: 'gig-2', start: '2026-06-02T00:00:00Z', end: '2026-06-04T00:00:00Z', timezone: 'UTC' },
          ],
          error: null,
        },
        {
          data: [
            { gig_id: 'gig-1', kit_id: 'kit-shared' },
            { gig_id: 'gig-1', kit_id: 'kit-only-a' },
            { gig_id: 'gig-2', kit_id: 'kit-shared' },
            { gig_id: 'gig-2', kit_id: 'kit-only-b' },
          ],
          error: null,
        },
      ];

      let callIndex = 0;
      mockSupabase.from.mockImplementation(() => {
        const chain = makeQueryChain(callResults[callIndex]);
        callIndex++;
        return chain;
      });

      const result = await getInventoryConflictFlags('org-1');

      expect(result.has('kit-shared')).toBe(true);
      expect(result.has('kit-only-a')).toBe(false);
      expect(result.has('kit-only-b')).toBe(false);
    });

    it('does not flag kits in non-overlapping gigs', async () => {
      const { getInventoryConflictFlags } = await import('./inventoryManagement.service');

      const callResults: any[] = [
        { data: [{ gig_id: 'gig-1' }, { gig_id: 'gig-2' }], error: null },
        {
          data: [
            { id: 'gig-1', start: '2026-06-01T00:00:00Z', end: '2026-06-02T00:00:00Z', timezone: 'UTC' },
            { id: 'gig-2', start: '2026-06-10T00:00:00Z', end: '2026-06-11T00:00:00Z', timezone: 'UTC' },
          ],
          error: null,
        },
        {
          data: [
            { gig_id: 'gig-1', kit_id: 'kit-a' },
            { gig_id: 'gig-2', kit_id: 'kit-a' },
          ],
          error: null,
        },
      ];

      let callIndex = 0;
      mockSupabase.from.mockImplementation(() => {
        const chain = makeQueryChain(callResults[callIndex]);
        callIndex++;
        return chain;
      });

      const result = await getInventoryConflictFlags('org-1');

      expect(result.has('kit-a')).toBe(false);
      expect(result.size).toBe(0);
    });
  });

  describe('getGigsForReportPicker', () => {
    it('returns all gigs the org participates in, unfiltered by status or date', async () => {
      const { getGigsForReportPicker } = await import('./inventoryManagement.service');

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'gig_participants') {
          return makeQueryChain({ data: [{ gig_id: 'gig-1' }, { gig_id: 'gig-2' }], error: null });
        }
        if (table === 'gigs') {
          return makeQueryChain({
            data: [
              { id: 'gig-1', title: 'Electric Festival' },
              { id: 'gig-2', title: 'Old Completed Gig' },
            ],
            error: null,
          });
        }
        return makeQueryChain({ data: [], error: null });
      });

      const result = await getGigsForReportPicker('org-1');

      expect(result).toEqual([
        { id: 'gig-1', title: 'Electric Festival' },
        { id: 'gig-2', title: 'Old Completed Gig' },
      ]);
    });

    it('returns an empty array when the org has no gig participants', async () => {
      const { getGigsForReportPicker } = await import('./inventoryManagement.service');
      mockSupabase.from.mockReturnValue(makeQueryChain({ data: [], error: null }));

      const result = await getGigsForReportPicker('org-1');
      expect(result).toEqual([]);
    });
  });

  describe('getManifestReport', () => {
    // Regression: the query never fetched assets, so asset_name/tag_number
    // were hardcoded null on every row. The UI falls back to showing the
    // kit's name when asset_name is null, so every asset in a kit rendered
    // as an identical-looking "duplicate" row bearing the kit's name.
    it('resolves each row\'s own asset name instead of leaving it null', async () => {
      const { getManifestReport } = await import('./inventoryManagement.service');

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'inventory_tracking') {
          return makeQueryChain({
            data: [
              {
                id: 'rec-1', gig_id: 'gig-1', kit_id: 'kit-1', asset_id: 'asset-1',
                status: 'In Transit', location: 'Truck 1', scanned_at: '2026-08-26T21:41:00Z',
                scanned_by: 'user-1', notes: null, created_at: '2026-08-26T21:41:00Z',
                scanned_by_user: { first_name: 'Cameron', last_name: "O'Rourke" },
                kit: { name: 'Small Gig Pack' }, gig: { title: 'Electric Festival' },
              },
              {
                id: 'rec-2', gig_id: 'gig-1', kit_id: 'kit-1', asset_id: 'asset-2',
                status: 'In Transit', location: 'Truck 1', scanned_at: '2026-08-26T21:42:00Z',
                scanned_by: 'user-1', notes: null, created_at: '2026-08-26T21:42:00Z',
                scanned_by_user: { first_name: 'Cameron', last_name: "O'Rourke" },
                kit: { name: 'Small Gig Pack' }, gig: { title: 'Electric Festival' },
              },
            ],
            error: null,
          });
        }
        if (table === 'assets') {
          return makeQueryChain({
            data: [
              { id: 'asset-1', manufacturer_model: 'Mic Stand', tag_number: 'MS-1' },
              { id: 'asset-2', manufacturer_model: 'XLR Cable', tag_number: 'XLR-1' },
            ],
            error: null,
          });
        }
        if (table === 'gig_participants') {
          return makeQueryChain({ data: [], error: null });
        }
        return makeQueryChain({ data: [], error: null });
      });

      const result = await getManifestReport('org-1', { location: 'Truck 1' });

      expect(result).toHaveLength(2);
      expect(result.find((r) => r.asset_id === 'asset-1')?.asset_name).toBe('Mic Stand');
      expect(result.find((r) => r.asset_id === 'asset-2')?.asset_name).toBe('XLR Cable');
      // The two rows are genuinely distinct assets, not duplicates of one kit.
      expect(new Set(result.map((r) => r.asset_name)).size).toBe(2);
    });

    // Regression: scanning a top-level kit cascades a tracking row for
    // every asset in its flattened subtree, and a nested sub-kit can also
    // independently be scanned — so the same physical asset can end up
    // with tracking rows under two different kit_ids (e.g. "Full Rack"
    // and its nested "Mic Case"). The old kit_id-inclusive dedup key kept
    // both, showing the same asset once per kit section on the manifest.
    it('shows an asset only once even when it has tracking rows under two different kit levels', async () => {
      const { getManifestReport } = await import('./inventoryManagement.service');

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'inventory_tracking') {
          return makeQueryChain({
            data: [
              {
                id: 'rec-top', gig_id: 'gig-1', kit_id: 'kit-full-rack', asset_id: 'asset-mic',
                status: 'In Transit', location: 'Truck 1', scanned_at: '2026-08-26T21:41:00Z',
                scanned_by: 'user-1', notes: null, created_at: '2026-08-26T21:41:00Z',
                scanned_by_user: { first_name: 'Cameron', last_name: "O'Rourke" },
                kit: { name: 'Full Rack' }, gig: { title: 'Electric Festival' },
              },
              {
                id: 'rec-sub', gig_id: 'gig-1', kit_id: 'kit-mic-case', asset_id: 'asset-mic',
                status: 'In Transit', location: 'Truck 1', scanned_at: '2026-08-26T21:44:00Z',
                scanned_by: 'user-1', notes: null, created_at: '2026-08-26T21:44:00Z',
                scanned_by_user: { first_name: 'Cameron', last_name: "O'Rourke" },
                kit: { name: 'Mic Case' }, gig: { title: 'Electric Festival' },
              },
            ],
            error: null,
          });
        }
        if (table === 'assets') {
          return makeQueryChain({
            data: [{ id: 'asset-mic', manufacturer_model: 'SM58', tag_number: 'MIC-1' }],
            error: null,
          });
        }
        return makeQueryChain({ data: [], error: null });
      });

      const result = await getManifestReport('org-1', { location: 'Truck 1' });

      expect(result).toHaveLength(1);
      // The later scan (through Mic Case, the nested sub-kit) wins.
      expect(result[0]).toMatchObject({ kit_id: 'kit-mic-case', kit_name: 'Mic Case', asset_id: 'asset-mic' });
    });
  });

  describe('getPackingListReport', () => {
    // Regression: the old query embedded kit_components -> assets directly
    // off gig_kit_assignments, so a nested sub-kit component (no asset_id
    // of its own) produced a bogus row with every field null instead of
    // being expanded. This mirrors the getActiveGigsWithTracking fix.
    it('does not produce a bogus null-asset row for a non-container kit with two direct assets', async () => {
      const { getPackingListReport } = await import('./inventoryManagement.service');

      mockSupabase.rpc = vi.fn().mockResolvedValue({ data: [], error: null });
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'gig_kit_assignments') {
          return makeQueryChain({
            data: [
              { kit_id: 'kit-1', kit: { id: 'kit-1', name: 'Full Rack', is_container: false, tag_number: null, organization_id: 'org-1' } },
            ],
            error: null,
          });
        }
        if (table === 'kits') {
          return makeQueryChain({
            data: [{ id: 'kit-1', name: 'Full Rack', category: null, is_container: false, tag_number: null }],
            error: null,
          });
        }
        if (table === 'kit_components') {
          return makeQueryChain({
            data: [
              { kit_id: 'kit-1', asset_id: 'asset-1', child_kit_id: null, quantity: 1, asset: { id: 'asset-1', manufacturer_model: 'DI Box', tag_number: null } },
              { kit_id: 'kit-1', asset_id: 'asset-2', child_kit_id: null, quantity: 1, asset: { id: 'asset-2', manufacturer_model: 'SM58', tag_number: null } },
            ],
            error: null,
          });
        }
        if (table === 'inventory_tracking') {
          return makeQueryChain({ data: [], error: null });
        }
        if (table === 'gig_participants') {
          return makeQueryChain({ data: [], error: null });
        }
        return makeQueryChain({ data: [], error: null });
      });

      const result = await getPackingListReport('org-1', 'gig-1');

      expect(result).toHaveLength(2);
      expect(result.every((r) => r.asset_id !== null)).toBe(true);
      expect(result.map((r) => r.asset_name).sort()).toEqual(['DI Box', 'SM58']);
    });

    // The actual bug reported live: a container nested inside a
    // non-container top-level kit was exploded into its individual assets
    // instead of showing as one row for the sealed unit.
    it('gives a nested container its own single row instead of exploding it into individual assets', async () => {
      const { getPackingListReport } = await import('./inventoryManagement.service');

      mockSupabase.rpc = vi.fn().mockResolvedValue({
        data: [{ parent_kit_id: 'kit-full-rack', child_kit_id: 'kit-mic-case', quantity: 1, depth: 1 }],
        error: null,
      });
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'gig_kit_assignments') {
          return makeQueryChain({
            data: [
              { kit_id: 'kit-full-rack', kit: { id: 'kit-full-rack', name: 'Full Rack', is_container: false, tag_number: null, organization_id: 'org-1' } },
            ],
            error: null,
          });
        }
        if (table === 'kits') {
          return makeQueryChain({
            data: [
              { id: 'kit-full-rack', name: 'Full Rack', category: null, is_container: false, tag_number: null },
              { id: 'kit-mic-case', name: 'Mic Case', category: null, is_container: true, tag_number: 'MIC-CASE-1' },
            ],
            error: null,
          });
        }
        if (table === 'kit_components') {
          return makeQueryChain({
            data: [
              { kit_id: 'kit-full-rack', asset_id: 'asset-snake', child_kit_id: null, quantity: 1, asset: { id: 'asset-snake', manufacturer_model: 'Cable Snake', tag_number: null } },
              { kit_id: 'kit-full-rack', asset_id: null, child_kit_id: 'kit-mic-case', quantity: 1, asset: null },
              { kit_id: 'kit-mic-case', asset_id: 'asset-mic', child_kit_id: null, quantity: 1, asset: { id: 'asset-mic', manufacturer_model: 'SM58', tag_number: null } },
            ],
            error: null,
          });
        }
        if (table === 'inventory_tracking') {
          return makeQueryChain({ data: [], error: null });
        }
        if (table === 'gig_participants') {
          return makeQueryChain({ data: [], error: null });
        }
        return makeQueryChain({ data: [], error: null });
      });

      const result = await getPackingListReport('org-1', 'gig-1');

      expect(result).toHaveLength(2);
      const snakeRow = result.find((r) => r.asset_name === 'Cable Snake');
      expect(snakeRow).toMatchObject({ kit_id: 'kit-full-rack', is_container: false, asset_id: 'asset-snake' });

      const micCaseRow = result.find((r) => r.kit_id === 'kit-mic-case');
      expect(micCaseRow).toMatchObject({ is_container: true, asset_id: null, kit_name: 'Mic Case', tag_number: 'MIC-CASE-1' });
      // The mic itself never gets its own row — it's sealed inside Mic Case.
      expect(result.some((r) => r.asset_name === 'SM58')).toBe(false);
    });

    it('does not query kit_flattened_cache for container kits', async () => {
      const { getPackingListReport } = await import('./inventoryManagement.service');
      const flattenedCacheCalls: string[] = [];

      mockSupabase.from.mockImplementation((table: string) => {
        flattenedCacheCalls.push(table);
        if (table === 'gig_kit_assignments') {
          return makeQueryChain({
            data: [
              { kit_id: 'kit-2', kit: { id: 'kit-2', name: 'Road Case', is_container: true, tag_number: 'RC-1', organization_id: 'org-1' } },
            ],
            error: null,
          });
        }
        return makeQueryChain({ data: [], error: null });
      });

      const result = await getPackingListReport('org-1', 'gig-1');

      expect(flattenedCacheCalls).not.toContain('kit_flattened_cache');
      expect(result).toEqual([
        expect.objectContaining({ kit_id: 'kit-2', is_container: true, asset_id: null }),
      ]);
    });
  });

  describe('getMaintenanceQueueReport', () => {
    // Regression: kit_components has two FKs to kits (kit_id and
    // child_kit_id) — an unhinted nested embed of kits through
    // kit_components is ambiguous and PostgREST rejects it with PGRST201.
    it('disambiguates the kit_components -> kits embed with an FK hint', async () => {
      const { getMaintenanceQueueReport } = await import('./inventoryManagement.service');
      let assetsSelectArg = '';

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'assets') {
          const chain = makeQueryChain({
            data: [
              {
                id: 'asset-1',
                manufacturer_model: 'DI Box',
                tag_number: 'TAG-1',
                kit_components: [{ kit_id: 'kit-1', kit: { id: 'kit-1', name: 'Full Rack' } }],
              },
            ],
            error: null,
          });
          chain.select = vi.fn((arg: string) => {
            assetsSelectArg = arg;
            return chain;
          });
          return chain;
        }
        if (table === 'inventory_tracking') {
          return makeQueryChain({ data: [], error: null });
        }
        return makeQueryChain({ data: [], error: null });
      });

      const result = await getMaintenanceQueueReport('org-1');

      expect(assetsSelectArg).toContain('kits!kit_assets_kit_id_fkey');
      expect(result).toEqual([
        expect.objectContaining({ asset_id: 'asset-1', kit_id: 'kit-1', kit_name: 'Full Rack' }),
      ]);
    });
  });
});
