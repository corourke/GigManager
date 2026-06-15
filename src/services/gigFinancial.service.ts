import { FinType, FinCategory } from '../utils/supabase/types';
import { FIN_TYPE_GROUPS } from '../utils/supabase/constants';
import { handleApiError } from '../utils/api-error-utils';
import { requireAuth } from '../utils/supabase/auth-utils';
import { UUID_REGEX } from '../utils/validation-utils';
import { getSupabase } from './gigService.shared';

/**
 * Gig financial / bid operations (Phase 7, Step 4 — extracted from
 * gig.service.ts). gig.service re-exports these for backwards compatibility.
 */

/**
 * Fetch financials for a gig
 */
export async function getGigFinancials(gigId: string, organizationId?: string) {
  const supabase = getSupabase();
  try {
    let query = supabase
      .from('gig_financials')
      .select('*, counterparty:organizations!counterparty_id(*)')
      .eq('gig_id', gigId)
      .order('date', { ascending: false });
    if (organizationId) query = query.eq('organization_id', organizationId);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    return handleApiError(err, 'fetch gig financials');
  }
}

/**
 * Fetch a summary of gig profitability
 */
export async function getGigProfitabilitySummary(gigId: string, organizationId: string) {
  const supabase = getSupabase();
  try {
    // 1. Fetch all financial records for this gig
    const { data: financials, error: finError } = await supabase
      .from('gig_financials')
      .select('type, amount')
      .eq('gig_id', gigId)
      .eq('organization_id', organizationId);

    if (finError) throw finError;

    // 2. Fetch all uncompleted staff assignments for projected costs
    // Sourced from gig_staff_assignments where completed_at IS NULL
    // Join with gig_staff_slots to ensure they belong to this gig and organization
    const { data: assignments, error: staffError } = await supabase
      .from('gig_staff_assignments')
      .select(`
        fee,
        rate,
        status,
        completed_at,
        slot:gig_staff_slots!inner(gig_id, organization_id)
      `)
      .eq('slot.gig_id', gigId)
      .eq('slot.organization_id', organizationId)
      .is('completed_at', null);

    if (staffError) throw staffError;

    // 3. Calculate metrics
    let received = 0;
    let actualCosts = 0;
    let contractSignedTotal = 0;
    let bidAcceptedTotal = 0;
    let informalTermsTotal = 0;

    const costTypes = FIN_TYPE_GROUPS.cost as readonly string[];

    (financials || []).forEach(f => {
      const amount = Number(f.amount) || 0;

      if (f.type === 'Contract Signed') {
        contractSignedTotal += amount;
      } else if (f.type === 'Bid Accepted') {
        bidAcceptedTotal += amount;
      } else if (f.type === 'Informal Terms') {
        informalTermsTotal += amount;
      }

      if (f.type === 'Deposit Received' || f.type === 'Payment Received') {
        received += amount;
      }

      if (costTypes.includes(f.type)) {
        actualCosts += amount;
      }
    });

    const formalContractAmount = contractSignedTotal > 0
      ? contractSignedTotal
      : bidAcceptedTotal > 0
        ? bidAcceptedTotal
        : informalTermsTotal;

    const contractAmount = Math.max(formalContractAmount, received);

    let projectedStaffCosts = 0;
    (assignments || []).forEach(a => {
      // Only include Confirmed or Requested assignments in projected costs
      if (a.status === 'Confirmed' || a.status === 'Requested') {
        // Use fee if available, otherwise rate (assume 1 unit for projection)
        const amount = a.fee !== null ? Number(a.fee) : (a.rate !== null ? Number(a.rate) : 0);
        projectedStaffCosts += amount;
      }
    });

    const outstandingRevenue = Math.max(0, contractAmount - received);
    const totalCosts = actualCosts + projectedStaffCosts;
    const profit = contractAmount - totalCosts;
    const margin = contractAmount > 0 ? (profit / contractAmount) * 100 : 0;

    return {
      contractAmount,
      received,
      outstandingRevenue,
      actualCosts,
      projectedStaffCosts,
      totalCosts,
      profit,
      margin
    };
  } catch (err) {
    return handleApiError(err, 'calculate gig profitability summary');
  }
}

/**
 * Legacy alias for getGigFinancials
 */
export const getGigBids = getGigFinancials;

/**
 * Create a new financial record for a gig
 */
export async function createGigFinancial(finData: {
  gig_id: string;
  organization_id: string;
  amount: number;
  date: string;
  type: FinType;
  category?: FinCategory;
  reference_number?: string;
  counterparty_id?: string;
  external_entity_name?: string;
  currency?: string;
  description?: string;
  notes?: string;
  due_date?: string;
  paid_at?: string;
  purchase_id?: string;
  staff_assignment_id?: string;
  mileage?: number;
}) {
  try {
    const { supabase, user } = await requireAuth();

    const { data, error } = await supabase.from('gig_financials').insert({ ...finData, created_by: user.id }).select().single();
    if (error) throw error;
    return data;
  } catch (err) {
    return handleApiError(err, 'create gig financial');
  }
}

