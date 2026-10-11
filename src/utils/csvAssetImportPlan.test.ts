import { describe, it, expect } from 'vitest';
import { parseAndValidateCSV, validateAssetRow, type AssetRow, type ParsedRow } from './csvImport';
import { buildAssetImportPlan, itemMatchKey, type ExistingItem } from './csvAssetImportPlan';
import micKitCsv from '../config/import-examples/mic-kit-purchase.csv?raw';

const ORG = 'org-1';
const file = (content: string, name = 'import.csv') => {
  const blob = new Blob([content], { type: 'text/csv' });
  (blob as any).name = name;
  return blob as File;
};
const parse = async (lines: string[]) => (await parseAndValidateCSV<AssetRow>(file(lines.join('\n')), 'assets')).validRows;

const HEAD = 'source,acquisition_date,vendor,total_inv_amount,manufacturer_model,category,type,description,insurance_class,quantity,serial_number,tag_number,kit,replacement_value,recovery_period,item_price';

describe('itemMatchKey (#183 D)', () => {
  it('matches like equipment_match_key: trimmed, inner spaces collapsed, any case', () => {
    expect(itemMatchKey('  Shure   SM58 ')).toBe(itemMatchKey('shure sm58'));
    expect(itemMatchKey('Shure SM58')).not.toBe(itemMatchKey('Shure SM58 Beta'));
  });
});

describe('buildAssetImportPlan (#183 D)', () => {
  it('turns one row of 3 serials into 3 units on one line, and a row with neither into one lot', async () => {
    const rows = await parse([
      HEAD,
      '0,2025-11-03,Sweetwater,300,,,,,,,,,,,,',
      '1,,,,QSC K12.2,Audio,Speaker,,Class B,3,S1;S2;S3,,,1049,7,90',
      '1,,,,XLR Cable 25 ft,Cables,,,,10,,,,16,,3',
    ]);
    const plan = buildAssetImportPlan(ORG, rows, { items: [], kitNames: [] });

    expect(plan.purchases).toHaveLength(1);
    const [p] = plan.purchases;
    expect(p.items).toHaveLength(2);
    expect(p.items[0]).toEqual(expect.objectContaining({ row_type: 'line', tax_treatment: 'depreciate', quantity: 3, description: 'QSC K12.2' }));
    expect(p.units.map((u) => [u.line_index, u.serial_number, u.tag_number, u.quantity])).toEqual([
      [0, 'S1', null, 1], [0, 'S2', null, 1], [0, 'S3', null, 1], [1, null, null, 10],
    ]);
    expect(p.units.every((u) => u.organization_id === ORG)).toBe(true);
    expect(p.units[0]).toEqual(expect.objectContaining({ manufacturer_model: 'QSC K12.2', category: 'Audio', type: 'Speaker', insurance_class: 'Class B', replacement_value: 1049, recovery_period: 7 }));
    expect(p.units[3].recovery_period).toBeUndefined();
    expect(p.rowIndexes).toEqual([2, 3, 4]);
    expect(plan.summary).toEqual(expect.objectContaining({ purchases: 1, lines: 2, units: 3, lots: 1, pieces: 13, itemsNew: 2, itemsMatched: 0 }));
  });

  it('reuses a stored item matched by model + category, keeps its details, and notes what differs', async () => {
    const stored: ExistingItem = { id: 'item-58', manufacturer_model: 'Shure SM58', category: 'Audio', type: 'Dynamic Microphone', description: null, insurance_class: 'Class A' };
    const rows = await parse([
      HEAD,
      '1,2025-11-03,Sweetwater,,shure  sm58,AUDIO,Vocal Mic,,Class A,1,,MIC-1,,99,,99',
    ]);
    const plan = buildAssetImportPlan(ORG, rows, { items: [stored], kitNames: [] });

    const [unit] = plan.purchases[0].units;
    expect(unit).toEqual(expect.objectContaining({ equipment_item_id: 'item-58', manufacturer_model: 'Shure SM58', category: 'Audio', type: 'Dynamic Microphone', insurance_class: 'Class A' }));
    expect(plan.rows[2].item).toEqual({ status: 'matched', id: 'item-58' });
    expect(plan.rows[2].notes).toContain('Differs from the stored item (type). The stored item’s details are kept.');
    expect(plan.summary).toEqual(expect.objectContaining({ itemsNew: 0, itemsMatched: 1 }));
  });

  it('gives every row of a new item the first row’s details, and notes a later row that differs', async () => {
    const rows = await parse([
      HEAD,
      '0,2025-11-03,Sweetwater,200,,,,,,,,,,,,',
      '1,,,,Shure SM58,Audio,Dynamic Microphone,,,1,,MIC-1,,99,,99',
      '1,,,,Shure SM58,Audio,Vocal Mic,,,1,,MIC-2,,99,,99',
    ]);
    const plan = buildAssetImportPlan(ORG, rows, { items: [], kitNames: [] });
    expect(plan.purchases[0].units.map((u) => u.type)).toEqual(['Dynamic Microphone', 'Dynamic Microphone']);
    expect(plan.rows[4].notes).toContain('Differs from row 3, which creates this item (type). Row 3’s details are used.');
    expect(plan.summary.itemsNew).toBe(1);
  });

  it('sends no equipment for an expense row, and a recovery period only for equipment', async () => {
    const rows = await parse([
      HEAD,
      '0,2025-11-03,Sweetwater,30,,,,,,,,,,,,',
      '2,,,,Gaffer tape,Supplies,,,,1,,,,,7,30',
    ]);
    const plan = buildAssetImportPlan(ORG, rows, { items: [], kitNames: [] });
    expect(plan.purchases[0].items[0]).toEqual(expect.objectContaining({ tax_treatment: 'expense', row_type: 'line' }));
    expect(plan.purchases[0].units).toEqual([]);
    expect(plan.rows[3].creates).toEqual({ kind: 'expense', count: 1 });
  });

  it('notes each row’s kit, and whether the kit is new', async () => {
    const rows = await parse([
      HEAD,
      '0,2025-11-03,Sweetwater,300,,,,,,,,,,,,',
      '1,,,,Shure SM58,Audio,,,,2,A;B,,Mic Kit 1,99,,99',
      '1,,,,Mic Clip,Audio,,,,10,,,main pa ,4.5,,4.5',
    ]);
    const plan = buildAssetImportPlan(ORG, rows, { items: [], kitNames: ['Main PA'] });
    expect(plan.purchases[0].unitKits).toEqual(['Mic Kit 1', 'Mic Kit 1', 'main pa']);
    expect(plan.rows[3].kit).toEqual({ name: 'Mic Kit 1', isNew: true });
    expect(plan.rows[4].kit).toEqual({ name: 'main pa', isNew: false });
    expect(plan.summary.kitsNew).toEqual(['Mic Kit 1']);
  });

  it('puts a fixed row that was moved to the end of the list back on its own invoice', async () => {
    const rows = await parse([
      HEAD,
      '0,2025-11-03,Vendor A,100,,,,,,,,,,,,',
      '1,,,,Item A1,Audio,,,,1,,,,,,50',
      '0,2025-11-04,Vendor B,100,,,,,,,,,,,,',
      '1,,,,Item B1,Audio,,,,1,,,,,,100',
    ]);
    // Row 4 belonged to Vendor A's invoice, was invalid, and was fixed: the screen appends it.
    const fixed = validateAssetRow({ source: '1', manufacturer_model: 'Item A2', category: 'Audio', quantity: '1', item_price: '50' }, 4);
    const plan = buildAssetImportPlan(ORG, [...rows, fixed] as ParsedRow<AssetRow>[], { items: [], kitNames: [] });
    expect(plan.purchases.map((p) => [p.header.vendor, p.rowIndexes])).toEqual([['Vendor A', [2, 3, 4]], ['Vendor B', [5, 6]]]);
  });
});

