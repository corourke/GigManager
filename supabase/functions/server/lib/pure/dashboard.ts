// Pure helpers for the organization dashboard route — no Deno/network
// imports, unit-testable under Vitest/Node.

/** The `assets` columns the dashboard's equipment totals read. */
export const DASHBOARD_ASSET_COLUMNS = 'quantity, replacement_value, insurance_policy_added, equipment_item_id';

export interface DashboardAssetRow {
  quantity?: number | string | null;
  replacement_value?: number | string | null;
  insurance_policy_added?: boolean | null;
  equipment_item_id?: string | null;
}

const num = (v: number | string | null | undefined): number => {
  const n = v == null ? NaN : parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
};

/**
 * Equipment totals for the dashboard (#157): total value is each unit's or
 * lot's replacement value × its quantity, the same figure as the equipment
 * list; insured value counts insured records the same way. Also counts the
 * items owned (distinct equipment items) and the pieces (sum of quantities).
 */
export function sumAssetValues(assets: readonly DashboardAssetRow[] | null | undefined): {
  totalAssetValue: number;
  totalInsuredValue: number;
  ownedItems: number;
  ownedPieces: number;
} {
  let totalAssetValue = 0;
  let totalInsuredValue = 0;
  let ownedPieces = 0;
  const items = new Set<string>();
  for (const asset of assets ?? []) {
    const quantity = asset.quantity == null ? 1 : num(asset.quantity);
    const value = num(asset.replacement_value) * quantity;
    totalAssetValue += value;
    if (asset.insurance_policy_added) totalInsuredValue += value;
    ownedPieces += quantity;
    if (asset.equipment_item_id) items.add(asset.equipment_item_id);
  }
  return { totalAssetValue, totalInsuredValue, ownedItems: items.size, ownedPieces };
}
