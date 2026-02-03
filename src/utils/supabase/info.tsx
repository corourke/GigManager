// Supabase configuration - update these with your own values
// For local development, create a .env.local file with:
// VITE_SUPABASE_URL=your-supabase-url
// VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

// Export values directly
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
export const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !publicAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please create a .env.local file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  );
}

// Extract project ID from URL for any other uses, but keep it robust
export const projectId = supabaseUrl?.includes('supabase.co') 
  ? supabaseUrl.replace('https://', '').split('.')[0] 
  : 'localhost';