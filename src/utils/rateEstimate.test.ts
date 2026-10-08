import { describe, it, expect } from 'vitest';
import { estimateRateUnits, projectedStaffCost } from './rateEstimate';

// America/Los_Angeles is UTC-7 in October (PDT).
const LA = 'America/Los_Angeles';

describe('estimateRateUnits (#213)', () => {
  describe('hourly', () => {
    it('counts the hours from start to end, across midnight: 18:00–03:00 is 9 hr', () => {
      const gig = { start: '2026-10-11T01:00:00Z', end: '2026-10-11T10:00:00Z', timezone: LA };
      expect(estimateRateUnits(gig, 'hour')).toEqual({ units: 9, label: '9 hr' });
    });

    it('rounds to the nearest quarter hour', () => {
      // 14:00–23:20 is 9 h 20 min → 9.25
      const gig = { start: '2026-10-10T21:00:00Z', end: '2026-10-11T06:20:00Z', timezone: LA };
      expect(estimateRateUnits(gig, 'hour')).toEqual({ units: 9.25, label: '9.25 hr' });
      // 14:00–23:30 is 9.5
      expect(estimateRateUnits({ ...gig, end: '2026-10-11T06:30:00Z' }, 'hour').units).toBe(9.5);
    });

    it('falls back to 1 hr, labelled as a placeholder, when the end is missing', () => {
      const gig = { start: '2026-10-11T01:00:00Z', end: null, timezone: LA };
      expect(estimateRateUnits(gig, 'hour')).toEqual({ units: 1, label: '1 hr (no end time)' });
    });

    it('falls back to 1 hr when the end is not after the start', () => {
      const gig = { start: '2026-10-11T01:00:00Z', end: '2026-10-11T01:00:00Z', timezone: LA };
      expect(estimateRateUnits(gig, 'hour')).toEqual({ units: 1, label: '1 hr (no end time)' });
    });

    it('falls back to 1 hr for a date-only gig, which has no times', () => {
      const gig = { start: '2026-10-10T12:00:00.000Z', end: '2026-10-11T12:00:00.000Z', timezone: LA };
      expect(estimateRateUnits(gig, 'hour')).toEqual({ units: 1, label: '1 hr (no times)' });
    });

    it('treats a missing unit as hourly (rows saved before #171)', () => {
      const gig = { start: '2026-10-11T01:00:00Z', end: '2026-10-11T10:00:00Z', timezone: LA };
      expect(estimateRateUnits(gig, null)).toEqual({ units: 9, label: '9 hr' });
    });
  });

  describe('per day', () => {
    it('counts each calendar day of a 2-day gig', () => {
      // Oct 10 09:00 → Oct 11 16:30 local
      const gig = { start: '2026-10-10T16:00:00Z', end: '2026-10-11T23:30:00Z', timezone: LA };
      expect(estimateRateUnits(gig, 'day')).toEqual({ units: 2, label: '2 days' });
    });

    it('counts a one-day gig as 1 day', () => {
      const gig = { start: '2026-10-10T21:00:00Z', end: '2026-10-11T06:30:00Z', timezone: LA };
      expect(estimateRateUnits(gig, 'day')).toEqual({ units: 1, label: '1 day' });
    });

    it('counts an overnight gig ending before 06:00 the next morning as 1 day', () => {
      // Oct 10 18:00 → Oct 11 02:00 local
      const gig = { start: '2026-10-11T01:00:00Z', end: '2026-10-11T09:00:00Z', timezone: LA };
      expect(estimateRateUnits(gig, 'day')).toEqual({ units: 1, label: '1 day' });
    });

    it('counts an end at 06:00 or later the next morning as a second day', () => {
      // Oct 10 18:00 → Oct 11 06:00 local
      const gig = { start: '2026-10-11T01:00:00Z', end: '2026-10-11T13:00:00Z', timezone: LA };
      expect(estimateRateUnits(gig, 'day').units).toBe(2);
    });

    it('does not count the small hours after the last night of a multi-day gig', () => {
      // Oct 10 18:00 → Oct 12 02:00 local: two nights, two days
      const gig = { start: '2026-10-11T01:00:00Z', end: '2026-10-12T09:00:00Z', timezone: LA };
      expect(estimateRateUnits(gig, 'day').units).toBe(2);
    });

    it("counts days in the gig's timezone, not UTC", () => {
      // Tokyo (UTC+9): Oct 10 08:00 → 22:00 local is one day, though in UTC it
      // runs Oct 9 23:00 → Oct 10 13:00.
      const gig = { start: '2026-10-09T23:00:00Z', end: '2026-10-10T13:00:00Z', timezone: 'Asia/Tokyo' };
      expect(estimateRateUnits(gig, 'day').units).toBe(1);
      // The same instants in New York (UTC-4) are Oct 9 19:00 → Oct 10 09:00: two days.
      expect(estimateRateUnits({ ...gig, timezone: 'America/New_York' }, 'day').units).toBe(2);
    });

    it('counts 1 day when the end is missing', () => {
      const gig = { start: '2026-10-11T01:00:00Z', end: null, timezone: LA };
      expect(estimateRateUnits(gig, 'day')).toEqual({ units: 1, label: '1 day' });
    });

    it('counts the dates of a date-only gig', () => {
      const gig = { start: '2026-10-10T12:00:00.000Z', end: '2026-10-11T12:00:00.000Z', timezone: LA };
      expect(estimateRateUnits(gig, 'day').units).toBe(2);
    });
  });

  describe('per half day', () => {
    it('is one per gig day: 1 on a one-day gig', () => {
      const gig = { start: '2026-10-10T21:00:00Z', end: '2026-10-11T06:30:00Z', timezone: LA };
      expect(estimateRateUnits(gig, 'half_day')).toEqual({ units: 1, label: '1 half day' });
    });

    it('is 2 on a 2-day gig', () => {
      const gig = { start: '2026-10-10T16:00:00Z', end: '2026-10-11T23:30:00Z', timezone: LA };
      expect(estimateRateUnits(gig, 'half_day')).toEqual({ units: 2, label: '2 half days' });
    });
  });
});

