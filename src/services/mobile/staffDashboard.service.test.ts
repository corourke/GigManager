import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createClient } from '../../utils/supabase/client';
import { fetchMyUpcomingAssignments } from './staffDashboard.service';

vi.mock('../../utils/supabase/client', () => ({ createClient: vi.fn() }));

// #20 batch 6: characterization of the staff dashboard load before it moves onto the shared base.
function query(result: { data: any; error: any }) {
  const q: any = {};
  for (const m of ['select', 'eq', 'neq', 'gte', 'lte', 'not', 'in', 'order']) q[m] = vi.fn().mockReturnValue(q);
  q.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject);
  return q;
}

const assignment = (id: string, gigId: string, start: string, role: string | null) => ({
  id, status: 'Confirmed', rate: 25, fee: null, confirmed_at: null,
  slot: { gig_id: gigId, staff_role: role ? { name: role } : null, gig: { id: gigId, title: `Gig ${gigId}`, start, end: start, timezone: 'America/Chicago', status: 'Booked' } },
});

describe('fetchMyUpcomingAssignments', () => {
  let supabase: any;
  let tables: Record<string, any>;

  beforeEach(() => {
    vi.clearAllMocks();
    tables = {};
    supabase = {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
      from: vi.fn((t: string) => tables[t]),
    };
    (createClient as any).mockReturnValue(supabase);
  });

  it("loads the signed-in user's assignments with venue and schedule, soonest first", async () => {
    tables.gig_staff_assignments = query({ data: [
      assignment('a2', 'g2', '2026-10-25T20:00:00Z', null),
      assignment('a1', 'g1', '2026-10-24T20:00:00Z', 'A1 Audio'),
    ], error: null });
    tables.gig_participants = query({ data: [
      { gig_id: 'g1', organization: { name: 'The Blue Room', address_line1: '1 Main St', phone_number: null } },
      { gig_id: 'g1', organization: { name: 'Second Venue' } },
    ], error: null });
    tables.gig_schedule_entries = query({ data: [{ id: 's1', gig_id: 'g1', title: 'Doors' }], error: null });

    const result = await fetchMyUpcomingAssignments();
    const a = tables.gig_staff_assignments;
    expect(a.eq).toHaveBeenCalledWith('user_id', 'u1');
    expect(a.neq).toHaveBeenCalledWith('status', 'Declined');
    expect(a.not).toHaveBeenCalledWith('slot.gig.status', 'in', '(Cancelled,Settled)');
    expect(tables.gig_participants.eq).toHaveBeenCalledWith('role', 'Venue');
    expect(result.map(r => r.gig.id)).toEqual(['g1', 'g2']);
    expect(result[0]).toEqual({
      gig: { id: 'g1', title: 'Gig g1', start: '2026-10-24T20:00:00Z', end: '2026-10-24T20:00:00Z', timezone: 'America/Chicago', status: 'Booked' },
      assignment: { id: 'a1', status: 'Confirmed', rate: 25, fee: null, confirmed_at: null },
      role_name: 'A1 Audio',
      venue: { name: 'The Blue Room', address_line1: '1 Main St', phone_number: undefined },
      schedule_entries: [{ id: 's1', gig_id: 'g1', title: 'Doors' }],
    });
    expect(result[1].role_name).toBe('Staff');
    expect(result[1].venue).toBeUndefined();
    expect(result[1].schedule_entries).toEqual([]);
  });

  it('returns nothing without further reads when there are no assignments', async () => {
    tables.gig_staff_assignments = query({ data: [], error: null });
    expect(await fetchMyUpcomingAssignments()).toEqual([]);
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });

  it('rejects when no one is signed in, and reads nothing', async () => {
    supabase.auth.getUser.mockResolvedValue({ data: { user: null } });
    await expect(fetchMyUpcomingAssignments()).rejects.toThrow();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('rejects when the assignments query fails', async () => {
    tables.gig_staff_assignments = query({ data: null, error: { message: 'boom' } });
    await expect(fetchMyUpcomingAssignments()).rejects.toThrow();
  });
});
