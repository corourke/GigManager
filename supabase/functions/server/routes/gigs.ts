import type { App } from '../lib/types.ts';
import { requireUser } from '../lib/auth.ts';
import { requireOrgRole } from '../lib/orgRole.ts';
import { requireGigAccess } from '../lib/gigAccess.ts';
import { supabaseAdmin } from '../lib/supabaseAdmin.ts';
import { getOrCreateStaffRole } from '../lib/staffRoles.ts';
import { requireGigCreateOrgId } from '../lib/pure/authz.ts';

export function registerGigs(app: App) {
  // List gigs for an org the caller belongs to
  app.get('/gigs', requireUser, requireOrgRole({ getOrgId: (c) => c.req.query('organization_id') }), async (c) => {
    const organizationId = c.req.query('organization_id')!;

    const { data: gigParticipants, error } = await supabaseAdmin
      .from('gig_participants').select('*, gig:gigs(*)').eq('organization_id', organizationId);
    if (error) {
      console.error('Error fetching gigs:', error);
      return c.json({ error: error.message }, 400);
    }

    const gigsMap = new Map();
    for (const gp of gigParticipants || []) {
      if (gp.gig) gigsMap.set(gp.gig.id, gp.gig);
    }
    const gigs = Array.from(gigsMap.values());

    const gigsWithParticipants = await Promise.all(
      gigs.map(async (gig) => {
        const { data: participants } = await supabaseAdmin
          .from('gig_participants').select('*, organization:organization_id(*)').eq('gig_id', gig.id);
        const venue = participants?.find((p: any) => p.role === 'Venue')?.organization;
        const act = participants?.find((p: any) => p.role === 'Act')?.organization;
        return { ...gig, venue, act };
      })
    );
    gigsWithParticipants.sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
    return c.json(gigsWithParticipants);
  });

  // Get a single gig (any member of a participant org — intersection)
  app.get('/gigs/:id', requireUser, requireGigAccess(), async (c) => {
    const gigId = c.req.param('id');
    const { data: gig, error } = await supabaseAdmin
      .from('gigs').select('*').eq('id', gigId).single();
    if (error) {
      console.error('Error fetching gig:', error);
      return c.json({ error: error.message }, 400);
    }
    const { data: participants } = await supabaseAdmin
      .from('gig_participants').select('*, organization:organization_id(*)').eq('gig_id', gig.id);
    return c.json({ ...gig, participants: participants || [] });
  });

  // Create gig — Admin/Manager of a REQUIRED primary org (Q-C fix).
  // requireGigCreateOrgId rejects a missing primary_organization_id (legacy bug).
  app.post(
    '/gigs',
    requireUser,
    requireOrgRole({
      roles: ['Admin', 'Manager'],
      getOrgId: async (c) => {
        const body = await c.req.json();
        const resolved = requireGigCreateOrgId(body);
        return resolved.ok ? resolved.orgId : undefined;
      },
    }),
    async (c) => {
      const user = c.get('user');
      const membership = c.get('membership');
      const body = await c.req.json();
      const { primary_organization_id, parent_gig_id, hierarchy_depth = 0, participants = [], staff_slots = [], ...gigData } = body;
      const primaryOrgType = (membership as any)?.organization?.type || 'Production';

      const { data: gig, error } = await supabaseAdmin
        .from('gigs')
        .insert({ ...gigData, parent_gig_id, hierarchy_depth, created_by: user.id, updated_by: user.id })
        .select().single();
      if (error) {
        console.error('Error creating gig:', error);
        return c.json({ error: error.message }, 400);
      }

      const participantsToInsert: Array<{ gig_id: string; organization_id: string; role: string; notes?: string | null }> = [];
      if (primary_organization_id) {
        participantsToInsert.push({ gig_id: gig.id, organization_id: primary_organization_id, role: primaryOrgType, notes: null });
      }
      participants.forEach((p: any) => {
        if (p.organization_id && p.role) {
          participantsToInsert.push({ gig_id: gig.id, organization_id: p.organization_id, role: p.role, notes: p.notes || null });
        }
      });
      if (participantsToInsert.length > 0) {
        const { error: participantsError } = await supabaseAdmin.from('gig_participants').insert(participantsToInsert);
        if (participantsError) console.error('Error creating participants:', participantsError);
      }

      if (staff_slots.length > 0) {
        for (const slot of staff_slots) {
          const staffRoleId = await getOrCreateStaffRole(slot.role);
          if (!staffRoleId) continue;
          const { data: createdSlot, error: slotError } = await supabaseAdmin
            .from('gig_staff_slots')
            .insert({
              gig_id: gig.id,
              organization_id: slot.organization_id || primary_organization_id,
              staff_role_id: staffRoleId,
              required_count: slot.count || slot.required_count || 1,
              notes: slot.notes || null,
            })
            .select().single();
          if (slotError) { console.error('Error creating staff slot:', slotError); continue; }

          if (slot.assignments?.length > 0) {
            const assignmentsToInsert = slot.assignments
              .filter((a: any) => a.user_id)
              .map((a: any) => ({
                gig_staff_slot_id: createdSlot.id,
                user_id: a.user_id,
                status: a.status || 'Requested',
                rate: a.rate || null,
                fee: a.fee || null,
                notes: a.notes || null,
              }));
            if (assignmentsToInsert.length > 0) {
              const { error: assignmentsError } = await supabaseAdmin.from('gig_staff_assignments').insert(assignmentsToInsert);
              if (assignmentsError) console.error('Error creating staff assignments:', assignmentsError);
            }
          }
        }
      }

      const { data: participantsData } = await supabaseAdmin
        .from('gig_participants').select('*, organization:organization_id(*)').eq('gig_id', gig.id);
      const venue = participantsData?.find((p: any) => p.role === 'Venue')?.organization;
      const act = participantsData?.find((p: any) => p.role === 'Act')?.organization;
      return c.json({ ...gig, venue, act, participants: participantsData || [] });
    }
  );

  // Update gig — Admin/Manager of a participant org (intersection)
  app.put('/gigs/:id', requireUser, requireGigAccess(['Admin', 'Manager']), async (c) => {
    const gigId = c.req.param('id');
    const user = c.get('user');
    const body = await c.req.json();
    const { participants, staff_slots, ...gigData } = body;

    const { data: gig } = await supabaseAdmin.from('gigs').select('*').eq('id', gigId).single();
    if (!gig) {
      return c.json({ error: 'Gig not found' }, 404);
    }

    const { data: updatedGig, error } = await supabaseAdmin
      .from('gigs').update({ ...gigData, updated_by: user.id, updated_at: new Date().toISOString() })
      .eq('id', gigId).select().single();
    if (error) {
      console.error('Error updating gig:', error);
      return c.json({ error: error.message }, 400);
    }

    if (participants !== undefined) {
      const { data: existingParticipants } = await supabaseAdmin
        .from('gig_participants').select('id, organization_id, role').eq('gig_id', gigId);
      const existingIds = new Set((existingParticipants || []).map((p: any) => p.id));
      const incomingParticipants = participants
        .filter((p: any) => p.organization_id && p.role)
        .map((p: any) => ({ id: p.id || null, organization_id: p.organization_id, role: p.role, notes: p.notes || null }));
      const incomingIds = new Set(incomingParticipants.filter((p: any) => p.id).map((p: any) => p.id));

      const idsToDelete = Array.from(existingIds).filter((id) => !incomingIds.has(id));
      if (idsToDelete.length > 0) {
        await supabaseAdmin.from('gig_participants').delete().in('id', idsToDelete);
      }
      for (const p of incomingParticipants) {
        if (p.id && existingIds.has(p.id)) {
          await supabaseAdmin.from('gig_participants')
            .update({ organization_id: p.organization_id, role: p.role, notes: p.notes }).eq('id', p.id);
        } else {
          await supabaseAdmin.from('gig_participants')
            .insert({ gig_id: gigId, organization_id: p.organization_id, role: p.role, notes: p.notes });
        }
      }
    }

    if (staff_slots !== undefined) {
      const { data: existingSlots } = await supabaseAdmin
        .from('gig_staff_slots')
        .select('id, staff_role_id, organization_id, required_count, notes, assignments:gig_staff_assignments(id, user_id, status, rate, fee, notes)')
        .eq('gig_id', gigId);
      const existingSlotIds = new Set((existingSlots || []).map((s: any) => s.id));
      const incomingSlots = staff_slots.filter((s: any) => s.role && s.role.trim() !== '');
      const processedSlotIds = new Set();

      for (const slot of incomingSlots) {
        const staffRoleId = await getOrCreateStaffRole(slot.role);
        if (!staffRoleId) continue;
        let slotId = slot.id;

        if (slotId && existingSlotIds.has(slotId)) {
          await supabaseAdmin.from('gig_staff_slots')
            .update({
              staff_role_id: staffRoleId,
              organization_id: slot.organization_id || null,
              required_count: slot.count || slot.required_count || 1,
              notes: slot.notes || null,
            }).eq('id', slotId);
          processedSlotIds.add(slotId);
        } else {
          const { data: newSlot } = await supabaseAdmin.from('gig_staff_slots')
            .insert({
              gig_id: gigId,
              staff_role_id: staffRoleId,
              organization_id: slot.organization_id || null,
              required_count: slot.count || slot.required_count || 1,
              notes: slot.notes || null,
            }).select('id').single();
          if (newSlot) { slotId = newSlot.id; processedSlotIds.add(slotId); }
        }

        if (slot.assignments && slot.assignments.length > 0) {
          const { data: existingAssignments } = await supabaseAdmin
            .from('gig_staff_assignments').select('id, user_id').eq('gig_staff_slot_id', slotId);
          const existingAssignmentIds = new Set((existingAssignments || []).map((a: any) => a.id));
          const incomingAssignments = slot.assignments.filter((a: any) => a.user_id && a.user_id.trim() !== '');
          const processedAssignmentIds = new Set();

          for (const assignment of incomingAssignments) {
            if (assignment.id && existingAssignmentIds.has(assignment.id)) {
              await supabaseAdmin.from('gig_staff_assignments')
                .update({
                  user_id: assignment.user_id,
                  status: assignment.status || 'Requested',
                  rate: assignment.rate || null,
                  fee: assignment.fee || null,
                  notes: assignment.notes || null,
                }).eq('id', assignment.id);
              processedAssignmentIds.add(assignment.id);
            } else {
              const { data: newAssignment } = await supabaseAdmin.from('gig_staff_assignments')
                .insert({
                  gig_staff_slot_id: slotId,
                  user_id: assignment.user_id,
                  status: assignment.status || 'Requested',
                  rate: assignment.rate || null,
                  fee: assignment.fee || null,
                  notes: assignment.notes || null,
                }).select('id').single();
              if (newAssignment) processedAssignmentIds.add(newAssignment.id);
            }
          }

          const assignmentIdsToDelete = Array.from(existingAssignmentIds).filter((id) => !processedAssignmentIds.has(id));
          if (assignmentIdsToDelete.length > 0) {
            await supabaseAdmin.from('gig_staff_assignments').delete().in('id', assignmentIdsToDelete);
          }
        } else {
          await supabaseAdmin.from('gig_staff_assignments').delete().eq('gig_staff_slot_id', slotId);
        }
      }

      const slotIdsToDelete = Array.from(existingSlotIds).filter((id) => !processedSlotIds.has(id));
      if (slotIdsToDelete.length > 0) {
        await supabaseAdmin.from('gig_staff_slots').delete().in('id', slotIdsToDelete);
      }
    }

    const { data: updatedParticipants } = await supabaseAdmin
      .from('gig_participants').select('*, organization:organization_id(*)').eq('gig_id', gigId);
    const venue = updatedParticipants?.find((p: any) => p.role === 'Venue')?.organization;
    const act = updatedParticipants?.find((p: any) => p.role === 'Act')?.organization;
    return c.json({ ...updatedGig, venue, act });
  });

  // Delete gig — Admin only (intersection)
  app.delete('/gigs/:id', requireUser, requireGigAccess(['Admin']), async (c) => {
    const gigId = c.req.param('id');
    const { error } = await supabaseAdmin.from('gigs').delete().eq('id', gigId);
    if (error) {
      console.error('Error deleting gig:', error);
      return c.json({ error: error.message }, 400);
    }
    return c.json({ success: true });
  });

  // Organization dashboard stats (Admin/Manager/Staff)
  app.get('/organizations/:id/dashboard', requireUser, requireOrgRole({ roles: ['Admin', 'Manager', 'Staff'] }), async (c) => {
    const orgId = c.req.param('id');
    const membership = c.get('membership')!;
    const isAdminOrManager = ['Admin', 'Manager'].includes(membership.role);

    const { data: gigsByStatus } = await supabaseAdmin
      .from('gig_participants').select('gig_id, gigs!inner(id, status)').eq('organization_id', orgId);
    const statusCounts: Record<string, number> = { DateHold: 0, Proposed: 0, Booked: 0, Completed: 0, Cancelled: 0, Settled: 0 };
    (gigsByStatus || []).forEach((gp: any) => {
      const status = gp.gigs?.status;
      if (status && Object.prototype.hasOwnProperty.call(statusCounts, status)) statusCounts[status]++;
    });

    const { data: assets } = await supabaseAdmin
      .from('assets').select('cost, replacement_value, insurance_policy_added').eq('organization_id', orgId);
    let totalAssetValue = 0;
    let totalInsuredValue = 0;
    if (isAdminOrManager) {
      (assets || []).forEach((asset: any) => {
        if (asset.cost) totalAssetValue += parseFloat(asset.cost);
        if (asset.insurance_policy_added && asset.replacement_value) totalInsuredValue += parseFloat(asset.replacement_value);
      });
    }

    const { data: kits } = await supabaseAdmin.from('kits').select('rental_value').eq('organization_id', orgId);
    let totalRentalValue = 0;
    if (isAdminOrManager) {
      (kits || []).forEach((kit: any) => { if (kit.rental_value) totalRentalValue += parseFloat(kit.rental_value); });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    let revenueThisMonth = 0;
    let revenueLastMonth = 0;
    let revenueThisYear = 0;
    if (isAdminOrManager) {
      const { data: thisMonthFin } = await supabaseAdmin
        .from('gig_financials').select('amount').eq('organization_id', orgId).eq('type', 'Payment Received')
        .gte('date', startOfMonth.toISOString().split('T')[0]);
      revenueThisMonth = (thisMonthFin || []).reduce((sum: number, f: any) => sum + parseFloat(f.amount), 0);

      const { data: lastMonthFin } = await supabaseAdmin
        .from('gig_financials').select('amount').eq('organization_id', orgId).eq('type', 'Payment Received')
        .gte('date', startOfLastMonth.toISOString().split('T')[0]).lte('date', endOfLastMonth.toISOString().split('T')[0]);
      revenueLastMonth = (lastMonthFin || []).reduce((sum: number, f: any) => sum + parseFloat(f.amount), 0);

      const { data: thisYearFin } = await supabaseAdmin
        .from('gig_financials').select('amount').eq('organization_id', orgId).eq('type', 'Payment Received')
        .gte('date', startOfYear.toISOString().split('T')[0]);
      revenueThisYear = (thisYearFin || []).reduce((sum: number, f: any) => sum + parseFloat(f.amount), 0);
    }

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const { data: upcomingGigsData } = await supabaseAdmin
      .from('gig_participants')
      .select(`gig_id, gigs!inner(id, title, start, status)`)
      .eq('organization_id', orgId)
      .gte('gigs.start', now.toISOString())
      .lte('gigs.start', thirtyDaysFromNow.toISOString())
      .in('gigs.status', ['DateHold', 'Proposed', 'Booked'])
      .order('gigs(start)', { ascending: true })
      .limit(10);

    const upcomingGigs = await Promise.all(
      (upcomingGigsData || []).map(async (gp: any) => {
        const gigId = gp.gigs.id;
        const { data: actParticipant } = await supabaseAdmin
          .from('gig_participants').select('organization:organizations(name)').eq('gig_id', gigId).eq('role', 'Act').maybeSingle();
        const { data: venueParticipant } = await supabaseAdmin
          .from('gig_participants').select('organization:organizations(name)').eq('gig_id', gigId).eq('role', 'Venue').maybeSingle();
        const { data: slots } = await supabaseAdmin
          .from('gig_staff_slots').select(`id, required_count, gig_staff_assignments(id, status)`).eq('gig_id', gigId);

        let unfilledSlots = 0, unconfirmedAssignments = 0, rejectedAssignments = 0, confirmedAssignments = 0;
        (slots || []).forEach((slot: any) => {
          const assignments = slot.gig_staff_assignments || [];
          const confirmedCount = assignments.filter((a: any) => a.status === 'Confirmed').length;
          const unconfirmedCount = assignments.filter((a: any) => a.status !== 'Confirmed' && a.status !== 'Rejected').length;
          const rejectedCount = assignments.filter((a: any) => a.status === 'Rejected').length;
          confirmedAssignments += confirmedCount;
          unconfirmedAssignments += unconfirmedCount;
          rejectedAssignments += rejectedCount;
          if (confirmedCount < slot.required_count) unfilledSlots += (slot.required_count - confirmedCount);
        });

        return {
          id: gp.gigs.id, title: gp.gigs.title, start: gp.gigs.start, status: gp.gigs.status,
          act: actParticipant?.organization?.name || 'N/A',
          venue: venueParticipant?.organization?.name || 'N/A',
          staffing: { unfilledSlots, unconfirmedAssignments, rejectedAssignments, confirmedAssignments },
        };
      })
    );

    return c.json({
      gigsByStatus: statusCounts,
      assetValues: { totalAssetValue, totalInsuredValue, totalRentalValue },
      revenue: { thisMonth: revenueThisMonth, lastMonth: revenueLastMonth, thisYear: revenueThisYear },
      upcomingGigs,
    });
  });
}
