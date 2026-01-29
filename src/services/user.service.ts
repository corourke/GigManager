import { createClient } from '../utils/supabase/client';
import { 
  User, 
  OrganizationMembershipWithOrg,
} from '../utils/supabase/types';
import { handleApiError } from '../utils/api-error-utils';

const getSupabase = () => createClient();

/**
 * Fetch a user profile by ID
 */
export async function getUserProfile(userId: string): Promise<User | null> {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
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
  const supabase = getSupabase();
  try {
    // Get current authenticated user
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Not authenticated');
    const user = session.user;

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
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
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
  const supabase = getSupabase();
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Not authenticated');

    if (!search || search.length < 2) return [];

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`)
      .neq('user_status', 'inactive')
      .order('first_name')
      .limit(20);

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
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Not authenticated');
    const user = session.user;

    let query = supabase
      .from('organization_members')
      .select('*, organization:organizations(*)')
      .eq('user_id', userId);

    if (user.id !== userId) {
      const { data: userOrgs } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id);
      
      const orgIds = userOrgs?.map(o => o.organization_id) || [];
      if (orgIds.length === 0) return [];
      query = query.in('organization_id', orgIds);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    return handleApiError(err, 'fetch user organizations');
  }
}
