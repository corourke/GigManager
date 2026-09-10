// WebAuthn relying-party config. RP_NAME defaults to the real product name
// (was the Figma Make scaffolding 'Field Ops Mobile'); override via env.
import { missingWebauthnConfigVars } from './pure/webauthnConfig.ts';
import { captureMessage } from '../../_shared/sentry.ts';

const rpIdEnv = Deno.env.get('RP_ID');
const originEnv = Deno.env.get('ORIGIN');

export const RP_NAME = Deno.env.get('RP_NAME') || 'GigWrangler';
export const RP_ID = rpIdEnv || 'localhost';
export const ORIGIN = originEnv || 'http://localhost:3000';

const missingConfigVars = missingWebauthnConfigVars(rpIdEnv, originEnv);
let fallbackReported = false;

/**
 * Reports (once per isolate, on first use — not at module load, so the
 * event carries request context and a DSN-less local `functions serve`
 * never fires it) that a passkey route is running on the localhost RP_ID/
 * ORIGIN fallback instead of deployed config. See issue #50: this silently
 * broke prod passkeys for an unknown period with zero signal.
 */
export function reportWebauthnConfigFallback(): void {
  if (fallbackReported || missingConfigVars.length === 0) return;
  fallbackReported = true;
  void captureMessage(
    `WebAuthn running on localhost fallback config — missing env var(s): ${missingConfigVars.join(', ')}`,
    'warning'
  );
}

export function base64urlEncode(buf: Uint8Array): string {
  return btoa(String.fromCharCode(...buf))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export function base64urlDecode(str: string): Uint8Array {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64.padEnd(b64.length + (4 - b64.length % 4) % 4, '=');
  return new Uint8Array(atob(padded).split('').map((c) => c.charCodeAt(0)));
}
