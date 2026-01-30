import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { supabaseUrl, publicAnonKey } from './info';

// Singleton Supabase client for frontend
let supabaseClient: ReturnType<typeof createSupabaseClient> | null = null;

export function createClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  supabaseClient = createSupabaseClient(supabaseUrl, publicAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return supabaseClient;
}

// Helper to get current session
export async function getSession() {
  const client = createClient();
  const { data: { session }, error } = await client.auth.getSession();
  return { session, error };
}

// Helper to get current user
export async function getCurrentUser() {
  const client = createClient();
  const { data: { user }, error } = await client.auth.getUser();
  return { user, error };
}

// Helper to sign out
export async function signOut() {
  const client = createClient();
  const { error } = await client.auth.signOut();
  return { error };
}
