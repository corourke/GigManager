import { createClient } from '../utils/supabase/client';
import { 
  Gig, 
  GigStatus,
} from '../utils/supabase/types';
import { handleApiError } from '../utils/api-error-utils';
import { getKit } from './kit.service';

const getSupabase = () => createClient();

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
        staff_slots:gig_staff_slots(
          *,
          role_info:staff_roles(name),
          assignments:gig_staff_assignments(
            *,
            user:user_id(id, first_name, last_name)
          )
        ),
        kit_assignments:gig_kit_assignments(*),
        bids:gig_bids(*)
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

    return {
      ...gig,
      staff_slots: processedSlots,
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
    if (!data?.id) throw new Error('Gig creation failed to return an ID');

    // Fetch the full gig details for the response
    return await getGig(data.id);
  } catch (err) {
    return handleApiError(err, 'create gig');
  }
}

/**
 * Update gig participants
 */
export async function updateGigParticipants(gigId: string, participants: Array<{
  id?: string;
  organization_id: string;
  role: string;
  notes?: string | null;
}>) {
  const supabase = getSupabase();
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Not authenticated');

    const { data: existingParticipants, error: fetchError } = await supabase
      .from('gig_participants')
      .select('id')
      .eq('gig_id', gigId);

    if (fetchError) throw fetchError;

    const existingIds = existingParticipants?.map(p => p.id) || [];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const incomingIds = participants
      .filter(p => p.id && uuidRegex.test(p.id))
      .map(p => p.id!);

    const idsToDelete = existingIds.filter(id => !incomingIds.includes(id));
    if (idsToDelete.length > 0) {
      await supabase.from('gig_participants').delete().in('id', idsToDelete);
    }

    for (const participant of participants) {
      const isDbId = participant.id && uuidRegex.test(participant.id);
      const participantData = {
        organization_id: participant.organization_id,
        role: participant.role,
        notes: participant.notes || null,
      };

      if (isDbId && existingIds.includes(participant.id!)) {
        await supabase.from('gig_participants').update(participantData).eq('id', participant.id);
      } else if (participant.organization_id && participant.role) {
        await supabase.from('gig_participants').insert({ gig_id: gigId, ...participantData });
      }
    }

    return { success: true };
  } catch (err) {
    return handleApiError(err, 'update gig participants');
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
  notes?: string;
  amount_paid?: number | null;
  participants?: Array<{ 
    id?: string;
    organization_id: string; 
    role: string; 
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
}) {
  const supabase = getSupabase();
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Not authenticated');
    const user = session.user;

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

    const { participants, staff_slots, ...restGigData } = gigData;

    const { error: updateError } = await supabase
      .from('gigs')
      .update({
        ...restGigData,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', gigId);

    if (updateError) throw updateError;

    if (participants !== undefined && Array.isArray(participants)) {
      await updateGigParticipants(gigId, participants);
    }

    if (staff_slots !== undefined && Array.isArray(staff_slots)) {
      await updateGigStaffSlots(gigId, staff_slots.map(s => ({...s, organization_id: primary_organization_id})));
    }

    return await getGig(gigId);
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
    const { error } = await supabase.from('gigs').delete().eq('id', gigId);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    return handleApiError(err, 'delete gig');
  }
}

/**
 * Update staff slots for a gig
 */
export async function updateGigStaffSlots(gigId: string, staff_slots: Array<{
  id?: string;
  organization_id: string;
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
}>) {
  const supabase = getSupabase();
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Not authenticated');
    const user = session.user;

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
    if (!hasAdminOrManager) throw new Error('Access denied - only Admins and Managers can update staff slots');

    const { data: existingSlots } = await supabase.from('gig_staff_slots').select('id').eq('gig_id', gigId);
    const existingSlotIds = existingSlots?.map(s => s.id) || [];
    const incomingSlotIds = staff_slots.filter(s => s.id).map(s => s.id!);

    const slotIdsToDelete = existingSlotIds.filter(id => !incomingSlotIds.includes(id));
    if (slotIdsToDelete.length > 0) {
      await supabase.from('gig_staff_slots').delete().in('id', slotIdsToDelete);
    }

    for (const slot of staff_slots) {
      let staffRoleId: string | null = null;
      const { data: existingRole } = await supabase.from('staff_roles').select('id').eq('name', slot.role).maybeSingle();

      if (existingRole?.id) {
        staffRoleId = existingRole.id;
      } else {
        const { data: newRole } = await supabase.from('staff_roles').insert({ name: slot.role }).select('id').single();
        staffRoleId = newRole?.id || null;
      }

      if (!staffRoleId) continue;

      let slotId = slot.id;

      if (slot.id && existingSlotIds.includes(slot.id)) {
        await supabase.from('gig_staff_slots').update({
          staff_role_id: staffRoleId,
          organization_id: slot.organization_id,
          required_count: slot.count || 1,
          notes: slot.notes || null,
        }).eq('id', slot.id);
      } else if (slot.role) {
        const { data: newSlot } = await supabase.from('gig_staff_slots').insert({
          gig_id: gigId,
          organization_id: slot.organization_id,
          staff_role_id: staffRoleId,
          required_count: slot.count || 1,
          notes: slot.notes || null,
        }).select('id').single();
        slotId = newSlot?.id;
      }

      if (!slotId) continue;

      if (slot.assignments) {
        const { data: existingAssignments } = await supabase.from('gig_staff_assignments').select('id').eq('slot_id', slotId);
        const existingAssignmentIds = existingAssignments?.map(a => a.id) || [];
        const incomingAssignmentIds = slot.assignments.filter(a => a.id).map(a => a.id!);

        const assignmentIdsToDelete = existingAssignmentIds.filter(id => !incomingAssignmentIds.includes(id));
        if (assignmentIdsToDelete.length > 0) {
          await supabase.from('gig_staff_assignments').delete().in('id', assignmentIdsToDelete);
        }

        for (const assignment of slot.assignments) {
          const assignmentData = {
            user_id: assignment.user_id,
            status: assignment.status || 'Requested',
            rate: assignment.rate || null,
            fee: assignment.fee || null,
            notes: assignment.notes || null,
          };

          if (assignment.id && existingAssignmentIds.includes(assignment.id)) {
            await supabase.from('gig_staff_assignments').update(assignmentData).eq('id', assignment.id);
          } else if (assignment.user_id) {
            await supabase.from('gig_staff_assignments').insert({ slot_id: slotId, ...assignmentData });
          }
        }
      }
    }

    return { success: true };
  } catch (err) {
    return handleApiError(err, 'update staff slots');
  }
}

