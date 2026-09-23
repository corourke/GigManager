// Pure health-check helpers (issue #52 phase 2) — no Deno/network imports,
// unit-testable under Vitest/Node. The route in ../../routes/healthCheck.ts
// wraps these with the actual Supabase/Places/Sentry calls.

export type HealthCheckId = 'supabase' | 'google_places' | 'sentry';
export type HealthCheckStatus = 'ok' | 'fail' | 'not_configured';

export interface HealthCheckResult {
  check: HealthCheckId;
  status: HealthCheckStatus;
  detail?: string;
}

/** Whether a result should raise a moderator alert — a real failure, not "not configured". */
export function isAlertable(status: HealthCheckStatus): boolean {
  return status === 'fail';
}

/**
 * Recipients to notify for one failing check: platform moderators minus
 * whoever already has an unread health_check.failure notification for this
 * same check — one alert per incident until it's read or the check
 * recovers and later fails again.
 */
export function recipientsToNotify(
  moderatorIds: readonly string[],
  alreadyNotifiedRecipientIds: readonly string[]
): string[] {
  const already = new Set(alreadyNotifiedRecipientIds);
  return moderatorIds.filter((id) => !already.has(id));
}

/** Whether the Sentry round-trip check has the secrets it needs to run at all. */
export function isSentryConfigured(
  token: string | null | undefined,
  orgSlug: string | null | undefined,
  projectSlug: string | null | undefined
): boolean {
  return Boolean(token && orgSlug && projectSlug);
}
