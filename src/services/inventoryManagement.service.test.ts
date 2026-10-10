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
    'eq', 'neq', 'in', 'not', 'is', 'or', 'gte', 'lte', 'lt',
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

    it('a logical kit writes a row per asset, like the phone, with each one\'s quantity, and no kit-only row (#185)', async () => {
      const { createManualTrackingRecord } = await import('./inventoryManagement.service');
      const chain = makeQueryChain({ data: [{ id: 't-2' }, { id: 't-3' }], error: null });
      mockSupabase.from.mockReturnValue(chain);

      const result = await createManualTrackingRecord({
        organizationId: 'org-1', gigId: 'gig-1', kitId: 'kit-1', status: 'On Site', createdBy: 'user-1',
        isContainerKit: false, assetIds: ['asset-1', 'cables'], quantities: { cables: 10 },
      });

      expect(result).toHaveLength(2);
      expect(chain.insert).toHaveBeenCalledWith([
        expect.objectContaining({ kit_id: 'kit-1', asset_id: 'asset-1', quantity: 1 }),
        expect.objectContaining({ kit_id: 'kit-1', asset_id: 'cables', quantity: 10 }),
      ]);
    });

    it('a kit that has its own row (a whole-kit override) keeps it, with or without units', async () => {
      const { createManualTrackingRecord } = await import('./inventoryManagement.service');
      const chain = makeQueryChain({ data: [{ id: 't-1' }], error: null });
      mockSupabase.from.mockReturnValue(chain);

      await createManualTrackingRecord({
        organizationId: 'org-1', gigId: 'gig-1', kitId: 'kit-1', status: 'On Site', createdBy: 'user-1',
        isContainerKit: false, assetIds: [], keepKitRow: true,
      });
      expect(chain.insert).toHaveBeenLastCalledWith([expect.objectContaining({ kit_id: 'kit-1', asset_id: null })]);

      await createManualTrackingRecord({
        organizationId: 'org-1', gigId: 'gig-1', kitId: 'kit-1', status: 'On Site', createdBy: 'user-1',
        isContainerKit: false, assetIds: ['a1'], keepKitRow: true,
      });
      expect(chain.insert).toHaveBeenLastCalledWith([
        expect.objectContaining({ kit_id: 'kit-1', asset_id: null }),
        expect.objectContaining({ kit_id: 'kit-1', asset_id: 'a1' }),
      ]);
    });

    it('a logical kit with nothing to move (only "any" lines) is refused, not silently saved as nothing', async () => {
      const { createManualTrackingRecord } = await import('./inventoryManagement.service');
      const chain = makeQueryChain({ data: [], error: null });
      mockSupabase.from.mockReturnValue(chain);

      await expect(createManualTrackingRecord({
        organizationId: 'org-1', gigId: 'gig-1', kitId: 'kit-1', status: 'On Site', createdBy: 'user-1',
        isContainerKit: false, assetIds: [],
      })).rejects.toThrow(/no specific units or lots/);
      expect(chain.insert).not.toHaveBeenCalled();
    });

    it('records N of a lot (#185: quantity is how many are there)', async () => {
      const { createManualTrackingRecord } = await import('./inventoryManagement.service');
      const chain = makeQueryChain({ data: { id: 't-1' }, error: null });
      mockSupabase.from.mockReturnValue(chain);
      await createManualTrackingRecord({
        organizationId: 'org-1', gigId: 'gig-1', kitId: 'kit-1', assetId: 'cables', quantity: 4, status: 'On Site', createdBy: 'user-1',
      });
      expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({ asset_id: 'cables', quantity: 4 }));
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
    it('a non-container kit reads its newest row, so an old kit-level row doesn\'t hide newer item scans (#185)', async () => {
      const { getKitTrackingSummary } = await import('./inventoryManagement.service');
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'kits') {
          return makeQueryChain({ data: [{ id: 'kit-1', is_container: false, kit_components: [{ asset_id: 'a1' }] }], error: null });
        }
        return makeQueryChain({
          data: [
            { kit_id: 'kit-1', asset_id: 'a1', gig_id: 'gig-1', status: 'In Warehouse', location: 'Warehouse', scanned_at: '2026-01-03T00:00:00Z', gig: { title: 'Test Gig' } },
            { kit_id: 'kit-1', asset_id: null, gig_id: 'gig-1', status: 'Checked Out', location: 'Staging Area', scanned_at: '2026-01-01T00:00:00Z', gig: { title: 'Test Gig' } },
          ],
          error: null,
        });
      });
      const summary = (await getKitTrackingSummary('org-1')).get('kit-1');
      expect(summary).toMatchObject({ status: 'In Warehouse', location: 'Warehouse', gigId: null });
    });

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
    it('returns the gigs the org participates in, unfiltered by status', async () => {
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

      const result = await getGigsForReportPicker('org-1', { showAll: true });

      expect(result).toEqual([
        { id: 'gig-1', title: 'Electric Festival' },
        { id: 'gig-2', title: 'Old Completed Gig' },
      ]);
    });

    // #109: by default the picker shows gigs from 30 days back to 30 days ahead
    // of the user's local today, filtered in the query on `start`.
    describe('date window', () => {
      const today = new Date(2026, 9, 4, 15, 30); // 2026-10-04 15:30 local
      const inWindow = (start: Date, w: { from: string; to: string }) =>
        start.getTime() >= new Date(w.from).getTime() && start.getTime() < new Date(w.to).getTime();

      it('includes gigs on day -30 and day +30 and excludes day -31 and day +31', async () => {
        const { reportPickerWindow } = await import('./inventoryManagement.service');
        const w = reportPickerWindow(today);

        expect(inWindow(new Date(2026, 8, 4, 0, 0), w)).toBe(true); // day -30, first minute
        expect(inWindow(new Date(2026, 8, 3, 23, 59), w)).toBe(false); // day -31, last minute
        expect(inWindow(new Date(2026, 10, 3, 23, 59), w)).toBe(true); // day +30, last minute
        expect(inWindow(new Date(2026, 10, 4, 0, 0), w)).toBe(false); // day +31, first minute
      });

      it('filters the gigs query on start by the window', async () => {
        const { getGigsForReportPicker, reportPickerWindow } = await import('./inventoryManagement.service');
        const gigsChain = makeQueryChain({ data: [{ id: 'gig-1', title: 'Soon' }], error: null });
        mockSupabase.from.mockImplementation((table: string) =>
          table === 'gig_participants'
            ? makeQueryChain({ data: [{ gig_id: 'gig-1' }], error: null })
            : gigsChain,
        );

        await getGigsForReportPicker('org-1', { today });

        const w = reportPickerWindow(today);
        expect(gigsChain.gte).toHaveBeenCalledWith('start', w.from);
        expect(gigsChain.lt).toHaveBeenCalledWith('start', w.to);
      });

      it('applies no date filter when showAll is set', async () => {
        const { getGigsForReportPicker } = await import('./inventoryManagement.service');
        const gigsChain = makeQueryChain({ data: [], error: null });
        mockSupabase.from.mockImplementation((table: string) =>
          table === 'gig_participants'
            ? makeQueryChain({ data: [{ gig_id: 'gig-1' }], error: null })
            : gigsChain,
        );

        await getGigsForReportPicker('org-1', { showAll: true, today });

        expect(gigsChain.gte).not.toHaveBeenCalled();
        expect(gigsChain.lt).not.toHaveBeenCalled();
      });
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
    // #185: "any" lines are packing lines, with the units packed for them; lots say how many they hold.
    const anyKit = (tables: Record<string, any>) => {
      mockSupabase.rpc = vi.fn().mockResolvedValue({ data: [], error: null });
      mockSupabase.from.mockImplementation((table: string) => makeQueryChain(tables[table] ?? { data: [], error: null }));
    };
    const base = {
      gig_kit_assignments: { data: [{ kit_id: 'kit-1', kit: { id: 'kit-1', name: 'Main PA', is_container: false, tag_number: null, organization_id: 'org-1' } }], error: null },
      kits: { data: [{ id: 'kit-1', name: 'Main PA', category: null, is_container: false, tag_number: null }], error: null },
      kit_components: { data: [
        { kit_id: 'kit-1', asset_id: null, equipment_item_id: 'item-k12', child_kit_id: null, quantity: 2, item: { id: 'item-k12', manufacturer_model: 'QSC K12.2', category: 'Audio' } },
        { kit_id: 'kit-1', asset_id: null, equipment_item_id: 'item-xlr', child_kit_id: null, quantity: 10, item: { id: 'item-xlr', manufacturer_model: 'XLR Cable, 50 ft', category: 'Audio' } },
        { kit_id: 'kit-1', asset_id: 'stands', child_kit_id: null, quantity: 2, asset: { id: 'stands', manufacturer_model: 'Speaker Stand', tag_number: null, serial_number: null, quantity: 6 } },
      ], error: null },
    };
    const scan = (asset_id: string, item: string, over: Record<string, unknown> = {}) => ({
      id: `t-${asset_id}`, gig_id: 'gig-1', kit_id: 'kit-1', asset_id, status: 'Checked Out', quantity: 1, scanned_at: '2026-10-09T10:00:00Z',
      created_at: '2026-10-09T10:00:00Z', asset: { equipment_item_id: item, tag_number: null, serial_number: null, manufacturer_model: 'x' }, ...over,
    });

    it('an "any" line of a tagged item lists the units packed for it (#185)', async () => {
      const { getPackingListReport } = await import('./inventoryManagement.service');
      anyKit({
        ...base,
        // K12s have tags. The cables' only "tags" are a blank one and one on a disposed record: counted.
        assets: { data: [
          { equipment_item_id: 'item-k12', tag_number: 'DSL-0101', status: 'Active', retired_on: null },
          { equipment_item_id: 'item-xlr', tag_number: '  ', status: 'Active', retired_on: null },
          { equipment_item_id: 'item-xlr', tag_number: 'OLD-1', status: 'Disposed', retired_on: '2025-01-01' },
        ], error: null },
        inventory_tracking: { data: [
          scan('k1', 'item-k12', { location: 'Staging Area', asset: { equipment_item_id: 'item-k12', tag_number: 'DSL-0101', serial_number: 'S1', manufacturer_model: 'QSC K12.2' } }),
          scan('k3', 'item-k12', { status: 'In Warehouse', asset: { equipment_item_id: 'item-k12', tag_number: 'DSL-0103', serial_number: null, manufacturer_model: 'QSC K12.2' } }),
          scan('cables', 'item-xlr', { quantity: 7 }),
          scan('stands', 'item-stand', { quantity: 2 }),
        ], error: null },
      });
      const rows = await getPackingListReport('org-1', 'gig-1');
      const k12 = rows.find((r) => r.item_id === 'item-k12')!;
      expect(k12).toMatchObject({ kind: 'any', asset_id: null, asset_name: 'QSC K12.2', quantity: 2, packed: 1, counted: false });
      // Each with its own status and place, for the gig's Equipment card (Cameron, 10-09).
      expect(k12.packed_units).toEqual([{ asset_id: 'k1', tag_number: 'DSL-0101', serial_number: 'S1', quantity: 1, status: 'Checked Out', location: 'Staging Area' }]);
      expect(rows.find((r) => r.item_id === 'item-xlr')).toMatchObject({ kind: 'any', quantity: 10, packed: 7, counted: true });
      expect(rows.find((r) => r.asset_id === 'stands')).toMatchObject({ kind: 'lot', lot_of: 6, quantity: 2, packed: 2 });
    });

    // #240 review: lines are filed under the owning kit, so the same item or lot in two of its
    // sub-kits must add up, not collapse into one line.
    it('sums the same "any" item and the same lot across sub-kits of one kit', async () => {
      const { getPackingListReport } = await import('./inventoryManagement.service');
      mockSupabase.rpc = vi.fn().mockResolvedValue({ data: [
        { parent_kit_id: 'band', child_kit_id: 'drums', quantity: 1, depth: 1 },
        { parent_kit_id: 'band', child_kit_id: 'guitars', quantity: 1, depth: 1 },
      ], error: null });
      const sm57 = { id: 'item-sm57', manufacturer_model: 'SM57', category: 'Audio' };
      const cables = { id: 'cables', manufacturer_model: 'XLR Cable', tag_number: null, serial_number: null, quantity: 20 };
      mockSupabase.from.mockImplementation((table: string) => makeQueryChain(({
        gig_kit_assignments: { data: [{ kit_id: 'band', kit: { id: 'band', name: 'Band', is_container: false, tag_number: null, organization_id: 'org-1' } }], error: null },
        kits: { data: [
          { id: 'band', name: 'Band', category: null, is_container: false, tag_number: null },
          { id: 'drums', name: 'Drum mics', category: null, is_container: false, tag_number: null },
          { id: 'guitars', name: 'Guitar mics', category: null, is_container: false, tag_number: null },
        ], error: null },
        kit_components: { data: [
          { kit_id: 'band', asset_id: null, child_kit_id: 'drums', quantity: 1, asset: null },
          { kit_id: 'band', asset_id: null, child_kit_id: 'guitars', quantity: 1, asset: null },
          { kit_id: 'drums', asset_id: null, equipment_item_id: 'item-sm57', child_kit_id: null, quantity: 3, item: sm57 },
          { kit_id: 'drums', asset_id: 'cables', child_kit_id: null, quantity: 4, asset: cables },
          { kit_id: 'guitars', asset_id: null, equipment_item_id: 'item-sm57', child_kit_id: null, quantity: 2, item: sm57 },
          { kit_id: 'guitars', asset_id: 'cables', child_kit_id: null, quantity: 3, asset: cables },
        ], error: null },
      } as Record<string, any>)[table] ?? { data: [], error: null }));

      const rows = await getPackingListReport('org-1', 'gig-1');
      expect(rows.filter((r) => r.item_id === 'item-sm57').map((r) => r.quantity)).toEqual([5]);
      expect(rows.filter((r) => r.asset_id === 'cables').map((r) => r.quantity)).toEqual([7]);
    });

    // #240 re-review: a tracked unit is one physical thing; listed in two sub-kits it's still
    // one line of 1, never "1 of 2", which could never be packed.
    it('a tracked unit in two sub-kits stays one line of 1', async () => {
      const { getPackingListReport } = await import('./inventoryManagement.service');
      mockSupabase.rpc = vi.fn().mockResolvedValue({ data: [
        { parent_kit_id: 'band', child_kit_id: 'drums', quantity: 1, depth: 1 },
        { parent_kit_id: 'band', child_kit_id: 'guitars', quantity: 1, depth: 1 },
      ], error: null });
      const di = { id: 'di-1', manufacturer_model: 'Radial DI', tag_number: 'DI-1', serial_number: null, quantity: 1 };
      mockSupabase.from.mockImplementation((table: string) => makeQueryChain(({
        gig_kit_assignments: { data: [{ kit_id: 'band', kit: { id: 'band', name: 'Band', is_container: false, tag_number: null, organization_id: 'org-1' } }], error: null },
        kits: { data: [
          { id: 'band', name: 'Band', category: null, is_container: false, tag_number: null },
          { id: 'drums', name: 'Drum mics', category: null, is_container: false, tag_number: null },
          { id: 'guitars', name: 'Guitar mics', category: null, is_container: false, tag_number: null },
        ], error: null },
        kit_components: { data: [
          { kit_id: 'band', asset_id: null, child_kit_id: 'drums', quantity: 1, asset: null },
          { kit_id: 'band', asset_id: null, child_kit_id: 'guitars', quantity: 1, asset: null },
          { kit_id: 'drums', asset_id: 'di-1', child_kit_id: null, quantity: 1, asset: di },
          { kit_id: 'guitars', asset_id: 'di-1', child_kit_id: null, quantity: 1, asset: di },
        ], error: null },
      } as Record<string, any>)[table] ?? { data: [], error: null }));

      const rows = await getPackingListReport('org-1', 'gig-1');
      expect(rows.filter((r) => r.asset_id === 'di-1').map((r) => r.quantity)).toEqual([1]);
    });

    // #240 re-review: a unit is packed only where its newest row puts it, across kits and gigs;
    // a written-off (retired) record is never packed.
    describe('packed counts follow where things are now', () => {
      const sm57 = { id: 'item-sm57', manufacturer_model: 'SM57', category: 'Audio' };
      const u1 = { equipment_item_id: 'item-sm57', tag_number: 'MIC-1', serial_number: null, manufacturer_model: 'SM57', quantity: 1, status: 'Active', retired_on: null };
      const lot = { equipment_item_id: 'item-xlr', tag_number: null, serial_number: null, manufacturer_model: 'XLR', quantity: 10, status: 'Active', retired_on: null };
      const row = (gig_id: string, kit_id: string, asset_id: string, at: string, asset: any, over: Record<string, unknown> = {}) => ({
        id: `${gig_id}-${kit_id}-${asset_id}-${at}`, gig_id, kit_id, asset_id, status: 'Checked Out', quantity: 1, scanned_at: `2026-10-09T${at}:00Z`,
        created_at: `2026-10-09T${at}:00Z`, asset, ...over,
      });
      const setup = (tracking: any[]) => {
        mockSupabase.rpc = vi.fn().mockResolvedValue({ data: [], error: null });
        mockSupabase.from.mockImplementation((table: string) => makeQueryChain(({
          gig_kit_assignments: { data: [
            { kit_id: 'kit-a', kit: { id: 'kit-a', name: 'Kit A', is_container: false, tag_number: null, organization_id: 'org-1' } },
            { kit_id: 'kit-b', kit: { id: 'kit-b', name: 'Kit B', is_container: false, tag_number: null, organization_id: 'org-1' } },
          ], error: null },
          kits: { data: [
            { id: 'kit-a', name: 'Kit A', category: null, is_container: false, tag_number: null },
            { id: 'kit-b', name: 'Kit B', category: null, is_container: false, tag_number: null },
          ], error: null },
          kit_components: { data: [
            { kit_id: 'kit-a', asset_id: null, equipment_item_id: 'item-sm57', child_kit_id: null, quantity: 1, item: sm57 },
            { kit_id: 'kit-b', asset_id: null, equipment_item_id: 'item-sm57', child_kit_id: null, quantity: 1, item: sm57 },
            { kit_id: 'kit-a', asset_id: 'cables', child_kit_id: null, quantity: 4, asset: { id: 'cables', ...lot } },
          ], error: null },
          assets: { data: [{ equipment_item_id: 'item-sm57', tag_number: 'MIC-1', status: 'Active', retired_on: null }], error: null },
          inventory_tracking: { data: tracking, error: null },
        } as Record<string, any>)[table] ?? { data: [], error: null }));
      };
      const packedOn = (rows: any[], kit: string, pred: (r: any) => boolean) => rows.find((r) => r.kit_id === kit && pred(r))?.packed;

      it('a unit scanned for kit A, then kit B, is packed on B only', async () => {
        const { getPackingListReport } = await import('./inventoryManagement.service');
        setup([row('gig-1', 'kit-a', 'u1', '10:00', u1), row('gig-1', 'kit-b', 'u1', '11:00', u1)]);
        const rows = await getPackingListReport('org-1', 'gig-1');
        expect(packedOn(rows, 'kit-a', (r) => r.item_id === 'item-sm57')).toBe(0);
        expect(packedOn(rows, 'kit-b', (r) => r.item_id === 'item-sm57')).toBe(1);
      });

      it('a unit since moved to another gig is not packed here', async () => {
        const { getPackingListReport } = await import('./inventoryManagement.service');
        setup([row('gig-1', 'kit-a', 'u1', '10:00', u1), row('gig-2', 'kit-x', 'u1', '11:00', u1)]);
        const rows = await getPackingListReport('org-1', 'gig-1');
        expect(packedOn(rows, 'kit-a', (r) => r.item_id === 'item-sm57')).toBe(0);
      });

      it('written-off pieces are never packed', async () => {
        const { getPackingListReport } = await import('./inventoryManagement.service');
        setup([row('gig-1', 'kit-a', 'cables', '10:00', { ...lot, status: 'Missing', retired_on: '2026-10-09' }, { quantity: 4 })]);
        const rows = await getPackingListReport('org-1', 'gig-1');
        expect(packedOn(rows, 'kit-a', (r) => r.asset_id === 'cables')).toBe(0);
      });
    });

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

    // Issue #40: quantity was read from kit_components but dropped before
    // reaching the report row, so a "3x XLR cable" component rendered
    // indistinguishably from a single one.
    it('carries a component quantity greater than one through to the row', async () => {
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
              { kit_id: 'kit-1', asset_id: 'asset-xlr', child_kit_id: null, quantity: 3, asset: { id: 'asset-xlr', manufacturer_model: 'XLR Cable', tag_number: null } },
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

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ asset_name: 'XLR Cable', quantity: 3 });
    });

    // A top-level container assigned directly to the gig has no
    // kit_components row of its own (gig_kit_assignments has no quantity
    // column) — it's assigned once, so its row quantity is always 1.
    it('gives a directly-assigned container row a quantity of 1', async () => {
      const { getPackingListReport } = await import('./inventoryManagement.service');

      mockSupabase.rpc = vi.fn().mockResolvedValue({ data: [], error: null });
      mockSupabase.from.mockImplementation((table: string) => {
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

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ kit_id: 'kit-2', is_container: true, quantity: 1 });
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

    // Issue #81: rows only said which unit to scan, not which assigned kit they
    // are packed under, so a kit holding only containers vanished and its
    // containers (and any container assigned on its own) read as part of
    // whichever kit happened to be listed above them.
    it('records the assigned kit each row is packed under (#81)', async () => {
      const { getPackingListReport } = await import('./inventoryManagement.service');

      mockSupabase.rpc = vi.fn().mockResolvedValue({
        data: [
          { parent_kit_id: 'kit-all-mic', child_kit_id: 'kit-boom-1', quantity: 1, depth: 1 },
          { parent_kit_id: 'kit-all-mic', child_kit_id: 'kit-boom-2', quantity: 1, depth: 1 },
        ],
        error: null,
      });
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'gig_kit_assignments') {
          return makeQueryChain({
            data: [
              { kit_id: 'kit-all-mic', kit: { id: 'kit-all-mic', name: 'All Mic Stands', is_container: false, tag_number: null, organization_id: 'org-1' } },
              { kit_id: 'kit-power', kit: { id: 'kit-power', name: 'Power Box', is_container: true, tag_number: 'PWR-1', organization_id: 'org-1' } },
            ],
            error: null,
          });
        }
        if (table === 'kits') {
          return makeQueryChain({
            data: [
              { id: 'kit-all-mic', name: 'All Mic Stands', category: null, is_container: false, tag_number: null },
              { id: 'kit-boom-1', name: 'Boom Stands 1', category: null, is_container: true, tag_number: 'BS-1' },
              { id: 'kit-boom-2', name: 'Boom Stands 2', category: null, is_container: true, tag_number: 'BS-2' },
            ],
            error: null,
          });
        }
        if (table === 'kit_components') {
          return makeQueryChain({
            data: [
              { kit_id: 'kit-all-mic', asset_id: null, child_kit_id: 'kit-boom-1', quantity: 1, asset: null },
              { kit_id: 'kit-all-mic', asset_id: null, child_kit_id: 'kit-boom-2', quantity: 1, asset: null },
            ],
            error: null,
          });
        }
        return makeQueryChain({ data: [], error: null });
      });

      const result = await getPackingListReport('org-1', 'gig-1');

      expect(result).toHaveLength(3);
      const allMic = { group_kit_id: 'kit-all-mic', group_kit_name: 'All Mic Stands', group_is_container: false, group_tag_number: null };
      expect(result.find((r) => r.kit_id === 'kit-boom-1')).toMatchObject({ is_container: true, kit_name: 'Boom Stands 1', ...allMic });
      expect(result.find((r) => r.kit_id === 'kit-boom-2')).toMatchObject({ is_container: true, kit_name: 'Boom Stands 2', ...allMic });
      expect(result.find((r) => r.kit_id === 'kit-power')).toMatchObject({
        group_kit_id: 'kit-power', group_kit_name: 'Power Box', group_is_container: true, group_tag_number: 'PWR-1',
      });
    });

    // Regression: a kit assigned directly to the gig AND nested inside
    // another assigned kit's tree (e.g. a container both stands alone and
    // sits inside a larger "gig pack") produced one row from each path —
    // the same physical container listed twice.
    it('dedupes a kit reachable both directly and nested inside another assigned kit', async () => {
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
              { kit_id: 'kit-mic-case', kit: { id: 'kit-mic-case', name: 'Mic Case', is_container: true, tag_number: 'MIC-CASE-1', organization_id: 'org-1' } },
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

      // One row for Full Rack's own loose asset, one row for Mic Case as a
      // sealed unit — not two Mic Case rows for its two assignment paths.
      expect(result).toHaveLength(2);
      expect(result.filter((r) => r.kit_id === 'kit-mic-case')).toHaveLength(1);
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
