import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '../../utils/supabase/client';
import { queryKeys } from '../../lib/queryKeys';
import {
  getOrganizationMembersWithAuth,
  getOrganizationInvitations,
  getStaffRoles,
  addExistingUserToOrganization,
  inviteUserToOrganization,
  updateMemberDetails,
  removeMember,
  cancelInvitation,
} from '../../services/organization.service';
import { searchAllUsers } from '../../services/user.service';
import type {
  User,
  UserRole,
  OrganizationMemberWithUser as OrganizationMember,
  InvitationWithInviter as Invitation,
} from '../../utils/supabase/types';

/**
 * Team server-state hooks (Phase 7, Step 3). Reads use useQuery; mutations use
 * useMutation with cache invalidation. The organization.service layer remains
 * the single Supabase access point.
 */

export function useTeamMembers(orgId: string) {
  const queryClient = useQueryClient();
  const query = useQuery<OrganizationMember[]>({
    queryKey: queryKeys.team(orgId),
    queryFn: () => getOrganizationMembersWithAuth(orgId) as Promise<OrganizationMember[]>,
  });

  // Keep the members cache fresh via the realtime channel (replaces the old
  // manual refresh on every postgres change).
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`org_members_${orgId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'organization_members',
          filter: `organization_id=eq.${orgId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.team(orgId) });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, queryClient]);

  return query;
}

export function useStaffRoles(orgId: string) {
  return useQuery<Array<{ id: string; name: string }>>({
    queryKey: queryKeys.staffRoles(orgId),
    queryFn: () => getStaffRoles() as Promise<Array<{ id: string; name: string }>>,
  });
}

export interface InvitationsResult {
  invitations: Invitation[];
  tableExists: boolean;
}

export function useInvitations(orgId: string) {
  return useQuery<InvitationsResult>({
    queryKey: queryKeys.invitations(orgId),
    queryFn: async () => {
      const data = await getOrganizationInvitations(orgId);
      // The service returns a non-array sentinel when the invitations table
      // hasn't been migrated yet.
      if (Array.isArray(data)) {
        return {
          invitations: (data as Invitation[]).filter((inv) => inv.status === 'pending'),
          tableExists: true,
        };
      }
      return { invitations: [], tableExists: false };
    },
  });
}

/** Debounced user search, excluding users already in the org. */
export function useUserSearch(search: string, excludeUserIds: string[]) {
  return useQuery<User[]>({
    queryKey: ['userSearch', search],
    queryFn: async () => {
      const results = await searchAllUsers(search);
      return results.filter((u) => !excludeUserIds.includes(u.id));
    },
    enabled: search.trim().length >= 2,
  });
}

export interface InviteUserVars {
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
}

export interface UpdateMemberVars {
  memberId: string;
  data: Record<string, any>;
}

/** Mutations for team management, each invalidating the affected caches. */
export function useTeamMutations(orgId: string) {
  const queryClient = useQueryClient();
  const invalidateMembers = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.team(orgId) });
  const invalidateInvitations = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.invitations(orgId) });

  const addExistingUser = useMutation({
    mutationFn: (vars: { userId: string; role: UserRole }) =>
      addExistingUserToOrganization(orgId, vars.userId, vars.role),
    onSuccess: invalidateMembers,
  });

  const inviteUser = useMutation({
    mutationFn: (vars: InviteUserVars) =>
      inviteUserToOrganization(orgId, vars.email, vars.role, vars.firstName, vars.lastName),
    onSuccess: () => {
      invalidateMembers();
      invalidateInvitations();
    },
  });

  const updateMember = useMutation({
    mutationFn: (vars: UpdateMemberVars) =>
      updateMemberDetails(orgId, vars.memberId, vars.data),
    onSuccess: invalidateMembers,
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) => removeMember(orgId, memberId),
    onSuccess: invalidateMembers,
  });

  const cancelInvitationMutation = useMutation({
    mutationFn: (invitationId: string) => cancelInvitation(invitationId),
    onSuccess: invalidateInvitations,
  });

  return {
    addExistingUser,
    inviteUser,
    updateMember,
    removeMember: removeMemberMutation,
    cancelInvitation: cancelInvitationMutation,
  };
}

export type { OrganizationMember, Invitation };
