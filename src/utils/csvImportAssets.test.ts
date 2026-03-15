import { describe, it, expect } from 'vitest';
import { validateAssetRow, applyCostAllocation, parseAndValidateCSV, type AssetRow, type ParsedRow } from './csvImport';

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
      expect(result.validRows[1].data.vendor).toBe(''); // Source 1 doesn't have its own vendor in CSV
      expect(result.validRows[1].data.item_cost).toBe('110.00');
      
      // Vendor B Group: Raw sum = 100 (B1) + 100 (Shipping) = 200. Factor = 200/200 = 1.0
      expect(result.validRows[3].data.item_cost).toBe('100.00'); // Item B1
      expect(result.validRows[4].data.item_cost).toBe('100.00'); // Shipping item
      expect(result.validRows[4].data.line_cost).toBe('100.00'); // line_cost updated for Source 2
    });

    it('should ignore invalid rows when grouping for allocation', async () => {
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

      // Raw sum of VALID items = 100. Factor = 150 / 100 = 1.5
      expect(result.validRows[1].data.item_cost).toBe('150.00');
    });
  });
});
