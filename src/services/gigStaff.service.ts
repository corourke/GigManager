import { handleApiError } from '../utils/api-error-utils';
import { requireAuth } from '../utils/supabase/auth-utils';
import { getSupabase } from './gigService.shared';
import { logActivity } from './activityLog.service';
import { StaffingChange } from '../utils/supabase/types';

/**
 * Gig staff-slot / assignment operations (Phase 7, Step 4 — extracted from
 * gig.service.ts). gig.service re-exports these for backwards compatibility.
 */

/**
 * Update staff slots for a gig
 */
export async function updateGigStaffSlots(
  gigId: string,
  staff_slots: Array<{
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
  }>,
  activityCtx?: {
    organization_id: string | null;
    actor_display_name: string;
    actor_org_name: string;
    gig_title: string;
  }
) {
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
    if (!hasAdminOrManager) throw new Error('Access denied - only Admins and Managers can update staff slots');

    const { data: existingSlots } = await supabase.from('gig_staff_slots').select('id').eq('gig_id', gigId);
    const existingSlotIds = existingSlots?.map(s => s.id) || [];
    const incomingSlotIds = staff_slots.filter(s => s.id).map(s => s.id!);

    const slotIdsToDelete = existingSlotIds.filter(id => !incomingSlotIds.includes(id));

    const staffingChanges: StaffingChange[] = [];

    if (slotIdsToDelete.length > 0) {
      const { data: deletedSlots } = await (supabase.from('gig_staff_slots') as any)
        .select('id, staff_roles(name)')
        .in('id', slotIdsToDelete);
      for (const ds of (deletedSlots ?? [])) {
        staffingChanges.push({ type: 'slot_removed', role: (ds.staff_roles as any)?.name ?? ds.id });
      }
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
        staffingChanges.push({ type: 'slot_added', role: slot.role });
      }

      if (!slotId) continue;

      if (slot.assignments) {
        const { data: existingAssignments } = await supabase.from('gig_staff_assignments').select('id, user_id').eq('slot_id', slotId);
        const existingAssignmentIds = existingAssignments?.map(a => a.id) || [];
        const incomingAssignmentIds = slot.assignments.filter(a => a.id).map(a => a.id!);

        const assignmentIdsToDelete = existingAssignmentIds.filter(id => !incomingAssignmentIds.includes(id));

        if (assignmentIdsToDelete.length > 0) {
          const removedUserIds = (existingAssignments ?? [])
            .filter(a => assignmentIdsToDelete.includes(a.id))
            .map(a => a.user_id)
            .filter(Boolean);
          let userNameMap: Map<string, string> = new Map();
          if (removedUserIds.length > 0) {
            const { data: users } = await (supabase.from('users') as any).select('id, first_name, last_name').in('id', removedUserIds);
            userNameMap = new Map((users ?? []).map((u: any) => [u.id, `${u.first_name} ${u.last_name}`.trim()]));
          }
          for (const aid of assignmentIdsToDelete) {
            const aRow = (existingAssignments ?? []).find(a => a.id === aid);
            if (aRow) staffingChanges.push({ type: 'unassigned', role: slot.role, user_name: userNameMap.get(aRow.user_id) ?? '' });
          }
          await supabase.from('gig_staff_assignments').delete().in('id', assignmentIdsToDelete);
        }

        const newAssignmentUserIds = slot.assignments.filter(a => !a.id || !existingAssignmentIds.includes(a.id)).map(a => a.user_id).filter(Boolean);
        let newUserNameMap: Map<string, string> = new Map();
        if (newAssignmentUserIds.length > 0) {
          const { data: users } = await (supabase.from('users') as any).select('id, first_name, last_name').in('id', newAssignmentUserIds);
          newUserNameMap = new Map((users ?? []).map((u: any) => [u.id, `${u.first_name} ${u.last_name}`.trim()]));
        }

        for (const assignment of slot.assignments) {
          const assignmentData = {
            user_id: assignment.user_id,
            status: assignment.status || 'Requested',
            rate: assignment.rate || null,
            fee: assignment.fee || null,
            notes: assignment.notes || null,
            completed_at: (assignment as any).completed_at || null,
            units_completed: (assignment as any).units_completed || null,
          };

          if (assignment.id && existingAssignmentIds.includes(assignment.id)) {
            await supabase.from('gig_staff_assignments').update(assignmentData).eq('id', assignment.id);
          } else if (assignment.user_id) {
            await supabase.from('gig_staff_assignments').insert({ slot_id: slotId, ...assignmentData });
            staffingChanges.push({ type: 'assigned', role: slot.role, user_name: newUserNameMap.get(assignment.user_id) ?? '', initial_status: assignmentData.status });
          }
        }
      }
    }

    if (staffingChanges.length > 0 && activityCtx) {
      try {
        await logActivity({
          organization_id: activityCtx.organization_id,
          event_type: 'staffing.updated',
          entity_type: 'staffing',
          entity_id: gigId,
          gig_id: gigId,
          context: {
            context_version: 1,
            actor_display_name: activityCtx.actor_display_name,
            actor_org_name: activityCtx.actor_org_name,
            gig_title: activityCtx.gig_title,
            changes: staffingChanges,
            change_count: staffingChanges.length
          }
        });
      } catch (e) { console.error('Activity log failed:', e); }
    }

    return { success: true };
  } catch (err) {
    return handleApiError(err, 'update staff slots');
  }
}

