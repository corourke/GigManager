import { getSupabase } from './gigService.shared';
import {
  GigStatus,
  GigAccountingSummary,
  PaymentHealth,
  OrganizationRole,
} from '../utils/supabase/types';
import { handleApiError } from '../utils/api-error-utils';
import { requireAuth } from '../utils/supabase/auth-utils';
import {deleteGigFromCalendar } from './googleCalendar.service';
// createGig calls createGigFinancial internally (financial record on import).
import { createGigFinancial } from './gigFinancial.service';
// updateGig calls updateGigParticipants internally.
import { updateGigParticipants } from './gigParticipant.service';
// updateGig calls updateGigStaffSlots internally.
import { updateGigStaffSlots } from './gigStaff.service';

// Kit-assignment operations live in gigKit.service.ts (Step 4 split); re-export
// them here so existing `services/gig.service` imports keep working.
export {
  assignKitToGig,
  removeKitFromGig,
  updateGigKitAssignment,
  updateGigKitAssignments,
  getGigKits,
  checkKitConflicts,
} from './gigKit.service';

// Financial / bid operations live in gigFinancial.service.ts (Step 4 split).
export {
  getGigFinancials,
  getGigProfitabilitySummary,
  getGigBids,
  createGigFinancial,
  createGigBid,
  updateGigFinancial,
  updateGigBid,
  deleteGigFinancial,
  deleteGigBid,
  updateGigFinancials,
  updateGigBids,
} from './gigFinancial.service';

// Participant / venue / act operations live in gigParticipant.service.ts.
export {
  updateGigParticipants,
  updateGigVenue,
  updateGigAct,
} from './gigParticipant.service';

// Staff-slot / assignment operations live in gigStaff.service.ts.
export {
  updateGigStaffSlots,
  completeStaffAssignment,
  unfinalizeStaffAssignment,
  completeAllStaffAssignments,
  updateStaffAssignmentStatus,
} from './gigStaff.service';

// Schedule-entry operations live in gigSchedule.service.ts.
import { updateGigScheduleEntries, duplicateGigScheduleEntries } from './gigSchedule.service';
export {
  getGigScheduleEntries,
  updateGigScheduleEntries,
  duplicateGigScheduleEntries,
} from './gigSchedule.service';

const SYNC_DEBOUNCE_MS = 30_000;
const pendingSyncTimers = new Map<string, ReturnType<typeof setTimeout>>();

function debouncedSyncGigToAllCalendars(gigId: string): void {
  const existing = pendingSyncTimers.get(gigId);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    pendingSyncTimers.delete(gigId);
    syncGigToAllCalendars(gigId).catch(err =>
      console.error('Debounced sync failed for gig:', gigId, err)
    );
  }, SYNC_DEBOUNCE_MS);
  pendingSyncTimers.set(gigId, timer);
}

async function syncGigToAllCalendars(gigId: string): Promise<void> {
  try {
    const supabase = getSupabase();
    
    // Call the edge function to handle multi-user sync server-side (bypassing RLS)
    const { data, error } = await supabase.functions.invoke(
      'server/integrations/google-calendar/sync-gig-all-users',
      {
        method: 'POST',
        body: { 
          gig_id: gigId,
          origin: window.location.origin
        },
      }
    );

    if (error) {
      console.error('Error triggering server-side gig sync:', error);
    } else {
      console.log('Server-side gig sync triggered successfully:', data);
    }
  } catch (error) {
    console.error('Error in syncGigToAllCalendars:', error);
  }
}

/**
 * Delete gig from all Google Calendars
 * This is called after gig delete operations
 */
async function deleteGigFromAllCalendars(gigId: string): Promise<void> {
  try {
    const supabase = getSupabase();

    // Get all users who have this gig synced
    const { data: syncStatuses, error } = await supabase
      .from('gig_sync_status')
      .select('user_id')
      .eq('gig_id', gigId)
      .not('google_event_id', 'is', null);

    if (error) {
      console.error('Error fetching sync statuses for deletion:', error);
      return;
    }

    if (!syncStatuses || syncStatuses.length === 0) {
      return; // No synced events to delete
    }

    // Delete from each user's calendar
    const deletePromises = syncStatuses.map(async (syncStatus) => {
      try {
        await deleteGigFromCalendar(syncStatus.user_id, gigId);
      } catch (deleteError) {
        console.error(`Failed to delete gig ${gigId} from user ${syncStatus.user_id}'s calendar:`, deleteError);
        // Continue with other users even if one fails
      }
    });

    await Promise.allSettled(deletePromises);
  } catch (error) {
    console.error('Error in deleteGigFromAllCalendars:', error);
    // Don't throw - sync failures shouldn't break gig operations
  }
}

