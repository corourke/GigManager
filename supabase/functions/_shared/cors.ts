// Pinned-origin CORS, shared by the `server` and `ai-scan` edge functions.
// Pure (no Deno/network imports) so it is unit-testable under Vitest/Node.
//
// Replaces the previous reflect-any-Origin behavior. Auth is Bearer-token, not
// cookie, so we never set Access-Control-Allow-Credentials.

export const ALLOWED_ORIGINS = [
  'https://gigwrangler.com',
  'https://www.gigwrangler.com',
  'https://gigwrangler.pages.dev',
  'http://localhost:3000',
  'https://localhost:3000',
];

/** Returns the origin if it is allow-listed, otherwise null. */
export function resolveAllowedOrigin(origin: string | null | undefined): string | null {
  if (origin && ALLOWED_ORIGINS.includes(origin)) return origin;
  return null;
}

export interface CorsOptions {
  allowMethods: string;
  allowHeaders: string;
}

/**
 * Build CORS response headers for a request Origin. When the origin is not
 * allow-listed, no `Access-Control-Allow-Origin` header is emitted (the browser
 * then blocks the cross-origin read).
 */
export function corsHeaders(
  requestOrigin: string | null | undefined,
  opts: CorsOptions
): Record<string, string> {
  const headers: Record<string, string> = {
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': opts.allowHeaders,
    'Access-Control-Allow-Methods': opts.allowMethods,
  };
  const allowed = resolveAllowedOrigin(requestOrigin);
  if (allowed) headers['Access-Control-Allow-Origin'] = allowed;
  return headers;
}
