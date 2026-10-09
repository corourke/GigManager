import { describe, it, expect } from 'vitest';
import {
  isRetired, isAvailable, pieceValue, recordItemMaps,
  recordKind,
  isInService,
  summarizeItem,
  containerPiecesByItem,
  itemMatchesSearch,
  type ItemRecord,
} from './equipmentItems';

const unit = (over: Partial<ItemRecord> = {}): ItemRecord => ({
  id: over.id ?? `u-${Math.random()}`,
  quantity: 1,
  serial_number: 'SN1',
  tag_number: null,
  status: 'Active',
  replacement_value: 999,
  ...over,
});
const lot = (n: number, over: Partial<ItemRecord> = {}): ItemRecord => ({
  id: over.id ?? `l-${Math.random()}`,
  quantity: n,
  serial_number: null,
  tag_number: null,
  status: 'Active',
  replacement_value: 16,
  ...over,
});

describe('recordKind', () => {
  it('is a unit when there is a serial number or a tag', () => {
    expect(recordKind({ serial_number: 'GAA213409', tag_number: null })).toBe('unit');
    expect(recordKind({ serial_number: null, tag_number: 'DSL-0101' })).toBe('unit');
  });
  it('is a lot when there is neither (blank counts as none)', () => {
    expect(recordKind({ serial_number: null, tag_number: null })).toBe('lot');
    expect(recordKind({ serial_number: '  ', tag_number: '' })).toBe('lot');
  });
});

describe('isInService', () => {
  it('counts Active, Inactive and Maintenance as still owned; Disposed and Returned are not', () => {
    expect(['Active', 'Inactive', 'Maintenance', 'Disposed', 'Returned'].map((s) => isInService(s))).toEqual([true, true, true, false, false]);
  });
  it('treats a missing status as Active', () => {
    expect(isInService(null)).toBe(true);
  });
});

describe('summarizeItem', () => {
  it('counts the six K12.2s: one in maintenance, so five available (#162 example)', () => {
    const records = [
      ...Array.from({ length: 5 }, (_, i) => unit({ id: `k${i}`, replacement_value: i < 3 ? 999 : 1049 })),
      unit({ id: 'k5', status: 'Maintenance', replacement_value: 999 }),
    ];
    expect(summarizeItem(records)).toMatchObject({
      owned: 6, units: 6, lots: 0, available: 5, inMaintenance: 1, inContainers: 0,
      totalValue: 999 * 4 + 1049 * 2, minValue: 999, maxValue: 1049,
    });
  });

  it('counts lot pieces, and takes pieces inside container kits out of available', () => {
    const records = [lot(10, { id: 'box' }), lot(20, { id: 'loose' })];
    expect(summarizeItem(records, 10)).toMatchObject({ owned: 30, units: 0, lots: 2, available: 20, inContainers: 10, totalValue: 480 });
  });

  it('leaves Disposed and Returned records out of every count', () => {
    const records = [unit({ id: 'a' }), unit({ id: 'b', status: 'Disposed' }), lot(4, { status: 'Returned' })];
    expect(summarizeItem(records)).toMatchObject({ owned: 1, units: 1, lots: 0, available: 1, totalValue: 999 });
  });

  it('shows every piece in container kits, but takes only the Active ones out of available (#230 follow-up)', () => {
    const records = [unit({ id: 'a' }), unit({ id: 'b' }), unit({ id: 'c' }), unit({ id: 'm', status: 'Maintenance' })];
    // a and m sit in a case: 2 in containers, 1 of them Active.
    expect(summarizeItem(records, 2, 1)).toMatchObject({ owned: 4, inMaintenance: 1, inContainers: 2, available: 2 });
  });

  it('counts missing pieces apart: out of owned and available (#185)', () => {
    const records = [lot(9, { id: 'cables' }), lot(1, { id: 'gone', status: 'Missing', retired_on: '2026-10-09' }), unit({ id: 'k', status: 'Missing', retired_on: '2026-10-09' })];
    expect(summarizeItem(records)).toMatchObject({ owned: 9, available: 9, missing: 2, totalValue: 16 * 9 });
  });

  it('never reports fewer than zero available', () => {
    expect(summarizeItem([lot(4, { status: 'Inactive' })], 4).available).toBe(0);
  });

  it('handles values sent as strings and missing quantities', () => {
    expect(summarizeItem([{ ...lot(1), quantity: null, replacement_value: '12.50' as unknown as number }]))
      .toMatchObject({ owned: 1, totalValue: 12.5 });
  });

  it('has no value range when nothing is owned', () => {
    expect(summarizeItem([])).toMatchObject({ owned: 0, available: 0, minValue: null, maxValue: null, totalValue: 0 });
  });
});

