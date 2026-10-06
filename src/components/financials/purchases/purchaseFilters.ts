import type { DbPurchase } from '../../../utils/supabase/types';
import { lineTaxTreatment } from '../../../utils/taxTreatment';

// Date presets and totals for the purchases report (10-01). Dates are local
// calendar days as YYYY-MM-DD, the same form as purchase_date.

export type DatePreset = 'last-30' | 'this-month' | 'last-month' | 'this-quarter' | 'this-year' | 'last-year' | 'all';

export const DATE_PRESETS: { key: DatePreset; label: string }[] = [
  { key: 'last-30', label: 'Last 30 days' },
  { key: 'this-month', label: 'This month' },
  { key: 'last-month', label: 'Last month' },
  { key: 'this-quarter', label: 'This quarter' },
  { key: 'this-year', label: 'This year' },
  { key: 'last-year', label: 'Last year' },
  { key: 'all', label: 'All time' },
];

export const DEFAULT_DATE_PRESET: DatePreset = 'last-30';

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
// Day 0 of the next month is the last day of this one; month may be out of range.
const monthStart = (year: number, month: number) => ymd(new Date(year, month, 1));
const monthEnd = (year: number, month: number) => ymd(new Date(year, month + 1, 0));

/** The from/to dates a preset stands for, relative to today. 'all' is unbounded. */
export function presetRange(preset: DatePreset, today: Date = new Date()): { from: string; to: string } {
  const y = today.getFullYear();
  const m = today.getMonth();
  switch (preset) {
    case 'last-30': {
      const from = new Date(y, m, today.getDate() - 30);
      return { from: ymd(from), to: ymd(today) };
    }
    case 'this-month': return { from: monthStart(y, m), to: monthEnd(y, m) };
    case 'last-month': return { from: monthStart(y, m - 1), to: monthEnd(y, m - 1) };
    case 'this-quarter': {
      const q = m - (m % 3);
      return { from: monthStart(y, q), to: monthEnd(y, q + 2) };
    }
    case 'this-year': return { from: `${y}-01-01`, to: `${y}-12-31` };
    case 'last-year': return { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` };
    case 'all': return { from: '', to: '' };
  }
}

/** By tax treatment (#133), or every line tracked as equipment whatever its treatment. */
export type PurchaseTypeFilter = 'all' | 'expense' | 'depreciate' | 'equipment';

export interface PurchaseGroup {
  header: DbPurchase;
  children: DbPurchase[];
}

export function lineMatchesType(line: DbPurchase, typeFilter: PurchaseTypeFilter): boolean {
  if (typeFilter === 'all') return true;
  if (typeFilter === 'equipment') return !!line.asset_id;
  return lineTaxTreatment(line) === typeFilter;
}

/**
 * Invoice groups, newest first: each header with its lines (only those of the
 * chosen type). Lines whose header isn't in the list are grouped by date and vendor.
 */
export function groupPurchases(purchases: DbPurchase[], typeFilter: PurchaseTypeFilter): PurchaseGroup[] {
  const headers = purchases.filter(p => p.row_type === 'header');
  const items = purchases.filter(p => p.row_type !== 'header');

  const groups = headers.map(header => {
    const children = items.filter(item => item.parent_id === header.id && lineMatchesType(item, typeFilter));
    if (typeFilter !== 'all' && children.length === 0) return null;
    return { header, children };
  }).filter(Boolean) as PurchaseGroup[];

  const orphanedItems = items.filter(item =>
    !headers.some(h => h.id === item.parent_id) && lineMatchesType(item, typeFilter)
  );

  if (orphanedItems.length > 0) {
    const orphanGroups = new Map<string, DbPurchase[]>();
    orphanedItems.forEach(item => {
      const key = `${item.purchase_date}|${item.vendor}`;
      if (!orphanGroups.has(key)) orphanGroups.set(key, []);
      orphanGroups.get(key)!.push(item);
    });

    orphanGroups.forEach((children, key) => {
      const [date, vendor] = key.split('|');
      groups.push({
        header: {
          id: `orphan-${key}`,
          purchase_date: date,
          vendor,
          row_type: 'header',
          total_inv_amount: children.reduce((sum, c) => sum + (c.line_cost || 0), 0)
        } as DbPurchase,
        children
      });
    });
  }

  return groups.sort((a, b) => (b.header.purchase_date || '').localeCompare(a.header.purchase_date || ''));
}

export interface PurchaseTotals {
  totalCost: number;
  depreciatedCount: number;
  expensedCount: number;
  /** Lines tracked as equipment, expensed or depreciated. */
  equipmentCount: number;
}

/** Total cost, and line counts by tax treatment and equipment, over invoice groups. */
export function purchaseTotals(groups: { children: DbPurchase[] }[]): PurchaseTotals {
  const totals: PurchaseTotals = { totalCost: 0, depreciatedCount: 0, expensedCount: 0, equipmentCount: 0 };
  for (const group of groups) {
    for (const line of group.children) {
      totals.totalCost += line.line_cost || 0;
      if (lineTaxTreatment(line) === 'depreciate') totals.depreciatedCount++;
      else totals.expensedCount++;
      if (line.asset_id) totals.equipmentCount++;
    }
  }
  return totals;
}
