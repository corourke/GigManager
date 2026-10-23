import { describe, it, expect } from 'vitest';
import { whereCardText, whereTheyAreLines } from './whereaboutText';

// #186: how an item's places read on the Locations "where is it" card and the Item page's
// "Where they are". Step 4 adds maintenance: in maintenance at its location, or flagged.
const at = (over: Record<string, unknown>) => ({ gig_id: null, gig_title: null, location: null, quantity: 1, ...over });

describe('whereabout text (#186)', () => {
  const places = [
    at({ gig_id: 'g1', gig_title: 'Harvest Gala', location: 'Stage', quantity: 4, maintenance: 'flagged', flagged: 2 }),
    at({ gig_id: 'g2', gig_title: 'Fall Fest', quantity: 1 }),
    at({ location: 'Bay 2', quantity: 3 }),
    at({ quantity: 2 }),
    at({ location: 'Repair Bench', quantity: 1, maintenance: 'in' }),
    at({ quantity: 1, maintenance: 'in' }),
  ];

  it('the card reads each place, with maintenance', () => {
    expect(whereCardText(places)).toBe([
      '4 at Harvest Gala (Stage), 2 flagged to maintenance',
      '1 at Fall Fest',
      '3 at Bay 2',
      '2 not checked out',
      '1 in maintenance · Repair Bench',
      '1 in maintenance',
    ].join(' · '));
  });

  it('the Item page lists each place, with maintenance', () => {
    expect(whereTheyAreLines(places)).toEqual([
      '4 · Harvest Gala (Stage) · 2 flagged to maintenance',
      '1 · Fall Fest',
      '3 · Bay 2',
      '2 · Not checked out',
      '1 · In maintenance · Repair Bench',
      '1 · In maintenance',
    ]);
  });
});
