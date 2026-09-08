export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function sanitizeLikeInput(input: string): string {
  return input.replace(/[%_\\]/g, '\\$&');
}

/**
 * Whether an email's domain matches one of an org's comma-separated
 * allowed_domains (issue #33 point 7). Case-insensitive; ignores blank
 * entries. UI-only check — the server (supabase/functions/server/lib/pure/
 * authz.ts's emailDomainMatches) re-validates and is authoritative.
 */
export function emailDomainMatches(
  email: string | null | undefined,
  allowedDomains: string | null | undefined
): boolean {
  if (!email || !allowedDomains) return false;
  const atIndex = email.lastIndexOf('@');
  if (atIndex === -1) return false;
  const domain = email.slice(atIndex + 1).trim().toLowerCase();
  if (!domain) return false;
  return allowedDomains
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean)
    .includes(domain);
}
