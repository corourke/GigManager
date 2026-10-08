// Pure helpers for the member update route — no Deno/network imports,
// unit-testable under Vitest/Node.

/** The user profile fields an Admin or Manager may change for a member. */
export const MEMBER_PROFILE_FIELDS = [
  'first_name', 'last_name', 'phone', 'avatar_url',
  'address_line1', 'address_line2', 'city', 'state', 'postal_code', 'country', 'timezone',
] as const;

/** The profile fields present in a member update request; anything else is ignored. */
export function pickProfileUpdates(body: Record<string, unknown>): Record<string, unknown> {
  const updates: Record<string, unknown> = {};
  for (const field of MEMBER_PROFILE_FIELDS) {
    if (body[field] !== undefined) updates[field] = body[field];
  }
  return updates;
}