/**
 * Legacy alias for createGigFinancial
 */
export async function createGigBid(bidData: any) {
  return createGigFinancial({
    ...bidData,
    date: bidData.date_given,
    type: 'Bid Submitted',
  });
}

/**
 * Update an existing financial record
 */
export async function updateGigFinancial(finId: string, finData: {
  amount?: number;
  date?: string;
  type?: FinType;
  category?: FinCategory;
  reference_number?: string;
  counterparty_id?: string;
  external_entity_name?: string;
  currency?: string;
  description?: string;
  notes?: string;
  due_date?: string;
  paid_at?: string;
  purchase_id?: string;
  staff_assignment_id?: string;
}) {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase.from('gig_financials').update(finData).eq('id', finId).select().single();
    if (error) throw error;
    return data;
  } catch (err) {
    return handleApiError(err, 'update gig financial');
  }
}

/**
 * Legacy alias for updateGigFinancial
 */
export async function updateGigBid(bidId: string, bidData: any) {
  const mappedData: any = { ...bidData };
  if (bidData.date_given) mappedData.date = bidData.date_given;
  delete mappedData.date_given;
  delete mappedData.result; // Dropped column
  return updateGigFinancial(bidId, mappedData);
}

/**
 * Delete a financial record
 */
export async function deleteGigFinancial(finId: string) {
  const supabase = getSupabase();
  try {
    // .select() to confirm a row was removed — RLS denies silently (0 rows, no error)
    const { data, error } = await supabase.from('gig_financials').delete().eq('id', finId).select();
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error('Financial record not found, or you do not have permission to delete it.');
    }
    return { success: true };
  } catch (err) {
    return handleApiError(err, 'delete gig financial');
  }
}

/**
 * Legacy alias for deleteGigFinancial
 */
export const deleteGigBid = deleteGigFinancial;

/**
 * Update all financials for a gig
 */
export async function updateGigFinancials(gigId: string, organizationId: string, financials: Array<{
  id?: string;
  amount: number;
  date: string;
  type: FinType;
  category?: FinCategory;
  reference_number?: string;
  counterparty_id?: string;
  external_entity_name?: string;
  currency?: string;
  description?: string;
  notes?: string;
  due_date?: string;
  paid_at?: string;
  purchase_id?: string;
  staff_assignment_id?: string;
}>) {
  try {
    const { supabase, user } = await requireAuth();

    const { data: existingFins, error: fetchError } = await supabase.from('gig_financials').select('id').eq('gig_id', gigId).eq('organization_id', organizationId);
    if (fetchError) throw fetchError;

    const existingIds = existingFins?.map(f => f.id) || [];
    const incomingIds = financials.filter(f => f.id && UUID_REGEX.test(f.id)).map(f => f.id!);

    const idsToDelete = existingIds.filter(id => !incomingIds.includes(id));
    if (idsToDelete.length > 0) {
      await supabase.from('gig_financials').delete().in('id', idsToDelete);
    }

    for (const fin of financials) {
      // Strip out any non-database fields like 'counterparty' object
      const { id, counterparty, ...restFin } = fin as any;

      // Clean and sanitize data: convert empty strings to null for UUID and Date fields
      // This prevents Supabase 400 Bad Request errors for invalid formats
      const cleanFin: any = { ...restFin };

      const uuidFields = ['counterparty_id', 'purchase_id', 'staff_assignment_id'];
      const dateFields = ['date', 'due_date', 'paid_at'];

      uuidFields.forEach(field => {
        if (cleanFin[field] === '' || cleanFin[field] === undefined) {
          delete cleanFin[field];
        }
      });

      dateFields.forEach(field => {
        if (cleanFin[field] === '' || cleanFin[field] === undefined) {
          delete cleanFin[field];
        }
      });

      const finData = {
        ...cleanFin,
        gig_id: gigId,
        organization_id: organizationId,
      };

      if (id && existingIds.includes(id)) {
        const { error: updateErr } = await supabase.from('gig_financials').update(finData).eq('id', id);
        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase.from('gig_financials').insert({ ...finData, created_by: user.id });
        if (insertErr) throw insertErr;
      }
    }
    return { success: true };
  } catch (err) {
    return handleApiError(err, 'update gig financials');
  }
}

/**
 * Legacy alias for updateGigFinancials
 */
export async function updateGigBids(gigId: string, organizationId: string, bids: any[]) {
  return updateGigFinancials(gigId, organizationId, bids.map(bid => ({
    ...bid,
    date: bid.date_given,
    type: 'Bid Submitted',
    category: 'Other'
  })));
}
