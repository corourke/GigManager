import { createClient } from '../utils/supabase/client';
import { AccessRequestWithRelations } from '../utils/supabase/types';
import { handleFunctionsError } from '../utils/api-error-utils';

const getSupabase = () => createClient();

export type RequestableRole = 'Manager' | 'Admin';

/**
 * Request an elevated role (Manager or Admin) for an org the caller is
 * already a Viewer or Staff member of — issue #33's recovery path for an
 * org stuck with no Admin, and a general elevation path for claimed orgs too.
 */
export async function createAccessRequest(
  organizationId: string,
  requestedRole: RequestableRole,
  message?: string
): Promise<AccessRequestWithRelations> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.functions.invoke(
      `server/organizations/${organizationId}/access-requests`,
      { method: 'POST', body: { requested_role: requestedRole, message } }
    );
    if (error) return await handleFunctionsError(error, 'request access');
    return data;
  } catch (err) {
    return await handleFunctionsError(err, 'request access');
  }
}

/** Pending access requests for an org — Admins of that org only. */
export async function getOrgAccessRequests(organizationId: string): Promise<AccessRequestWithRelations[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.functions.invoke(
      `server/organizations/${organizationId}/access-requests`,
      { method: 'GET' }
    );
    if (error) return await handleFunctionsError(error, 'fetch access requests');
    return data || [];
  } catch (err) {
    return await handleFunctionsError(err, 'fetch access requests');
  }
}

/** Approve or reject a pending access request. */
export async function decideAccessRequest(
  organizationId: string,
  requestId: string,
  decision: 'approved' | 'rejected',
  responseMessage?: string
): Promise<AccessRequestWithRelations> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.functions.invoke(
      `server/organizations/${organizationId}/access-requests/${requestId}`,
      { method: 'PUT', body: { decision, response_message: responseMessage } }
    );
    if (error) return await handleFunctionsError(error, 'decide access request');
    return data;
  } catch (err) {
    return await handleFunctionsError(err, 'decide access request');
  }
}

/** Pending access requests across all unclaimed orgs — platform moderators only. */
export async function getModeratorAccessRequests(): Promise<AccessRequestWithRelations[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.functions.invoke('server/moderator/access-requests', { method: 'GET' });
    if (error) return await handleFunctionsError(error, 'fetch moderator access-request queue');
    return data || [];
  } catch (err) {
    return await handleFunctionsError(err, 'fetch moderator access-request queue');
  }
}

/** The caller's own access requests, most recent first — powers the notification bell's outcome notices. */
export async function getMyAccessRequests(): Promise<AccessRequestWithRelations[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.functions.invoke('server/me/access-requests', { method: 'GET' });
    if (error) return await handleFunctionsError(error, 'fetch your access requests');
    return data || [];
  } catch (err) {
    return await handleFunctionsError(err, 'fetch your access requests');
  }
}

/** Dismiss an approved/rejected request's outcome notice. */
export async function markAccessRequestSeen(requestId: string): Promise<void> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.functions.invoke(`server/access-requests/${requestId}/seen`, { method: 'PUT' });
    if (error) return await handleFunctionsError(error, 'dismiss notification');
  } catch (err) {
    return await handleFunctionsError(err, 'dismiss notification');
  }
}
