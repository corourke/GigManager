import { describe, it, expect } from 'vitest';
import { parseAndValidateCSV, validateAssetRow, revalidateAssetRows, type AssetRow, type ParsedRow } from './csvImport';
import { buildAssetImportPlan, itemMatchKey, type ExistingItem } from './csvAssetImportPlan';
import micKitCsv from '../config/import-examples/mic-kit-purchase.csv?raw';

const ORG = 'org-1';
const file = (content: string, name = 'import.csv') => {
  const blob = new Blob([content], { type: 'text/csv' });
  (blob as any).name = name;
  return blob as File;
};
const parseAll = (lines: string[]) => parseAndValidateCSV<AssetRow>(file(lines.join('\n')), 'assets');
const parse = async (lines: string[]) => (await parseAll(lines)).validRows;

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
    const first = await parseAll([
      HEAD,
      '0,2025-11-03,Vendor A,100,,,,,,,,,,,,',
      '1,,,,Item A1,Audio,,,,1,,,,,,50',
      '1,,,,Item A2,,,,,1,,,,,,50', // no category: invalid until fixed
      '0,2025-11-04,Vendor B,100,,,,,,,,,,,,',
      '1,,,,Item B1,Audio,,,,1,,,,,,100',
    ]);
    // Row 4 belonged to Vendor A's invoice, was invalid, and was fixed: the screen appends it.
    const fixed = validateAssetRow({ ...first.invalidRows[0].raw, category: 'Audio' }, 4);
    const next = revalidateAssetRows(first.validRows, [fixed]);
    const plan = buildAssetImportPlan(ORG, [...next.validRows, ...next.invalidRows], { items: [], kitNames: [] });
    expect(plan.purchases.map((p) => [p.header.vendor, p.rowIndexes, p.state])).toEqual([['Vendor A', [2, 3, 4], 'ready'], ['Vendor B', [5, 6], 'ready']]);
  });
});

