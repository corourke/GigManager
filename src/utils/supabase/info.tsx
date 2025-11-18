// Supabase configuration - update these with your own values
// For local development, create a .env.local file with:
// VITE_SUPABASE_URL=your-supabase-url
// VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please create a .env.local file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  );
}

// Extract project ID from URL
export const projectId = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
export const publicAnonKey = supabaseAnonKey;