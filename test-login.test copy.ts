import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Manually parse .env.local
const envFile = readFileSync('.env.local', 'utf-8');
const env: any = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

describe('Supabase Login Test', () => {
  it('should login successfully', async () => {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const email = 'cameron.orourke@gmail.com';
    const password = 'hard2find';

    console.log(`Attempting login for ${email}...`);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Login error:', error.message);
      throw error;
    }

    console.log('Login successful! User ID:', data.user.id);
    expect(data.user.id).toBeDefined();

    console.log('Fetching profile via RPC...');
    const { data: profile, error: profileError } = await supabase.rpc('get_user_profile_secure', { user_uuid: data.user.id });
    
    if (profileError) {
      console.error('Profile RPC error:', profileError);
    } else {
      console.log('Profile fetched:', profile);
    }

    console.log('Fetching organizations via RPC...');
    const { data: orgs, error: orgsError } = await supabase.rpc('get_user_organizations_secure', { user_uuid: data.user.id });
    
    if (orgsError) {
      console.error('Orgs RPC error:', orgsError);
    } else {
      console.log('Orgs fetched:', (orgs as any)?.length, 'organizations');
    }
  }, 30000); // 30s timeout
});
