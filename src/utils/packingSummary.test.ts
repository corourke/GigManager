import { describe, it, expect } from 'vitest';
import { kitLocationSummary, kitStatusSummary, packedPieces, summarizeKitPacking } from './packingSummary';
import type { PackingListRow } from '../services/inventoryManagement.service';

// The gig's Equipment card, per kit (Cameron, 10-09): what of each kit is packed, by status and
// where, counted from the packing list's rows so the two agree.
const row = (over: Partial<PackingListRow>): PackingListRow => ({
  kit_id: 'pa', kit_name: 'Main PA', is_container: false, kind: 'unit', asset_id: 'u', quantity: 1, packed: 0,
  status: null, location: null, has_conflict: false,
  group_kit_id: 'pa', group_kit_name: 'Main PA', group_is_container: false, group_tag_number: null, ...over,
});
/** n units of one kit, each packed with the given status and location. */
const units = (n: number, status: string | null, location: string | null = null, kit = 'pa') =>
  Array.from({ length: n }, (_, i) => row({
    asset_id: `${kit}-${status}-${location}-${i}`, group_kit_id: kit, kit_id: kit, packed: status ? 1 : 0, status, location,
  }));
const summaryOf = (rows: PackingListRow[], kit = 'pa') => summarizeKitPacking(rows).get(kit)!;

describe('packedPieces', () => {
  it('counts what is packed of a line, never more than the line asks for', () => {
    expect(packedPieces(row({ quantity: 2, packed: 3 }))).toBe(2);
    expect(packedPieces(row({ quantity: 10, packed: 7 }))).toBe(7);
  });
});

describe('kitStatusSummary', () => {
  it('every piece in one state: "All Checked Out"', () => {
    expect(kitStatusSummary(summaryOf(units(3, 'Checked Out')))).toEqual({ text: 'All Checked Out', title: 'Checked Out 3', muted: false });
    expect(kitStatusSummary(summaryOf(units(2, 'On Site'))).text).toBe('All On Site');
  });

  it('some still home: "Checked Out 9 of 15"', () => {
    const s = kitStatusSummary(summaryOf([...units(9, 'Checked Out'), ...units(6, null)]));
    expect(s).toEqual({ text: 'Checked Out 9 of 15', title: 'Checked Out 9 · Not packed 6', muted: false });
  });

  it('mixed states lead with the most common, the full breakdown in the title', () => {
    const s = kitStatusSummary(summaryOf([...units(3, 'In Transit'), ...units(6, 'On Site'), ...units(6, null)]));
    expect(s).toEqual({ text: 'On Site 6 of 15 · In Transit 3', title: 'On Site 6 · In Transit 3 · Not packed 6', muted: false });
  });

  it('mixed states, everything packed: still "of" the kit\'s pieces', () => {
    const s = kitStatusSummary(summaryOf([...units(1, 'Checked Out'), ...units(2, 'In Transit')]));
    expect(s.text).toBe('In Transit 2 of 3 · Checked Out 1');
  });

  it('a tie goes to the later step of the workflow', () => {
    // Checked Out, then In Transit, then On Site (SCANNING_MODES).
    expect(kitStatusSummary(summaryOf([...units(2, 'Checked Out'), ...units(2, 'On Site')])).text).toBe('On Site 2 of 4 · Checked Out 2');
  });

  it('nothing scanned: "Not packed", muted', () => {
    expect(kitStatusSummary(summaryOf(units(4, null)))).toEqual({ text: 'Not packed', title: 'Not packed 4', muted: true });
  });

  it('a kit with nothing to pack says nothing', () => {
    expect(kitStatusSummary(undefined)).toEqual({ text: '', title: '', muted: true });
  });

  it('a lot counts its quantity; an "any" line counts N, its packed units by their own status', () => {
    const rows = [
      row({ kind: 'lot', asset_id: 'cables', quantity: 10, packed: 7, status: 'Checked Out', location: 'Staging Area' }),
      row({
        kind: 'any', asset_id: null, item_id: 'k12', quantity: 2, packed: 2, status: null, location: null,
        packed_units: [
          { asset_id: 'k1', tag_number: 'T1', serial_number: null, quantity: 1, status: 'In Transit', location: 'Truck' },
          { asset_id: 'k2', tag_number: 'T2', serial_number: null, quantity: 1, status: 'Checked Out', location: 'Staging Area' },
        ],
      }),
    ];
    const s = summaryOf(rows);
    expect(s).toMatchObject({ total: 12, packed: 9 });
    expect(kitStatusSummary(s).text).toBe('Checked Out 8 of 12 · In Transit 1');
  });

  it('an "any" line packed past what it asks for counts only what it asks for', () => {
    const s = summaryOf([row({
      kind: 'any', asset_id: null, quantity: 1, packed: 2,
      packed_units: [
        { asset_id: 'k1', tag_number: 'T1', serial_number: null, quantity: 1, status: 'On Site', location: null },
        { asset_id: 'k2', tag_number: 'T2', serial_number: null, quantity: 1, status: 'On Site', location: null },
      ],
    })]);
    expect(s).toMatchObject({ total: 1, packed: 1 });
    expect(kitStatusSummary(s).text).toBe('All On Site');
  });

  it('a container counts as its quantity of cases, as the packing list does', () => {
    const rows = [
      row({ kind: 'container', is_container: true, kit_id: 'case', asset_id: null, quantity: 2, packed: 2, status: 'On Site' }),
      ...units(1, null),
    ];
    expect(kitStatusSummary(summaryOf(rows)).text).toBe('On Site 2 of 3');
  });

  it('a unit whose newest row is at another gig is not counted here, whatever its row here says', () => {
    // The packing list's `packed` already applies bucketsAt: a unit moved on is 0 here.
    const movedOn = row({ asset_id: 'k1', packed: 0, status: 'Checked Out', location: 'Staging Area' });
    const s = summaryOf([movedOn, ...units(1, 'Checked Out', 'Staging Area')]);
    expect(s).toMatchObject({ total: 2, packed: 1 });
    expect(kitStatusSummary(s).text).toBe('Checked Out 1 of 2');
  });

  it('groups by the kit assigned to the gig, sub-kit lines included', () => {
    const map = summarizeKitPacking([
      ...units(2, 'On Site', null, 'pa'),
      row({ group_kit_id: 'pa', kit_id: 'drum-mics', asset_id: 'sm57', packed: 1, status: 'On Site' }),
      ...units(1, null, null, 'lights'),
    ]);
    expect(map.get('pa')).toMatchObject({ total: 3, packed: 3 });
    expect(map.get('lights')).toMatchObject({ total: 1, packed: 0 });
  });
});

