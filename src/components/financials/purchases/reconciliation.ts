import type { DbPurchase } from '../../../utils/supabase/types';

export function sumLineCosts(items: DbPurchase[]): number {
  return items.reduce((sum, item) => sum + (item.line_cost || 0), 0);
}

export function getDiscrepancy(totalInvAmount: number | null | undefined, items: DbPurchase[]): number {
  const total = totalInvAmount ?? 0;
  return total - sumLineCosts(items);
}

export function isReconciled(totalInvAmount: number | null | undefined, items: DbPurchase[]): boolean {
  return Math.abs(getDiscrepancy(totalInvAmount, items)) <= 0.01;
}

export function isSyntheticHeader(id: string): boolean {
  return id.startsWith('orphan-');
}
