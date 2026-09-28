import { describe, it, expect } from 'vitest';
import { isGigPast } from './gigTimeframe';

describe('isGigPast', () => {
  const tz = 'America/Los_Angeles';
  // 2026-09-25 15:00 in Los Angeles (PDT, UTC-7)
  const now = new Date('2026-09-25T22:00:00.000Z');

  it('keeps a gig that started earlier today in Upcoming', () => {
    const gig = { start: '2026-09-25T17:00:00.000Z', end: '2026-09-25T20:00:00.000Z', timezone: tz };
    expect(isGigPast(gig, now)).toBe(false);
  });

  it('keeps a gig with no end that started earlier today in Upcoming', () => {
    expect(isGigPast({ start: '2026-09-25T17:00:00.000Z', timezone: tz }, now)).toBe(false);
  });

  it('marks a gig that ended yesterday in its own timezone as past', () => {
    // Ends 2026-09-24 23:00 PDT, which is already 2026-09-25 in UTC
    const gig = { start: '2026-09-25T02:00:00.000Z', end: '2026-09-25T06:00:00.000Z', timezone: tz };
    expect(isGigPast(gig, now)).toBe(true);
  });

  it('keeps a gig that is still today in its timezone but tomorrow in UTC', () => {
    // 2026-09-25 23:30 PDT == 2026-09-26 06:30 UTC; the gig ended at 21:00 PDT
    const lateNow = new Date('2026-09-26T06:30:00.000Z');
    const gig = { start: '2026-09-26T01:00:00.000Z', end: '2026-09-26T04:00:00.000Z', timezone: tz };
    expect(isGigPast(gig, lateNow)).toBe(false);
  });

  it('keeps a multi-day gig in Upcoming until its last day is over', () => {
    const gig = { start: '2026-09-23T17:00:00.000Z', end: '2026-09-26T05:00:00.000Z', timezone: tz };
    expect(isGigPast(gig, now)).toBe(false);
  });

  it('keeps a future gig in Upcoming', () => {
    expect(isGigPast({ start: '2026-10-01T17:00:00.000Z', timezone: tz }, now)).toBe(false);
  });

  it('uses the UTC date of a date-only gig (stored as noon UTC)', () => {
    expect(isGigPast({ start: '2026-09-25T12:00:00.000Z', timezone: tz }, now)).toBe(false);
    expect(isGigPast({ start: '2026-09-24T12:00:00.000Z', timezone: tz }, now)).toBe(true);
  });

  it('reads a date-only gig by its UTC date even where noon UTC is the next local day', () => {
    // 19:00 on 2026-09-25 in Kiritimati (UTC+14); the gig was dated 2026-09-24
    const kiritimatiNow = new Date('2026-09-25T05:00:00.000Z');
    expect(isGigPast({ start: '2026-09-24T12:00:00.000Z', timezone: 'Pacific/Kiritimati' }, kiritimatiNow)).toBe(true);
  });

  it('falls back to the browser timezone when the gig has none', () => {
    expect(isGigPast({ start: '2020-01-01T17:00:00.000Z', timezone: null }, now)).toBe(true);
    expect(isGigPast({ start: '2030-01-01T17:00:00.000Z' }, now)).toBe(false);
  });
});
