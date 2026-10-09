import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createClient } from '../utils/supabase/client';

vi.mock('../utils/supabase/client', () => ({
  createClient: vi.fn(),
}));

// #184: per-item counts come from the needs loader; each test sets what it returns.
const needs = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock('./equipmentNeeds.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./equipmentNeeds.service')>();
  return { ...actual, loadEquipmentNeeds: needs.load };
});
const noNeeds = () => ({ ctx: { kits: new Map(), lines: new Map(), assetItem: new Map() }, counts: new Map() });

function createQueryBuilder(resolveWith: any) {
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    then(resolve: any, reject?: any) {
      return Promise.resolve(resolveWith).then(resolve, reject);
    },
  };
  return builder;
}

function createBatchMock(responses: { table: string; response: any }[]) {
  const tableCallCounts: Record<string, number> = {};
  return {
    from: vi.fn().mockImplementation((table: string) => {
      tableCallCounts[table] = (tableCallCounts[table] || 0);
      const match = responses.find(r => r.table === table);
      const resp = match ? match.response : { data: [], error: null };
      tableCallCounts[table]++;
      return createQueryBuilder(resp);
    }),
  };
}

describe('conflictDetection.service', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    needs.load.mockResolvedValue(noNeeds());
  });

  it('should export required functions', async () => {
    const service = await import('./conflictDetection.service');
    expect(typeof service.checkStaffConflicts).toBe('function');
    expect(typeof service.checkParticipantConflicts).toBe('function');
    expect(typeof service.checkEquipmentConflicts).toBe('function');
    expect(typeof service.checkAllConflicts).toBe('function');
    expect(typeof service.checkAllConflictsForGigs).toBe('function');
  });

  describe('checkStaffConflicts', () => {
    it('should return empty when gig has no staff slots', async () => {
      mockSupabase = {
        from: vi.fn().mockImplementation(() => createQueryBuilder({ data: [], error: null })),
      };
      (createClient as any).mockReturnValue(mockSupabase);
      const { checkStaffConflicts } = await import('./conflictDetection.service');

      const result = await checkStaffConflicts('gig-1', '2026-03-01T18:00:00Z', '2026-03-01T22:00:00Z');
      expect(result).toEqual({ conflicts: [], warnings: [] });
    });

    it('should detect staff conflict when same user assigned to overlapping gigs', async () => {
      const tableResponses: Record<string, any> = {
        gig_staff_slots: { data: [{ id: 'slot-1' }], error: null },
        gig_staff_assignments: {
          data: [{ user_id: 'user-1', user: { id: 'user-1', first_name: 'John', last_name: 'Doe' } }],
          error: null,
        },
        gigs: {
          data: [{
            id: 'gig-2', title: 'Other Gig',
            start: '2026-03-01T19:00:00Z', end: '2026-03-01T23:00:00Z',
            staff_slots: [{
              assignments: [{ user_id: 'user-1', user: { id: 'user-1', first_name: 'John', last_name: 'Doe' } }]
            }]
          }],
          error: null,
        },
      };
      mockSupabase = {
        from: vi.fn().mockImplementation((table: string) =>
          createQueryBuilder(tableResponses[table] || { data: [], error: null })
        ),
      };
      (createClient as any).mockReturnValue(mockSupabase);
      const { checkStaffConflicts } = await import('./conflictDetection.service');

      const result = await checkStaffConflicts('gig-1', '2026-03-01T18:00:00Z', '2026-03-01T22:00:00Z');
      expect(result.conflicts.length).toBe(1);
      expect(result.conflicts[0].type).toBe('staff');
      expect(result.conflicts[0].gig_id).toBe('gig-2');
      expect(result.conflicts[0].details.conflicting_staff[0].user_id).toBe('user-1');
    });

    it('should return warning for near-overlapping gigs (within 4hr buffer)', async () => {
      const tableResponses: Record<string, any> = {
        gig_staff_slots: { data: [{ id: 'slot-1' }], error: null },
        gig_staff_assignments: {
          data: [{ user_id: 'user-1', user: { id: 'user-1', first_name: 'John', last_name: 'Doe' } }],
          error: null,
        },
        gigs: {
          data: [{
            id: 'gig-2', title: 'Other Gig',
            start: '2026-03-01T23:00:00Z', end: '2026-03-02T03:00:00Z',
            staff_slots: [{
              assignments: [{ user_id: 'user-1', user: { id: 'user-1', first_name: 'John', last_name: 'Doe' } }]
            }]
          }],
          error: null,
        },
      };
      mockSupabase = {
        from: vi.fn().mockImplementation((table: string) =>
          createQueryBuilder(tableResponses[table] || { data: [], error: null })
        ),
      };
      (createClient as any).mockReturnValue(mockSupabase);
      const { checkStaffConflicts } = await import('./conflictDetection.service');

      const result = await checkStaffConflicts('gig-1', '2026-03-01T18:00:00Z', '2026-03-01T22:00:00Z');
      expect(result.warnings.length).toBe(1);
      expect(result.warnings[0].level).toBe('warning');
      expect(result.conflicts.length).toBe(0);
    });
  });

  describe('checkParticipantConflicts', () => {
    it('should return empty when gig has no participants with conflict roles', async () => {
      mockSupabase = {
        from: vi.fn().mockImplementation(() => createQueryBuilder({ data: [], error: null })),
      };
      (createClient as any).mockReturnValue(mockSupabase);
      const { checkParticipantConflicts } = await import('./conflictDetection.service');

      const result = await checkParticipantConflicts('gig-1', '2026-03-01T18:00:00Z', '2026-03-01T22:00:00Z');
      expect(result).toEqual({ conflicts: [], warnings: [] });
    });

    it('should detect venue conflict when same org participates in overlapping gigs', async () => {
      const tableResponses: Record<string, any> = {
        gig_participants: {
          data: [{ organization_id: 'org-venue', role: 'Venue' }],
          error: null,
        },
        gigs: {
          data: [{
            id: 'gig-2', title: 'Other Gig',
            start: '2026-03-01T19:00:00Z', end: '2026-03-01T23:00:00Z',
            participants: [{
              role: 'Venue',
              organization: { id: 'org-venue', name: 'The Club' }
            }]
          }],
          error: null,
        },
      };
      mockSupabase = {
        from: vi.fn().mockImplementation((table: string) =>
          createQueryBuilder(tableResponses[table] || { data: [], error: null })
        ),
      };
      (createClient as any).mockReturnValue(mockSupabase);
      const { checkParticipantConflicts } = await import('./conflictDetection.service');

      const result = await checkParticipantConflicts('gig-1', '2026-03-01T18:00:00Z', '2026-03-01T22:00:00Z');
      expect(result.conflicts.length).toBe(1);
      expect(result.conflicts[0].type).toBe('venue');
      expect(result.conflicts[0].details.venue_name).toBe('The Club');
    });
  });

  describe('checkEquipmentConflicts', () => {
    it('should return empty when gig has no kit assignments', async () => {
      mockSupabase = {
        from: vi.fn().mockImplementation(() => createQueryBuilder({ data: [], error: null })),
      };
      (createClient as any).mockReturnValue(mockSupabase);
      const { checkEquipmentConflicts } = await import('./conflictDetection.service');

      const result = await checkEquipmentConflicts('gig-1', '2026-03-01T18:00:00Z', '2026-03-01T22:00:00Z', undefined, 'org-1');
      expect(result).toEqual({ conflicts: [], warnings: [] });
    });

    it('should detect equipment conflict when same kit assigned to overlapping gigs', async () => {
      const tableResponses: Record<string, any> = {
        gig_kit_assignments: { data: [{ kit_id: 'kit-1', organization_id: 'org-1' }], error: null },
        gigs: {
          data: [{
            id: 'gig-2', title: 'Other Gig',
            start: '2026-03-01T19:00:00Z', end: '2026-03-01T23:00:00Z',
            kit_assignments: [{ kit_id: 'kit-1', organization_id: 'org-1', kit: { id: 'kit-1', name: 'PA System' } }]
          }],
          error: null,
        },
        kit_flattened_cache: { data: [{ kit_id: 'kit-1', asset_id: 'asset-1' }], error: null },
      };
      mockSupabase = {
        from: vi.fn().mockImplementation((table: string) =>
          createQueryBuilder(tableResponses[table] || { data: [], error: null })
        ),
      };
      (createClient as any).mockReturnValue(mockSupabase);
      const { checkEquipmentConflicts } = await import('./conflictDetection.service');

      const result = await checkEquipmentConflicts('gig-1', '2026-03-01T18:00:00Z', '2026-03-01T22:00:00Z', undefined, 'org-1');
      expect(result.conflicts.length).toBe(1);
      expect(result.conflicts[0].type).toBe('equipment');
      expect(result.conflicts[0].details.conflicting_kits[0].kit_name).toBe('PA System');
    });

    it('regression: detects a conflict when two DIFFERENT kits share the same physical asset', async () => {
      // This is the gap that existed before hierarchical kits: comparing kit
      // IDs instead of resolving to assets meant two different kits sharing
      // an asset produced zero conflict warning.
      const tableResponses: Record<string, any> = {
        gig_kit_assignments: { data: [{ kit_id: 'kit-mine', organization_id: 'org-1' }], error: null },
        gigs: {
          data: [{
            id: 'gig-2', title: 'Other Gig',
            start: '2026-03-01T19:00:00Z', end: '2026-03-01T23:00:00Z',
            kit_assignments: [{ kit_id: 'kit-theirs', organization_id: 'org-1', kit: { id: 'kit-theirs', name: 'Different Kit' } }]
          }],
          error: null,
        },
        // Both kits are different rows but both flatten to the same asset.
        kit_flattened_cache: {
          data: [
            { kit_id: 'kit-mine', asset_id: 'shared-asset', asset: { manufacturer_model: 'Shure SM58', tag_number: 'M-12' } },
            { kit_id: 'kit-mine', asset_id: 'my-only', asset: { manufacturer_model: 'Mic stand', tag_number: null } },
            { kit_id: 'kit-theirs', asset_id: 'shared-asset', asset: { manufacturer_model: 'Shure SM58', tag_number: 'M-12' } },
          ],
          error: null,
        },
      };
      mockSupabase = {
        from: vi.fn().mockImplementation((table: string) =>
          createQueryBuilder(tableResponses[table] || { data: [], error: null })
        ),
      };
      (createClient as any).mockReturnValue(mockSupabase);
      const { checkEquipmentConflicts } = await import('./conflictDetection.service');

      const result = await checkEquipmentConflicts('gig-1', '2026-03-01T18:00:00Z', '2026-03-01T22:00:00Z', undefined, 'org-1');
      expect(result.conflicts.length).toBe(1);
      expect(result.conflicts[0].details.conflicting_kits[0].kit_name).toBe('Different Kit');
      // names exactly what is shared
      expect(result.conflicts[0].details.conflicting_kits[0].shared_assets).toEqual(['Shure SM58 (#M-12)']);
    });

    it('should NOT conflict when two different kits share no assets', async () => {
      const tableResponses: Record<string, any> = {
        gig_kit_assignments: { data: [{ kit_id: 'kit-mine', organization_id: 'org-1' }], error: null },
        gigs: {
          data: [{
            id: 'gig-2', title: 'Other Gig',
            start: '2026-03-01T19:00:00Z', end: '2026-03-01T23:00:00Z',
            kit_assignments: [{ kit_id: 'kit-theirs', organization_id: 'org-1', kit: { id: 'kit-theirs', name: 'Different Kit' } }]
          }],
          error: null,
        },
        kit_flattened_cache: {
          data: [
            { kit_id: 'kit-mine', asset_id: 'asset-a' },
            { kit_id: 'kit-theirs', asset_id: 'asset-b' },
          ],
          error: null,
        },
      };
      mockSupabase = {
        from: vi.fn().mockImplementation((table: string) =>
          createQueryBuilder(tableResponses[table] || { data: [], error: null })
        ),
      };
      (createClient as any).mockReturnValue(mockSupabase);
      const { checkEquipmentConflicts } = await import('./conflictDetection.service');

      const result = await checkEquipmentConflicts('gig-1', '2026-03-01T18:00:00Z', '2026-03-01T22:00:00Z', undefined, 'org-1');
      expect(result.conflicts.length).toBe(0);
    });
  });

  describe('checkAllConflictsForGigs (batch)', () => {
    it('should return empty array for empty gig list', async () => {
      mockSupabase = createBatchMock([]);
      (createClient as any).mockReturnValue(mockSupabase);
      const { checkAllConflictsForGigs } = await import('./conflictDetection.service');

      const result = await checkAllConflictsForGigs([], 'org-1');
      expect(result).toEqual([]);
    });

    it('should detect staff conflicts between overlapping gigs', async () => {
      const gigs = [
        { id: 'gig-1', title: 'Gig A', start: '2026-03-01T18:00:00Z', end: '2026-03-01T22:00:00Z' },
        { id: 'gig-2', title: 'Gig B', start: '2026-03-01T20:00:00Z', end: '2026-03-02T00:00:00Z' },
      ];

      mockSupabase = createBatchMock([
        {
          table: 'gig_staff_slots',
          response: {
            data: [
              { gig_id: 'gig-1', assignments: [{ user_id: 'user-1', user: { first_name: 'John', last_name: 'Doe' } }] },
              { gig_id: 'gig-2', assignments: [{ user_id: 'user-1', user: { first_name: 'John', last_name: 'Doe' } }] },
            ],
            error: null,
          },
        },
        { table: 'gig_participants', response: { data: [], error: null } },
        { table: 'gig_kit_assignments', response: { data: [], error: null } },
      ]);
      (createClient as any).mockReturnValue(mockSupabase);
      const { checkAllConflictsForGigs } = await import('./conflictDetection.service');

      const result = await checkAllConflictsForGigs(gigs, 'org-1');
      const staffConflicts = result.filter(c => c.type === 'staff');
      expect(staffConflicts.length).toBe(2);
      expect(staffConflicts.some(c => c.gig_id === 'gig-1')).toBe(true);
      expect(staffConflicts.some(c => c.gig_id === 'gig-2')).toBe(true);
    });

    it('should detect venue/participant conflicts between overlapping gigs', async () => {
      const gigs = [
        { id: 'gig-1', title: 'Gig A', start: '2026-03-01T18:00:00Z', end: '2026-03-01T22:00:00Z' },
        { id: 'gig-2', title: 'Gig B', start: '2026-03-01T20:00:00Z', end: '2026-03-02T00:00:00Z' },
      ];

      mockSupabase = createBatchMock([
        { table: 'gig_staff_slots', response: { data: [], error: null } },
        {
          table: 'gig_participants',
          response: {
            data: [
              { gig_id: 'gig-1', role: 'Venue', organization: { id: 'org-venue', name: 'The Club' } },
              { gig_id: 'gig-2', role: 'Venue', organization: { id: 'org-venue', name: 'The Club' } },
            ],
            error: null,
          },
        },
        { table: 'gig_kit_assignments', response: { data: [], error: null } },
      ]);
      (createClient as any).mockReturnValue(mockSupabase);
      const { checkAllConflictsForGigs } = await import('./conflictDetection.service');

      const result = await checkAllConflictsForGigs(gigs, 'org-1');
      const venueConflicts = result.filter(c => c.type === 'venue');
      expect(venueConflicts.length).toBe(2);
      expect(venueConflicts[0].details.venue_name).toBe('The Club');
    });

    it('should detect equipment conflicts between overlapping gigs', async () => {
      const gigs = [
        { id: 'gig-1', title: 'Gig A', start: '2026-03-01T18:00:00Z', end: '2026-03-01T22:00:00Z' },
        { id: 'gig-2', title: 'Gig B', start: '2026-03-01T20:00:00Z', end: '2026-03-02T00:00:00Z' },
      ];

      mockSupabase = createBatchMock([
        { table: 'gig_staff_slots', response: { data: [], error: null } },
        { table: 'gig_participants', response: { data: [], error: null } },
        {
          table: 'gig_kit_assignments',
          response: {
            data: [
              { gig_id: 'gig-1', kit_id: 'kit-1', organization_id: 'org-1' },
              { gig_id: 'gig-2', kit_id: 'kit-1', organization_id: 'org-1' },
            ],
            error: null,
          },
        },
        {
          table: 'kit_flattened_cache',
          response: { data: [{ kit_id: 'kit-1', asset_id: 'asset-1' }], error: null },
        },
      ]);
      (createClient as any).mockReturnValue(mockSupabase);
      const { checkAllConflictsForGigs } = await import('./conflictDetection.service');

      const result = await checkAllConflictsForGigs(gigs, 'org-1');
      const equipConflicts = result.filter(c => c.type === 'equipment');
      expect(equipConflicts.length).toBe(2);
      expect(equipConflicts[0].details.conflicting_asset_ids).toContain('asset-1');
    });

    it('regression (batch): detects a conflict when two different kits share an asset', async () => {
      const gigs = [
        { id: 'gig-1', title: 'Gig A', start: '2026-03-01T18:00:00Z', end: '2026-03-01T22:00:00Z' },
        { id: 'gig-2', title: 'Gig B', start: '2026-03-01T20:00:00Z', end: '2026-03-02T00:00:00Z' },
      ];

      mockSupabase = createBatchMock([
        { table: 'gig_staff_slots', response: { data: [], error: null } },
        { table: 'gig_participants', response: { data: [], error: null } },
        {
          table: 'gig_kit_assignments',
          response: {
            data: [
              { gig_id: 'gig-1', kit_id: 'kit-mine', organization_id: 'org-1' },
              { gig_id: 'gig-2', kit_id: 'kit-theirs', organization_id: 'org-1' },
            ],
            error: null,
          },
        },
        {
          table: 'kit_flattened_cache',
          response: {
            data: [
              { kit_id: 'kit-mine', asset_id: 'shared-asset' },
              { kit_id: 'kit-theirs', asset_id: 'shared-asset' },
            ],
            error: null,
          },
        },
      ]);
      (createClient as any).mockReturnValue(mockSupabase);
      const { checkAllConflictsForGigs } = await import('./conflictDetection.service');

      const result = await checkAllConflictsForGigs(gigs, 'org-1');
      const equipConflicts = result.filter(c => c.type === 'equipment');
      expect(equipConflicts.length).toBe(2);
      expect(equipConflicts[0].details.conflicting_asset_ids).toContain('shared-asset');
    });

    it('regression (#170): names the kits and shared assets, as the banner expects', async () => {
      const gigs = [
        { id: 'gig-1', title: 'Gig A', start: '2026-03-01T18:00:00Z', end: '2026-03-01T22:00:00Z' },
        { id: 'gig-2', title: 'Gig B', start: '2026-03-01T20:00:00Z', end: '2026-03-02T00:00:00Z' },
      ];

      mockSupabase = createBatchMock([
        { table: 'gig_staff_slots', response: { data: [], error: null } },
        { table: 'gig_participants', response: { data: [], error: null } },
        {
          table: 'gig_kit_assignments',
          response: {
            data: [
              { gig_id: 'gig-1', kit_id: 'kit-mine', organization_id: 'org-1', kit: { id: 'kit-mine', name: 'Main PA' } },
              { gig_id: 'gig-2', kit_id: 'kit-theirs', organization_id: 'org-1', kit: { id: 'kit-theirs', name: 'Mic Case' } },
            ],
            error: null,
          },
        },
        {
          table: 'kit_flattened_cache',
          response: {
            data: [
              { kit_id: 'kit-mine', asset_id: 'shared-asset', asset: { manufacturer_model: 'Shure SM58', tag_number: 'M-12' } },
              { kit_id: 'kit-mine', asset_id: 'only-mine', asset: { manufacturer_model: 'QSC K12', tag_number: null } },
              { kit_id: 'kit-theirs', asset_id: 'shared-asset', asset: { manufacturer_model: 'Shure SM58', tag_number: 'M-12' } },
            ],
            error: null,
          },
        },
      ]);
      (createClient as any).mockReturnValue(mockSupabase);
      const { checkAllConflictsForGigs } = await import('./conflictDetection.service');

      const result = await checkAllConflictsForGigs(gigs, 'org-1');
      // Each entry names its own gig's kits, as the single-gig check does.
      const onGigA = result.find(c => c.type === 'equipment' && c.gig_id === 'gig-1');
      const onGigB = result.find(c => c.type === 'equipment' && c.gig_id === 'gig-2');
      expect(onGigA?.details.conflicting_kits).toEqual([
        { kit_id: 'kit-mine', kit_name: 'Main PA', shared_assets: ['Shure SM58 (#M-12)'] },
      ]);
      expect(onGigB?.details.conflicting_kits).toEqual([
        { kit_id: 'kit-theirs', kit_name: 'Mic Case', shared_assets: ['Shure SM58 (#M-12)'] },
      ]);
    });

    it('should NOT detect conflicts for non-overlapping gigs', async () => {
      const gigs = [
        { id: 'gig-1', title: 'Gig A', start: '2026-03-01T10:00:00Z', end: '2026-03-01T12:00:00Z' },
        { id: 'gig-2', title: 'Gig B', start: '2026-03-05T18:00:00Z', end: '2026-03-05T22:00:00Z' },
      ];

      mockSupabase = createBatchMock([
        {
          table: 'gig_staff_slots',
          response: {
            data: [
              { gig_id: 'gig-1', assignments: [{ user_id: 'user-1', user: { first_name: 'John', last_name: 'Doe' } }] },
              { gig_id: 'gig-2', assignments: [{ user_id: 'user-1', user: { first_name: 'John', last_name: 'Doe' } }] },
            ],
            error: null,
          },
        },
        { table: 'gig_participants', response: { data: [], error: null } },
        { table: 'gig_kit_assignments', response: { data: [], error: null } },
      ]);
      (createClient as any).mockReturnValue(mockSupabase);
      const { checkAllConflictsForGigs } = await import('./conflictDetection.service');

      const result = await checkAllConflictsForGigs(gigs, 'org-1');
      expect(result.length).toBe(0);
    });

    it('should handle date-only gigs (noon UTC) correctly', async () => {
      const gigs = [
        { id: 'gig-1', title: 'Gig A', start: '2026-03-01T12:00:00.000Z', end: '2026-03-01T12:00:00.000Z' },
        { id: 'gig-2', title: 'Gig B', start: '2026-03-01T12:00:00.000Z', end: '2026-03-01T12:00:00.000Z' },
      ];

      mockSupabase = createBatchMock([
        {
          table: 'gig_staff_slots',
          response: {
            data: [
              { gig_id: 'gig-1', assignments: [{ user_id: 'user-1', user: { first_name: 'Alice', last_name: 'Smith' } }] },
              { gig_id: 'gig-2', assignments: [{ user_id: 'user-1', user: { first_name: 'Alice', last_name: 'Smith' } }] },
            ],
            error: null,
          },
        },
        { table: 'gig_participants', response: { data: [], error: null } },
        { table: 'gig_kit_assignments', response: { data: [], error: null } },
      ]);
      (createClient as any).mockReturnValue(mockSupabase);
      const { checkAllConflictsForGigs } = await import('./conflictDetection.service');

      const result = await checkAllConflictsForGigs(gigs, 'org-1');
      const staffConflicts = result.filter(c => c.type === 'staff');
      expect(staffConflicts.length).toBe(2);
    });

    it('should detect conflict between date-only gig in PST and timed gig in UTC evening', async () => {
      const gigs = [
        { id: 'gig-1', title: 'All-Day Gig', start: '2026-02-27T12:00:00.000Z', end: '2026-02-27T12:00:00.000Z', timezone: 'America/Los_Angeles' },
        { id: 'gig-2', title: 'Evening Gig', start: '2026-02-28T03:00:00+00:00', end: '2026-02-28T05:00:00+00:00', timezone: 'America/Los_Angeles' },
      ];

      mockSupabase = createBatchMock([
        {
          table: 'gig_staff_slots',
          response: {
            data: [
              { gig_id: 'gig-1', assignments: [{ user_id: 'user-1', user: { first_name: 'Alice', last_name: 'Smith' } }] },
              { gig_id: 'gig-2', assignments: [{ user_id: 'user-1', user: { first_name: 'Alice', last_name: 'Smith' } }] },
            ],
            error: null,
          },
        },
        { table: 'gig_participants', response: { data: [], error: null } },
        { table: 'gig_kit_assignments', response: { data: [], error: null } },
      ]);
      (createClient as any).mockReturnValue(mockSupabase);
      const { checkAllConflictsForGigs } = await import('./conflictDetection.service');

      const result = await checkAllConflictsForGigs(gigs, 'org-1');
      const staffConflicts = result.filter(c => c.type === 'staff');
      expect(staffConflicts.length).toBe(2);
    });

    it('should NOT detect conflict between date-only gig and timed gig on different days in same timezone', async () => {
      const gigs = [
        { id: 'gig-1', title: 'All-Day Gig', start: '2026-02-26T12:00:00.000Z', end: '2026-02-26T12:00:00.000Z', timezone: 'America/Los_Angeles' },
        { id: 'gig-2', title: 'Evening Gig', start: '2026-02-28T03:00:00+00:00', end: '2026-02-28T05:00:00+00:00', timezone: 'America/Los_Angeles' },
      ];

      mockSupabase = createBatchMock([
        {
          table: 'gig_staff_slots',
          response: {
            data: [
              { gig_id: 'gig-1', assignments: [{ user_id: 'user-1', user: { first_name: 'Alice', last_name: 'Smith' } }] },
              { gig_id: 'gig-2', assignments: [{ user_id: 'user-1', user: { first_name: 'Alice', last_name: 'Smith' } }] },
            ],
            error: null,
          },
        },
        { table: 'gig_participants', response: { data: [], error: null } },
        { table: 'gig_kit_assignments', response: { data: [], error: null } },
      ]);
      (createClient as any).mockReturnValue(mockSupabase);
      const { checkAllConflictsForGigs } = await import('./conflictDetection.service');

      const result = await checkAllConflictsForGigs(gigs, 'org-1');
      expect(result.length).toBe(0);
    });

    it('should detect multiple conflict types simultaneously', async () => {
      const gigs = [
        { id: 'gig-1', title: 'Gig A', start: '2026-03-01T18:00:00Z', end: '2026-03-01T22:00:00Z' },
        { id: 'gig-2', title: 'Gig B', start: '2026-03-01T20:00:00Z', end: '2026-03-02T00:00:00Z' },
      ];

      mockSupabase = createBatchMock([
        {
          table: 'gig_staff_slots',
          response: {
            data: [
              { gig_id: 'gig-1', assignments: [{ user_id: 'user-1', user: { first_name: 'John', last_name: 'Doe' } }] },
              { gig_id: 'gig-2', assignments: [{ user_id: 'user-1', user: { first_name: 'John', last_name: 'Doe' } }] },
            ],
            error: null,
          },
        },
        {
          table: 'gig_participants',
          response: {
            data: [
              { gig_id: 'gig-1', role: 'Venue', organization: { id: 'org-venue', name: 'The Club' } },
              { gig_id: 'gig-2', role: 'Venue', organization: { id: 'org-venue', name: 'The Club' } },
            ],
            error: null,
          },
        },
        {
          table: 'gig_kit_assignments',
          response: {
            data: [
              { gig_id: 'gig-1', kit_id: 'kit-1', organization_id: 'org-1' },
              { gig_id: 'gig-2', kit_id: 'kit-1', organization_id: 'org-1' },
            ],
            error: null,
          },
        },
        {
          table: 'kit_flattened_cache',
          response: { data: [{ kit_id: 'kit-1', asset_id: 'asset-1' }], error: null },
        },
      ]);
      (createClient as any).mockReturnValue(mockSupabase);
      const { checkAllConflictsForGigs } = await import('./conflictDetection.service');

      const result = await checkAllConflictsForGigs(gigs, 'org-1');
      const types = new Set(result.map(c => c.type));
      expect(types.has('staff')).toBe(true);
      expect(types.has('venue')).toBe(true);
      expect(types.has('equipment')).toBe(true);
    });

    it('should deduplicate conflicts', async () => {
      const gigs = [
        { id: 'gig-1', title: 'Gig A', start: '2026-03-01T18:00:00Z', end: '2026-03-01T22:00:00Z' },
        { id: 'gig-2', title: 'Gig B', start: '2026-03-01T20:00:00Z', end: '2026-03-02T00:00:00Z' },
      ];

      mockSupabase = createBatchMock([
        {
          table: 'gig_staff_slots',
          response: {
            data: [
              { gig_id: 'gig-1', assignments: [
                { user_id: 'user-1', user: { first_name: 'John', last_name: 'Doe' } },
                { user_id: 'user-2', user: { first_name: 'Jane', last_name: 'Doe' } },
              ]},
              { gig_id: 'gig-2', assignments: [
                { user_id: 'user-1', user: { first_name: 'John', last_name: 'Doe' } },
              ]},
            ],
            error: null,
          },
        },
        { table: 'gig_participants', response: { data: [], error: null } },
        { table: 'gig_kit_assignments', response: { data: [], error: null } },
      ]);
      (createClient as any).mockReturnValue(mockSupabase);
      const { checkAllConflictsForGigs } = await import('./conflictDetection.service');

      const result = await checkAllConflictsForGigs(gigs, 'org-1');
      const staffConflicts = result.filter(c => c.type === 'staff');
      expect(staffConflicts.length).toBe(2);
    });

    it('should return empty array when Supabase returns errors', async () => {
      const gigs = [
        { id: 'gig-1', title: 'Gig A', start: '2026-03-01T18:00:00Z', end: '2026-03-01T22:00:00Z' },
      ];

      mockSupabase = createBatchMock([
        { table: 'gig_staff_slots', response: { data: null, error: { message: 'RLS error', code: 'PGRST301' } } },
        { table: 'gig_participants', response: { data: [], error: null } },
        { table: 'gig_kit_assignments', response: { data: [], error: null } },
      ]);
      (createClient as any).mockReturnValue(mockSupabase);
      const { checkAllConflictsForGigs } = await import('./conflictDetection.service');

      const result = await checkAllConflictsForGigs(gigs, 'org-1');
      expect(result).toEqual([]);
    });

    it('should detect Act participant conflicts (not just Venue)', async () => {
      const gigs = [
        { id: 'gig-1', title: 'Gig A', start: '2026-03-01T18:00:00Z', end: '2026-03-01T22:00:00Z' },
        { id: 'gig-2', title: 'Gig B', start: '2026-03-01T20:00:00Z', end: '2026-03-02T00:00:00Z' },
      ];

      mockSupabase = createBatchMock([
        { table: 'gig_staff_slots', response: { data: [], error: null } },
        {
          table: 'gig_participants',
          response: {
            data: [
              { gig_id: 'gig-1', role: 'Act', organization: { id: 'org-band', name: 'The Band' } },
              { gig_id: 'gig-2', role: 'Act', organization: { id: 'org-band', name: 'The Band' } },
            ],
            error: null,
          },
        },
        { table: 'gig_kit_assignments', response: { data: [], error: null } },
      ]);
      (createClient as any).mockReturnValue(mockSupabase);
      const { checkAllConflictsForGigs } = await import('./conflictDetection.service');

      const result = await checkAllConflictsForGigs(gigs, 'org-1');
      const venueConflicts = result.filter(c => c.type === 'venue');
      expect(venueConflicts.length).toBe(2);
      expect(venueConflicts[0].details.venue_name).toBe('The Band');
      expect(venueConflicts[0].details.role).toBe('Act');
    });

    it('should handle three gigs where only two overlap', async () => {
      const gigs = [
        { id: 'gig-1', title: 'Gig A', start: '2026-03-01T10:00:00Z', end: '2026-03-01T14:00:00Z' },
        { id: 'gig-2', title: 'Gig B', start: '2026-03-01T13:00:00Z', end: '2026-03-01T17:00:00Z' },
        { id: 'gig-3', title: 'Gig C', start: '2026-03-01T20:00:00Z', end: '2026-03-01T23:00:00Z' },
      ];

      mockSupabase = createBatchMock([
        {
          table: 'gig_staff_slots',
          response: {
            data: [
              { gig_id: 'gig-1', assignments: [{ user_id: 'user-1', user: { first_name: 'John', last_name: 'Doe' } }] },
              { gig_id: 'gig-2', assignments: [{ user_id: 'user-1', user: { first_name: 'John', last_name: 'Doe' } }] },
              { gig_id: 'gig-3', assignments: [{ user_id: 'user-1', user: { first_name: 'John', last_name: 'Doe' } }] },
            ],
            error: null,
          },
        },
        { table: 'gig_participants', response: { data: [], error: null } },
        { table: 'gig_kit_assignments', response: { data: [], error: null } },
      ]);
      (createClient as any).mockReturnValue(mockSupabase);
      const { checkAllConflictsForGigs } = await import('./conflictDetection.service');

      const result = await checkAllConflictsForGigs(gigs, 'org-1');
      const staffConflicts = result.filter(c => c.type === 'staff');
      expect(staffConflicts.length).toBe(2);
      expect(staffConflicts.some(c => c.gig_id === 'gig-1')).toBe(true);
      expect(staffConflicts.some(c => c.gig_id === 'gig-2')).toBe(true);
      expect(staffConflicts.some(c => c.gig_id === 'gig-3')).toBe(false);
    });
  });
});

