import { describe, it, expect } from 'vitest';
import { validateAssetRow, applyCostAllocation, parseAndValidateCSV, revalidateAssetRows, type AssetRow, type ParsedRow } from './csvImport';

/**
 * Helper to create a File-like Blob for testing parseAndValidateCSV
 */
const createFile = (content: string, name: string) => {
  const blob = new Blob([content], { type: 'text/csv' });
  (blob as any).name = name;
  return blob as File;
};

describe('Asset CSV Import: Parsing & Allocation', () => {
  
  describe('validateAssetRow: Field Mapping and Rules', () => {
    it('should correctly map Source 0 (Header) required fields', () => {
      const row = {
        source: '0',
        acquisition_date: '2024-05-10',
        vendor: 'B&H Photo Video',
        total_inv_amount: '1,550.00',
        payment_method: 'Amex'
      };
      const result = validateAssetRow(row, 1);
      expect(result.isValid).toBe(true);
      expect(result.data.source).toBe('0');
      expect(result.data.total_inv_amount).toBe('1,550.00');
    });

    it('should normalize Source "0-Invoice" to "0"', () => {
      const row = {
        source: '0-Invoice',
        acquisition_date: '2024-05-10',
        vendor: 'B&H Photo Video',
        total_inv_amount: '1,550.00',
      };
      const result = validateAssetRow(row, 1);
      expect(result.isValid).toBe(true);
      expect(result.data.source).toBe('0');
    });

    it('should normalize Source "1-Asset" to "1" and "2-Expense" to "2"', () => {
      const row1 = { source: '1-Asset', category: 'Cat', manufacturer_model: 'Model' };
      const row2 = { source: '2-Expense', category: 'Cat', line_amount: '10' };
      
      const result1 = validateAssetRow(row1, 1);
      const result2 = validateAssetRow(row2, 2);
      
      expect(result1.data.source).toBe('1');
      expect(result2.data.source).toBe('2');
    });

    it('should fail Source 0 if missing vendor or total_inv_amount', () => {
      const row = { source: '0', acquisition_date: '2024-05-10' };
      const result = validateAssetRow(row, 1);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'vendor')).toBe(true);
      expect(result.errors.some(e => e.field === 'total_inv_amount')).toBe(true);
    });

    it('should correctly map Source 1 (Asset) required fields', () => {
      const row = {
        source: '1',
        category: 'Audio',
        manufacturer_model: 'Sennheiser G4',
        quantity: '2',
        item_price: '599.00'
      };
      const result = validateAssetRow(row, 1);
      expect(result.isValid).toBe(true);
      expect(result.data.manufacturer_model).toBe('Sennheiser G4');
    });

    it('should fail Source 1 if missing category or manufacturer_model', () => {
      const row = { source: '1', quantity: '2' };
      const result = validateAssetRow(row, 1);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'category')).toBe(true);
      expect(result.errors.some(e => e.field === 'manufacturer_model')).toBe(true);
    });

    it('should handle Source 2 (Expense) with category and line_amount', () => {
      const row = {
        source: '2',
        category: 'Tax',
        line_amount: '85.50'
      };
      const result = validateAssetRow(row, 1);
      expect(result.isValid).toBe(true);
      expect(result.data.category).toBe('Tax');
      expect(result.data.line_amount).toBe('85.50');
    });
  });

  describe('applyCostAllocation: Burdened Cost Distribution', () => {
    it('should calculate the factor correctly (Factor = Total / Raw Sum)', () => {
      const headerRow: AssetRow = {
        source: '0',
        acquisition_date: '2024-01-01',
        vendor: 'Test',
        total_inv_amount: '120.00', // Total with tax/shipping
        manufacturer_model: '',
        category: ''
      };

      const itemRows: ParsedRow<AssetRow>[] = [
        {
          rowIndex: 2,
          isValid: true,
          errors: [],
          data: {
            source: '1',
            category: 'Audio',
            manufacturer_model: 'Item 1',
            quantity: '1',
            item_price: '50.00',
            acquisition_date: ''
          }
        },
        {
          rowIndex: 3,
          isValid: true,
          errors: [],
          data: {
            source: '1',
            category: 'Audio',
            manufacturer_model: 'Item 2',
            quantity: '1',
            item_price: '50.00',
            acquisition_date: ''
          }
        }
      ];

      applyCostAllocation(headerRow, itemRows);

      // Raw sum = 100. Factor = 120 / 100 = 1.2
      // Each item should be 50 * 1.2 = 60.00
      expect(itemRows[0].data.item_cost).toBe('60.00');
      expect(itemRows[1].data.item_cost).toBe('60.00');
    });

    it('should reconcile the final penny to ensure exact match with invoice total', () => {
      const headerRow: AssetRow = {
        source: '0',
        acquisition_date: '2024-01-01',
        vendor: 'Test',
        total_inv_amount: '100.00',
        manufacturer_model: '',
        category: ''
      };

      // 3 items at 33.33 each = 99.99 raw sum.
      // Final penny should go to the last row.
      const itemRows: ParsedRow<AssetRow>[] = Array(3).fill(null).map((_, i) => ({
        rowIndex: i + 2,
        isValid: true,
        errors: [],
        data: {
          source: '1',
          category: 'Misc',
          manufacturer_model: `Item ${i + 1}`,
          quantity: '1',
          item_price: '33.33',
          acquisition_date: ''
        }
      }));

      applyCostAllocation(headerRow, itemRows);

      expect(itemRows[0].data.item_cost).toBe('33.33');
      expect(itemRows[1].data.item_cost).toBe('33.33');
      expect(itemRows[2].data.item_cost).toBe('33.34'); // Reconciliation penny
      
      const sum = itemRows.reduce((acc, row) => acc + parseFloat(row.data.item_cost || '0'), 0);
      expect(sum).toBe(100.00);
    });

    it('should handle mixed Path A (Cost) and Path B (Price) rows correctly', () => {
      const headerRow: AssetRow = {
        source: '0',
        acquisition_date: '2024-01-01',
        vendor: 'Test',
        total_inv_amount: '150.00',
        manufacturer_model: '',
        category: ''
      };

      const itemRows: ParsedRow<AssetRow>[] = [
        {
          rowIndex: 2,
          isValid: true,
          errors: [],
          data: {
            source: '1',
            category: 'Audio',
            manufacturer_model: 'Fixed Cost Item',
            quantity: '1',
            line_cost: '50.00',
            acquisition_date: ''
          }
        },
        {
          rowIndex: 3,
          isValid: true,
          errors: [],
          data: {
            source: '1',
            category: 'Audio',
            manufacturer_model: 'Price Item',
            quantity: '2',
            item_price: '40.00', // line_amount = 80.00
            acquisition_date: ''
          }
        }
      ];

      // Step 3: Fixed sum = 50. Remaining balance = 150 - 50 = 100.
      // Step 4: Price sum = 80. Factor = 100 / 80 = 1.25.
      // Step 5: Price Item final line_cost = 80 * 1.25 = 100.00. item_cost = 100 / 2 = 50.00.

      applyCostAllocation(headerRow, itemRows);

      expect(itemRows[0].data.item_cost).toBe('50.00'); // Fixed path
      expect(itemRows[1].data.item_cost).toBe('50.00'); // Price path (burdened)
      
      const sum = itemRows.reduce((acc, row) => acc + parseFloat(row.data.line_cost || '0'), 0);
      expect(sum).toBe(150.00);
    });

    it('should handle Path A (Cost) with missing item_cost', () => {
      const headerRow: AssetRow = { source: '0', total_inv_amount: '100.00', acquisition_date: '', vendor: '', manufacturer_model: '', category: '' };
      const itemRows: ParsedRow<AssetRow>[] = [
        { rowIndex: 2, isValid: true, errors: [], data: { source: '1', quantity: '2', line_cost: '100.00', acquisition_date: '', manufacturer_model: '', category: '' } }
      ];
      applyCostAllocation(headerRow, itemRows);
      expect(itemRows[0].data.item_cost).toBe('50.00');
    });

    it('should handle Path B (Price) with missing line_amount', () => {
      const headerRow: AssetRow = { source: '0', total_inv_amount: '110.00', acquisition_date: '', vendor: '', manufacturer_model: '', category: '' };
      const itemRows: ParsedRow<AssetRow>[] = [
        { rowIndex: 2, isValid: true, errors: [], data: { source: '1', quantity: '2', item_price: '50.00', acquisition_date: '', manufacturer_model: '', category: '' } }
      ];
      applyCostAllocation(headerRow, itemRows);
      expect(itemRows[0].data.item_cost).toBe('55.00'); // 50 * (110/100) = 55
    });

    it('should fail rows with no price or cost information (Path C)', () => {
      const headerRow: AssetRow = { source: '0', total_inv_amount: '100.00', acquisition_date: '', vendor: '', manufacturer_model: '', category: '' };
      const itemRows: ParsedRow<AssetRow>[] = [
        { rowIndex: 2, isValid: true, errors: [], data: { source: '1', quantity: '1', acquisition_date: '', manufacturer_model: '', category: '' } }
      ];
      applyCostAllocation(headerRow, itemRows);
      expect(itemRows[0].isValid).toBe(false);
      expect(itemRows[0].errors.some(e => e.field === 'item_cost')).toBe(true);
    });
  });

  describe('parseAndValidateCSV: Hierarchical Grouping (A-Z Pipeline)', () => {
    it('should group child rows under Source 0 headers and apply allocation per group', async () => {
      const csvContent = [
        'source,acquisition_date,vendor,total_inv_amount,category,manufacturer_model,quantity,item_price,line_amount',
        '0,2024-01-15,Vendor A,110.00,,,,,', // $10 burden
        '1,,,,Audio,Item A1,1,100.00,',
        '0,2024-01-16,Vendor B,200.00,,,,,', // $0 burden
        '1,,,,Audio,Item B1,1,100.00,',
        '2,,,,Shipping,,1,100.00,100.00' // Source 2 is also an item
      ].join('\n');

      const file = createFile(csvContent, 'grouped_import.csv');
      const result = await parseAndValidateCSV<AssetRow>(file, 'assets');

      expect(result.validRows).toHaveLength(5);
      
      // Vendor A Group: Item A1 gets 100 * (110/100) = 110
      expect(result.validRows[1].data.vendor).toBe('Vendor A'); // Propagated from header
      expect(result.validRows[1].data.acquisition_date).toBe('2024-01-15'); // Propagated from header
      expect(result.validRows[1].data.item_cost).toBe('110.00');
      
      // Vendor B Group: Raw sum = 100 (B1) + 100 (Shipping) = 200. Factor = 200/200 = 1.0
      expect(result.validRows[3].data.vendor).toBe('Vendor B');
      expect(result.validRows[4].data.vendor).toBe('Vendor B');
      expect(result.validRows[3].data.item_cost).toBe('100.00');
      expect(result.validRows[4].data.line_cost).toBe('100.00');
      expect(result.validRows[3].data.item_cost).toBe('100.00'); // Item B1
      expect(result.validRows[4].data.item_cost).toBe('100.00'); // Shipping item
      expect(result.validRows[4].data.line_cost).toBe('100.00'); // line_cost updated for Source 2
    });

    it('holds back the purchase of an invalid row, without allocating its total over the other lines', async () => {
      const csvContent = [
        'source,acquisition_date,vendor,total_inv_amount,category,manufacturer_model,quantity,item_price',
        '0,2024-01-15,V1,150.00,,,,',
        '1,,,,,Invalid Item,,100.00', // Missing category (invalid)
        '1,,,,Audio,Valid Item,1,100.00'
      ].join('\n');

      const file = createFile(csvContent, 'partial_valid.csv');
      const result = await parseAndValidateCSV<AssetRow>(file, 'assets');

      expect(result.validRows).toHaveLength(2); // Header + 1 Valid Asset
      expect(result.invalidRows).toHaveLength(1);

      // The whole $150 would land on the valid line; it isn't allocated until row 3 is fixed.
      expect(result.validRows[1].data.line_cost).toBe('');
      expect(result.validRows[1].data.item_cost).toBe('');
    });
  });
});

