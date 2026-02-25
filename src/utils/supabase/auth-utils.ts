import { createClient } from './client';

export async function requireAuth() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');
  return { supabase, session, user: session.user };
}
