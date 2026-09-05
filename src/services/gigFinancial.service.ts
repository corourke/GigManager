import { FinType, FinCategory, DbGigFinancial } from '../utils/supabase/types';
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

    const rows = data || [];
    // Attach a receipt/document count per row in one round-trip (entity_attachments
    // is polymorphic with no FK, so it can't be embedded via PostgREST). Non-fatal:
    // a failure here just leaves attachment_count at 0.
    if (rows.length > 0) {
      const ids = rows.map((r: any) => r.id);
      const { data: links } = await supabase
        .from('entity_attachments')
        .select('entity_id')
        .eq('entity_type', 'gig_financial')
        .in('entity_id', ids);
      const counts = new Map<string, number>();
      for (const l of links || []) {
        counts.set((l as any).entity_id, (counts.get((l as any).entity_id) || 0) + 1);
      }
      for (const r of rows as any[]) r.attachment_count = counts.get(r.id) || 0;
    }
    return rows;
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
    let expectedSubContractCosts = 0;
    let contractSignedTotal = 0;
    let bidAcceptedTotal = 0;
    let informalTermsTotal = 0;

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

      if (
        f.type === 'Expense Incurred' ||
        f.type === 'Payment Sent' ||
        f.type === 'Deposit Sent' ||
        f.type === 'Sub-Contract Settled'
      ) {
        actualCosts += amount;
      }

      if (f.type === 'Sub-Contract Submitted' || f.type === 'Sub-Contract Signed') {
        expectedSubContractCosts += amount;
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
    const totalCosts = actualCosts + projectedStaffCosts + expectedSubContractCosts;
    const profit = contractAmount - totalCosts;
    const margin = contractAmount > 0 ? (profit / contractAmount) * 100 : 0;

    return {
      contractAmount,
      received,
      outstandingRevenue,
      actualCosts,
      projectedStaffCosts,
      expectedSubContractCosts,
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
 * Per-gig financial aggregates for the Gigs List CSV export.
 *
 * Each field is defined independently so the export columns reconcile as
 * `profit = revenue - costOfStaff - expenses`:
 *  - `revenue`      booked/contract amount (same precedence as
 *                   getAllGigAccountingSummaries: Contract Signed, else Bid
 *                   Accepted, else Informal Terms; floored at payments received).
 *  - `costOfStaff`  sum of every staff assignment's fee (or rate) on the gig,
 *                   regardless of status.
 *  - `expenses`     non-staff logged costs only — FIN_TYPE_GROUPS.cost rows whose
 *                   `staff_assignment_id` is null (a completed staff assignment
 *                   auto-creates an "Expense Incurred" row tagged with its id;
 *                   that spend is already counted in `costOfStaff`). This
 *                   includes sub-contractor costs (Submitted/Signed/Settled are
 *                   all in FIN_TYPE_GROUPS.cost) regardless of whether they're
 *                   paid yet — consistent with `costOfStaff` also summing every
 *                   assignment regardless of status.
 *  - `staffCount`   number of staff assignments on the gig, all roles/statuses.
 */
export interface GigExportAggregates {
  revenue: number;
  costOfStaff: number;
  expenses: number;
  staffCount: number;
}

/**
 * Compute {@link GigExportAggregates} for every gig the organization
 * participates in, in three queries (mirrors getAllGigAccountingSummaries).
 * Gigs with no financials and no staff are simply absent from the map; callers
 * treat a miss as all-zero.
 */
export async function getGigExportAggregates(
  organizationId: string,
): Promise<Map<string, GigExportAggregates>> {
  const supabase = getSupabase();
  try {
    const { data: participants, error: partError } = await supabase
      .from('gig_participants')
      .select('gig_id')
      .eq('organization_id', organizationId);

    if (partError) throw partError;
    if (!participants || participants.length === 0) return new Map();

    const gigIds = participants.map((p: { gig_id: string }) => p.gig_id);

    const { data: financials, error: finError } = await supabase
      .from('gig_financials')
      .select('gig_id, type, amount, staff_assignment_id')
      .in('gig_id', gigIds)
      .eq('organization_id', organizationId);

    if (finError) throw finError;

    const { data: assignments, error: staffError } = await supabase
      .from('gig_staff_assignments')
      .select('fee, rate, slot:gig_staff_slots!inner(gig_id, organization_id)')
      .in('slot.gig_id', gigIds)
      .eq('slot.organization_id', organizationId);

    if (staffError) throw staffError;

    type RawFinancial = {
      gig_id: string;
      type: string;
      amount: number | null;
      staff_assignment_id: string | null;
    };
    type RawAssignment = {
      fee: number | null;
      rate: number | null;
      slot: { gig_id: string; organization_id: string } | { gig_id: string; organization_id: string }[];
    };

    const costTypes = FIN_TYPE_GROUPS.cost as readonly string[];

    type Acc = {
      contractSigned: number;
      bidAccepted: number;
      informalTerms: number;
      received: number;
      expenses: number;
      costOfStaff: number;
      staffCount: number;
    };
    const acc = new Map<string, Acc>();
    const bucket = (gigId: string): Acc => {
      let a = acc.get(gigId);
      if (!a) {
        a = {
          contractSigned: 0,
          bidAccepted: 0,
          informalTerms: 0,
          received: 0,
          expenses: 0,
          costOfStaff: 0,
          staffCount: 0,
        };
        acc.set(gigId, a);
      }
      return a;
    };

    for (const f of (financials || []) as RawFinancial[]) {
      const a = bucket(f.gig_id);
      const amount = Number(f.amount) || 0;

      if (f.type === 'Contract Signed') a.contractSigned += amount;
      else if (f.type === 'Bid Accepted') a.bidAccepted += amount;
      else if (f.type === 'Informal Terms') a.informalTerms += amount;

      if (f.type === 'Deposit Received' || f.type === 'Payment Received') {
        a.received += amount;
      }

      if (costTypes.includes(f.type) && f.staff_assignment_id == null) {
        a.expenses += amount;
      }
    }

    for (const s of (assignments || []) as RawAssignment[]) {
      const slot = Array.isArray(s.slot) ? s.slot[0] : s.slot;
      if (!slot) continue;
      const a = bucket(slot.gig_id);
      const amount = s.fee !== null ? Number(s.fee) : s.rate !== null ? Number(s.rate) : 0;
      a.costOfStaff += Number.isFinite(amount) ? amount : 0;
      a.staffCount += 1;
    }

    const result = new Map<string, GigExportAggregates>();
    for (const [gigId, a] of acc) {
      const formalContract =
        a.contractSigned > 0 ? a.contractSigned : a.bidAccepted > 0 ? a.bidAccepted : a.informalTerms;
      result.set(gigId, {
        revenue: Math.max(formalContract, a.received),
        costOfStaff: a.costOfStaff,
        expenses: a.expenses,
        staffCount: a.staffCount,
      });
    }
    return result;
  } catch (err) {
    return handleApiError(err, 'get gig export aggregates') as never;
  }
}

/**
 * Fetch the gig_financials rows that reference a given purchase (line or header)
 * via `purchase_id`. Used to keep the auto-created "Expense Incurred" ledger
 * entry in sync when a purchase line is assigned to / moved between / cleared of
 * a gig, and as a dedup guard so a line never gets two ledger entries.
 */
export async function getGigFinancialsByPurchaseId(purchaseId: string): Promise<DbGigFinancial[]> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from('gig_financials')
      .select('*')
      .eq('purchase_id', purchaseId);
    if (error) throw error;
    return (data as DbGigFinancial[]) || [];
  } catch (err) {
    return handleApiError(err, 'fetch gig financials by purchase');
  }
}

