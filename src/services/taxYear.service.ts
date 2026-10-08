/**
 * Filed tax years (#133). A locked year's purchases keep their tax fields; the
 * database enforces it (trigger purchases_c_tax_year_lock). Admins and Managers
 * read; only Admins add, change or remove years.
 */
import { handleApiError } from '../utils/api-error-utils';
import { getCurrentUser, getSupabase } from './base/dataAccess';

export interface TaxYear {
  organization_id: string;
  year: number;
  locked: boolean;
  filed_on: string | null;
  notes: string | null;
}

export async function getTaxYears(organizationId: string): Promise<TaxYear[]> {
  try {
    await getCurrentUser();
    const supabase = getSupabase();
    const { data, error } = await (supabase.from('tax_years') as any)
      .select('organization_id, year, locked, filed_on, notes')
      .eq('organization_id', organizationId)
      .order('year', { ascending: false });
    if (error) throw error;
    return (data ?? []) as TaxYear[];
  } catch (err) {
    return handleApiError(err, 'load tax years');
  }
}

/** The years whose purchases can't change. Empty (nothing locked) if they can't be read. */
export async function getLockedTaxYears(organizationId: string): Promise<Set<number>> {
  try {
    const years = await getTaxYears(organizationId);
    return new Set(years.filter(y => y.locked).map(y => y.year));
  } catch {
    return new Set();
  }
}

/** Add or update a year (Admins only). */
export async function saveTaxYear(
  organizationId: string,
  year: number,
  values: { locked: boolean; filed_on?: string | null; notes?: string | null },
): Promise<TaxYear> {
  try {
    await getCurrentUser();
    const supabase = getSupabase();
    const { data, error } = await (supabase.from('tax_years') as any)
      .upsert({ organization_id: organizationId, year, ...values }, { onConflict: 'organization_id,year' })
      .select('organization_id, year, locked, filed_on, notes')
      .single();
    if (error) throw error;
    return data as TaxYear;
  } catch (err) {
    return handleApiError(err, 'save tax year');
  }
}

export async function deleteTaxYear(organizationId: string, year: number): Promise<void> {
  try {
    await getCurrentUser();
    const supabase = getSupabase();
    const { error } = await (supabase.from('tax_years') as any)
      .delete()
      .eq('organization_id', organizationId)
      .eq('year', year);
    if (error) throw error;
  } catch (err) {
    return handleApiError(err, 'remove tax year');
  }
}
