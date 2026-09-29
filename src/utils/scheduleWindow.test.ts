import { describe, it, expect } from 'vitest';
import { widenGigToSchedule } from './scheduleWindow';

const gig = { start: '2026-07-12T19:00:00.000Z', end: '2026-07-13T04:00:00.000Z' }; // noon–9 PM PDT

describe('widenGigToSchedule (#12)', () => {
  it('leaves the gig alone when the schedule fits inside it', () => {
    expect(widenGigToSchedule(gig, [{ start_time: '2026-07-12T22:00:00.000Z', end_time: '2026-07-13T01:00:00.000Z' }], false)).toBeNull();
  });

  it('moves the end out to the last item end (or start, when it has no end)', () => {
    expect(widenGigToSchedule(gig, [{ start_time: '2026-07-13T06:30:00.000Z', end_time: null }], false))
      .toEqual({ start: gig.start, end: '2026-07-13T06:30:00.000Z' });
    expect(widenGigToSchedule(gig, [{ start_time: '2026-07-13T03:00:00.000Z', end_time: '2026-07-13T05:00:00.000Z' }], false))
      .toEqual({ start: gig.start, end: '2026-07-13T05:00:00.000Z' });
  });

  it('moves the start back to the earliest item', () => {
    expect(widenGigToSchedule(gig, [{ start_time: '2026-07-12T17:00:00.000Z', end_time: null }], false))
      .toEqual({ start: '2026-07-12T17:00:00.000Z', end: gig.end });
  });

  it('widens both ends at once', () => {
    expect(widenGigToSchedule(gig, [
      { start_time: '2026-07-12T16:00:00.000Z', end_time: null },
      { start_time: '2026-07-13T06:00:00.000Z', end_time: '2026-07-13T07:00:00.000Z' },
    ], false)).toEqual({ start: '2026-07-12T16:00:00.000Z', end: '2026-07-13T07:00:00.000Z' });
  });

  it('never changes an all-day gig', () => {
    expect(widenGigToSchedule(gig, [{ start_time: '2026-07-14T06:30:00.000Z', end_time: null }], true)).toBeNull();
  });

  it('ignores items without a time and invalid dates', () => {
    expect(widenGigToSchedule(gig, [{ start_time: '', end_time: null }, { start_time: 'nope', end_time: null }], false)).toBeNull();
  });
});
