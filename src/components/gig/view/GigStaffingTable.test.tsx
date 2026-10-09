import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import GigStaffingTable from './GigStaffingTable';

describe('GigStaffingTable staff cost (#213)', () => {
  const slots = [{
    id: 'slot-1', role: 'Stage Hand', count: 2,
    staff_assignments: [
      { id: 'a1', user_id: 'u1', status: 'Confirmed', rate: 35, rate_unit: 'hour', fee: null, user: { first_name: 'Sam', last_name: 'Rivera' } },
      { id: 'a2', user_id: 'u2', status: 'Confirmed', rate: 35, rate_unit: 'hour', fee: null, completed_at: '2026-10-12T00:00:00Z', units_completed: 4, user: { first_name: 'Cy', last_name: 'Ng' } },
    ],
  }] as any;

  it('projects a booked rate over the gig hours, like the edit footer', () => {
    render(
      <GigStaffingTable
        slots={slots}
        showAmounts
        // 18:00–03:00 in Los Angeles: 9 hours
        gig={{ start: '2026-10-11T01:00:00Z', end: '2026-10-11T10:00:00Z', timezone: 'America/Los_Angeles' }}
      />,
    );
    expect(screen.getByText('Staff cost · Finalized $140 · Projected $315 · Total $455')).toBeInTheDocument();
  });

  it('shows cents in the footer: $1,582.50, not $1,582.5 (#219)', () => {
    const big = [{
      id: 'slot-2', role: 'Stage Hand', count: 1,
      staff_assignments: [{ id: 'a3', user_id: 'u3', status: 'Confirmed', fee: 1582.5, rate: null, user: { first_name: 'Bo', last_name: 'Li' } }],
    }] as any;
    render(<GigStaffingTable slots={big} showAmounts />);
    expect(screen.getByText('Staff cost · Finalized $0 · Projected $1,582.50 · Total $1,582.50')).toBeInTheDocument();
  });
});
