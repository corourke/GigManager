import type { App } from '../lib/types.ts';
import { requireUser } from '../lib/auth.ts';
import { requireOrgRole } from '../lib/orgRole.ts';
import { requireGigAccess } from '../lib/gigAccess.ts';
import { supabaseAdmin } from '../lib/supabaseAdmin.ts';
import { DASHBOARD_ASSET_COLUMNS, sumAssetValues } from '../lib/pure/dashboard.ts';

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

  // Gigs are created with the create_gig_complex RPC and edited through RLS-
  // guarded table writes; the server's old create and update routes were
  // unused and wrote other organizations' staffing, so they were removed.

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

    const { data: assets, error: assetsError } = await supabaseAdmin
      .from('assets').select(DASHBOARD_ASSET_COLUMNS).eq('organization_id', orgId);
    if (assetsError) {
      console.error('Error fetching assets for dashboard:', assetsError);
      return c.json({ error: assetsError.message }, 500);
    }
    const { totalAssetValue, totalInsuredValue } = isAdminOrManager
      ? sumAssetValues(assets)
      : { totalAssetValue: 0, totalInsuredValue: 0 };

    const { data: kits, error: kitsError } = await supabaseAdmin.from('kits').select('rental_value').eq('organization_id', orgId);
    if (kitsError) {
      console.error('Error fetching kits for dashboard:', kitsError);
      return c.json({ error: kitsError.message }, 500);
    }
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
          .from('gig_staff_slots').select(`id, required_count, gig_staff_assignments(id, status)`).eq('gig_id', gigId)
          .eq('organization_id', orgId); // this org's staffing only (#61)

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