/**
 * Duplicate an existing gig
 */
export async function duplicateGig(gigId: string, newTitle?: string) {
  const supabase = getSupabase();
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Not authenticated');
    const user = session.user;

    const originalGig = await getGig(gigId);

    if (!originalGig.start || !originalGig.end) {
      throw new Error('Original gig missing start or end dates');
    }

    const { data: newGig, error: gigError } = await supabase
      .from('gigs')
      .insert({
        title: newTitle || `${originalGig.title} (Copy)`,
        start: originalGig.start,
        end: originalGig.end,
        timezone: originalGig.timezone,
        status: 'Proposed',
        tags: originalGig.tags || [],
        notes: originalGig.notes,
        amount_paid: originalGig.amount_paid,
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single();

    if (gigError) throw gigError;

    if (originalGig.participants && originalGig.participants.length > 0) {
      const participants = originalGig.participants.map((gp: any) => ({
        gig_id: newGig.id,
        organization_id: gp.organization_id,
        role: gp.role,
        notes: gp.notes,
      }));
      await supabase.from('gig_participants').insert(participants);
    }

    if (originalGig.staff_slots && originalGig.staff_slots.length > 0) {
      for (const slot of originalGig.staff_slots) {
        const { data: newSlot, error: slotError } = await supabase
          .from('gig_staff_slots')
          .insert({
            gig_id: newGig.id,
            staff_role_id: slot.staff_role_id,
            organization_id: slot.organization_id,
            required_count: slot.required_count,
            notes: slot.notes,
          })
          .select('id')
          .single();

        if (slotError || !newSlot) continue;

        if (slot.staff_assignments && slot.staff_assignments.length > 0) {
          const assignments = slot.staff_assignments.map((sa: any) => ({
            slot_id: newSlot.id,
            user_id: sa.user_id,
            status: sa.status,
            rate: sa.rate,
            fee: sa.fee,
            notes: sa.notes,
          }));
          await supabase.from('gig_staff_assignments').insert(assignments);
        }
      }
    }

    if (originalGig.bids && originalGig.bids.length > 0) {
      const bids = originalGig.bids.map((bid: any) => ({
        gig_id: newGig.id,
        organization_id: bid.organization_id,
        amount: bid.amount,
        date_given: bid.date_given,
        result: bid.result,
        notes: bid.notes,
        created_by: user.id,
      }));
      await supabase.from('gig_bids').insert(bids);
    }

    if (originalGig.kit_assignments && originalGig.kit_assignments.length > 0) {
      const kitAssignments = originalGig.kit_assignments.map((gka: any) => ({
        gig_id: newGig.id,
        kit_id: gka.kit_id,
        organization_id: gka.organization_id,
        notes: gka.notes,
        assigned_by: user.id,
      }));
      await supabase.from('gig_kit_assignments').insert(kitAssignments);
    }

    return newGig;
  } catch (err) {
    return handleApiError(err, 'duplicate gig');
  }
}

/**
 * Assign a kit to a gig
 */
export async function assignKitToGig(gigId: string, kitId: string, organizationId: string, notes?: string) {
  const supabase = getSupabase();
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Not authenticated');
    const user = session.user;

    const { data, error } = await supabase
      .from('gig_kit_assignments')
      .insert({
        gig_id: gigId,
        kit_id: kitId,
        organization_id: organizationId,
        notes: notes || null,
        assigned_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    return handleApiError(err, 'assign kit to gig');
  }
}

/**
 * Remove a kit from a gig
 */
export async function removeKitFromGig(assignmentId: string) {
  const supabase = getSupabase();
  try {
    const { error } = await supabase.from('gig_kit_assignments').delete().eq('id', assignmentId);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    return handleApiError(err, 'remove kit from gig');
  }
}

/**
 * Update a kit assignment for a gig
 */
export async function updateGigKitAssignment(assignmentId: string, updates: { notes?: string }) {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase.from('gig_kit_assignments').update(updates).eq('id', assignmentId).select().single();
    if (error) throw error;
    return data;
  } catch (err) {
    return handleApiError(err, 'update kit assignment');
  }
}

/**
 * Update all kit assignments for a gig
 */
export async function updateGigKitAssignments(gigId: string, organizationId: string, assignments: Array<{
  id?: string;
  kit_id: string;
  notes?: string | null;
}>) {
  const supabase = getSupabase();
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Not authenticated');
    const user = session.user;

    const { data: existingAssignments, error: fetchError } = await supabase
      .from('gig_kit_assignments')
      .select('id, kit_id')
      .eq('gig_id', gigId)
      .eq('organization_id', organizationId);

    if (fetchError) throw fetchError;

    const existingIds = existingAssignments?.map(a => a.id) || [];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const incomingIds = assignments.filter(a => a.id && uuidRegex.test(a.id)).map(a => a.id!);

    const assignmentIdsToDelete = existingIds.filter(id => !incomingIds.includes(id));
    if (assignmentIdsToDelete.length > 0) {
      await supabase.from('gig_kit_assignments').delete().in('id', assignmentIdsToDelete);
    }

    for (const assignment of assignments) {
      const isDbId = assignment.id && uuidRegex.test(assignment.id);
      const assignmentData = {
        gig_id: gigId,
        kit_id: assignment.kit_id,
        organization_id: organizationId,
        notes: assignment.notes || null,
      };

      if (isDbId) {
        await supabase.from('gig_kit_assignments').update(assignmentData).eq('id', assignment.id);
      } else {
        await supabase.from('gig_kit_assignments').insert({ ...assignmentData, assigned_by: user.id });
      }
    }

    return { success: true };
  } catch (err) {
    return handleApiError(err, 'update gig kit assignments');
  }
}

