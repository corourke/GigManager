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
