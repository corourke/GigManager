import { createClient } from '@supabase/supabase-js';
import * as readline from 'readline';

// Retrieve environment variables loaded by vite-node
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables are missing.');
  console.error('Please ensure they are defined in your .env.development.local or other env files.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => rl.question(query, resolve));
};

async function main() {
  console.log('====================================================');
  console.log('🚀 GigWrangler - Bulk Gig Google Calendar Re-sync 🚀');
  console.log('====================================================');
  console.log(`Supabase Project URL: ${supabaseUrl}\n`);

  let email = process.env.SYNC_USER_EMAIL || '';
  let password = process.env.SYNC_USER_PASSWORD || '';

  if (!email) {
    email = await question('Enter user/admin email: ');
  }
  if (!password) {
    password = await question('Enter password: ');
  }
  rl.close();

  console.log('\n🔑 Logging in...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.session) {
    console.error('❌ Authentication failed:', authError?.message || 'No session established');
    process.exit(1);
  }

  console.log('✅ Authenticated successfully!');
  const token = authData.session.access_token;

  console.log('📦 Fetching gigs from database...');
  // Fetch gigs readable by this user
  const { data: gigs, error: gigsError } = await supabase
    .from('gigs')
    .select('id, title');

  if (gigsError) {
    console.error('❌ Failed to fetch gigs:', gigsError.message);
    process.exit(1);
  }

  if (!gigs || gigs.length === 0) {
    console.log('ℹ️ No gigs found to sync.');
    process.exit(0);
  }

  console.log(`📋 Found ${gigs.length} gigs. Starting bulk re-sync...`);
  
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < gigs.length; i++) {
    const gig = gigs[i];
    const percentage = Math.round(((i + 1) / gigs.length) * 100);
    process.stdout.write(`⏳ [${percentage}%] Syncing gig ${i + 1}/${gigs.length}: "${gig.title}"... `);

    try {
      const { error: invokeError } = await supabase.functions.invoke(
        'server/integrations/google-calendar/sync-gig-all-users',
        {
          method: 'POST',
          body: {
            gig_id: gig.id,
            origin: 'http://localhost:3000',
          },
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (invokeError) {
        console.log('❌ FAILED');
        console.error(`   -> Error: ${JSON.stringify(invokeError)}`);
        failCount++;
      } else {
        console.log('✅ SUCCESS');
        successCount++;
      }
    } catch (err: any) {
      console.log('❌ ERROR');
      console.error(`   -> Exception: ${err.message || err}`);
      failCount++;
    }
  }

  console.log('\n====================================================');
  console.log('🎉 Bulk Re-sync Completed!');
  console.log(`📊 Total: ${gigs.length} | Success: ${successCount} | Failed: ${failCount}`);
  console.log('====================================================');
}

main().catch((err) => {
  console.error('❌ An unexpected error occurred:', err);
  process.exit(1);
});