describe('generateAssetTemplate (#125)', () => {
  it('has a recovery_period column, no service_life / dep_method, and every row fits the header', async () => {
    const { generateAssetTemplate } = await import('./csvImport');
    const Papa = (await import('papaparse')).default;
    const rows = Papa.parse<string[]>(generateAssetTemplate()).data.filter(r => r.length > 1);
    const [header, ...examples] = rows;
    expect(header).toContain('recovery_period');
    expect(header).not.toContain('service_life');
    expect(header).not.toContain('dep_method');
    for (const r of examples) expect(r).toHaveLength(header.length);
    expect(examples[1][header.indexOf('recovery_period')]).toBe('7');
  });
});

// #183 D: one row of N with N serials or tags makes N units; a kit names the kit
// the row's units or lot go into; retired_on and liquidation_amt are no longer read.
describe('validateAssetRow: units, lots and kits (#183 D)', () => {
  const equipment = (extra: Record<string, string>) => ({
    source: '1', acquisition_date: '2025-11-03', vendor: 'Sweetwater', category: 'Audio',
    manufacturer_model: 'Shure SM58', item_price: '99.00', ...extra,
  });

  it('accepts 2 serials separated by ";" on a line of 2: the row that used to fail to save', () => {
    const r = validateAssetRow(equipment({ quantity: '2', serial_number: '2NC0412; 2NC0413' }), 3);
    expect(r.errors).toEqual([]);
    expect(r.isValid).toBe(true);
  });

  it('refuses one serial on a line of 4, saying how to fix it', () => {
    const r = validateAssetRow(equipment({ quantity: '4', serial_number: 'HX8M-55120' }), 6);
    expect(r.isValid).toBe(false);
    expect(r.errors).toContainEqual({
      field: 'serial_number',
      message: '1 serial number for quantity 4. Give 4 serial numbers separated by ";" (4 units), or clear the serial number (a lot of 4).',
    });
  });

  it('refuses 3 tags on a line of 4', () => {
    const r = validateAssetRow(equipment({ quantity: '4', tag_number: 'MIC-1;MIC-2;MIC-3' }), 2);
    expect(r.errors).toContainEqual({
      field: 'tag_number',
      message: '3 tags for quantity 4. Give 4 tags separated by ";" (4 units), or clear the tags (a lot of 4).',
    });
  });

  it('pairs serials and tags by position; the longer list sets the number of units', () => {
    const r = validateAssetRow(equipment({ quantity: '3', serial_number: 'S1;;S3', tag_number: 'T1;T2' }), 2);
    expect(r.isValid).toBe(true);
  });

  it('refuses a unit with neither a serial nor a tag, in the pop-up’s words', () => {
    const r = validateAssetRow(equipment({ quantity: '3', serial_number: 'S1;;S3' }), 2);
    expect(r.errors.map((e) => e.message)).toContain('Unit 2 needs a serial number or a tag (either will do).');
  });

  it('refuses the same tag twice in one row', () => {
    const r = validateAssetRow(equipment({ quantity: '2', tag_number: 'DSL-0152;dsl-0152' }), 2);
    expect(r.errors.map((e) => e.message)).toContain('Units 1 and 2 both have tag DSL-0152.');
  });

  it('takes a blank quantity from the serials, and says so', () => {
    const r = validateAssetRow(equipment({ quantity: '', serial_number: 'A;B;C' }), 2);
    expect(r.isValid).toBe(true);
    expect(r.data.quantity).toBe('3');
    expect(r.notes).toEqual(['Quantity read as 3 from the serial list.']);
  });

  it('takes a blank quantity from the tags when there are no serials', () => {
    const r = validateAssetRow(equipment({ quantity: '', tag_number: 'MIC-0201;MIC-0202' }), 2);
    expect(r.data.quantity).toBe('2');
    expect(r.notes).toEqual(['Quantity read as 2 from the tag list.']);
  });

  it('keeps the kit on an equipment row', () => {
    const r = validateAssetRow(equipment({ quantity: '10', kit: 'Mic Kit 1' }), 2);
    expect(r.isValid).toBe(true);
    expect(r.data.kit).toBe('Mic Kit 1');
  });

  it('refuses a kit on an expense row', () => {
    const r = validateAssetRow({ source: '2', acquisition_date: '2025-11-03', vendor: 'Sweetwater', category: 'Supplies',
      manufacturer_model: 'AA Batteries', item_price: '18.99', kit: 'Mic Kit 1' }, 6);
    expect(r.isValid).toBe(false);
    expect(r.errors).toContainEqual({ field: 'kit', message: 'Only an equipment row (1-Asset) can go in a kit: clear the kit, or make the row 1-Asset.' });
  });

  it('reads no status: every imported unit and lot is Active', () => {
    for (const status of ['Missing', 'Lost', 'Disposed']) {
      const r = validateAssetRow(equipment({ quantity: '1', status }), 2);
      expect(r.errors).toEqual([]);
      expect(r.data).not.toHaveProperty('status');
    }
  });

  it.each(['3.5', '1e1', '4 units', '-2', '1,000'])('refuses quantity "%s", which isn’t a whole number', (quantity) => {
    const r = validateAssetRow(equipment({ quantity }), 2);
    expect(r.isValid).toBe(false);
    expect(r.errors).toContainEqual({ field: 'quantity', message: `Invalid quantity "${quantity}". Must be a whole number.` });
  });

  it('reads a quantity with spaces around it', () => {
    const r = validateAssetRow(equipment({ quantity: ' 4 ' }), 2);
    expect(r.errors).toEqual([]);
    expect(r.data.quantity).toBe('4');
  });

  it('ignores retired_on and liquidation_amt, even when they are invalid', () => {
    const r = validateAssetRow(equipment({ quantity: '1', retired_on: 'not a date', liquidation_amt: 'abc' }), 2);
    expect(r.isValid).toBe(true);
    expect(r.data).not.toHaveProperty('retired_on');
    expect(r.data).not.toHaveProperty('liquidation_amt');
  });
});

