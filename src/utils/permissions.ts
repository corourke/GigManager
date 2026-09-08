import type { UserRole } from './supabase/constants';

/**
 * Whether a role may create / edit / delete / upload (i.e. mutate data).
 * Admin and Manager can manage; Staff and Viewer are read-only. Mirrors the
 * backend authorization (RLS + edge-function middleware) at the UI layer so we
 * don't show affordances that would fail.
 */
export function canManage(role: UserRole | undefined | null): boolean {
  return role === 'Admin' || role === 'Manager';
}

/**
 * Whether the caller may edit/delete a given organization's details (issue
 * #24/#33): an Admin of THAT org always can; an Admin of ANY org can only
 * while it's unclaimed. Mirrors the server's "Admins can update per claimed
 * status" rule (organizations RLS + requireOrgRole) at the UI layer.
 */
export function canEditOrganization(
  org: { claimed: boolean },
  isAdminOfThisOrg: boolean,
  isAdminOfAnyOrg: boolean
): boolean {
  if (isAdminOfThisOrg) return true;
  return !org.claimed && isAdminOfAnyOrg;
}