describe('the microphone example file (#183 D)', () => {
  it('imports as 4 SM58 units, 2 Beta 52A units and a lot of 10 clips, all into Mic Kit 1, plus an expensed line', async () => {
    const result = await parseAndValidateCSV<AssetRow>(file(micKitCsv, 'mic-kit-purchase.csv'), 'assets');
    expect(result.invalidRows).toEqual([]);
    expect(result.notices).toEqual([]);

    const plan = buildAssetImportPlan(ORG, result.validRows, { items: [], kitNames: [] });
    expect(plan.purchases).toHaveLength(1);
    const [p] = plan.purchases;
    expect(p.header).toEqual(expect.objectContaining({ vendor: 'Sweetwater', purchase_date: '2025-11-03', total_inv_amount: 905.03 }));
    expect(p.items.map((i) => [i.description, i.quantity, i.tax_treatment])).toEqual([
      ['Shure SM58', 4, 'depreciate'],
      ['Shure Beta 52A', 2, 'depreciate'],
      ['Mic Clip', 10, 'depreciate'],
      ['Procell AA Batteries (24-pack)', 1, 'expense'],
    ]);
    expect(p.units.map((u) => [u.line_index, u.manufacturer_model, u.serial_number, u.tag_number, u.quantity])).toEqual([
      [0, 'Shure SM58', '2NC0412', null, 1],
      [0, 'Shure SM58', '2NC0413', null, 1],
      [0, 'Shure SM58', '2NC0414', null, 1],
      [0, 'Shure SM58', '2NC0415', null, 1],
      [1, 'Shure Beta 52A', null, 'MIC-0201', 1],
      [1, 'Shure Beta 52A', null, 'MIC-0202', 1],
      [2, 'Mic Clip', null, null, 10],
    ]);
    // Every unit, and the lot with its quantity, goes into the kit as its own line.
    expect(p.unitKits).toEqual(Array(7).fill('Mic Kit 1'));
    // The invoice's lines add up to its total.
    const lineCosts = p.items.reduce((s, i) => s + Number(i.line_cost), 0);
    expect(Math.round(lineCosts * 100) / 100).toBe(905.03);
    expect(plan.summary).toEqual(expect.objectContaining({ purchases: 1, lines: 4, units: 6, lots: 1, pieces: 16, itemsNew: 3, kitsNew: ['Mic Kit 1'] }));
  });
});