describe('kitLocationSummary', () => {
  it('every out piece in one place: that place', () => {
    const s = summaryOf([...units(2, 'Checked Out', 'Staging Area'), ...units(1, 'In Transit', 'Staging Area'), ...units(3, null)]);
    expect(kitLocationSummary(s)).toEqual({ text: 'Staging Area', title: '' });
  });

  it('out pieces in different places: "Mixed", the breakdown in the title', () => {
    const s = summaryOf([...units(2, 'In Transit', 'Truck'), ...units(5, 'On Site', 'Venue Area'), ...units(1, 'On Site', null)]);
    expect(kitLocationSummary(s)).toEqual({ text: 'Mixed', title: 'Venue Area 5 · Truck 2 · No location 1' });
  });

  it('nothing out: empty', () => {
    expect(kitLocationSummary(summaryOf(units(3, null)))).toEqual({ text: '', title: '' });
    expect(kitLocationSummary(undefined)).toEqual({ text: '', title: '' });
  });

  it('out pieces with no location recorded: empty', () => {
    expect(kitLocationSummary(summaryOf(units(2, 'Checked Out', null)))).toEqual({ text: '', title: '' });
  });

  it('an "any" line\'s units each bring their own place', () => {
    const s = summaryOf([row({
      kind: 'any', asset_id: null, quantity: 2, packed: 2,
      packed_units: [
        { asset_id: 'k1', tag_number: 'T1', serial_number: null, quantity: 1, status: 'On Site', location: 'Stage Left' },
        { asset_id: 'k2', tag_number: 'T2', serial_number: null, quantity: 1, status: 'On Site', location: 'Stage Right' },
      ],
    })]);
    expect(kitLocationSummary(s).text).toBe('Mixed');
  });
});
