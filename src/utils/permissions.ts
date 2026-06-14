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
