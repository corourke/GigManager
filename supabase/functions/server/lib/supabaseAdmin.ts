import { createClient, type SupabaseClient } from '../deps.ts';

// Service-role client (bypasses RLS). The function authorizes every request
// explicitly via the requireUser / requireOrgRole / requireGigAccess
// middleware — see ../lib/*.ts.
export const supabaseAdmin: SupabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);
