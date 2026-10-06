/**
 * The two category lists on a purchase line (#125, #133): the shared expense
 * categories, and the organization's equipment categories (what its assets use).
 */
import { requireAuth } from '../utils/supabase/auth-utils';
import { EXPENSE_HEADINGS, tidyAssetCategory } from '../utils/purchaseCategories';
import { getDistinctAssetValues } from './asset.service';

export interface ExpenseCategory {
  name: string;
  schedule_c_line: string | null;
}

/** Active expense categories, in return order. Falls back to the built-in headings if the list can't load. */
export async function getExpenseCategories(): Promise<ExpenseCategory[]> {
  try {
    const { supabase } = await requireAuth();
    const { data, error } = await (supabase.from('expense_categories') as any)
      .select('name, schedule_c_line')
      .eq('active', true)
      .order('sort_order');
    if (error) throw error;
    if (data?.length) return data as ExpenseCategory[];
  } catch (err) {
    console.error('Error loading expense categories:', err);
  }
  return EXPENSE_HEADINGS.map(name => ({ name, schedule_c_line: null }));
}

/** The organization's equipment categories, tidied (Cases → Cases/Bags, Small Parts → Misc) and sorted. */
export async function getEquipmentCategories(organizationId: string): Promise<string[]> {
  try {
    const values = await getDistinctAssetValues(organizationId, 'category');
    return Array.from(new Set(values.map(tidyAssetCategory))).sort((a, b) => a.localeCompare(b));
  } catch (err) {
    console.error('Error loading equipment categories:', err);
    return [];
  }
}