/**
 * Bulk variant of {@link getGigFinancialsByPurchaseId}: returns the set of
 * purchase ids (out of those given) that already have at least one linked
 * gig_financials row. Used to show a persistent "add to gig ledger" affordance
 * only on purchase lines that are linked to a gig but have no ledger entry yet.
 */
export async function getPurchaseIdsWithLedgerEntry(purchaseIds: string[]): Promise<Set<string>> {
  if (purchaseIds.length === 0) return new Set();
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from('gig_financials')
      .select('purchase_id')
      .in('purchase_id', purchaseIds);
    if (error) throw error;
    return new Set((data || []).map((r: any) => r.purchase_id).filter(Boolean));
  } catch (err) {
    handleApiError(err, 'fetch purchase ids with ledger entry');
    return new Set();
  }
}

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
  gig_id?: string;
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
 * Best-effort removal of storage blobs for attachments that belong ONLY to this
 * financial record. DB metadata (entity_attachments / attachments rows) is swept
 * by the trg_cleanup_attachments trigger on delete; the storage backend can only
 * be written through the Storage API, so that part is done here. Never throws.
 */
async function purgeSoleAttachmentBlobsForGigFinancial(finId: string): Promise<void> {
  try {
    const supabase = getSupabase();
    const { data: links } = await supabase
      .from('entity_attachments')
      .select('attachment_id, attachment:attachment_id(file_path)')
      .eq('entity_type', 'gig_financial')
      .eq('entity_id', finId);
    if (!links || links.length === 0) return;

    const soleOwnedPaths: string[] = [];
    for (const l of links as any[]) {
      const { count } = await supabase
        .from('entity_attachments')
        .select('id', { count: 'exact', head: true })
        .eq('attachment_id', l.attachment_id);
      // 1 => only this financial's link references the attachment
      if ((count ?? 0) <= 1 && l.attachment?.file_path) soleOwnedPaths.push(l.attachment.file_path);
    }
    if (soleOwnedPaths.length > 0) {
      await supabase.storage.from('attachments').remove(soleOwnedPaths);
    }
  } catch (err) {
    console.warn('purgeSoleAttachmentBlobsForGigFinancial: non-fatal', err);
  }
}

/**
 * Delete a financial record
 */
export async function deleteGigFinancial(finId: string) {
  const supabase = getSupabase();
  try {
    await purgeSoleAttachmentBlobsForGigFinancial(finId);
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