/**
 * Fetch kits assigned to a gig
 */
export async function getGigKits(gigId: string, organizationId?: string) {
  const supabase = getSupabase();
  try {
    let query = supabase
      .from('gig_kit_assignments')
      .select(`
        *,
        kit:kits(
          id,
          name,
          category,
          tag_number,
          rental_value,
          organization_id,
          kit_assets(
            quantity,
            notes,
            asset:assets(*)
          )
        )
      `)
      .eq('gig_id', gigId);

    if (organizationId) query = query.eq('organization_id', organizationId);

    const { data, error } = await query.order('assigned_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    return handleApiError(err, 'fetch gig kits');
  }
}

/**
 * Check for kit availability conflicts
 */
export async function checkKitConflicts(kitId: string, gigId: string, startTime: string, endTime: string) {
  const supabase = getSupabase();
  try {
    const kit = await getKit(kitId);
    if (!kit.kit_assets || kit.kit_assets.length === 0) return { conflicts: [] };

    const assetIds = kit.kit_assets.map((ka: any) => ka.asset.id);

    const { data: overlappingGigs, error } = await supabase
      .from('gigs')
      .select(`
        id,
        title,
        start,
        end,
        gig_kit_assignments!inner(
          kit:kits!inner(
            kit_assets!inner(
              asset_id
            )
          )
        )
      `)
      .neq('id', gigId)
      .lte('start', endTime)
      .gte('end', startTime);

    if (error) throw error;

    const conflicts: any[] = [];
    for (const gig of overlappingGigs || []) {
      const gigAssetIds = new Set<string>();
      for (const assignment of gig.gig_kit_assignments || []) {
        for (const kitAsset of assignment.kit?.kit_assets || []) {
          gigAssetIds.add(kitAsset.asset_id);
        }
      }

      const conflictingAssetIds = assetIds.filter(id => gigAssetIds.has(id));
      if (conflictingAssetIds.length > 0) {
        conflicts.push({
          gig_id: gig.id,
          gig_title: gig.title,
          start: gig.start,
          end: gig.end,
          conflicting_assets: conflictingAssetIds,
        });
      }
    }

    return { conflicts };
  } catch (err) {
    return handleApiError(err, 'check kit conflicts');
  }
}

/**
 * Fetch bids for a gig
 */
export async function getGigBids(gigId: string, organizationId?: string) {
  const supabase = getSupabase();
  try {
    let query = supabase.from('gig_bids').select('*').eq('gig_id', gigId).order('date_given', { ascending: false });
    if (organizationId) query = query.eq('organization_id', organizationId);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    return handleApiError(err, 'fetch gig bids');
  }
}

/**
 * Create a new bid for a gig
 */
export async function createGigBid(bidData: {
  gig_id: string;
  organization_id: string;
  amount: number;
  date_given: string;
  result?: string;
  notes?: string;
}) {
  const supabase = getSupabase();
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Not authenticated');
    const user = session.user;

    const { data, error } = await supabase.from('gig_bids').insert({ ...bidData, created_by: user.id }).select().single();
    if (error) throw error;
    return data;
  } catch (err) {
    return handleApiError(err, 'create gig bid');
  }
}

