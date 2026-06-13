import type { MiddlewareHandler } from '../deps.ts';
import type { OrgIdSource } from './types.ts';
import { supabaseAdmin } from './supabaseAdmin.ts';
import { isRoleAllowed } from './pure/authz.ts';

export interface OrgRoleOptions {
  /** Allowed roles; omit/empty for any member. */
  roles?: string[];
  /** Where to read the org id from (default: the `:id` route param). */
  getOrgId?: OrgIdSource;
  /** When true, a global admin (user_is_admin RPC) bypasses the membership check. */
  allowGlobalAdmin?: boolean;
}

/**
 * Verifies org membership (and optional role) for the authenticated user,
 * attaching the membership to the context. Replaces the inline
 * verifyOrgMembership blocks. Preserves the legacy semantics exactly:
 *  - membership selected with the joined organization
 *  - missing membership → 403 'Not a member of this organization'
 *  - role not allowed → 403 'Insufficient permissions'
 *  - optional global-admin short-circuit (orgs PUT/DELETE, members GET)
 */
export function requireOrgRole(options: OrgRoleOptions = {}): MiddlewareHandler {
  const getOrgId: OrgIdSource = options.getOrgId ?? ((c) => c.req.param('id'));

  return async (c, next) => {
    const orgId = await getOrgId(c);
    if (!orgId) {
      return c.json({ error: 'organization id is required' }, 400);
    }

    const user = c.get('user');

    if (options.allowGlobalAdmin) {
      const { data: isAdmin } = await supabaseAdmin.rpc('user_is_admin', { user_uuid: user.id });
      if (isAdmin) {
        c.set('orgId', orgId);
        await next();
        return;
      }
    }

    const { data: membership, error: dbError } = await supabaseAdmin
      .from('organization_members')
      .select('*, organization:organizations(*)')
      .eq('organization_id', orgId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (dbError) {
      return c.json({ error: `Database error: ${dbError.message}` }, 500);
    }
    if (!membership) {
      return c.json({ error: 'Not a member of this organization' }, 403);
    }
    if (!isRoleAllowed(membership.role, options.roles)) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    c.set('membership', membership);
    c.set('orgId', orgId);
    await next();
  };
}
