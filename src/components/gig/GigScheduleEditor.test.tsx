import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import GigScheduleEditor from './GigScheduleEditor';

vi.mock('../../services/gigSchedule.service', () => ({
  getGigScheduleEntries: vi.fn().mockResolvedValue([
    { id: 'e1', gig_id: 'g', activity_type: 'Load-In', label: null, start_time: '2026-07-12T19:00:00Z', end_time: null, act_participant_id: null, notes: null, sort_order: 0 },
    { id: 'e2', gig_id: 'g', activity_type: 'Rehearsal', label: null, start_time: '2026-07-12T20:00:00Z', end_time: null, act_participant_id: null, notes: null, sort_order: 1 },
  ]),
  updateGigScheduleEntries: vi.fn().mockResolvedValue({}),
}));
vi.mock('../../services/gig.service', () => ({ getGigParticipants: vi.fn().mockResolvedValue([]) }));

// #12: schedule item types are free text; the UI offers these defaults.
const DEFAULTS = ['Load-In', 'Act Arrival', 'Soundcheck', 'Doors', 'Set', 'Load-Out', 'Return'];

describe('GigScheduleEditor item choices (#12)', () => {
  it('offers the default schedule items plus Custom', async () => {
    render(<GigScheduleEditor gigId="g" gigStart="2026-07-12T19:00:00Z" />);
    const selects = await screen.findAllByRole('combobox');
    const options = within(selects[0]).getAllByRole('option').map((o) => o.textContent);
    expect(options).toEqual([...DEFAULTS, 'Custom...']);
  });

  it('still shows an existing item whose type is not a default', async () => {
    render(<GigScheduleEditor gigId="g" gigStart="2026-07-12T19:00:00Z" />);
    const selects = await screen.findAllByRole('combobox');
    expect((selects[1] as HTMLSelectElement).value).toBe('Rehearsal');
  });
});
