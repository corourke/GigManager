import { createClient } from '../utils/supabase/client';
import { 
  User, 
  OrganizationMembershipWithOrg,
} from '../utils/supabase/types';
import { handleApiError } from '../utils/api-error-utils';
import { requireAuth } from '../utils/supabase/auth-utils';
import { sanitizeLikeInput } from '../utils/validation-utils';

const getSupabase = () => createClient();

/**
 * Fetch complete user data (profile + organizations) in one secure call
 */
export async function getCompleteUserData(userId: string): Promise<{ profile: User | null; organizations: OrganizationMembershipWithOrg[] }> {
  const supabase = getSupabase();
  
  try {
    const { data, error } = await supabase.rpc('get_complete_user_data', { user_uuid: userId });

    if (error) {
      throw error;
    }
    
    const profile = data?.profile || null;
    const orgs = (data?.organizations || []).map((org: any) => ({
      user_id: org.user_id,
      organization_id: org.organization_id,
      role: org.role,
      joined_at: org.created_at,
      organization: org.organization
    }));

    return { profile, organizations: orgs };
  } catch (err) {
    return { profile: null, organizations: [] };
  }
}

/**
 * Fetch a user profile by ID
 */
export async function getUserProfile(userId: string): Promise<User | null> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .rpc('get_user_profile_secure', { user_uuid: userId });

    if (error) {
      throw error;
    }
    
    // The RPC returns a SETOF users which comes as an array
    const profile = Array.isArray(data) ? data[0] : data;
    return profile || null;
  } catch (err) {
    return handleApiError(err, 'fetch user profile');
  }
}

/**
 * Create a new user profile
 */
export async function createUserProfile(userData: {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
}): Promise<User> {
  const supabase = getSupabase();
  try {
    // Check if user already exists
    const existing = await getUserProfile(userData.id);
    if (existing) return existing;

    const { data, error } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    return handleApiError(err, 'create user profile');
  }
}

/**
 * Update a user profile
 */
export async function updateUserProfile(userId: string, updates: {
  first_name?: string;
  last_name?: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  timezone?: string;
}): Promise<User> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    return handleApiError(err, 'update user profile');
  }
}

/**
 * Search for users within specific organizations
 */
export async function searchUsers(search?: string, organizationIds?: string[]): Promise<User[]> {
  try {
    const { supabase, user } = await requireAuth();

    let orgIds: string[] = [];

    if (organizationIds && organizationIds.length > 0) {
      orgIds = organizationIds;
    } else {
      const { data: userOrgs } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id);

      orgIds = userOrgs?.map(o => o.organization_id) || [];
    }
    
    if (orgIds.length === 0) return [];

    // Get all users who are members of these organizations
    const { data: memberData } = await supabase
      .from('organization_members')
      .select('user_id')
      .in('organization_id', orgIds);

    const userIds = [...new Set(memberData?.map(m => m.user_id) || [])];
    if (userIds.length === 0) return [];

    let query = supabase
      .from('users')
      .select('*')
      .in('id', userIds)
      .neq('user_status', 'inactive')
      .order('first_name');

    if (search) {
      const s = sanitizeLikeInput(search);
      query = query.or(`first_name.ilike.%${s}%,last_name.ilike.%${s}%,email.ilike.%${s}%`);
    }

    const { data, error } = await query.limit(20);
    if (error) throw error;
    return data || [];
  } catch (err) {
    return handleApiError(err, 'search users');
  }
}

/**
 * Search for all active users in the system
 */
export async function searchAllUsers(search: string): Promise<User[]> {
  try {
    const { supabase } = await requireAuth();

    if (!search || search.length < 2) return [];

    const { data, error } = await supabase
      .rpc('search_users_secure', { search_text: search });

    if (error) throw error;
    return data || [];
  } catch (err) {
    return handleApiError(err, 'search all users');
  }
}

/**
 * Get organizations a user belongs to
 */
export async function getUserOrganizations(userId: string): Promise<OrganizationMembershipWithOrg[]> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .rpc('get_user_organizations_secure', { user_uuid: userId });

    if (error) {
      throw error;
    }

    let orgs = data || [];

    // Optional: If we want to be extra sure about permissions when querying someone else,
    // we could fetch the current session here, but for self-queries (the common case),
    // we can skip it to avoid redundant getSession() calls that might hang.
    // The server-side RPC and RLS should ideally handle security.
    
    // Transform the data to match the expected format
    return orgs.map(org => ({
      user_id: org.user_id,
      organization_id: org.organization_id,
      role: org.role,
      joined_at: org.created_at,
      organization: org.organization
    }));
  } catch (err) {
    return handleApiError(err, 'fetch user organizations');
  }
}