/**
 * Update an existing bid
 */
export async function updateGigBid(bidId: string, bidData: {
  amount?: number;
  date_given?: string;
  result?: string;
  notes?: string;
}) {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase.from('gig_bids').update(bidData).eq('id', bidId).select().single();
    if (error) throw error;
    return data;
  } catch (err) {
    return handleApiError(err, 'update gig bid');
  }
}

/**
 * Delete a bid
 */
export async function deleteGigBid(bidId: string) {
  const supabase = getSupabase();
  try {
    const { error } = await supabase.from('gig_bids').delete().eq('id', bidId);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    return handleApiError(err, 'delete gig bid');
  }
}

/**
 * Update all bids for a gig
 */
export async function updateGigBids(gigId: string, organizationId: string, bids: Array<{
  id?: string;
  amount: number;
  date_given: string;
  result?: string | null;
  notes?: string | null;
}>) {
  const supabase = getSupabase();
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Not authenticated');
    const user = session.user;

    const { data: existingBids, error: fetchError } = await supabase.from('gig_bids').select('id').eq('gig_id', gigId).eq('organization_id', organizationId);
    if (fetchError) throw fetchError;

    const existingBidIds = existingBids?.map(b => b.id) || [];
    const incomingBidIds = bids.filter(b => b.id && b.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)).map(b => b.id!);

    const bidIdsToDelete = existingBidIds.filter(id => !incomingBidIds.includes(id));
    if (bidIdsToDelete.length > 0) {
      await supabase.from('gig_bids').delete().in('id', bidIdsToDelete);
    }

    for (const bid of bids) {
      const bidData = {
        gig_id: gigId,
        organization_id: organizationId,
        amount: bid.amount,
        date_given: bid.date_given,
        result: bid.result || null,
        notes: bid.notes || null,
      };

      if (bid.id && existingBidIds.includes(bid.id)) {
        await supabase.from('gig_bids').update(bidData).eq('id', bid.id);
      } else {
        await supabase.from('gig_bids').insert({ ...bidData, created_by: user.id });
      }
    }
    return { success: true };
  } catch (err) {
    return handleApiError(err, 'update gig bids');
  }
}