describe('parseAndValidateCSV: file-level checks (#183 D)', () => {
  it('refuses a tag that is already on an earlier row of the file', async () => {
    const csv = [
      'source,acquisition_date,vendor,category,manufacturer_model,quantity,tag_number,item_price',
      '1,2025-11-03,Sweetwater,Audio,Shure SM58,2,MIC-0201;MIC-0202,99',
      '1,2025-11-03,Sweetwater,Audio,Shure Beta 52A,1,mic-0202,189',
    ].join('\n');
    const result = await parseAndValidateCSV<AssetRow>(createFile(csv, 'dupes.csv'), 'assets');
    expect(result.validRows.map((r) => r.rowIndex)).toEqual([2]);
    expect(result.invalidRows[0].errors).toContainEqual({ field: 'tag_number', message: 'Tag MIC-0202 is also on row 2.' });
  });

  it('notices an old file’s retired_on and liquidation_amt columns, without blocking it', async () => {
    const csv = [
      'source,acquisition_date,vendor,category,manufacturer_model,quantity,item_price,retired_on,liquidation_amt',
      '1,2025-11-03,Sweetwater,Audio,Shure SM58,1,99,2026-01-01,40',
    ].join('\n');
    const result = await parseAndValidateCSV<AssetRow>(createFile(csv, 'old.csv'), 'assets');
    expect(result.validRows).toHaveLength(1);
    expect(result.notices).toEqual([
      'These columns aren’t imported: retired_on, liquidation_amt. Record sales and retirements on the equipment page.',
    ]);
  });

  it('notices an old file’s status column in the same notice, without blocking it', async () => {
    const csv = [
      'source,acquisition_date,vendor,category,manufacturer_model,quantity,item_price,status,retired_on',
      '1,2025-11-03,Sweetwater,Audio,Shure SM58,1,99,Missing,2026-01-01',
    ].join('\n');
    const result = await parseAndValidateCSV<AssetRow>(createFile(csv, 'old.csv'), 'assets');
    expect(result.invalidRows).toEqual([]);
    expect(result.notices).toEqual([
      'These columns aren’t imported: status, retired_on. Imported equipment is Active. Record sales and retirements on the equipment page.',
    ]);
  });

  it('refuses a quantity of 1e1 with one serial, instead of reading it as 1 in one place and 11 in another', async () => {
    const csv = ['source,acquisition_date,vendor,category,manufacturer_model,quantity,serial_number,item_price', '1,2025-11-03,V,Audio,M,1e1,S1,9'].join('\n');
    const result = await parseAndValidateCSV<AssetRow>(createFile(csv, 'qty.csv'), 'assets');
    expect(result.validRows).toEqual([]);
    expect(result.invalidRows[0].errors).toContainEqual({ field: 'quantity', message: 'Invalid quantity "1e1". Must be a whole number.' });
  });

  it('has no notices for a file in the current format', async () => {
    const csv = ['source,acquisition_date,vendor,category,manufacturer_model,quantity,item_price', '1,2025-11-03,V,Audio,M,1,9'].join('\n');
    expect((await parseAndValidateCSV<AssetRow>(createFile(csv, 'new.csv'), 'assets')).notices).toEqual([]);
  });
});

