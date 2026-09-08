import type { App, AppContext } from '../lib/types.ts';
import { requireUser } from '../lib/auth.ts';
import { requireOrgRole } from '../lib/orgRole.ts';
import { supabaseAdmin } from '../lib/supabaseAdmin.ts';
import { canDecideAccessRequest, shouldClaimOrgOnApproval } from '../lib/pure/authz.ts';
import { sendEmail } from '../lib/email.ts';

const REQUESTABLE_ROLES = ['Manager', 'Admin'];

const REQUEST_SELECT = `
  *,
  requester:users!access_requests_requester_id_fkey(id, first_name, last_name, email, avatar_url),
  organization:organizations(id, name, claimed),
  handler:users!access_requests_handled_by_fkey(id, first_name, last_name)
`;

async function isPlatformModerator(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('users').select('platform_moderator').eq('id', userId).maybeSingle();
  return data?.platform_moderator === true;
}

export function registerAccessRequests(app: App) {
  // Create a request — caller must already be a Viewer or Staff member of the
  // org (issue #33: no non-member path — self-join first, then request).
  app.post(
    '/organizations/:id/access-requests',
    requireUser,
    requireOrgRole({ roles: ['Viewer', 'Staff'] }),
    async (c: AppContext) => {
      const orgId = c.req.param('id');
      const user = c.get('user');

      let body: any;
      try {
        body = await c.req.json();
      } catch {
        return c.json({ error: 'Invalid JSON body' }, 400);
      }
      const { requested_role, message } = body;
      if (!REQUESTABLE_ROLES.includes(requested_role)) {
        return c.json({ error: `requested_role must be one of: ${REQUESTABLE_ROLES.join(', ')}` }, 400);
      }

      const { data: existing } = await supabaseAdmin
        .from('access_requests').select('id')
        .eq('organization_id', orgId).eq('requester_id', user.id).eq('status', 'pending')
        .maybeSingle();
      if (existing) {
        return c.json({ error: 'You already have a pending access request for this organization' }, 400);
      }

      const { data: request, error } = await supabaseAdmin
        .from('access_requests')
        .insert({ organization_id: orgId, requester_id: user.id, requested_role, message: message || null })
        .select(REQUEST_SELECT).single();
      if (error) {
        console.error('Error creating access request:', error);
        return c.json({ error: error.message }, 400);
      }
      return c.json(request);
    }
  );

  // List pending requests for an org — its own Admins only.
  app.get(
    '/organizations/:id/access-requests',
    requireUser,
    requireOrgRole({ roles: ['Admin'] }),
    async (c: AppContext) => {
      const orgId = c.req.param('id');
      const { data, error } = await supabaseAdmin
        .from('access_requests').select(REQUEST_SELECT)
        .eq('organization_id', orgId).eq('status', 'pending')
        .order('created_at', { ascending: true });
      if (error) {
        console.error('Error fetching org access requests:', error);
        return c.json({ error: error.message }, 400);
      }
      return c.json(data || []);
    }
  );

  // Approve or reject a request — a platform moderator while the org is
  // unclaimed, or that org's own Admin once it isn't (issue #33, point 6).
  app.put('/organizations/:id/access-requests/:requestId', requireUser, async (c: AppContext) => {
    const orgId = c.req.param('id');
    const requestId = c.req.param('requestId');
    const user = c.get('user');

    let body: any;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }
    const { decision, response_message } = body;
    if (decision !== 'approved' && decision !== 'rejected') {
      return c.json({ error: "decision must be 'approved' or 'rejected'" }, 400);
    }

    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations').select('id, claimed').eq('id', orgId).maybeSingle();
    if (orgError || !org) {
      return c.json({ error: 'Organization not found' }, 404);
    }

    const [callerIsModerator, callerMembership] = await Promise.all([
      isPlatformModerator(user.id),
      supabaseAdmin
        .from('organization_members').select('role')
        .eq('organization_id', orgId).eq('user_id', user.id).maybeSingle()
        .then(({ data }) => data),
    ]);
    if (!canDecideAccessRequest(org.claimed, callerIsModerator, callerMembership?.role)) {
      return c.json({ error: 'Only a platform moderator (for an unclaimed org) or that org\'s Admin may decide this request' }, 403);
    }

    const { data: request, error: requestError } = await supabaseAdmin
      .from('access_requests').select('*')
      .eq('id', requestId).eq('organization_id', orgId).maybeSingle();
    if (requestError || !request) {
      return c.json({ error: 'Access request not found' }, 404);
    }
    if (request.status !== 'pending') {
      return c.json({ error: 'This request has already been handled' }, 400);
    }

    if (decision === 'approved') {
      const { error: memberError } = await supabaseAdmin
        .from('organization_members')
        .update({ role: request.requested_role })
        .eq('organization_id', orgId).eq('user_id', request.requester_id);
      if (memberError) {
        console.error('Error promoting member on access-request approval:', memberError);
        return c.json({ error: memberError.message }, 400);
      }
      if (shouldClaimOrgOnApproval(org.claimed, request.requested_role)) {
        const { error: claimError } = await supabaseAdmin
          .from('organizations').update({ claimed: true, updated_at: new Date().toISOString() }).eq('id', orgId);
        if (claimError) {
          console.error('Error marking organization claimed on access-request approval:', claimError);
          return c.json({ error: claimError.message }, 400);
        }
      }
    }

    const { data: updatedRequest, error: updateError } = await supabaseAdmin
      .from('access_requests')
      .update({
        status: decision,
        handled_by: user.id,
        handled_at: new Date().toISOString(),
        response_message: response_message || null,
      })
      .eq('id', requestId).select(REQUEST_SELECT).single();
    if (updateError) {
      console.error('Error updating access request:', updateError);
      return c.json({ error: updateError.message }, 400);
    }

    // Best-effort — a failed send must never fail the decision itself. The
    // in-app outcome notice (requester_seen_at / GET /me/access-requests) is
    // authoritative regardless of whether this succeeds.
    const requesterEmail = updatedRequest?.requester?.email;
    if (requesterEmail) {
      const orgName = updatedRequest.organization?.name || 'the organization';
      const verb = decision === 'approved' ? 'approved' : 'rejected';
      const emailResult = await sendEmail({
        to: requesterEmail,
        subject: `Your ${request.requested_role} request for ${orgName} was ${verb}`,
        html: `
          <p>Hi ${updatedRequest.requester.first_name || ''},</p>
          <p>Your request for <strong>${request.requested_role}</strong> access on <strong>${orgName}</strong> was <strong>${verb}</strong>.</p>
          ${response_message ? `<p>${response_message}</p>` : ''}
        `.trim(),
      });
      if (!emailResult.sent) {
        console.warn('Access-request outcome email not sent:', emailResult.error);
      }
    }

    return c.json(updatedRequest);
  });

  // Platform moderator queue — pending requests across all unclaimed orgs.
  app.get('/moderator/access-requests', requireUser, async (c: AppContext) => {
    const user = c.get('user');
    if (!(await isPlatformModerator(user.id))) {
      return c.json({ error: 'Platform moderator access required' }, 403);
    }

    const { data: unclaimedOrgs, error: orgsError } = await supabaseAdmin
      .from('organizations').select('id').eq('claimed', false);
    if (orgsError) {
      console.error('Error fetching unclaimed organizations:', orgsError);
      return c.json({ error: orgsError.message }, 400);
    }
    const unclaimedOrgIds = (unclaimedOrgs || []).map((o) => o.id);
    if (unclaimedOrgIds.length === 0) {
      return c.json([]);
    }

    const { data, error } = await supabaseAdmin
      .from('access_requests').select(REQUEST_SELECT)
      .eq('status', 'pending').in('organization_id', unclaimedOrgIds)
      .order('created_at', { ascending: true });
    if (error) {
      console.error('Error fetching moderator access-request queue:', error);
      return c.json({ error: error.message }, 400);
    }
    return c.json(data || []);
  });

  // The caller's own requests — powers the notification bell's outcome
  // notices (approved/rejected, not yet seen).
  app.get('/me/access-requests', requireUser, async (c: AppContext) => {
    const user = c.get('user');
    const { data, error } = await supabaseAdmin
      .from('access_requests').select(REQUEST_SELECT)
      .eq('requester_id', user.id)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching own access requests:', error);
      return c.json({ error: error.message }, 400);
    }
    return c.json(data || []);
  });

  // Dismiss an outcome notice. PUT, not PATCH — this app's CORS config only
  // allows GET/POST/PUT/DELETE (index.ts), matching every other route here.
  app.put('/access-requests/:requestId/seen', requireUser, async (c: AppContext) => {
    const requestId = c.req.param('requestId');
    const user = c.get('user');
    const { data, error } = await supabaseAdmin
      .from('access_requests')
      .update({ requester_seen_at: new Date().toISOString() })
      .eq('id', requestId).eq('requester_id', user.id)
      .select('id').maybeSingle();
    if (error) {
      console.error('Error marking access request seen:', error);
      return c.json({ error: error.message }, 400);
    }
    if (!data) {
      return c.json({ error: 'Access request not found' }, 404);
    }
    return c.json({ success: true });
  });
}