/**
 * Fetch gigs for a specific organization
 */
export async function getGigsForOrganization(organizationId: string) {
  const supabase = getSupabase();
  try {
    // 1. Get IDs of gigs this organization is participating in
    const { data: participatingGigs, error: participantError } = await supabase
      .from('gig_participants')
      .select('gig_id')
      .eq('organization_id', organizationId);

    if (participantError) throw participantError;
    if (!participatingGigs?.length) return [];

    const gigIds = participatingGigs.map(pg => pg.gig_id);

    // 2. Fetch those gigs with their participants in one query
    const { data: gigs, error } = await supabase
      .from('gigs')
      .select(`
        *,
        participants:gig_participants(
          *,
          organization:organization_id(*)
        )
      `)
      .in('id', gigIds)
      .order('start', { ascending: false });

    if (error) throw error;

    // 3. Map venue and act organizations for UI convenience
    const gigsWithParticipants = (gigs || []).map((gig: any) => {
      const venue = gig.participants?.find((p: any) => p.role === 'Venue')?.organization;
      const act = gig.participants?.find((p: any) => p.role === 'Act')?.organization;

      return {
        ...gig,
        venue,
        act,
      };
    });

    return gigsWithParticipants;
  } catch (err) {
    return handleApiError(err, 'fetch gigs for organization');
  }
}

/**
 * Fetch a single gig with all its details (participants, staff slots, assignments, kits, bids)
 */
export async function getGig(gigId: string) {
  const supabase = getSupabase();
  try {
    const { data: gig, error } = await supabase
      .from('gigs')
      .select(`
        *,
        participants:gig_participants(
          *,
          organization:organization_id(*)
        ),
        schedule_entries:gig_schedule_entries(
          *,
          act_participant:act_participant_id(
            id,
            role,
            organization:organization_id(id, name)
          )
        ),
        staff_slots:gig_staff_slots(
          *,
          role_info:staff_roles(name),
          assignments:gig_staff_assignments(
            *,
            user:user_id(id, email, first_name, last_name)
          )
        ),
        kit_assignments:gig_kit_assignments(*),
        financials:gig_financials(*)
      `)
      .eq('id', gigId)
      .single();

    if (error) throw error;
    if (!gig) throw new Error('Gig not found');

    // Post-process to maintain existing interface
    const processedSlots = (gig.staff_slots || []).map((slot: any) => ({
      ...slot,
      role: slot.role_info?.name || '',
      count: slot.required_count,
      staff_assignments: (slot.assignments || []).map((assignment: any) => ({
        ...assignment,
        user: assignment.user
      }))
    }));

    const sortedScheduleEntries = ((gig as any).schedule_entries || []).sort(
      (a: any, b: any) => a.sort_order - b.sort_order || new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    return {
      ...gig,
      tags: gig.tags ?? [],
      staff_slots: processedSlots,
      schedule_entries: sortedScheduleEntries,
    };
  } catch (err) {
    return handleApiError(err, 'fetch gig details');
  }
}

/**
 * Create a new gig
 */
export async function createGig(gigData: any) {
  const supabase = getSupabase();
  try {
    const { 
      primary_organization_id,
      parent_gig_id,
      hierarchy_depth = 0,
      participants = [],
      staff_slots = [],
      amount,
      ...restGigData
    } = gigData;

    // Call the complex creation RPC for atomic operation
    const { data, error } = await supabase.rpc('create_gig_complex', {
      p_gig_data: {
        ...restGigData,
        primary_organization_id,
        parent_gig_id,
        hierarchy_depth
      },
      p_participants: participants,
      p_staff_slots: staff_slots
    });

    if (error) throw error;
    if (!data?.[0]?.id) throw new Error('Gig creation failed to return an ID');

    // If amount is provided, create a financial record
    if (amount !== undefined && amount !== null && parseFloat(amount) > 0) {
      try {
        // Use gig start date for the financial record, or current date if no start date
        const finDate = restGigData.start 
          ? new Date(restGigData.start).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];
          
        await createGigFinancial({
          gig_id: data[0].id,
          organization_id: primary_organization_id,
          amount: parseFloat(amount),
          date: finDate,
          type: 'Payment Received',
          description: 'Payment from import'
        });
      } catch (finError) {
        // If financial creation fails, delete the gig to maintain consistency
        console.error('Financial creation failed, rolling back gig creation:', finError);
        try {
          await deleteGig(data[0].id);
        } catch (deleteError) {
          console.error('Failed to rollback gig creation:', deleteError);
        }
        // Re-throw the original financial error
        throw finError;
      }
    }

    // Fetch the full gig details for the response
    const createdGig = await getGig(data[0].id);

    debouncedSyncGigToAllCalendars(data[0].id);

    return createdGig;
  } catch (err) {
    return handleApiError(err, 'create gig');
  }
}

