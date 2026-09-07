import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import {
  createAccessRequest,
  decideAccessRequest,
  getModeratorAccessRequests,
  getMyAccessRequests,
  getOrgAccessRequests,
  markAccessRequestSeen,
  RequestableRole,
} from '../services/accessRequest.service';
import type { AccessRequestWithRelations } from '../utils/supabase/types';

/** Pending access requests for an org — for its Admins (Team screen). */
export function useOrgAccessRequests(orgId: string, enabled: boolean = true) {
  return useQuery<AccessRequestWithRelations[]>({
    queryKey: queryKeys.orgAccessRequests(orgId),
    queryFn: () => getOrgAccessRequests(orgId),
    enabled,
  });
}

/** Pending access requests across all unclaimed orgs — platform moderators only. */
export function useModeratorAccessRequests(enabled: boolean) {
  return useQuery<AccessRequestWithRelations[]>({
    queryKey: queryKeys.moderatorAccessRequests(),
    queryFn: () => getModeratorAccessRequests(),
    enabled,
  });
}

/** The caller's own access requests — powers the notification bell's outcome notices. */
export function useMyAccessRequests() {
  return useQuery<AccessRequestWithRelations[]>({
    queryKey: queryKeys.myAccessRequests(),
    queryFn: () => getMyAccessRequests(),
  });
}

/** Create a new access request (Team screen's "Request Access" action). */
export function useCreateAccessRequest(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { requestedRole: RequestableRole; message?: string }) =>
      createAccessRequest(orgId, vars.requestedRole, vars.message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myAccessRequests() });
      queryClient.invalidateQueries({ queryKey: queryKeys.orgAccessRequests(orgId) });
    },
  });
}

/**
 * Approve/reject a request. Takes the org id per-call (rather than fixed at
 * hook-creation time) since the moderator queue spans many orgs at once;
 * invalidates every list the request could appear in.
 */
export function useDecideAccessRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { orgId: string; requestId: string; decision: 'approved' | 'rejected'; responseMessage?: string }) =>
      decideAccessRequest(vars.orgId, vars.requestId, vars.decision, vars.responseMessage),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orgAccessRequests(vars.orgId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.moderatorAccessRequests() });
      queryClient.invalidateQueries({ queryKey: queryKeys.team(vars.orgId) });
    },
  });
}

/** Dismiss an outcome notice from the notification bell. */
export function useMarkAccessRequestSeen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => markAccessRequestSeen(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myAccessRequests() });
    },
  });
}