// Review of #183 D: every line keeps its own invoice, whatever else in the file is invalid
// or already imported; a purchase imports only when all its rows are valid.
describe('buildAssetImportPlan: purchases with invalid or imported rows (#183 D)', () => {
  const COLS = 'source,acquisition_date,vendor,total_inv_amount,manufacturer_model,category,quantity,serial_number,kit,item_price';
  const plan = (rows: ParsedRow<AssetRow>[]) => buildAssetImportPlan(ORG, rows, { items: [], kitNames: [] });
  const shape = (p: ReturnType<typeof plan>) => p.purchases.map((x) => [x.header.vendor, x.rowIndexes, x.state, x.heldBy]);
  const mark = (rows: ParsedRow<AssetRow>[], indexes: number[], importStatus: 'success' | 'failed') =>
    rows.map((r) => (indexes.includes(r.rowIndex) ? { ...r, importStatus } : r));

  it('keeps a line on its own invoice when that invoice row is invalid, and holds that purchase back', async () => {
    const result = await parseAll([
      COLS,
      '0,2025-01-01,Vendor A,110,,,,,,',
      '1,,,,Item A1,Audio,1,,,100',
      '0,2025-02-01,Vendor B,,,,,,,', // no total: invalid
      '1,,,,Item B1,Audio,1,s1,K,100',
    ]);
    expect(result.invalidRows.map((r) => r.rowIndex)).toEqual([4]);
    // Row 5 is Vendor B's line, not Vendor A's, and Vendor A's $110 is all on its own line.
    const byRow = new Map(result.validRows.map((r) => [r.rowIndex, r.data]));
    expect(byRow.get(5)?.vendor).toBe('Vendor B');
    expect(byRow.get(3)?.line_cost).toBe('110.00');

    const p = plan([...result.validRows, ...result.invalidRows]);
    expect(shape(p)).toEqual([
      ['Vendor A', [2, 3], 'ready', []],
      ['Vendor B', [4, 5], 'held', [4]],
    ]);
    expect(p.purchases[0].items.map((i) => i.line_cost)).toEqual([110]);
    expect(p.purchases[1].items).toEqual([]);
    expect(p.purchases[1].units).toEqual([]);
    expect(p.summary).toEqual(expect.objectContaining({ purchases: 1, lines: 1, kitsNew: [] }));
  });

  it('holds back an invoice whose lines are all invalid, instead of saving it with no lines', async () => {
    const result = await parseAll([
      COLS,
      '0,2025-01-01,Vendor A,100,,,,,,',
      '1,,,,Item A1,,1,,,100', // no category: invalid
    ]);
    expect(shape(plan([...result.validRows, ...result.invalidRows]))).toEqual([['Vendor A', [2, 3], 'held', [3]]]);
  });

  it('refuses an invoice row with no lines at all, instead of saving an empty purchase', async () => {
    const result = await parseAll([
      COLS,
      '0,2025-01-01,Vendor A,100,,,,,,',
      '0,2025-02-01,Vendor B,100,,,,,,',
      '1,,,,Item B1,Audio,1,,,100',
    ]);
    expect(result.invalidRows.map((r) => [r.rowIndex, r.errors])).toEqual([
      [2, [{ field: 'source', message: 'The invoice on row 2 has no lines. Put its lines on the rows after it, or delete the row.' }]],
    ]);
    const p = plan([...result.validRows, ...result.invalidRows]);
    expect(p.purchases.filter((x) => x.state === 'ready').map((x) => x.rowIndexes)).toEqual([[3, 4]]);
  });

  describe('fixing a row after an import (scenario B)', () => {
    const file3 = [
      COLS,
      '0,2025-01-01,Vendor A,100,,,,,,',
      '1,,,,Item A1,Audio,1,,,100',
      '0,2025-02-01,Vendor B,220,,,,,,',
      '1,,,,Item B1,Audio,1,,,100',
      '1,,,,Item B2,,1,,,100', // no category: invalid until fixed
    ];

    it('holds Vendor B’s purchase while row 6 is invalid, so it can’t be saved without it', async () => {
      const first = await parseAll(file3);
      expect(shape(plan([...first.validRows, ...first.invalidRows]))).toEqual([
        ['Vendor A', [2, 3], 'ready', []],
        ['Vendor B', [4, 5, 6], 'held', [6]],
      ]);
    });

    it('puts fixed row 6 back on Vendor B’s invoice after Vendor A’s purchase failed', async () => {
      const first = await parseAll(file3);
      const fixed = validateAssetRow({ ...first.invalidRows[0].raw, category: 'Audio' }, 6);
      const next = revalidateAssetRows(mark(first.validRows, [2, 3], 'failed'), [fixed]);
      expect(next.invalidRows).toEqual([]);
      const p = plan(next.validRows);
      expect(p.purchases.map((x) => [x.header.vendor, x.rowIndexes, x.header.total_inv_amount])).toEqual([
        ['Vendor A', [2, 3], 100],
        ['Vendor B', [4, 5, 6], 220],
      ]);
      expect(p.purchases[1].items.map((i) => i.line_cost)).toEqual([110, 110]);
    });

    it('puts fixed row 6 on Vendor B’s invoice, not a made-up one of $0, after Vendor A’s purchase saved', async () => {
      const first = await parseAll(file3);
      const fixed = validateAssetRow({ ...first.invalidRows[0].raw, category: 'Audio' }, 6);
      const next = revalidateAssetRows(mark(first.validRows, [2, 3], 'success'), [fixed]);
      const p = plan(next.validRows);
      expect(shape(p)).toEqual([
        ['Vendor A', [2, 3], 'imported', []],
        ['Vendor B', [4, 5, 6], 'ready', []],
      ]);
      expect(p.purchases[1].header.total_inv_amount).toBe(220);
      expect(p.purchases[1].items.map((i) => i.line_cost)).toEqual([110, 110]);
      expect(p.summary.purchases).toBe(1);
    });
  });

  it('refuses a fixed row that lands on an invoice already imported, and never resubmits that invoice', async () => {
    const first = await parseAll([
      COLS,
      '0,2025-01-01,Vendor A,100,,,,,,',
      '1,,,,Item A1,Audio,1,,,100',
      '1,2025-03-01,Vendor C,50,Item C1,,1,,,50', // its own purchase; no category: invalid
    ]);
    const saved = mark(first.validRows, [2, 3], 'success');
    // The user moves row 4 onto Vendor A's invoice.
    const fixed = validateAssetRow({ ...first.invalidRows[0].raw, category: 'Audio', acquisition_date: '2025-01-01', vendor: 'Vendor A', total_inv_amount: '' }, 4);
    const next = revalidateAssetRows(saved, [fixed]);

    expect(next.invalidRows.map((r) => [r.rowIndex, r.errors.map((e) => e.message)])).toEqual([
      [4, ['Row 4 belongs to the invoice on row 2, which was already imported. Imports never add lines to a saved invoice: add it on the purchase screen.']],
    ]);
    // The saved rows are kept as they were imported.
    expect(next.validRows.map((r) => [r.rowIndex, r.importStatus, r.data.line_cost])).toEqual([[2, 'success', ''], [3, 'success', '100.00']]);
    const p = plan([...next.validRows, ...next.invalidRows]);
    expect(shape(p)).toEqual([['Vendor A', [2, 3, 4], 'imported', []]]);
  });

  it('refuses a fixed row whose serial was already imported from a later row of the file', async () => {
    const first = await parseAll([
      COLS,
      '1,2025-03-01,Vendor C,50,Item C1,,1,S1,,50', // no category: invalid, so row 4 took S1
      '0,2025-01-01,Vendor A,100,,,,,,',
      '1,,,,Item A1,Audio,1,S1,,100',
    ]);
    expect(first.validRows.map((r) => r.rowIndex)).toEqual([3, 4]);
    const fixed = validateAssetRow({ ...first.invalidRows[0].raw, category: 'Audio' }, 2);
    const next = revalidateAssetRows(mark(first.validRows, [3, 4], 'success'), [fixed]);
    expect(next.invalidRows.map((r) => [r.rowIndex, r.errors])).toEqual([
      [2, [{ field: 'serial_number', message: 'Serial number S1 is also on row 4, which was already imported.' }]],
    ]);
  });

  it('marks a purchase whose rows failed to save as failed, so only it is retried', async () => {
    const first = await parseAll([
      COLS,
      '0,2025-01-01,Vendor A,100,,,,,,',
      '1,,,,Item A1,Audio,1,,,100',
      '0,2025-02-01,Vendor B,100,,,,,,',
      '1,,,,Item B1,Audio,1,,,100',
    ]);
    const rows = mark(mark(first.validRows, [2, 3], 'failed'), [4, 5], 'success');
    const p = plan(rows);
    expect(shape(p)).toEqual([
      ['Vendor A', [2, 3], 'failed', []],
      ['Vendor B', [4, 5], 'imported', []],
    ]);
    expect(p.purchases[0].items).toHaveLength(1);
  });

  it('builds no units for a quantity the import can’t read, instead of throwing', async () => {
    const result = await parseAll([COLS, '1,2025-01-01,Vendor A,,Item A1,Audio,1e1,S1,,100']);
    expect(result.invalidRows.map((r) => r.rowIndex)).toEqual([2]);
    expect(() => plan([...result.validRows, ...result.invalidRows])).not.toThrow();
  });
});

describe('every imported unit and lot is Active (#183 D review)', () => {
  it('sends no status, even when an old file has a status column', async () => {
    const result = await parseAll([
      'source,acquisition_date,vendor,manufacturer_model,category,quantity,tag_number,status,item_price',
      '1,2025-01-01,Vendor A,Shure SM58,Audio,1,MIC-1,Disposed,99',
      '1,2025-01-01,Vendor A,Mic Clip,Audio,10,,Missing,4',
    ]);
    expect(result.invalidRows).toEqual([]);
    const p = buildAssetImportPlan(ORG, result.validRows, { items: [], kitNames: [] });
    for (const u of p.purchases.flatMap((x) => x.units)) expect(u).not.toHaveProperty('status');
  });

  it('has no status column in the example file', () => {
    expect(micKitCsv.split('\n')[0].split(',')).not.toContain('status');
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
