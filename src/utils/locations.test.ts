import { describe, it, expect } from 'vitest';
import { bucketsAt, currentRows, placementOf, type TrackingRow } from './locations';
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

  it('a lot sent back from a gig is all at home again, at the return row\'s location', () => {
    const rows = [
      row({ asset_id: 'lot', quantity: 4, scanned_at: '2026-10-01T10:00:00Z' }),
      row({ asset_id: 'lot', quantity: 4, status: RETURNED_STATUS, location: 'Warehouse', scanned_at: '2026-10-04T10:00:00Z' }),
    ];
    expect(placementOf(rows, lot)).toEqual([{ gig_id: null, quantity: 10, status: RETURNED_STATUS, location: 'Warehouse' }]);
  });

  it('a lot split across kits at one gig counts every kit (dev: XLR 50 ft, 2 in FOH + 4 in the cable box)', () => {
    const rows = [
      row({ asset_id: 'lot', kit_id: 'foh', quantity: 2, scanned_at: '2026-10-01T10:00:00Z' }),
      row({ asset_id: 'lot', kit_id: 'cable-box', quantity: 4, scanned_at: '2026-10-01T10:05:00Z' }),
    ];
    expect(placementOf(rows, lot)).toEqual([
      { gig_id: null, quantity: 4, status: null, location: null },
      { gig_id: 'gig-a', quantity: 6, status: 'Checked Out', location: null },
    ]);
  });

  it('a no-kit manual move is its own bucket; a lot re-recorded under another kit counts in both until one is returned', () => {
    const rows = [
      row({ asset_id: 'lot', kit_id: 'kit-1', quantity: 4, scanned_at: '2026-10-01T10:00:00Z' }),
      row({ asset_id: 'lot', kit_id: null, quantity: 3, scanned_at: '2026-10-01T11:00:00Z' }),
    ];
    expect(placementOf(rows, lot).find((p) => p.gig_id === 'gig-a')?.quantity).toBe(7);
    const returned = [...rows, row({ asset_id: 'lot', kit_id: 'kit-1', quantity: 4, status: RETURNED_STATUS, scanned_at: '2026-10-02T10:00:00Z' })];
    expect(placementOf(returned, lot).find((p) => p.gig_id === 'gig-a')?.quantity).toBe(3);
  });

  it('a lot at an old gig stays there until it is returned', () => {
    const rows = [
      row({ asset_id: 'lot', gig_id: 'old-gig', quantity: 2, status: 'On Site', scanned_at: '2026-09-01T10:00:00Z' }),
      row({ asset_id: 'lot', gig_id: 'gig-b', quantity: 3, scanned_at: '2026-10-01T10:00:00Z' }),
    ];
    expect(placementOf(rows, lot).find((p) => p.gig_id === 'old-gig')?.quantity).toBe(2);
  });

  it('times are compared as instants, not strings (offsets like -07:00)', () => {
    // 10:00-07:00 is 17:00Z: after 12:00Z, though it sorts first as a string.
    const rows = [
      row({ asset_id: 'u1', gig_id: 'gig-b', scanned_at: '2026-10-01T12:00:00Z' }),
      row({ asset_id: 'u1', gig_id: 'gig-a', scanned_at: '2026-10-01T10:00:00-07:00' }),
    ];
    expect(placementOf(rows, unit)[0].gig_id).toBe('gig-a');
  });

  it('ties on scanned_at break by created_at, then id, like compareTrackingRecords', () => {
    const at = '2026-10-01T10:00:00Z';
    const byCreated = [
      row({ asset_id: 'u1', gig_id: 'gig-b', scanned_at: at, created_at: '2026-10-01T10:00:02Z', id: 'a' }),
      row({ asset_id: 'u1', gig_id: 'gig-a', scanned_at: at, created_at: '2026-10-01T10:00:01Z', id: 'z' }),
    ];
    expect(placementOf(byCreated, unit)[0].gig_id).toBe('gig-b');
    expect(placementOf([...byCreated].reverse(), unit)[0].gig_id).toBe('gig-b');
    const byId = [
      row({ asset_id: 'u1', gig_id: 'gig-b', scanned_at: at, created_at: at, id: 'b' }),
      row({ asset_id: 'u1', gig_id: 'gig-a', scanned_at: at, created_at: at, id: 'a' }),
    ];
    expect(placementOf(byId, unit)[0].gig_id).toBe('gig-b');
    expect(placementOf([...byId].reverse(), unit)[0].gig_id).toBe('gig-b');
  });

  it('gives the same answer whatever order the rows come in', () => {
    const rows = [
      row({ asset_id: 'lot', kit_id: 'k1', quantity: 2, scanned_at: '2026-10-01T10:00:00Z' }),
      row({ asset_id: 'lot', kit_id: 'k1', quantity: 5, status: 'On Site', scanned_at: '2026-10-01T12:00:00Z' }),
      row({ asset_id: 'lot', kit_id: 'k2', quantity: 1, scanned_at: '2026-10-01T11:00:00Z' }),
      row({ asset_id: 'lot', gig_id: 'gig-b', quantity: 3, scanned_at: '2026-10-02T10:00:00Z' }),
    ];
    const expected = placementOf(rows, lot);
    expect(placementOf([...rows].reverse(), lot)).toEqual(expected);
    expect(placementOf([rows[2], rows[0], rows[3], rows[1]], lot)).toEqual(expected);
    expect(expected.find((p) => p.gig_id === 'gig-a')).toMatchObject({ quantity: 6, status: 'On Site' });
  });

  it('a kit-only row (asset_id null) says nothing about a record', () => {
    expect(placementOf([row({ asset_id: null, kit_id: 'case', quantity: 1 })], lot)).toEqual([
      { gig_id: null, quantity: 10, status: null, location: null },
    ]);
  });

  it("a 'Maintenance' row (the manual override's Mark for Maintenance) isn't a return: the record stays at that gig", () => {
    const rows = [
      row({ asset_id: 'u1', status: 'On Site', scanned_at: '2026-10-01T10:00:00Z' }),
      row({ asset_id: 'u1', status: 'Maintenance', location: 'Shop', scanned_at: '2026-10-02T10:00:00Z' }),
    ];
    expect(placementOf(rows, unit)).toEqual([{ gig_id: 'gig-a', quantity: 1, status: 'Maintenance', location: 'Shop' }]);
  });

  it('two manual moves of the same lot to one gig, same kit, count once', () => {
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

// #185: "Leave the rest at the gig" is one non-return row with what's still out (quantity is state).
describe('partial returns and what is still out at a gig (#185)', () => {
  const out4 = row({ asset_id: 'lot', kit_id: 'foh', quantity: 4, status: 'On Site', scanned_at: '2026-10-01T10:00:00Z' });
  const left1 = row({ asset_id: 'lot', kit_id: 'foh', quantity: 1, status: 'Not Returned', scanned_at: '2026-10-02T10:00:00Z' });

  it('4 out, 3 back, 1 left: 1 at the gig, 9 at home', () => {
    expect(placementOf([out4, left1], lot)).toEqual([
      { gig_id: null, quantity: 9, status: null, location: null },
      { gig_id: 'gig-a', quantity: 1, status: 'Not Returned', location: null },
    ]);
  });

  it('a later return in that bucket brings the last one home', () => {
    const back = row({ asset_id: 'lot', kit_id: 'foh', quantity: 1, status: RETURNED_STATUS, location: 'Warehouse', scanned_at: '2026-10-03T10:00:00Z' });
    expect(placementOf([out4, left1, back], lot)).toEqual([{ gig_id: null, quantity: 10, status: RETURNED_STATUS, location: 'Warehouse' }]);
    expect(bucketsAt([out4, left1, back], lot, 'gig-a')).toEqual([]);
  });

  it('bucketsAt: what is still out at the gig, kit by kit', () => {
    const cableBox = row({ asset_id: 'lot', kit_id: 'box', quantity: 2, status: 'On Site', location: 'Stage left', scanned_at: '2026-10-01T11:00:00Z' });
    const elsewhere = row({ asset_id: 'lot', gig_id: 'gig-b', kit_id: 'foh', quantity: 3 });
    expect(bucketsAt([out4, left1, cableBox, elsewhere], lot, 'gig-a')).toEqual([
      { kit_id: 'box', quantity: 2, status: 'On Site', location: 'Stage left' },
      { kit_id: 'foh', quantity: 1, status: 'Not Returned', location: null },
    ]);
  });

  it('bucketsAt: a unit is out at the gig only if its newest row anywhere says so', () => {
    const here = row({ asset_id: 'u1', kit_id: 'pa', status: 'On Site', scanned_at: '2026-10-01T10:00:00Z' });
    expect(bucketsAt([here], unit, 'gig-a')).toEqual([{ kit_id: 'pa', quantity: 1, status: 'On Site', location: null }]);
    const movedOn = row({ asset_id: 'u1', gig_id: 'gig-b', status: 'Checked Out', scanned_at: '2026-10-02T10:00:00Z' });
    expect(bucketsAt([here, movedOn], unit, 'gig-a')).toEqual([]);
    expect(bucketsAt([here], { ...unit, status: 'Missing', retired_on: '2026-10-09' }, 'gig-a')).toEqual([]);
  });
});

describe('currentRows (Equipment → Locations)', () => {
  it('a lot keeps its newest row per (gig, kit), so a split lot shows at each gig', () => {
    const rows = [
      row({ id: '1', asset_id: 'lot', gig_id: 'gig-a', quantity: 4, scanned_at: '2026-10-01T10:00:00Z' }),
      row({ id: '2', asset_id: 'lot', gig_id: 'gig-b', quantity: 3, scanned_at: '2026-10-02T10:00:00Z' }),
    ];
    expect(currentRows(rows, { isLot: (id) => id === 'lot' }).map((r) => r.id)).toEqual(['1', '2']);
    expect(currentRows(rows).map((r) => r.id)).toEqual(['2']);
  });

  it('each item keeps its own newest row, even under a container with a newer kit-only row (Cameron, 10-10)', () => {
    const at = '2026-10-02T10:00:00Z';
    const rows = [
      row({ id: 'k1', kit_id: 'case', asset_id: null, scanned_at: at }),
      row({ id: 'u1', kit_id: 'case', asset_id: 'u1', scanned_at: at }),
      row({ id: 'u2', kit_id: 'case', asset_id: 'u2', scanned_at: '2026-10-01T10:00:00Z' }),
      row({ id: 'l1', kit_id: 'logical', asset_id: 'u3', scanned_at: '2026-10-01T10:00:00Z' }),
      row({ id: 'k2', kit_id: 'logical', asset_id: null, scanned_at: at }),
    ];
    expect(currentRows(rows).map((r) => r.id)).toEqual(['k1', 'u1', 'u2', 'l1', 'k2']);
  });
});

// #255: a lot in a case that went out and back on gig A, then out and back on gig B, showed
// once per gig under Warehouse. A returned bucket isn't a place the lot is on its own: the
// pieces back home show once, at the lot's newest return.
describe('currentRows: a lot\'s returned buckets are one home line (#255)', () => {
  const isLot = (id: string) => id === 'lot';
  const ids = (rows: TrackingRow[]) => currentRows(rows, { isLot }).map((r) => r.id).sort();
  const t = (n: number) => `2026-10-0${n}T10:00:00Z`;
  const outAndBack = (gig: string, out: number, back: number) => [
    row({ id: `${gig}-case-out`, gig_id: gig, kit_id: 'case', asset_id: null, scanned_at: t(out) }),
    row({ id: `${gig}-lot-out`, gig_id: gig, kit_id: 'case', asset_id: 'lot', quantity: 4, scanned_at: t(out) }),
    row({ id: `${gig}-unit-out`, gig_id: gig, kit_id: 'case', asset_id: 'u1', scanned_at: t(out) }),
    row({ id: `${gig}-case-back`, gig_id: gig, kit_id: 'case', asset_id: null, status: RETURNED_STATUS, location: 'Warehouse', scanned_at: t(back) }),
    row({ id: `${gig}-lot-back`, gig_id: gig, kit_id: 'case', asset_id: 'lot', quantity: 4, status: RETURNED_STATUS, location: 'Warehouse', scanned_at: t(back) }),
    row({ id: `${gig}-unit-back`, gig_id: gig, kit_id: 'case', asset_id: 'u1', status: RETURNED_STATUS, location: 'Warehouse', scanned_at: t(back) }),
  ];
  // The Locations override on the case alone: a kit-only row.
  const override = (gig: string, n: number, where: string) =>
    row({ id: `${gig}-case-override`, gig_id: gig, kit_id: 'case', asset_id: null, status: RETURNED_STATUS, location: where, scanned_at: t(n) });
  const history = [
    ...outAndBack('gig-a', 1, 2),
    override('gig-a', 3, 'Warehouse, Shelf C'),
    ...outAndBack('gig-b', 4, 5),
    override('gig-b', 6, 'Warehouse, Shelf D'),
  ];
  const now = ['gig-b-case-override', 'gig-b-lot-back', 'gig-b-unit-back'];

  it('out and back on gig A, then on gig B: the case, the unit and the lot each show once, at their newest row', () => {
    expect(ids(history)).toEqual(now);
    expect(ids([...history].reverse())).toEqual(now);
  });

  it('a genuine split still shows at each place: 1 piece On Site at gig C, the rest at home once', () => {
    const onSite = row({ id: 'gig-c-lot', gig_id: 'gig-c', kit_id: null, asset_id: 'lot', quantity: 1, status: 'On Site', location: 'Stage', scanned_at: t(7) });
    expect(ids([...history, onSite])).toEqual([...now, 'gig-c-lot']);
  });

  it("pieces still out at an older gig stay there; a newer return elsewhere doesn't bring them home", () => {
    const left = row({ id: 'gig-a-left', gig_id: 'gig-a', kit_id: 'foh', asset_id: 'lot', quantity: 1, status: 'Not Returned', scanned_at: t(2) });
    expect(ids([...history, left])).toEqual(['gig-a-left', ...now]);
  });
});


describe('currentRows: a lot shows in no more places than it has pieces (Cameron, 10-11)', () => {
  const isLot = (id: string) => id === 'lot';
  const ids = (rows: TrackingRow[], total: number) =>
    currentRows(rows, { isLot, lotQuantity: () => total }).map((r) => r.id).sort();
  const t = (n: number) => `2026-10-${String(n).padStart(2, '0')}T10:00:00Z`;

  it('a one-piece lot left "In Transit" on an old gig, then out and back on a newer gig, shows once at home', () => {
    // SndEng Case's untagged contents: White Road's last rows say In Transit / Car (10-02);
    // the same pieces went out and back on Blue Valley (10-10).
    const rows = [
      row({ id: 'wr', asset_id: 'lot', gig_id: 'white-road', kit_id: 'case', status: 'In Transit', location: 'Car', scanned_at: t(2) }),
      row({ id: 'bv-out', asset_id: 'lot', gig_id: 'blue-valley', kit_id: 'case', status: 'In Transit', scanned_at: t(9) }),
      row({ id: 'bv-home', asset_id: 'lot', gig_id: 'blue-valley', kit_id: 'case', status: RETURNED_STATUS, location: 'Garage', scanned_at: t(10) }),
    ];
    expect(ids(rows, 1)).toEqual(['bv-home']);
  });

  it('a one-piece lot whose newest row is out shows only there, not also at an older return', () => {
    // Stage Snakes: returned on Oyster (9/29), newest row Checked Out on Blue Valley.
    const rows = [
      row({ id: 'oyster-home', asset_id: 'lot', gig_id: 'oyster', status: RETURNED_STATUS, location: 'Garage', scanned_at: t(1) }),
      row({ id: 'bv-out', asset_id: 'lot', gig_id: 'blue-valley', status: 'Checked Out', scanned_at: t(10) }),
    ];
    expect(ids(rows, 1)).toEqual(['bv-out']);
  });

  it('a real split still shows at each place while the pieces add up to the lot', () => {
    const rows = [
      row({ id: 'home', asset_id: 'lot', gig_id: 'gig-a', status: RETURNED_STATUS, quantity: 9, scanned_at: t(3) }),
      row({ id: 'out', asset_id: 'lot', gig_id: 'gig-c', status: 'On Site', quantity: 1, scanned_at: t(5) }),
    ];
    expect(ids(rows, 10)).toEqual(['home', 'out']);
  });

  it('an older out bucket that the newer places already account for is dropped', () => {
    const rows = [
      row({ id: 'stale', asset_id: 'lot', gig_id: 'gig-a', status: 'On Site', quantity: 4, scanned_at: t(2) }),
      row({ id: 'now', asset_id: 'lot', gig_id: 'gig-b', status: 'Checked Out', quantity: 4, scanned_at: t(6) }),
    ];
    expect(ids(rows, 4)).toEqual(['now']);
  });
});
