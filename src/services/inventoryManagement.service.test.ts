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
});
