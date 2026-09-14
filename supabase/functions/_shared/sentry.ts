// Shared Sentry setup for edge functions. No-ops entirely when SENTRY_DSN is
// not set (local dev / functions serve), so it is always safe to import.
// Version pinned so `supabase functions deploy` is reproducible (an unpinned
// URL silently tracks whatever "latest" resolves to at deploy time).
import * as Sentry from 'https://deno.land/x/sentry@8.55.0/index.mjs';

const dsn = Deno.env.get('SENTRY_DSN');

if (dsn) {
  Sentry.init({
    dsn,
    environment: Deno.env.get('SENTRY_ENVIRONMENT') ?? 'development',
    // Error monitoring only — no performance tracing on edge functions
    tracesSampleRate: 0,
  });
}

/**
 * Capture an exception and flush before the isolate can be torn down.
 * Edge function isolates may terminate right after the response is returned,
 * so the explicit flush is required for the event to actually be sent.
 */
export async function captureException(error: unknown): Promise<void> {
  if (!dsn) return;
  try {
    Sentry.captureException(error);
    await Sentry.flush(2000);
  } catch (sentryError) {
    console.error('Sentry capture failed:', sentryError);
  }
}

/**
 * Capture a message (not a thrown error) at the given severity level, e.g. a
 * degraded-but-running config that has no exception to throw. Same
 * no-op-without-DSN and explicit-flush behavior as captureException.
 */
export async function captureMessage(message: string, level: 'warning' | 'error' = 'warning'): Promise<void> {
  if (!dsn) return;
  try {
    Sentry.captureMessage(message, level);
    await Sentry.flush(2000);
  } catch (sentryError) {
    console.error('Sentry capture failed:', sentryError);
  }
}