// #184 PR 2 (mockup screen 10): overlapping gigs that together need more of an item than are free.
describe('per-item equipment conflicts (#184)', () => {
  const trioNeeds = (kitIds: string[]) => ({
    ctx: {
      kits: new Map(kitIds.map((id) => [id, { id, name: id === 'light-a' ? 'Club Lighting Package' : 'Club Lighting B', is_container: false }])),
      lines: new Map(kitIds.map((id) => [id, [{ equipment_item_id: 'trio', quantity: 4 }]])),
      assetItem: new Map(),
    },
    counts: new Map([['trio', { name: 'Chauvet Intimidator Trio', owned: 6, available: 6, inMaintenance: 0, inContainers: 0 }]]),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('checkEquipmentConflicts: names the item, how many are needed and available, and how many short', async () => {
    needs.load.mockResolvedValue(trioNeeds(['light-a', 'light-b']));
    const tableResponses: Record<string, any> = {
      gig_kit_assignments: { data: [{ kit_id: 'light-a', organization_id: 'org-1' }], error: null },
      gigs: { data: [{ id: 'gig-2', title: 'Other Gig', start: '2026-10-10T18:00:00Z', end: '2026-10-10T23:00:00Z',
        kit_assignments: [{ kit_id: 'light-b', organization_id: 'org-1', kit: { id: 'light-b', name: 'Club Lighting B' } }] }], error: null },
      kit_flattened_cache: { data: [], error: null },
    };
    (createClient as any).mockReturnValue({ from: vi.fn((t: string) => createQueryBuilder(tableResponses[t] || { data: [], error: null })) });
    const { checkEquipmentConflicts } = await import('./conflictDetection.service');

    const result = await checkEquipmentConflicts('gig-1', '2026-10-10T19:00:00Z', '2026-10-10T23:00:00Z', undefined, 'org-1');
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].details.items_short).toEqual([{
      item_id: 'trio', item_name: 'Chauvet Intimidator Trio', needed: 8, available: 6, short: 2,
      peak_at: '2026-10-10T19:00:00.000Z', timezone: undefined,
      this_gig: { total: 4, kits: [{ kit_name: 'Club Lighting Package', quantity: 4 }] },
      others: [{ gig_title: 'Other Gig', need: { total: 4, kits: [{ kit_name: 'Club Lighting B', quantity: 4 }] } }],
    }]);
    expect(result.conflicts[0].details.conflicting_kits).toEqual([]);
  });

  it('checkEquipmentConflicts: no conflict when there are enough', async () => {
    const enough = trioNeeds(['light-a', 'light-b']);
    enough.counts.get('trio')!.available = 8;
    needs.load.mockResolvedValue(enough);
    const tableResponses: Record<string, any> = {
      gig_kit_assignments: { data: [{ kit_id: 'light-a', organization_id: 'org-1' }], error: null },
      gigs: { data: [{ id: 'gig-2', title: 'Other Gig', start: '2026-10-10T18:00:00Z', end: '2026-10-10T23:00:00Z',
        kit_assignments: [{ kit_id: 'light-b', organization_id: 'org-1', kit: { id: 'light-b', name: 'Club Lighting B' } }] }], error: null },
    };
    (createClient as any).mockReturnValue({ from: vi.fn((t: string) => createQueryBuilder(tableResponses[t] || { data: [], error: null })) });
    const { checkEquipmentConflicts } = await import('./conflictDetection.service');

    const result = await checkEquipmentConflicts('gig-1', '2026-10-10T19:00:00Z', '2026-10-10T23:00:00Z', undefined, 'org-1');
    expect(result.conflicts).toHaveLength(0);
  });

  it('checkAllConflictsForGigs: flags both overlapping gigs with the item short', async () => {
    needs.load.mockResolvedValue(trioNeeds(['light-a', 'light-b']));
    (createClient as any).mockReturnValue(createBatchMock([
      { table: 'gig_kit_assignments', response: { data: [
        { gig_id: 'gig-1', kit_id: 'light-a', organization_id: 'org-1', kit: { id: 'light-a', name: 'Club Lighting Package' } },
        { gig_id: 'gig-2', kit_id: 'light-b', organization_id: 'org-1', kit: { id: 'light-b', name: 'Club Lighting B' } },
      ], error: null } },
    ]));
    const { checkAllConflictsForGigs } = await import('./conflictDetection.service');

    const result = await checkAllConflictsForGigs([
      { id: 'gig-1', title: 'Gig A', start: '2026-10-10T18:00:00Z', end: '2026-10-10T22:00:00Z' },
      { id: 'gig-2', title: 'Gig B', start: '2026-10-10T20:00:00Z', end: '2026-10-11T00:00:00Z' },
    ], 'org-1');
    const equipment = result.filter((c) => c.type === 'equipment');
    expect(equipment.map((c) => c.gig_id).sort()).toEqual(['gig-1', 'gig-2']);
    expect(equipment[0].details.items_short[0]).toMatchObject({ item_name: 'Chauvet Intimidator Trio', needed: 8, available: 6, short: 2 });
  });
});