describe('revalidateAssetRows: a fixed row joins its own invoice (#183 D)', () => {
  it('groups a fixed row under the invoice it sits in, and allocates its cost there', async () => {
    const csv = [
      'source,acquisition_date,vendor,total_inv_amount,category,manufacturer_model,quantity,item_price',
      '0,2024-01-15,Vendor A,220.00,,,,',
      '1,,,,Audio,Item A1,1,100.00',
      '1,,,,,Item A2,1,100.00', // no category: invalid until fixed
      '0,2024-01-16,Vendor B,100.00,,,,',
      '1,,,,Audio,Item B1,1,100.00',
    ].join('\n');
    const first = await parseAndValidateCSV<AssetRow>(createFile(csv, 'fix.csv'), 'assets');
    expect(first.invalidRows.map((r) => r.rowIndex)).toEqual([4]);

    const fixed = validateAssetRow({ ...first.invalidRows[0].raw, category: 'Audio' }, 4);
    const next = revalidateAssetRows(first.validRows, [fixed]);

    expect(next.invalidRows).toEqual([]);
    const byRow = new Map(next.validRows.map((r) => [r.rowIndex, r.data]));
    expect(byRow.get(4)?.vendor).toBe('Vendor A');
    // Vendor A: 220 over two lines of 100, so 110 each.
    expect(byRow.get(3)?.item_cost).toBe('110.00');
    expect(byRow.get(4)?.item_cost).toBe('110.00');
    expect(byRow.get(6)?.item_cost).toBe('100.00');
    expect(next.validRows.map((r) => r.rowIndex)).toEqual([2, 3, 4, 5, 6]);
  });
});

