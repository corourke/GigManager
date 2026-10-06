/**
 * Purchase line categories (#125, #133).
 *
 * An expensed line's `category` is an expense category: one of the shared
 * headings in `expense_categories` (Cameron's 2025 Schedule C headings). A
 * depreciated line's `category` is its equipment category, the same as its
 * asset's. An expensed line tracked as equipment has both: the expense
 * category on the line and the equipment category on its asset.
 * See docs/technical/financials.md §3.
 */
import type { TaxTreatment } from './taxTreatment';

/** Old free-text categories → the expense heading they were filed under. */
const EXPENSE_HEADING_FOR: Record<string, string> = {
  audio: 'Small audio parts',
  lighting: 'Small lighting parts',
  networking: 'Small networking parts',
  power: 'Small power parts and consumables',
  'small parts': 'Other small parts',
  misc: 'Other small parts',
  'cases/bags': 'Cases and bags',
  cases: 'Cases and bags',
  software: 'Software subscriptions',
  marketing: 'Marketing and website',
  meals: 'Travel meals',
  transportation: 'Travel',
  'car and truck exp': 'Car and truck expenses',
  'car and truck': 'Car and truck expenses',
  reimbursable: 'Reimbursable (not deducted)',
};

/** The headings themselves (kept in step with the seed in 20261008000000_expense_categories.sql). */
export const EXPENSE_HEADINGS = [
  'Small audio parts', 'Small lighting parts', 'Small networking parts', 'Small power parts and consumables',
  'Other small parts', 'Cases and bags', 'Supplies', 'Software subscriptions', 'Training', 'Marketing and website',
  'Insurance', 'Car and truck expenses', 'Contract labor', 'Travel', 'Travel meals', 'Reimbursable (not deducted)',
];

/** The expense heading for a scanned or old category, if there's an obvious one. */
export function suggestExpenseCategory(raw: string | null | undefined): string | undefined {
  const key = (raw ?? '').trim().toLowerCase();
  if (!key) return undefined;
  return EXPENSE_HEADINGS.find(h => h.toLowerCase() === key) ?? EXPENSE_HEADING_FOR[key];
}

/** Equipment categories merged on 10-06: Cases → Cases/Bags, Small Parts → Misc. */
const TIDY: Record<string, string> = { Cases: 'Cases/Bags', 'Small Parts': 'Misc' };
export function tidyAssetCategory(c: string): string {
  return TIDY[c] ?? c;
}

interface LineCategories {
  category?: string;
  asset_category?: string;
}

/**
 * Move a line's categories when its tax treatment changes. A depreciated line
 * keeps one (equipment) category; otherwise the line holds the expense
 * category and `asset_category` the equipment one.
 */
export function retargetCategories<T extends LineCategories>(
  item: T, from: TaxTreatment | null | undefined, to: TaxTreatment | null | undefined,
): T {
  const wasDep = from === 'depreciate';
  const isDep = to === 'depreciate';
  if (wasDep === isDep) return item;
  if (isDep) {
    const category = item.asset_category || (suggestExpenseCategory(item.category) === item.category ? '' : item.category ?? '');
    return { ...item, category, asset_category: undefined };
  }
  return { ...item, category: suggestExpenseCategory(item.category) ?? '', asset_category: item.category };
}

/** The category the line's equipment record gets (or has). */
export function equipmentCategoryOf(item: LineCategories & { tax_treatment?: TaxTreatment | null }): string {
  return (item.tax_treatment === 'depreciate' ? item.category : item.asset_category) ?? '';
}
