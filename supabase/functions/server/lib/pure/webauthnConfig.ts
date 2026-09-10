// Pure (no Deno imports) so it is unit-testable under Vitest, same split as
// authz.ts/cors.ts — the Deno.env reads and Sentry reporting stay in
// webauthnConfig.ts, this just decides what's missing.

/**
 * Which of the WebAuthn relying-party env vars are absent, given their raw
 * (pre-fallback) values. An empty string counts as absent — same as unset.
 */
export function missingWebauthnConfigVars(
  rpId: string | undefined,
  origin: string | undefined
): string[] {
  const missing: string[] = [];
  if (!rpId) missing.push('RP_ID');
  if (!origin) missing.push('ORIGIN');
  return missing;
}