/**
 * Complete a staff assignment and create a corresponding financial record
 */
export async function completeStaffAssignment(assignmentId: string, unitsCompleted?: number) {
  try {
    const { supabase, user } = await requireAuth();

    // 1. Get assignment details
    const { data: assignment, error: fetchError } = await supabase
      .from('gig_staff_assignments')
      .select('*, slot:gig_staff_slots(gig_id, organization_id, role_info:staff_roles(name))')
      .eq('id', assignmentId)
      .single();

    if (fetchError) throw fetchError;
    if (!assignment) throw new Error('Assignment not found');

    const amount = assignment.fee || (assignment.rate ? (assignment.rate * (unitsCompleted || 1)) : 0);
    const gigId = assignment.slot.gig_id;
    const organizationId = assignment.slot.organization_id;
    const roleName = assignment.slot.role_info?.name || 'Staff';

    // 2. Create gig_financials record
    const { data: financial, error: finError } = await supabase
      .from('gig_financials')
      .insert({
        gig_id: gigId,
        organization_id: organizationId,
        amount: amount,
        date: new Date().toISOString().split('T')[0],
        type: 'Expense Incurred',
        category: 'Contract labor',
        description: `Labor: ${roleName}`,
        staff_assignment_id: assignmentId,
        created_by: user.id,
      })
      .select()
      .single();

    if (finError) throw finError;

    // 3. Update assignment with completed_at, units_completed, and gig_financial_id
    const { error: updateError } = await supabase
      .from('gig_staff_assignments')
      .update({
        completed_at: new Date().toISOString(),
        units_completed: unitsCompleted || null,
        gig_financial_id: financial.id,
      })
      .eq('id', assignmentId);

    if (updateError) throw updateError;

    return { success: true, financialId: financial.id };
  } catch (err) {
    return handleApiError(err, 'complete staff assignment');
  }
}

/**
 * Un-finalize a staff assignment by deleting the linked financial record
 */
export async function unfinalizeStaffAssignment(assignmentId: string) {
  try {
    const { supabase } = await requireAuth();

    // 1. Get assignment details
    const { data: assignment, error: fetchError } = await supabase
      .from('gig_staff_assignments')
      .select('gig_financial_id')
      .eq('id', assignmentId)
      .single();

    if (fetchError) throw fetchError;
    if (!assignment) throw new Error('Assignment not found');

    // 2. Delete the financial record if it exists
    if (assignment.gig_financial_id) {
      const { error: deleteError } = await supabase
        .from('gig_financials')
        .delete()
        .eq('id', assignment.gig_financial_id);

      if (deleteError) throw deleteError;
    }

    // 3. Reset assignment completion fields
    const { error: updateError } = await supabase
      .from('gig_staff_assignments')
      .update({
        completed_at: null,
        units_completed: null,
        gig_financial_id: null,
      })
      .eq('id', assignmentId);

    if (updateError) throw updateError;

    return { success: true };
  } catch (err) {
    return handleApiError(err, 'un-finalize staff assignment');
  }
}

/**
 * Bulk completion for all confirmed fee-based assignments that haven't been completed yet
 */
export async function completeAllStaffAssignments(gigId: string, organizationId: string) {
  try {
    const { supabase } = await requireAuth();

    // 1. Get all confirmed fee-based assignments for this gig/org that aren't completed
    const { data: validAssignments, error: joinError } = await supabase
      .from('gig_staff_assignments')
      .select(`
        id,
        fee,
        slot:gig_staff_slots!inner(gig_id, organization_id)
      `)
      .eq('slot.gig_id', gigId)
      .eq('slot.organization_id', organizationId)
      .eq('status', 'Confirmed')
      .is('completed_at', null)
      .not('fee', 'is', null);

    if (joinError) throw joinError;

    if (!validAssignments || validAssignments.length === 0) {
      return { success: true, count: 0 };
    }

    // 2. Complete each assignment
    const results = await Promise.all(
      validAssignments.map(a => completeStaffAssignment(a.id))
    );

    return {
      success: true,
      count: results.filter(r => (r as any).success).length
    };
  } catch (err) {
    return handleApiError(err, 'complete all staff assignments');
  }
}

export async function updateStaffAssignmentStatus(
  assignmentId: string,
  status: 'Confirmed' | 'Declined'
) {
  const supabase = getSupabase();
  try {
    const updateData: Record<string, any> = { status };
    if (status === 'Confirmed') {
      updateData.confirmed_at = new Date().toISOString();
    }
    const { error } = await supabase
      .from('gig_staff_assignments')
      .update(updateData)
      .eq('id', assignmentId);

    if (error) throw error;
  } catch (err) {
    return handleApiError(err, 'update staff assignment status');
  }
}
