import { describe, it, expect } from 'vitest';
import { placementOf, type TrackingRow } from './locations';
import { RETURNED_STATUS } from '../config/inventoryWorkflow';

// #186 / #185: where a unit or lot is, from the append-only tracking history.
// The newest row wins; a lot can be split across gigs ("N from a lot").
const row = (over: Partial<TrackingRow>): TrackingRow => ({
  gig_id: 'gig-a', kit_id: null, asset_id: 'x', status: 'Checked Out', location: null, scanned_at: '2026-10-01T10:00:00Z', quantity: 1, ...over,
});
const unit = { id: 'u1', quantity: 1, tag_number: 'T1', status: 'Active' };
const lot = { id: 'lot', quantity: 10, status: 'Active' };

describe('placementOf (#186)', () => {
  it('a unit with no tracking is at home', () => {
    expect(placementOf([], unit)).toEqual([{ gig_id: null, quantity: 1, status: null, location: null }]);
  });

  it('a unit is wherever its newest row says, across gigs', () => {
    const rows = [
      row({ asset_id: 'u1', gig_id: 'gig-a', status: 'On Site', scanned_at: '2026-10-01T10:00:00Z' }),
      row({ asset_id: 'u1', gig_id: 'gig-b', status: 'Checked Out', location: 'Staging Area', scanned_at: '2026-10-02T10:00:00Z' }),
    ];
    expect(placementOf(rows, unit)).toEqual([{ gig_id: 'gig-b', quantity: 1, status: 'Checked Out', location: 'Staging Area' }]);
  });

  it('a unit whose newest row is a return is at home', () => {
    const rows = [
      row({ asset_id: 'u1', status: 'On Site', scanned_at: '2026-10-01T10:00:00Z' }),
      row({ asset_id: 'u1', status: RETURNED_STATUS, location: 'Warehouse', scanned_at: '2026-10-03T10:00:00Z' }),
    ];
    expect(placementOf(rows, unit)).toEqual([{ gig_id: null, quantity: 1, status: RETURNED_STATUS, location: 'Warehouse' }]);
  });

  it('a lot split across two gigs: N at each, the rest at home', () => {
    const rows = [
      row({ asset_id: 'lot', gig_id: 'gig-a', quantity: 2 }),
      row({ asset_id: 'lot', gig_id: 'gig-b', quantity: 3, status: 'In Transit' }),
    ];
    expect(placementOf(rows, lot)).toEqual([
      { gig_id: null, quantity: 5, status: null, location: null },
      { gig_id: 'gig-a', quantity: 2, status: 'Checked Out', location: null },
      { gig_id: 'gig-b', quantity: 3, status: 'In Transit', location: null },
    ]);
  });

  it('a re-scan of a lot at the same gig replaces its N', () => {
    const rows = [
      row({ asset_id: 'lot', quantity: 4, scanned_at: '2026-10-01T10:00:00Z' }),
      row({ asset_id: 'lot', quantity: 6, status: 'On Site', scanned_at: '2026-10-01T12:00:00Z' }),
    ];
    expect(placementOf(rows, lot).find((p) => p.gig_id === 'gig-a')).toMatchObject({ quantity: 6, status: 'On Site' });
  });

  it('a lot sent back from a gig is all at home again', () => {
    const rows = [
      row({ asset_id: 'lot', quantity: 4, scanned_at: '2026-10-01T10:00:00Z' }),
      row({ asset_id: 'lot', quantity: 4, status: RETURNED_STATUS, scanned_at: '2026-10-04T10:00:00Z' }),
    ];
    expect(placementOf(rows, lot)).toEqual([{ gig_id: null, quantity: 10, status: null, location: null }]);
  });

  it('the same lot at one gig, recorded under a kit and then with no kit, counts once (newest wins)', () => {
    const rows = [
      row({ asset_id: 'lot', kit_id: 'kit-1', quantity: 4, scanned_at: '2026-10-01T10:00:00Z' }),
      row({ asset_id: 'lot', kit_id: null, quantity: 3, scanned_at: '2026-10-01T11:00:00Z' }),
    ];
    expect(placementOf(rows, lot)).toEqual([
      { gig_id: null, quantity: 7, status: null, location: null },
      { gig_id: 'gig-a', quantity: 3, status: 'Checked Out', location: null },
    ]);
  });

  it('two manual moves of the same lot to one gig count once', () => {
    const rows = [
      row({ asset_id: 'lot', quantity: 3, scanned_at: '2026-10-01T10:00:00Z' }),
      row({ asset_id: 'lot', quantity: 3, scanned_at: '2026-10-01T10:05:00Z' }),
    ];
    expect(placementOf(rows, lot).find((p) => p.gig_id === 'gig-a')?.quantity).toBe(3);
  });

  it('more out than the lot holds leaves none at home, never fewer than none', () => {
    const rows = [row({ asset_id: 'lot', gig_id: 'gig-a', quantity: 8 }), row({ asset_id: 'lot', gig_id: 'gig-b', quantity: 5 })];
    const placed = placementOf(rows, lot);
    expect(placed.find((p) => p.gig_id === null)).toBeUndefined();
    expect(placed.reduce((n, p) => n + p.quantity, 0)).toBe(13);
  });

  it('a retired record is nowhere: it is no longer owned', () => {
    expect(placementOf([row({ asset_id: 'u1' })], { ...unit, status: 'Disposed' })).toEqual([]);
    expect(placementOf([row({ asset_id: 'u1' })], { ...unit, retired_on: '2026-09-01' })).toEqual([]);
  });

  it('rows for other records are ignored', () => {
    expect(placementOf([row({ asset_id: 'other' })], unit)).toEqual([{ gig_id: null, quantity: 1, status: null, location: null }]);
  });
});
