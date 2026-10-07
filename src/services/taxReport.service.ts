/**
 * Data for the tax-year reports under Financials → Reporting (#125). Everything
 * an organization has (purchase lines of every year, paid gig money), so one load
 * serves every year and report; utils/taxReports does the counting.
 */
import { requireAuth } from '../utils/supabase/auth-utils';
import type {
  ReportPurchaseLine, ReportGigRow, ReportExpenseCategory, ScheduleCLineLabel,
} from '../utils/taxReports';

export interface TaxReportData {
  lines: ReportPurchaseLine[];
  gigRows: ReportGigRow[];
  categories: ReportExpenseCategory[];
  scheduleC: ScheduleCLineLabel[];
}

const PAGE = 1000;

/** Every row of a query, a page at a time (PostgREST returns at most 1,000). */
async function all<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await query(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) return out;
  }
}

export async function getTaxReportData(organizationId: string): Promise<TaxReportData> {
  const { supabase } = await requireAuth();
  const [lines, gigRows, categories, scheduleC] = await Promise.all([
    all<ReportPurchaseLine>((from, to) => (supabase.from('purchases') as any)
      .select('id, purchase_date, vendor, description, category, quantity, item_cost, line_cost, tax_treatment, asset_id, '
        + 'parent:parent_id(purchase_date, vendor), '
        + 'asset:asset_id(id, manufacturer_model, category, recovery_period, retired_on, liquidation_amt, status)')
      .eq('organization_id', organizationId)
      .neq('row_type', 'header')
      .order('id')
      .range(from, to)),
    all<ReportGigRow>((from, to) => (supabase.from('gig_financials') as any)
      .select('id, gig_id, direction, stage, amount_settled, paid_at, description, category, mileage, purchase_id, '
        + 'staff_assignment_id, external_entity_name, reference_number, '
        + 'counterparty:organizations!counterparty_id(name), gig:gigs(title, start)')
      .eq('organization_id', organizationId)
      .eq('stage', 'paid')
      .order('id')
      .range(from, to)),
    (async () => {
      const { data, error } = await (supabase.from('expense_categories') as any)
        .select('name, schedule_c_line').eq('organization_id', organizationId);
      if (error) throw error;
      return (data ?? []) as ReportExpenseCategory[];
    })(),
    (async () => {
      const { data, error } = await (supabase.from('schedule_c_lines') as any).select('code, label').order('sort_order');
      if (error) throw error;
      return (data ?? []) as ScheduleCLineLabel[];
    })(),
  ]);
  return { lines, gigRows, categories, scheduleC };
}
