/**
 * Category lists (#125, 10-06). Each organization has its own expense
 * categories (each filed on a Schedule C line) and equipment categories.
 * The first time an organization needs a list, the database copies the
 * starter set into it (`ensure_org_categories`). The starter sets themselves
 * (organization_id NULL) are seen and edited only by platform moderators.
 * See docs/technical/financials.md §6.
 */
import { requireAuth } from '../utils/supabase/auth-utils';
import { EXPENSE_HEADINGS, tidyAssetCategory } from '../utils/purchaseCategories';
import { getDistinctAssetValues } from './asset.service';

export type CategoryKind = 'expense' | 'equipment';

export interface ExpenseCategory {
  id?: string;
  name: string;
  schedule_c_line: string | null;
  sort_order?: number;
  active?: boolean;
}

export interface EquipmentCategory {
  id?: string;
  name: string;
  sort_order?: number;
  active?: boolean;
}

export interface CategoryRow {
  id: string;
  organization_id: string | null;
  name: string;
  schedule_c_line?: string | null;
  sort_order: number;
  active: boolean;
}

export interface ScheduleCLine {
  code: string;
  label: string;
}

const TABLE: Record<CategoryKind, 'expense_categories' | 'equipment_categories'> = { expense: 'expense_categories', equipment: 'equipment_categories' };

/** Copy the starter sets into the organization if it has no lists yet. */
export async function ensureOrgCategories(organizationId: string): Promise<void> {
  const { supabase } = await requireAuth();
  const { error } = await supabase.rpc('ensure_org_categories' as any, { p_org: organizationId } as any);
  if (error) throw error;
}

/** The organization's active expense categories. Falls back to the built-in headings if the list can't load. */
export async function getExpenseCategories(organizationId: string): Promise<ExpenseCategory[]> {
  try {
    await ensureOrgCategories(organizationId);
    const { supabase } = await requireAuth();
    const { data, error } = await (supabase.from('expense_categories') as any)
      .select('id, name, schedule_c_line, sort_order')
      .eq('organization_id', organizationId)
      .eq('active', true)
      .order('sort_order');
    if (error) throw error;
    if (data?.length) return data as ExpenseCategory[];
  } catch (err) {
    console.error('Error loading expense categories:', err);
  }
  return EXPENSE_HEADINGS.map(name => ({ name, schedule_c_line: null }));
}

/**
 * The organization's active equipment category names. Falls back to the
 * categories its assets already use if the list can't load.
 */
export async function getEquipmentCategories(organizationId: string): Promise<string[]> {
  try {
    await ensureOrgCategories(organizationId);
    const { supabase } = await requireAuth();
    const { data, error } = await (supabase.from('equipment_categories') as any)
      .select('name')
      .eq('organization_id', organizationId)
      .eq('active', true)
      .order('sort_order');
    if (error) throw error;
    if (data?.length) return (data as { name: string }[]).map(r => r.name);
  } catch (err) {
    console.error('Error loading equipment categories:', err);
  }
  try {
    const values = await getDistinctAssetValues(organizationId, 'category');
    return Array.from(new Set(values.map(tidyAssetCategory))).sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

/** Every category in a list, active or not: an organization's (`organizationId`) or the starter set (`null`). */
export async function listCategories(kind: CategoryKind, organizationId: string | null): Promise<CategoryRow[]> {
  if (organizationId) await ensureOrgCategories(organizationId);
  const { supabase } = await requireAuth();
  const cols = kind === 'expense' ? 'id, organization_id, name, schedule_c_line, sort_order, active' : 'id, organization_id, name, sort_order, active';
  let q = (supabase.from(TABLE[kind]) as any).select(cols);
  q = organizationId ? q.eq('organization_id', organizationId) : q.is('organization_id', null);
  const { data, error } = await q.order('sort_order');
  if (error) throw error;
  return (data ?? []) as CategoryRow[];
}

export async function addCategory(
  kind: CategoryKind,
  organizationId: string | null,
  fields: { name: string; schedule_c_line?: string | null; sort_order: number },
): Promise<CategoryRow> {
  const { supabase } = await requireAuth();
  const row: Record<string, unknown> = { organization_id: organizationId, name: fields.name.trim(), sort_order: fields.sort_order };
  if (kind === 'expense') row.schedule_c_line = fields.schedule_c_line ?? null;
  const { data, error } = await (supabase.from(TABLE[kind]) as any).insert(row).select().single();
  if (error) throw error;
  return data as CategoryRow;
}

export async function updateCategory(
  kind: CategoryKind,
  id: string,
  patch: Partial<Pick<CategoryRow, 'name' | 'schedule_c_line' | 'active' | 'sort_order'>>,
): Promise<void> {
  const { supabase } = await requireAuth();
  const { error } = await (supabase.from(TABLE[kind]) as any).update(patch).eq('id', id);
  if (error) throw error;
}

export async function getScheduleCLines(): Promise<ScheduleCLine[]> {
  const { supabase } = await requireAuth();
  const { data, error } = await (supabase.from('schedule_c_lines') as any).select('code, label').order('sort_order');
  if (error) throw error;
  return (data ?? []) as ScheduleCLine[];
}

/**
 * How many records use each category name in an organization: expensed
 * purchase lines for expense categories, equipment for equipment categories.
 * A category in use isn't renamed here, since records store the name.
 */
export async function getCategoryUsage(kind: CategoryKind, organizationId: string): Promise<Record<string, number>> {
  const { supabase } = await requireAuth();
  let q: any;
  if (kind === 'expense') {
    q = (supabase.from('purchases') as any).select('category')
      .eq('organization_id', organizationId).neq('row_type', 'header').eq('tax_treatment', 'expense');
  } else {
    q = (supabase.from('assets') as any).select('category').eq('organization_id', organizationId);
  }
  const { data, error } = await q;
  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const r of (data ?? []) as { category: string | null }[]) {
    const k = (r.category ?? '').trim().toLowerCase();
    if (k) counts[k] = (counts[k] ?? 0) + 1;
  }
  return counts;
}