describe('getEquipmentNeeded (#184)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('rows for this gig against the gigs that overlap it, shortest first; near-but-not-overlapping gigs don\'t count', async () => {
    needs.load.mockResolvedValue({
      ctx: {
        kits: new Map([['light-a', { id: 'light-a', name: 'A', is_container: false }], ['light-b', { id: 'light-b', name: 'B', is_container: false }], ['pa', { id: 'pa', name: 'PA', is_container: false }]]),
        lines: new Map([
          ['light-a', [{ equipment_item_id: 'trio', quantity: 4 }, { equipment_item_id: 'k12', quantity: 2 }]],
          ['light-b', [{ equipment_item_id: 'trio', quantity: 4 }]],
          ['pa', [{ equipment_item_id: 'k12', quantity: 6 }]],
        ]),
        assetItem: new Map(),
      },
      counts: new Map([
        ['trio', { name: 'Chauvet Intimidator Trio', owned: 6, available: 6, inMaintenance: 0, inContainers: 0 }],
        ['k12', { name: 'QSC K12.2', owned: 6, available: 5, inMaintenance: 1, inContainers: 0 }],
      ]),
    });
    const tableResponses: Record<string, any> = {
      gig_kit_assignments: { data: [{ kit_id: 'light-a', organization_id: 'org-1' }], error: null },
      gigs: { data: [
        { id: 'gig-2', start: '2026-10-10T18:00:00Z', end: '2026-10-10T23:00:00Z', kit_assignments: [{ kit_id: 'light-b', organization_id: 'org-1' }] },
        // Ends two hours before this gig starts: a warning elsewhere, but not counted here.
        { id: 'gig-3', start: '2026-10-10T11:00:00Z', end: '2026-10-10T17:00:00Z', kit_assignments: [{ kit_id: 'pa', organization_id: 'org-1' }] },
      ], error: null },
    };
    (createClient as any).mockReturnValue({ from: vi.fn((t: string) => createQueryBuilder(tableResponses[t] || { data: [], error: null })) });
    const { getEquipmentNeeded } = await import('./conflictDetection.service');

    const result = await getEquipmentNeeded('gig-1', '2026-10-10T19:00:00Z', '2026-10-10T23:00:00Z', undefined, 'org-1');
    expect(result.overlapping).toBe(1);
    expect(result.rows.map((r) => [r.name, r.thisGig, r.overlapping, r.needed, r.free, r.status])).toEqual([
      ['Chauvet Intimidator Trio', 4, 4, 8, 6, 'short'],
      ['QSC K12.2', 2, 0, 2, 5, 'enough'],
    ]);
  });
});

