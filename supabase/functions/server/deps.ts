// Pinned external dependencies for the server function (Deno).
// Centralized so versions live in one place.

export { Hono } from 'npm:hono@4';
export type { Context, MiddlewareHandler } from 'npm:hono@4';
export { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';
export type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';
export * as WebAuthnServer from 'https://esm.sh/@simplewebauthn/server@9.0.3';
