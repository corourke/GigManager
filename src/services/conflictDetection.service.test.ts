import { vi, describe, it, expect, beforeEach } from 'vitest';
import { createClient } from '../utils/supabase/client';

vi.mock('../utils/supabase/client', () => ({
  createClient: vi.fn(),
}));

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

      const result = await checkEquipmentConflicts('gig-1', '2026-03-01T18:00:00Z', '2026-03-01T22:00:00Z');
      expect(result).toEqual({ conflicts: [], warnings: [] });
    });

    it('should detect equipment conflict when same kit assigned to overlapping gigs', async () => {
      const tableResponses: Record<string, any> = {
        gig_kit_assignments: { data: [{ kit_id: 'kit-1' }], error: null },
        gigs: {
          data: [{
            id: 'gig-2', title: 'Other Gig',
            start: '2026-03-01T19:00:00Z', end: '2026-03-01T23:00:00Z',
            kit_assignments: [{ kit: { id: 'kit-1', name: 'PA System', kit_assets: [] } }]
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
      const { checkEquipmentConflicts } = await import('./conflictDetection.service');

      const result = await checkEquipmentConflicts('gig-1', '2026-03-01T18:00:00Z', '2026-03-01T22:00:00Z');
      expect(result.conflicts.length).toBe(1);
      expect(result.conflicts[0].type).toBe('equipment');
      expect(result.conflicts[0].details.conflicting_kits[0].kit_name).toBe('PA System');
    });
  });

  describe('checkAllConflictsForGigs (batch)', () => {
    it('should return empty array for empty gig list', async () => {
      mockSupabase = createBatchMock([]);
      (createClient as any).mockReturnValue(mockSupabase);
      const { checkAllConflictsForGigs } = await import('./conflictDetection.service');

      const result = await checkAllConflictsForGigs([]);
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

      const result = await checkAllConflictsForGigs(gigs);
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

      const result = await checkAllConflictsForGigs(gigs);
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
              { gig_id: 'gig-1', kit_id: 'kit-1' },
              { gig_id: 'gig-2', kit_id: 'kit-1' },
            ],
            error: null,
          },
        },
      ]);
      (createClient as any).mockReturnValue(mockSupabase);
      const { checkAllConflictsForGigs } = await import('./conflictDetection.service');

      const result = await checkAllConflictsForGigs(gigs);
      const equipConflicts = result.filter(c => c.type === 'equipment');
      expect(equipConflicts.length).toBe(2);
      expect(equipConflicts[0].details.conflicting_kit_ids).toContain('kit-1');
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

      const result = await checkAllConflictsForGigs(gigs);
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

      const result = await checkAllConflictsForGigs(gigs);
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

      const result = await checkAllConflictsForGigs(gigs);
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

      const result = await checkAllConflictsForGigs(gigs);
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
              { gig_id: 'gig-1', kit_id: 'kit-1' },
              { gig_id: 'gig-2', kit_id: 'kit-1' },
            ],
            error: null,
          },
        },
      ]);
      (createClient as any).mockReturnValue(mockSupabase);
      const { checkAllConflictsForGigs } = await import('./conflictDetection.service');

      const result = await checkAllConflictsForGigs(gigs);
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

      const result = await checkAllConflictsForGigs(gigs);
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

      const result = await checkAllConflictsForGigs(gigs);
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

      const result = await checkAllConflictsForGigs(gigs);
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

      const result = await checkAllConflictsForGigs(gigs);
      const staffConflicts = result.filter(c => c.type === 'staff');
      expect(staffConflicts.length).toBe(2);
      expect(staffConflicts.some(c => c.gig_id === 'gig-1')).toBe(true);
      expect(staffConflicts.some(c => c.gig_id === 'gig-2')).toBe(true);
      expect(staffConflicts.some(c => c.gig_id === 'gig-3')).toBe(false);
    });
  });
});
