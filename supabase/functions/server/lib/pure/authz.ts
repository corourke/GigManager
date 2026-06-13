// Pure authorization helpers — no Deno/network imports, unit-testable under
// Vitest/Node. The Deno middleware in ../auth.ts, ../orgRole.ts and
// ../gigAccess.ts wraps these with the service-role Supabase client.

/** Extract the bearer token from an Authorization header, or null. */
export function parseBearer(authHeader: string | null | undefined): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  // Preserves the original `authHeader.split(' ')[1]` semantics
  const token = parts[1];
  return token && token.length > 0 ? token : null;
}

/**
 * Whether a membership role satisfies an allow-list. When no allow-list is
 * given, any role (i.e. any member) is permitted — matching the legacy
 * verifyOrgMembership behavior.
 */
export function isRoleAllowed(role: string | null | undefined, allowedRoles?: string[]): boolean {
  if (!role) return false;
  if (!allowedRoles || allowedRoles.length === 0) return true;
  return allowedRoles.includes(role);
}

/**
 * Gig intersection predicate: does the caller's set of org memberships overlap
 * the gig's participant orgs? This is the core of the documented
 * User → Org membership → Org participation → Gig access model.
 */
export function orgsIntersect(
  userOrgIds: readonly string[],
  participantOrgIds: readonly string[]
): boolean {
  if (userOrgIds.length === 0 || participantOrgIds.length === 0) return false;
  const participants = new Set(participantOrgIds);
  return userOrgIds.some((id) => participants.has(id));
}

/**
 * Q-C fix (inventory #21): gig creation must always authorize against a
 * required primary organization. The legacy handler skipped the permission
 * check entirely when `primary_organization_id` was absent — this rejects that.
 */
export function requireGigCreateOrgId(
  body: { primary_organization_id?: string | null } | null | undefined
): { ok: true; orgId: string } | { ok: false; error: string } {
  const orgId = body?.primary_organization_id;
  if (!orgId) {
    return { ok: false, error: 'primary_organization_id is required to create a gig' };
  }
  return { ok: true, orgId };
}