describe('projectedStaffCost (#213)', () => {
  const gig = { start: '2026-10-11T01:00:00Z', end: '2026-10-11T10:00:00Z', timezone: LA }; // 9 hr, 1 day

  it('multiplies a rate by the estimated units and says how', () => {
    expect(projectedStaffCost({ rate: 35, fee: null, rate_unit: 'hour' }, gig)).toEqual({
      amount: 315,
      label: 'est. 9 hr × $35.00 / hr = $315.00',
    });
    expect(projectedStaffCost({ rate: 400, fee: null, rate_unit: 'day' }, gig).label).toBe('est. 1 day × $400.00 / day = $400.00');
    expect(projectedStaffCost({ rate: 200, fee: null, rate_unit: 'half_day' }, gig).label).toBe('est. 1 half day × $200.00 / ½ day = $200.00');
  });

  it('keeps a fee at its flat amount', () => {
    expect(projectedStaffCost({ rate: null, fee: 350, rate_unit: 'hour' }, gig)).toEqual({ amount: 350, label: '$350.00' });
  });

  it('is zero with neither', () => {
    expect(projectedStaffCost({ rate: null, fee: null }, gig)).toEqual({ amount: 0, label: '$0.00' });
  });

  it('shows the placeholder when the gig has no end', () => {
    expect(projectedStaffCost({ rate: 35, fee: null, rate_unit: 'hour' }, { ...gig, end: null })).toEqual({
      amount: 35,
      label: 'est. 1 hr (no end time) × $35.00 / hr = $35.00',
    });
  });

  it('reads a rate given as a string', () => {
    expect(projectedStaffCost({ rate: '35' as any, fee: null, rate_unit: 'hour' }, gig).amount).toBe(315);
  });
});