/**
 * Update the venue for a gig
 */
export async function updateGigVenue(gigId: string, organizationId: string | null) {
  const supabase = getSupabase();
  try {
    if (organizationId) {
      const { data: existing } = await supabase.from('gig_participants').select('id').eq('gig_id', gigId).eq('role', 'Venue').maybeSingle();
      if (existing) {
        await supabase.from('gig_participants').update({ organization_id: organizationId }).eq('id', existing.id);
      } else {
        await supabase.from('gig_participants').insert({ gig_id: gigId, organization_id: organizationId, role: 'Venue' });
      }
    } else {
      await supabase.from('gig_participants').delete().eq('gig_id', gigId).eq('role', 'Venue');
    }
  } catch (err) {
    return handleApiError(err, 'update gig venue');
  }
}

/**
 * Update the act for a gig
 */
export async function updateGigAct(gigId: string, organizationId: string | null) {
  const supabase = getSupabase();
  try {
    if (organizationId) {
      const { data: existing } = await supabase.from('gig_participants').select('id').eq('gig_id', gigId).eq('role', 'Act').maybeSingle();
      if (existing) {
        await supabase.from('gig_participants').update({ organization_id: organizationId }).eq('id', existing.id);
      } else {
        await supabase.from('gig_participants').insert({ gig_id: gigId, organization_id: organizationId, role: 'Act' });
      }
    } else {
      await supabase.from('gig_participants').delete().eq('gig_id', gigId).eq('role', 'Act');
    }
  } catch (err) {
    return handleApiError(err, 'update gig act');
  }
}

/**
 * Legacy alias for getGigsForOrganization
 */
export async function getGigs(organizationId: string) {
  return getGigsForOrganization(organizationId);
}
