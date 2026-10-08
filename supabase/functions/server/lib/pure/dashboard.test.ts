import { describe, it, expect } from 'vitest';
import { DASHBOARD_ASSET_COLUMNS, sumAssetValues } from './dashboard';

describe('DASHBOARD_ASSET_COLUMNS', () => {
  it('selects what the totals need: quantity, replacement value, insured flag, item and status (#157)', () => {
    const columns = DASHBOARD_ASSET_COLUMNS.split(',').map((c) => c.trim());
    expect(columns).toEqual(['quantity', 'replacement_value', 'insurance_policy_added', 'equipment_item_id', 'status']);
  });
});

describe('sumAssetValues', () => {
  it('totals replacement value × quantity, the same figure as the equipment list (#157)', () => {
    // PostgREST returns numeric columns as numbers or strings depending on size.
    const rows = [
      { replacement_value: 999, quantity: 1 },
      { replacement_value: '1049.00', quantity: '1' },
      { replacement_value: 16, quantity: 30 },
      { replacement_value: null, quantity: 4 },
    ];
    expect(sumAssetValues(rows).totalAssetValue).toBe(999 + 1049 + 480);
  });

  it('counts a missing quantity as 1', () => {
    expect(sumAssetValues([{ replacement_value: 250, quantity: null }]).totalAssetValue).toBe(250);
  });

  it('counts insured records the same way, replacement value × quantity (#157)', () => {
    const rows = [
      { replacement_value: 500, quantity: 1, insurance_policy_added: true },
      { replacement_value: '25', quantity: 10, insurance_policy_added: true },
      { replacement_value: 900, quantity: 2, insurance_policy_added: false },
    ];
    expect(sumAssetValues(rows)).toMatchObject({ totalAssetValue: 500 + 250 + 1800, totalInsuredValue: 750 });
  });

  it('counts the items and pieces owned', () => {
    const rows = [
      { equipment_item_id: 'k12', quantity: 1 },
      { equipment_item_id: 'k12', quantity: 1 },
      { equipment_item_id: 'xlr25', quantity: 10 },
      { equipment_item_id: 'xlr25', quantity: 20 },
    ];
    expect(sumAssetValues(rows)).toMatchObject({ ownedItems: 2, ownedPieces: 32 });
  });

  it('leaves out Disposed and Returned equipment, as the Items tab does (#190)', () => {
    const rows = [
      { equipment_item_id: 'k12', replacement_value: 999, quantity: 1, status: 'Active', insurance_policy_added: true },
      { equipment_item_id: 'k12', replacement_value: 999, quantity: 1, status: 'Maintenance' },
      { equipment_item_id: 'xlr25', replacement_value: 16, quantity: 10, status: 'Inactive' },
      { equipment_item_id: 'xlr25', replacement_value: 16, quantity: 1, status: null },
      { equipment_item_id: 'trio', replacement_value: 500, quantity: 1, status: 'Disposed', insurance_policy_added: true },
      { equipment_item_id: 'trio', replacement_value: 500, quantity: 2, status: 'Returned', insurance_policy_added: true },
    ];
    expect(sumAssetValues(rows)).toEqual({
      totalAssetValue: 999 * 2 + 16 * 11, totalInsuredValue: 999, ownedItems: 2, ownedPieces: 13,
    });
  });

  it('reports zero for no assets', () => {
    const zero = { totalAssetValue: 0, totalInsuredValue: 0, ownedItems: 0, ownedPieces: 0 };
    expect(sumAssetValues([])).toEqual(zero);
    expect(sumAssetValues(null)).toEqual(zero);
  });
});