/**
 * Update gig details
 */
export async function updateGig(gigId: string, gigData: {
  title?: string;
  start?: string;
  end?: string;
  timezone?: string;
  status?: GigStatus;
  tags?: string[];
  notes?: string | null;
  participants?: Array<{
    id?: string;
    organization_id: string;
    role: OrganizationRole;
    notes?: string | null
  }>;
  staff_slots?: Array<{
    id?: string;
    role: string;
    count?: number;
    notes?: string | null;
    assignments?: Array<{
      id?: string;
      user_id: string;
      status?: string;
      rate?: number | null;
      fee?: number | null;
      notes?: string | null;
    }>;
  }>;
  schedule_entries?: Array<{
    id?: string;
    activity_type: string;
    label?: string | null;
    start_time: string;
    end_time: string;
    act_participant_id?: string | null;
    notes?: string | null;
  }>;
}) {
  try {
    const { supabase, user } = await requireAuth();

    const { data: gigParticipants } = await supabase
      .from('gig_participants')
      .select('organization_id')
      .eq('gig_id', gigId);

    if (!gigParticipants || gigParticipants.length === 0) throw new Error('Access denied - no participants found');

    const orgIds = gigParticipants.map(gp => gp.organization_id);
    const { data: userMemberships } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .in('organization_id', orgIds);

    if (!userMemberships || userMemberships.length === 0) throw new Error('Access denied - not a member of participating organizations');

    const hasAdminOrManager = userMemberships.some(m => m.role === 'Admin' || m.role === 'Manager');
    if (!hasAdminOrManager) throw new Error('Access denied - only Admins and Managers can update gigs');

    const primary_organization_id = userMemberships.find(m => m.role === 'Admin' || m.role === 'Manager')?.organization_id || userMemberships[0]?.organization_id;

    const { participants, staff_slots, schedule_entries, ...restGigData } = gigData;

    const { data: updatedRows, error: updateError } = await supabase
      .from('gigs')
      .update({
        ...restGigData,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', gigId)
      .select('id');

    if (updateError) throw updateError;
    if (!updatedRows || updatedRows.length === 0) {
      throw new Error('Failed to save gig — you may not have permission to edit this gig.');
    }

    if (participants !== undefined && Array.isArray(participants)) {
      await updateGigParticipants(gigId, participants);
    }

    if (staff_slots !== undefined && Array.isArray(staff_slots)) {
      await updateGigStaffSlots(gigId, staff_slots.map(s => ({...s, organization_id: primary_organization_id})));
    }

    if (schedule_entries !== undefined && Array.isArray(schedule_entries)) {
      await updateGigScheduleEntries(gigId, schedule_entries as any);
    }

    const updatedGig = await getGig(gigId);

    if (updatedGig.start && updatedGig.end && new Date(updatedGig.end) > new Date(updatedGig.start)) {
      debouncedSyncGigToAllCalendars(gigId);
    }

    return updatedGig;
  } catch (err) {
    return handleApiError(err, 'update gig');
  }
}

/**
 * Delete a gig
 */
export async function deleteGig(gigId: string) {
  const supabase = getSupabase();
  try {
    // Delete from Google Calendar first (before deleting the gig)
    await deleteGigFromAllCalendars(gigId);

    // .select() so we can tell whether a row was actually removed. RLS denies
    // silently (0 rows, no error), so without this a non-Admin's delete would
    // report false success.
    const { data, error } = await supabase.from('gigs').delete().eq('id', gigId).select();
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error('Gig not found, or you do not have permission to delete it.');
    }
    return { success: true };
  } catch (err) {
    return handleApiError(err, 'delete gig');
  }
}

/**
 * Duplicate an existing gig
 */
export async function duplicateGig(gigId: string, newTitle?: string) {
  try {
    const { supabase, user } = await requireAuth();

    const originalGig = await getGig(gigId);

    if (!originalGig.start || !originalGig.end) {
      throw new Error('Original gig missing start or end dates');
    }

    const participants = (originalGig.participants || []).map((gp: any) => ({
      organization_id: gp.organization_id,
      role: gp.role,
      notes: gp.notes,
    }));

    const staffSlots = (originalGig.staff_slots || []).map((slot: any) => ({
      staff_role_id: slot.staff_role_id,
      organization_id: slot.organization_id,
      required_count: slot.required_count,
      notes: slot.notes,
      assignments: (slot.staff_assignments || []).map((sa: any) => ({
        user_id: sa.user_id,
        status: sa.status,
        rate: sa.rate,
        fee: sa.fee,
        notes: sa.notes,
      })),
    }));

    const primaryOrgId = participants.find((p: any) => p.role === 'Venue')?.organization_id
      || participants[0]?.organization_id;

    const { data, error } = await supabase.rpc('create_gig_complex', {
      p_gig_data: {
        title: newTitle || `${originalGig.title} (Copy)`,
        start: originalGig.start,
        end: originalGig.end,
        timezone: originalGig.timezone,
        status: 'Proposed',
        tags: originalGig.tags || [],
        notes: originalGig.notes,
        primary_organization_id: primaryOrgId,
      },
      p_participants: participants,
      p_staff_slots: staffSlots,
    });

    if (error) throw error;
    if (!data?.[0]?.id) throw new Error('Gig duplication failed to return an ID');

    const newGigId = data[0].id;

    if (originalGig.financials && originalGig.financials.length > 0) {
      const financials = originalGig.financials.map((fin: any) => ({
        gig_id: newGigId,
        organization_id: fin.organization_id,
        amount: fin.amount,
        date: fin.date,
        type: fin.type,
        category: fin.category,
        reference_number: fin.reference_number,
        counterparty_id: fin.counterparty_id,
        external_entity_name: fin.external_entity_name,
        currency: fin.currency,
        description: fin.description,
        notes: fin.notes,
        created_by: user.id,
      }));
      await supabase.from('gig_financials').insert(financials);
    }

    if (originalGig.kit_assignments && originalGig.kit_assignments.length > 0) {
      const kitAssignments = originalGig.kit_assignments.map((gka: any) => ({
        gig_id: newGigId,
        kit_id: gka.kit_id,
        organization_id: gka.organization_id,
        notes: gka.notes,
        assigned_by: user.id,
      }));
      await supabase.from('gig_kit_assignments').insert(kitAssignments);
    }

    // Duplicate schedule entries with remapped act participant IDs
    if (originalGig.schedule_entries && originalGig.schedule_entries.length > 0) {
      const { data: newParticipants } = await supabase
        .from('gig_participants')
        .select('id, organization_id, role')
        .eq('gig_id', newGigId);

      const participantIdMap = new Map<string, string>();
      for (const oldP of (originalGig.participants || [])) {
        const newP = (newParticipants || []).find(
          (np: any) => np.organization_id === oldP.organization_id && np.role === oldP.role
        );
        if (newP && oldP.id) {
          participantIdMap.set(oldP.id, newP.id);
        }
      }

      await duplicateGigScheduleEntries(gigId, newGigId, participantIdMap);
    }

    return await getGig(newGigId);
  } catch (err) {
    return handleApiError(err, 'duplicate gig');
  }
}

// Re-export conflict detection functions for convenience
export {
  checkStaffConflicts,
  checkParticipantConflicts,
  checkParticipantConflicts as checkVenueConflicts,
  checkEquipmentConflicts,
  checkAllConflicts,
  type Conflict,
  type ConflictResult
} from './conflictDetection.service';

/**
 * Legacy alias for getGigsForOrganization
 */
export async function getGigs(organizationId: string) {
  return getGigsForOrganization(organizationId);
}

export async function getAllGigAccountingSummaries(
  organizationId: string
): Promise<GigAccountingSummary[]> {
  const supabase = getSupabase();
  try {
    const { data: participants, error: partError } = await supabase
      .from('gig_participants')
      .select('gig_id')
      .eq('organization_id', organizationId);

    if (partError) throw partError;

    if (!participants || participants.length === 0) return [];

    const gigIds = participants.map((p: { gig_id: string }) => p.gig_id);

    const { data: gigs, error: gigsError } = await supabase
      .from('gigs')
      .select('id, title, status, start, end')
      .in('id', gigIds);

    if (gigsError) throw gigsError;

    const { data: financials, error: finError } = await supabase
      .from('gig_financials')
      .select('id, gig_id, type, amount, paid_at, staff_assignment_id')
      .in('gig_id', gigIds)
      .eq('organization_id', organizationId);

    if (finError) throw finError;

    const { data: assignments, error: staffError } = await supabase
      .from('gig_staff_assignments')
      .select(`
        id,
        fee,
        rate,
        status,
        completed_at,
        gig_financial_id,
        slot:gig_staff_slots!inner(gig_id, organization_id)
      `)
      .in('slot.gig_id', gigIds)
      .eq('slot.organization_id', organizationId);

    if (staffError) throw staffError;

    type RawFinancial = {
      id: string;
      gig_id: string;
      type: string;
      amount: number;
      paid_at: string | null;
      staff_assignment_id: string | null;
    };

    type RawAssignment = {
      id: string;
      fee: number | null;
      rate: number | null;
      status: string;
      completed_at: string | null;
      gig_financial_id: string | null;
      slot: { gig_id: string; organization_id: string };
    };

    const financialsByGig = new Map<string, RawFinancial[]>();
    for (const f of (financials || []) as RawFinancial[]) {
      const list = financialsByGig.get(f.gig_id) ?? [];
      list.push(f);
      financialsByGig.set(f.gig_id, list);
    }

    const assignmentsByGig = new Map<string, RawAssignment[]>();
    for (const a of (assignments || []) as RawAssignment[]) {
      const gigId = (a.slot as { gig_id: string }).gig_id;
      const list = assignmentsByGig.get(gigId) ?? [];
      list.push(a);
      assignmentsByGig.set(gigId, list);
    }

    const financialIdToPaidAt = new Map<string, string | null>();
    for (const f of (financials || []) as RawFinancial[]) {
      financialIdToPaidAt.set(f.id, f.paid_at);
    }

    return (gigs || []).map((gig: { id: string; title: string; status: string; start: string; end: string }) => {
      const gigFinancials = financialsByGig.get(gig.id) ?? [];
      const gigAssignments = assignmentsByGig.get(gig.id) ?? [];

      let contractSignedTotal = 0;
      let bidAcceptedTotal = 0;
      let informalTermsTotal = 0;
      let received = 0;
      let actualCosts = 0;
      let expectedSubContractCosts = 0;
      let subContractSignedTotal = 0;
      let subContractSettledTotal = 0;

      for (const f of gigFinancials) {
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

        if (f.type === 'Sub-Contract Signed') {
          subContractSignedTotal += amount;
        }

        if (f.type === 'Sub-Contract Settled') {
          subContractSettledTotal += amount;
        }
      }

      const formalContractAmount = contractSignedTotal > 0
        ? contractSignedTotal
        : bidAcceptedTotal > 0
          ? bidAcceptedTotal
          : informalTermsTotal;

      const contractAmount = Math.max(formalContractAmount, received);
      const outstandingRevenue = Math.max(0, contractAmount - received);

      let expectedStaffCosts = 0;
      let paymentsToMakeStaff = 0;

      for (const a of gigAssignments) {
        if ((a.status === 'Confirmed' || a.status === 'Requested') && !a.completed_at) {
          const amount = a.fee !== null ? Number(a.fee) : (a.rate !== null ? Number(a.rate) : 0);
          expectedStaffCosts += amount;
        }

        if (a.completed_at && a.gig_financial_id) {
          const paidAt = financialIdToPaidAt.get(a.gig_financial_id);
          if (paidAt === null || paidAt === undefined) {
            const fee = a.fee !== null ? Number(a.fee) : (a.rate !== null ? Number(a.rate) : 0);
            paymentsToMakeStaff += fee;
          }
        }
      }

      const paymentsToMakeSubContracts = Math.max(0, subContractSignedTotal - subContractSettledTotal);
      const paymentsToMake = paymentsToMakeSubContracts + paymentsToMakeStaff;

      const totalCosts = actualCosts + expectedStaffCosts + expectedSubContractCosts;
      const profit = contractAmount - totalCosts;
      const margin = contractAmount > 0 ? (profit / contractAmount) * 100 : 0;

      let paymentHealth: PaymentHealth;
      if (outstandingRevenue === 0 && paymentsToMake === 0) {
        paymentHealth = 'all-clear';
      } else if (outstandingRevenue > 0 && paymentsToMake === 0) {
        paymentHealth = 'revenue-outstanding';
      } else if (outstandingRevenue === 0 && paymentsToMake > 0) {
        paymentHealth = 'payments-due';
      } else {
        paymentHealth = 'both';
      }

      return {
        gigId: gig.id,
        gigTitle: gig.title,
        gigStatus: gig.status as GigStatus,
        gigStart: gig.start,
        gigEnd: gig.end,
        contractAmount,
        received,
        outstandingRevenue,
        actualCosts,
        expectedStaffCosts,
        expectedSubContractCosts,
        totalCosts,
        paymentsToMake,
        profit,
        margin,
        paymentHealth,
      } satisfies GigAccountingSummary;
    });
  } catch (err) {
    return handleApiError(err, 'get all gig accounting summaries') as never;
  }
}