// #230 review: peak concurrent demand, one entry per side, the viewing organization only.
describe('per-item conflicts: review fixes (#184)', () => {
  const ctxFor = (lines: Record<string, number>, available: number) => ({
    ctx: {
      kits: new Map(Object.keys(lines).map((id) => [id, { id, name: id, is_container: false }])),
      lines: new Map(Object.entries(lines).map(([id, n]) => [id, [{ equipment_item_id: 'trio', quantity: n }]])),
      assetItem: new Map(),
    },
    counts: new Map([['trio', { name: 'Trio', owned: available, available, inMaintenance: 0, inContainers: 0 }]]),
  });
  const gigRow = (id: string, from: string, to: string, kit: string, org = 'org-1') =>
    ({ id, title: id, start: `2026-10-10T${from}:00Z`, end: `2026-10-10T${to}:00Z`, kit_assignments: [{ kit_id: kit, organization_id: org, kit: { id: kit, name: kit } }] });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('gigs that overlap this one but not each other don\'t add up (peak, not sum)', async () => {
    needs.load.mockResolvedValue(ctxFor({ mine: 1, morning: 4, evening: 4 }, 5));
    const tableResponses: Record<string, any> = {
      gig_kit_assignments: { data: [{ kit_id: 'mine', organization_id: 'org-1' }], error: null },
      gigs: { data: [gigRow('morning', '10:00', '13:00', 'morning'), gigRow('evening', '18:00', '23:00', 'evening')], error: null },
    };
    (createClient as any).mockReturnValue({ from: vi.fn((t: string) => createQueryBuilder(tableResponses[t] || { data: [], error: null })) });
    const { checkEquipmentConflicts, getEquipmentNeeded } = await import('./conflictDetection.service');

    const result = await checkEquipmentConflicts('gig-1', '2026-10-10T10:00:00Z', '2026-10-10T23:00:00Z', undefined, 'org-1');
    expect(result.conflicts).toHaveLength(0);
    const needed = await getEquipmentNeeded('gig-1', '2026-10-10T10:00:00Z', '2026-10-10T23:00:00Z', undefined, 'org-1');
    expect(needed.rows[0]).toMatchObject({ thisGig: 1, overlapping: 4, needed: 5, short: 0 });
  });

  it('counts only the viewing organization\'s kits', async () => {
    needs.load.mockResolvedValue(ctxFor({ mine: 4, theirs: 4, other: 4 }, 6));
    const tableResponses: Record<string, any> = {
      gig_kit_assignments: { data: [{ kit_id: 'mine', organization_id: 'org-1' }, { kit_id: 'theirs', organization_id: 'org-2' }], error: null },
      gigs: { data: [gigRow('other', '18:00', '23:00', 'other', 'org-2')], error: null },
    };
    (createClient as any).mockReturnValue({ from: vi.fn((t: string) => createQueryBuilder(tableResponses[t] || { data: [], error: null })) });
    const { checkEquipmentConflicts, getEquipmentNeeded } = await import('./conflictDetection.service');

    expect((await checkEquipmentConflicts('gig-1', '2026-10-10T18:00:00Z', '2026-10-10T23:00:00Z', undefined, 'org-1')).conflicts).toHaveLength(0);
    const needed = await getEquipmentNeeded('gig-1', '2026-10-10T18:00:00Z', '2026-10-10T23:00:00Z', undefined, 'org-1');
    expect(needed).toMatchObject({ overlapping: 0, rows: [{ thisGig: 4, needed: 4 }] });
    expect(needs.load).toHaveBeenLastCalledWith(['mine'], 'org-1');
  });

  it('batch: the same-unit check counts only the viewing organization\'s kits (#230 follow-up)', async () => {
    // Another org's kit on gig B holds the same PD-20 as ours on gig A: not our conflict.
    (createClient as any).mockReturnValue(createBatchMock([
      { table: 'gig_kit_assignments', response: { data: [
        { gig_id: 'A', kit_id: 'ours', organization_id: 'org-1', kit: { id: 'ours', name: 'Main PA' } },
        { gig_id: 'B', kit_id: 'theirs', organization_id: 'org-2', kit: { id: 'theirs', name: 'Their PA' } },
        { gig_id: 'B', kit_id: 'ours-too', organization_id: 'org-1', kit: { id: 'ours-too', name: 'Monitors' } },
      ], error: null } },
      { table: 'kit_flattened_cache', response: { data: [
        { kit_id: 'ours', asset_id: 'pd20', asset: { manufacturer_model: 'PD-20', tag_number: 'T1' } },
        { kit_id: 'theirs', asset_id: 'pd20', asset: { manufacturer_model: 'PD-20', tag_number: 'T1' } },
        { kit_id: 'ours-too', asset_id: 'wedge', asset: { manufacturer_model: 'Wedge', tag_number: 'T2' } },
      ], error: null } },
    ]));
    const { checkAllConflictsForGigs } = await import('./conflictDetection.service');

    const result = await checkAllConflictsForGigs([
      { id: 'A', title: 'A', start: '2026-10-10T10:00:00Z', end: '2026-10-10T13:00:00Z' },
      { id: 'B', title: 'B', start: '2026-10-10T11:00:00Z', end: '2026-10-10T14:00:00Z' },
    ], 'org-1');
    expect(result.filter((c) => c.type === 'equipment')).toHaveLength(0);
  });

  it('batch: every short pair is reported, each at its own moment, and no entry is empty (#230 follow-up)', async () => {
    // X (10-13) needs 2, Y (12:30-20) needs 2, Z (18-23) needs 3; 3 free. Y is short with X at 12:30
    // (4 of 3) and with Z at 18:00 (5 of 3): both are named, not only the peak's Z. X and Z never meet.
    // (12:30, not 12:00: a 12:00 UTC start marks a date-only gig.)
    needs.load.mockResolvedValue(ctxFor({ kx: 2, ky: 2, kz: 3 }, 3));
    (createClient as any).mockReturnValue(createBatchMock([
      { table: 'gig_kit_assignments', response: { data: [
        { gig_id: 'X', kit_id: 'kx', organization_id: 'org-1', kit: { id: 'kx', name: 'kx' } },
        { gig_id: 'Y', kit_id: 'ky', organization_id: 'org-1', kit: { id: 'ky', name: 'ky' } },
        { gig_id: 'Z', kit_id: 'kz', organization_id: 'org-1', kit: { id: 'kz', name: 'kz' } },
      ], error: null } },
    ]));
    const { checkAllConflictsForGigs } = await import('./conflictDetection.service');

    const result = await checkAllConflictsForGigs([
      { id: 'X', title: 'X', start: '2026-10-10T10:00:00Z', end: '2026-10-10T13:00:00Z' },
      { id: 'Y', title: 'Y', start: '2026-10-10T12:30:00Z', end: '2026-10-10T20:00:00Z' },
      { id: 'Z', title: 'Z', start: '2026-10-10T18:00:00Z', end: '2026-10-10T23:00:00Z' },
    ], 'org-1');
    const equipment = result.filter((c) => c.type === 'equipment');
    const pair = (gig: string, other: string) => equipment.find((c) => c.gig_id === gig && c.details.other_gig_id === other);
    expect(pair('X', 'Y')?.details.items_short).toMatchObject([{ needed: 4, short: 1, others: [{ gig_title: 'Y' }] }]);
    expect(pair('Y', 'X')?.details.items_short).toMatchObject([{ needed: 4, short: 1, peak_at: '2026-10-10T12:30:00.000Z', others: [{ gig_title: 'X' }] }]);
    expect(pair('Y', 'Z')?.details.items_short).toMatchObject([{ needed: 5, short: 2, peak_at: '2026-10-10T18:00:00.000Z', others: [{ gig_title: 'Z' }] }]);
    expect(pair('X', 'Z')).toBeUndefined();
    for (const c of equipment) expect(c.details.items_short.length + c.details.conflicting_asset_ids.length).toBeGreaterThan(0);
  });

  it('batch: a gig short on its own, with no other gig adding to it, isn\'t a conflict between gigs', async () => {
    needs.load.mockResolvedValue({
      ctx: {
        kits: new Map([['ka', { id: 'ka', name: 'ka', is_container: false }], ['kb', { id: 'kb', name: 'kb', is_container: false }]]),
        lines: new Map([['ka', [{ equipment_item_id: 'small', quantity: 1 }]], ['kb', [{ equipment_item_id: 'trio', quantity: 4 }]]]),
        assetItem: new Map(),
      },
      counts: new Map([
        ['trio', { name: 'Trio', owned: 3, available: 3, inMaintenance: 0, inContainers: 0 }],
        ['small', { name: 'Small', owned: 5, available: 5, inMaintenance: 0, inContainers: 0 }],
      ]),
    });
    (createClient as any).mockReturnValue(createBatchMock([
      { table: 'gig_kit_assignments', response: { data: [
        { gig_id: 'A', kit_id: 'ka', organization_id: 'org-1', kit: { id: 'ka', name: 'ka' } },
        { gig_id: 'B', kit_id: 'kb', organization_id: 'org-1', kit: { id: 'kb', name: 'kb' } },
      ], error: null } },
    ]));
    const { checkAllConflictsForGigs } = await import('./conflictDetection.service');
    const result = await checkAllConflictsForGigs([
      { id: 'A', title: 'A', start: '2026-10-10T10:00:00Z', end: '2026-10-10T13:00:00Z' },
      { id: 'B', title: 'B', start: '2026-10-10T11:00:00Z', end: '2026-10-10T20:00:00Z' },
    ], 'org-1');
    // B alone needs 4 of 3 (its own Equipment needed table says so), but A doesn't ask for any.
    expect(result.filter((c) => c.type === 'equipment')).toEqual([]);
  });

  it('when the counts can\'t be loaded, the other checks still run', async () => {
    needs.load.mockRejectedValue(new Error('network'));
    const tableResponses: Record<string, any> = {
      gig_kit_assignments: { data: [{ kit_id: 'kit-1', organization_id: 'org-1' }], error: null },
      gigs: { data: [gigRow('gig-2', '18:00', '23:00', 'kit-1')], error: null },
      kit_flattened_cache: { data: [{ kit_id: 'kit-1', asset_id: 'asset-1' }], error: null },
    };
    (createClient as any).mockReturnValue({ from: vi.fn((t: string) => createQueryBuilder(tableResponses[t] || { data: [], error: null })) });
    const { checkEquipmentConflicts } = await import('./conflictDetection.service');
    const result = await checkEquipmentConflicts('gig-1', '2026-10-10T18:00:00Z', '2026-10-10T23:00:00Z', undefined, 'org-1');
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].details).toMatchObject({ items_short: [] });
    expect(result.conflicts[0].details.conflicting_kits[0].shared_assets).toHaveLength(1);
  });
});
