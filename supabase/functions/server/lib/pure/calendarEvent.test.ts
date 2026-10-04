import { describe, it, expect } from 'vitest';
import { buildCalendarEvent } from './calendarEvent';

// Issue #117: every synced gig is an all-day Google Calendar event in the
// gig's local dates, with the times and venue at the top of the description.
const LINK = 'https://app.example/gigs/gig-1';
const venue = { name: 'Riverside Amphitheater', address_line1: '1200 Waterfront Dr', city: 'Portland' };
const LA = 'America/Los_Angeles';

describe('buildCalendarEvent', () => {
  it('makes a one-day gig an all-day event with its times and venue first', () => {
    const event = buildCalendarEvent(
      { title: 'Summer Show', start: '2026-07-11T02:00:00Z', end: '2026-07-11T06:30:00Z', timezone: LA, notes: 'Load in at 4.' },
      venue,
      LINK,
    );

    expect(event.start).toEqual({ date: '2026-07-10' });
    expect(event.end).toEqual({ date: '2026-07-11' });
    expect(event.summary).toBe('Summer Show');
    expect(event.location).toBe('Riverside Amphitheater, 1200 Waterfront Dr, Portland');
    expect(event.description).toBe(
      '7:00 PM – 11:30 PM PDT\nRiverside Amphitheater, 1200 Waterfront Dr, Portland\n\nLoad in at 4.\n\n' +
      `[View in GigWrangler](${LINK})`,
    );
  });

  it('runs a gig that ends past midnight local time through its end date', () => {
    // 9:00 PM Oct 3 to 1:30 AM Oct 4, Los Angeles.
    const event = buildCalendarEvent(
      { title: 'Late Set', start: '2026-10-04T04:00:00Z', end: '2026-10-04T08:30:00Z', timezone: LA },
      venue,
      LINK,
    );

    expect(event.start).toEqual({ date: '2026-10-03' });
    expect(event.end).toEqual({ date: '2026-10-05' });
    expect(event.description.split('\n')[0]).toBe('Oct 3, 9:00 PM – Oct 4, 1:30 AM PDT');
  });

  it('does not spill into the next day when a gig ends at exactly midnight', () => {
    const event = buildCalendarEvent(
      { title: 'Ends at Midnight', start: '2026-10-04T02:00:00Z', end: '2026-10-04T07:00:00Z', timezone: LA },
      null,
      LINK,
    );

    expect(event.start).toEqual({ date: '2026-10-03' });
    expect(event.end).toEqual({ date: '2026-10-04' });
  });

  it('covers every day of a multi-day gig, Google end date exclusive', () => {
    // Fri Oct 9 10:00 AM to Sun Oct 11 6:00 PM, Los Angeles.
    const event = buildCalendarEvent(
      { title: 'Festival', start: '2026-10-09T17:00:00Z', end: '2026-10-12T01:00:00Z', timezone: LA },
      venue,
      LINK,
    );

    expect(event.start).toEqual({ date: '2026-10-09' });
    expect(event.end).toEqual({ date: '2026-10-12' });
    expect(event.description.split('\n')[0]).toBe('Oct 9, 10:00 AM – Oct 11, 6:00 PM PDT');
  });

  it('uses the local date when it differs from the UTC date', () => {
    // 8:00 AM Oct 10 in Auckland is still Oct 9 in UTC.
    const event = buildCalendarEvent(
      { title: 'Morning Gig', start: '2026-10-09T19:00:00Z', end: '2026-10-09T23:00:00Z', timezone: 'Pacific/Auckland' },
      venue,
      LINK,
    );

    expect(event.start).toEqual({ date: '2026-10-10' });
    expect(event.end).toEqual({ date: '2026-10-11' });
  });

  it('leaves out the venue line and location when the gig has no venue', () => {
    const event = buildCalendarEvent(
      { title: 'No Venue', start: '2026-07-11T02:00:00Z', end: '2026-07-11T06:30:00Z', timezone: LA, notes: null },
      null,
      LINK,
    );

    expect(event.location).toBeUndefined();
    expect(event.description).toBe(`7:00 PM – 11:30 PM PDT\n\n[View in GigWrangler](${LINK})`);
  });

  it('keeps the UTC dates of a gig marked all-day by its noon-UTC start, with no times line', () => {
    // The app's all-day convention; in Auckland noon UTC is already the next day.
    const event = buildCalendarEvent(
      { title: 'All Day', start: '2026-10-10T12:00:00.000Z', end: '2026-10-11T12:00:00.000Z', timezone: 'Pacific/Auckland', notes: 'Bring tarps.' },
      null,
      LINK,
    );

    expect(event.start).toEqual({ date: '2026-10-10' });
    expect(event.end).toEqual({ date: '2026-10-12' });
    expect(event.description).toBe(`Bring tarps.\n\n[View in GigWrangler](${LINK})`);
  });

  it('treats a gig with no end as one day and shows only its start time', () => {
    const event = buildCalendarEvent(
      { title: 'Open Ended', start: '2026-07-11T02:00:00Z', end: null, timezone: LA },
      null,
      LINK,
    );

    expect(event.start).toEqual({ date: '2026-07-10' });
    expect(event.end).toEqual({ date: '2026-07-11' });
    expect(event.description.split('\n')[0]).toBe('7:00 PM PDT');
  });

  it('never sends timed start or end fields', () => {
    const event = buildCalendarEvent(
      { title: 'Any', start: '2026-07-11T02:00:00Z', end: '2026-07-11T06:30:00Z', timezone: LA },
      venue,
      LINK,
    );

    expect(Object.keys(event.start)).toEqual(['date']);
    expect(Object.keys(event.end)).toEqual(['date']);
  });
});
