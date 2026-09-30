// Pure helpers for the organization dashboard route — no Deno/network
// imports, unit-testable under Vitest/Node.

/** The `assets` columns the dashboard's value totals read. */
export const DASHBOARD_ASSET_COLUMNS = 'item_cost, replacement_value, insurance_policy_added';

export interface DashboardAssetRow {
  item_cost?: number | string | null;
  replacement_value?: number | string | null;
  insurance_policy_added?: boolean | null;
}

/**
 * Total asset value (sum of each asset's `item_cost`) and insured value (sum
 * of the replacement value of assets added to an insurance policy).
 */
export function sumAssetValues(assets: readonly DashboardAssetRow[] | null | undefined): {
  totalAssetValue: number;
  totalInsuredValue: number;
} {
  let totalAssetValue = 0;
  let totalInsuredValue = 0;
  for (const asset of assets ?? []) {
    if (asset.item_cost) totalAssetValue += parseFloat(String(asset.item_cost));
    if (asset.insurance_policy_added && asset.replacement_value) totalInsuredValue += parseFloat(String(asset.replacement_value));
  }
  return { totalAssetValue, totalInsuredValue };
}
