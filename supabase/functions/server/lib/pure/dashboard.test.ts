import { describe, it, expect } from 'vitest';
import { DASHBOARD_ASSET_COLUMNS, sumAssetValues } from './dashboard';

describe('DASHBOARD_ASSET_COLUMNS', () => {
  it('selects item_cost, the column assets.cost was renamed to (#91)', () => {
    const columns = DASHBOARD_ASSET_COLUMNS.split(',').map((c) => c.trim());
    expect(columns).toEqual(['item_cost', 'replacement_value', 'insurance_policy_added']);
  });
});

describe('sumAssetValues', () => {
  it('sums item_cost into the total asset value (#91)', () => {
    // PostgREST returns numeric columns as numbers or strings depending on size.
    expect(sumAssetValues([{ item_cost: 1200 }, { item_cost: '350.50' }, { item_cost: null }]).totalAssetValue).toBe(1550.5);
  });

  it('sums the replacement value of insured assets only', () => {
    const rows = [
      { item_cost: 100, replacement_value: 500, insurance_policy_added: true },
      { item_cost: 100, replacement_value: '250', insurance_policy_added: true },
      { item_cost: 100, replacement_value: 900, insurance_policy_added: false },
    ];
    expect(sumAssetValues(rows)).toEqual({ totalAssetValue: 300, totalInsuredValue: 750 });
  });

  it('reports zero for no assets', () => {
    expect(sumAssetValues([])).toEqual({ totalAssetValue: 0, totalInsuredValue: 0 });
    expect(sumAssetValues(null)).toEqual({ totalAssetValue: 0, totalInsuredValue: 0 });
  });
});