describe('generateAssetTemplate: grouped columns and a kit (#183 D)', () => {
  it('lists the item, unit-or-lot and purchase-line columns in that order, with kit and without retired_on or liquidation_amt', async () => {
    const { generateAssetTemplate, ASSET_TEMPLATE_COLUMNS } = await import('./csvImport');
    const Papa = (await import('papaparse')).default;
    const [header, ...examples] = Papa.parse<string[]>(generateAssetTemplate()).data.filter((r) => r.length > 1);
    expect(header).toEqual([...ASSET_TEMPLATE_COLUMNS.item, ...ASSET_TEMPLATE_COLUMNS.unit, ...ASSET_TEMPLATE_COLUMNS.line]);
    expect(ASSET_TEMPLATE_COLUMNS.item.slice(0, 2)).toEqual(['manufacturer_model', 'category']);
    expect(ASSET_TEMPLATE_COLUMNS.unit).toContain('kit');
    expect(header).not.toContain('retired_on');
    expect(header).not.toContain('liquidation_amt');
    // Every imported unit and lot is Active (Cameron, 10-12).
    expect(header).not.toContain('status');
    // The units example lists one serial per unit.
    const units = examples.find((r) => r[header.indexOf('serial_number')].includes(';'))!;
    expect(units[header.indexOf('serial_number')].split(';')).toHaveLength(Number(units[header.indexOf('quantity')]));
  });
});

describe('ASSET_COLUMN_GUIDE: the screen’s grouped column guide (#183 D2, mockup 11)', () => {
  it('describes every template column, in the template’s groups and order', async () => {
    const { ASSET_COLUMN_GUIDE, ASSET_TEMPLATE_COLUMNS } = await import('./csvImport');
    expect(ASSET_COLUMN_GUIDE.map((g) => g.group)).toEqual(['item', 'unit', 'line']);
    for (const g of ASSET_COLUMN_GUIDE) {
      expect(g.columns.map((c) => c.name)).toEqual([...ASSET_TEMPLATE_COLUMNS[g.group]]);
      expect(g.title.trim()).not.toBe('');
      expect(g.summary.trim()).not.toBe('');
      for (const c of g.columns) expect(c.description.trim()).not.toBe('');
    }
  });

  it('marks the columns every equipment row needs', async () => {
    const { ASSET_COLUMN_GUIDE } = await import('./csvImport');
    const required = ASSET_COLUMN_GUIDE.flatMap((g) => g.columns).filter((c) => c.required).map((c) => c.name);
    expect(required).toEqual(['manufacturer_model', 'category', 'acquisition_date']);
  });
});