describe('containerPiecesByItem', () => {
  const assetItem = new Map([['xlr25-lot', 'xlr25'], ['trunk', 'trunk-item'], ['amp', 'pld45']]);

  it('adds up specific records and "any" lines inside container kits, per item', () => {
    const result = containerPiecesByItem({
      containerKitIds: new Set(['cable-box', 'pa-rack']),
      nestedContainerIds: new Set(),
      unitCache: [
        { kit_id: 'cable-box', asset_id: 'trunk', total_quantity: 1 },
        { kit_id: 'pa-rack', asset_id: 'amp', total_quantity: 1 },
        { kit_id: 'items-kit', asset_id: 'xlr25-lot', total_quantity: 2 }, // not a container: ignored
      ],
      itemCache: [
        { kit_id: 'cable-box', equipment_item_id: 'xlr25', total_quantity: 10 },
        { kit_id: 'pa-rack', equipment_item_id: 'xlr3', total_quantity: 6 },
      ],
      assetItem,
    });
    expect(Object.fromEntries(result)).toEqual({ 'trunk-item': 1, pld45: 1, xlr25: 10, xlr3: 6 });
  });

  it('counts a container nested in another container once, through the outer one', () => {
    const result = containerPiecesByItem({
      containerKitIds: new Set(['outer', 'inner']),
      nestedContainerIds: new Set(['inner']),
      unitCache: [],
      itemCache: [
        { kit_id: 'outer', equipment_item_id: 'xlr25', total_quantity: 10 }, // includes inner's 10
        { kit_id: 'inner', equipment_item_id: 'xlr25', total_quantity: 10 },
      ],
      assetItem,
    });
    expect(result.get('xlr25')).toBe(10);
  });
});

describe('itemMatchesSearch', () => {
  const item = { manufacturer_model: 'QSC K12.2', category: 'Audio', type: 'Speaker, Powered' };
  const records = [unit({ serial_number: 'GAA213409', tag_number: 'DSL-0101' })];

  it('matches the item’s model, category or type', () => {
    expect(itemMatchesSearch(item, records, 'k12')).toBe(true);
    expect(itemMatchesSearch(item, records, 'powered')).toBe(true);
  });
  it('matches a unit’s serial or tag', () => {
    expect(itemMatchesSearch(item, records, 'gaa2134')).toBe(true);
    expect(itemMatchesSearch(item, records, 'dsl-0101')).toBe(true);
  });
  it('matches everything when the search is blank, and nothing unrelated', () => {
    expect(itemMatchesSearch(item, records, '  ')).toBe(true);
    expect(itemMatchesSearch(item, records, 'trio')).toBe(false);
  });
});

// #184 (Cameron, 10-09): only Active is available; a retirement date means retired, like Disposed.
describe('retired records and piece value (#184)', () => {
  it('a record with a retirement date is no longer owned', () => {
    const s = summarizeItem([
      { id: 'a', quantity: 1, tag_number: 'T1', status: 'Active' },
      { id: 'b', quantity: 1, tag_number: 'T2', status: 'Active', retired_on: '2026-09-01' },
    ]);
    expect(s.owned).toBe(1);
    expect(s.available).toBe(1);
  });

  it('isRetired: Disposed, Returned or a retirement date', () => {
    expect(isRetired({ status: 'Disposed' })).toBe(true);
    expect(isRetired({ status: 'Returned' })).toBe(true);
    expect(isRetired({ status: 'Active', retired_on: '2026-09-01' })).toBe(true);
    expect(isRetired({ status: 'Inactive' })).toBe(false);
    expect(isRetired({ status: 'Maintenance' })).toBe(false);
  });

  it('isAvailable: Active and not retired', () => {
    expect(isAvailable({ status: 'Active' })).toBe(true);
    expect(isAvailable({ status: null })).toBe(true);
    expect(isAvailable({ status: 'Inactive' })).toBe(false);
    expect(isAvailable({ status: 'Maintenance' })).toBe(false);
    expect(isAvailable({ status: 'Active', retired_on: '2026-09-01' })).toBe(false);
  });

  it('pieceValue: the average value of one piece, over pieces still owned', () => {
    expect(pieceValue([
      { id: 'a', quantity: 1, replacement_value: 100 },
      { id: 'b', quantity: 3, replacement_value: 20 },
      { id: 'c', quantity: 1, replacement_value: 999, status: 'Disposed' },
    ])).toBe(40);
    expect(pieceValue([{ id: 'a', quantity: 2, replacement_value: null }])).toBe(0);
  });
});

describe('recordItemMaps (#230 review)', () => {
  it('maps every record to its item, and separately only the Active, not-retired ones', () => {
    const { all, available } = recordItemMaps([
      { id: 'item-a', records: [unit({ id: 'a1' }), unit({ id: 'a2', status: 'Maintenance' }), unit({ id: 'a3', retired_on: '2026-09-01' })] },
      { id: 'item-b', records: [lot(10, { id: 'b1' }), lot(4, { id: 'b2', status: 'Inactive' })] },
      { id: 'item-c' },
    ]);
    expect([...all.keys()]).toEqual(['a1', 'a2', 'a3', 'b1', 'b2']);
    expect([...available.entries()]).toEqual([['a1', 'item-a'], ['b1', 'item-b']]);
  });
});
