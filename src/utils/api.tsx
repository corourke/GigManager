/**
 * API utility functions for Gig Manager
 * These functions use the Supabase client directly with RLS policies for security
 */

import { createClient } from './supabase/client';
import { projectId, publicAnonKey } from './supabase/info';
import { 
  OrganizationType, 
  UserRole,
  Organization,
  User,
  OrganizationMembershipWithOrg,
  GigStatus
} from './supabase/types';

// Get a fresh client instance for each API call to ensure we have the latest session
const getSupabase = () => createClient();

/**
 * Helper to identify network/connection errors
 */
const isNetworkError = (err: any): boolean => {
  return (
    err?.message?.includes('Failed to fetch') || 
    err?.code === 'ERR_NETWORK' ||
    err?.name === 'TypeError' ||
    // Supabase error codes for connection issues
    err?.code === 'PGRST301' || // JWT expired or connection issue
    err?.status === 0
  );
};
const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-de012ad4`;

// ===== User Management =====

export async function getUserProfile(userId: string): Promise<User | null> {
  const supabase = getSupabase();
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }

    return data;
  } catch (err: any) {
    // Re-throw network errors with more context
    if (isNetworkError(err)) {
      const networkError = new Error('Network error: Unable to fetch user profile. Please check your internet connection.');
      networkError.name = 'NetworkError';
      throw networkError;
    }
    throw err;
  }
}

export async function createUserProfile(userData: {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
}): Promise<User> {
  const supabase = getSupabase();
  // Check if user already exists
  const existing = await getUserProfile(userData.id);
  if (existing) {
    return existing;
  }

  const { data, error } = await supabase
    .from('users')
    .insert(userData)
    .select()
    .single();

  if (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }

  return data;
}

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
  const { data, error } = await supabase
    .from('users')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }

  return data;
}

export async function searchUsers(search?: string, organizationIds?: string[]): Promise<User[]> {
  const supabase = getSupabase();
  // Get current authenticated user
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');
  const user = session.user;

  let orgIds: string[] = [];

  if (organizationIds && organizationIds.length > 0) {
    // Use provided organization IDs (e.g., from gig participants)
    orgIds = organizationIds;
  } else {
    // Default: Get organizations current user belongs to
    const { data: userOrgs } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id);

    orgIds = userOrgs?.map(o => o.organization_id) || [];
  }
  
  if (orgIds.length === 0) {
    return []; // No organizations to search within
  }

  // Get all users who are members of these organizations
  const { data: memberData } = await supabase
    .from('organization_members')
    .select('user_id')
    .in('organization_id', orgIds);

  const userIds = [...new Set(memberData?.map(m => m.user_id) || [])];

  if (userIds.length === 0) {
    return [];
  }

  // Only search active users in the specified organizations (exclude inactive)
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

  if (error) {
    console.error('Error searching users:', error);
    throw error;
  }

  return data || [];
}

export async function getUserOrganizations(userId: string): Promise<OrganizationMembershipWithOrg[]> {
  const supabase = getSupabase();
  // Get current authenticated user
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');
  const user = session.user;

  let query = supabase
    .from('organization_members')
    .select('*, organization:organizations(*)')
    .eq('user_id', userId);

  // If user is not requesting their own organizations, filter to shared organizations only
  if (user.id !== userId) {
    const { data: userOrgs } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id);
    
    const orgIds = userOrgs?.map(o => o.organization_id) || [];
    if (orgIds.length === 0) {
      return []; // No shared organizations
    }
    query = query.in('organization_id', orgIds);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching user organizations:', error);
    throw error;
  }

  return data || [];
}

// ===== Organization Management =====

export async function searchOrganizations(filters?: { type?: OrganizationType; search?: string }): Promise<Organization[]> {
  const supabase = getSupabase();
  try {
    let query = supabase
      .from('organizations')
      .select('*')
      .order('name');

    if (filters?.type) {
      query = query.eq('type', filters.type);
    }

    if (filters?.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }

    const { data, error } = await query.limit(20);

    if (error) {
      console.error('Error searching organizations:', error);
      throw error;
    }

    return data || [];
  } catch (err: any) {
    if (isNetworkError(err)) {
      const networkError = new Error('Network error: Unable to connect to server to search organizations. Please check your internet connection.');
      networkError.name = 'NetworkError';
      throw networkError;
    }
    throw err;
  }
}

export async function createOrganization(orgData: {
  name: string;
  type: OrganizationType;
  description?: string;
  phone?: string;
  email?: string;
  website?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  place_id?: string;
}): Promise<Organization> {
  const supabase = getSupabase();
  try {
    // Get current user from session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Not authenticated');
    const user = session.user;

    // Create organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert(orgData)
      .select()
      .single();

    if (orgError) {
      console.error('Error creating organization:', orgError);
      throw orgError;
    }

    // Add creator as Admin member
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: org.id,
        user_id: user.id,
        role: 'Admin',
      });

    if (memberError) {
      console.error('Error adding organization member:', memberError);
      // Try to clean up the created org
      await supabase.from('organizations').delete().eq('id', org.id);
      throw memberError;
    }

    return org;
  } catch (err: any) {
    if (isNetworkError(err)) {
      const networkError = new Error('Network error: Unable to connect to server to create organization. Please check your internet connection.');
      networkError.name = 'NetworkError';
      throw networkError;
    }
    throw err;
  }
}

export async function updateOrganization(organizationId: string, orgData: {
  name?: string;
  type?: OrganizationType;
  url?: string;
  phone_number?: string;
  description?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  allowed_domains?: string;
}): Promise<Organization> {
  const supabase = getSupabase();
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Not authenticated');
    const user = session.user;

    const { data, error } = await supabase
      .from('organizations')
      .update({
        ...orgData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', organizationId)
      .select()
      .single();

    if (error) {
      console.error('Error updating organization:', error);
      throw error;
    }

    return data;
  } catch (err: any) {
    if (isNetworkError(err)) {
      const networkError = new Error('Network error: Unable to connect to server to update organization. Please check your internet connection.');
      networkError.name = 'NetworkError';
      throw networkError;
    }
    throw err;
  }
}

export async function joinOrganization(orgId: string): Promise<{ organization: Organization; role: UserRole }> {
  const supabase = getSupabase();
  // Get current user from session
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');
  const user = session.user;

  // Check if organization exists
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single();

  if (orgError || !org) {
    throw new Error('Organization not found');
  }

  // Check if user is already a member
  const { data: existingMember } = await supabase
    .from('organization_members')
    .select('*')
    .eq('organization_id', orgId)
    .eq('user_id', user.id)
    .single();

  if (existingMember) {
    throw new Error('Already a member of this organization');
  }

  // Add user as a Viewer by default
  const { data: membership, error: memberError } = await supabase
    .from('organization_members')
    .insert({
      organization_id: orgId,
      user_id: user.id,
      role: 'Viewer',
    })
    .select()
    .single();

  if (memberError) {
    console.error('Error joining organization:', memberError);
    throw memberError;
  }

  return { organization: org, role: membership.role };
}

// ===== Team Management =====

export async function getOrganizationMembersWithAuth(organizationId: string) {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');

  const response = await fetch(
    `${API_BASE_URL}/organizations/${organizationId}/members`,
    {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch organization members');
  }

  return await response.json();
}

export async function getOrganizationMembers(organizationId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('organization_members')
    .select(`
      *,
      user:users(
        id,
        first_name,
        last_name,
        email,
        phone,
        avatar_url,
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        country,
        user_status
      )
    `)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching organization members:', error);
    throw error;
  }

  return data || [];
}

export async function searchAllUsers(search: string) {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');

  if (!search || search.length < 2) {
    return [];
  }

  // Search all active users in the system (exclude inactive)
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`)
    .neq('user_status', 'inactive')
    .order('first_name')
    .limit(20);

  if (error) {
    console.error('Error searching users:', error);
    throw error;
  }

  return data || [];
}

export async function addExistingUserToOrganization(
  organizationId: string,
  userId: string,
  role: 'Admin' | 'Manager' | 'Member'
) {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');

  // Check if user is already a member
  const { data: existingMember } = await supabase
    .from('organization_members')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existingMember) {
    throw new Error('User is already a member of this organization');
  }

  // Add user to organization
  const { data, error } = await supabase
    .from('organization_members')
    .insert({
      organization_id: organizationId,
      user_id: userId,
      role,
    })
    .select(`
      *,
      user:users(
        id,
        first_name,
        last_name,
        email,
        phone,
        avatar_url,
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        country,
        user_status
      )
    `)
    .single();

  if (error) {
    console.error('Error adding user to organization:', error);
    throw error;
  }

  return data;
}

export async function inviteUserToOrganization(
  organizationId: string,
  email: string,
  role: 'Admin' | 'Manager' | 'Member',
  firstName?: string,
  lastName?: string
) {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');

  // Check if user already exists in the system (any status)
  const { data: existingUser } = await supabase
    .from('users')
    .select('id, user_status')
    .eq('email', email)
    .maybeSingle();

  if (existingUser && existingUser.user_status === 'active') {
    throw new Error('A user with this email already exists. Please use "Add Existing User" instead.');
  }

  if (existingUser && existingUser.user_status === 'pending') {
    throw new Error('An invitation has already been sent to this email address');
  }

  if (existingUser && existingUser.user_status === 'inactive') {
    throw new Error('A user with this email exists but is inactive. Please contact support.');
  }

  // Check if there's already a pending invitation
  const { data: existingInvitation, error: checkError } = await supabase
    .from('invitations')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('email', email)
    .eq('status', 'pending')
    .maybeSingle();

  // Handle case where invitations table doesn't exist yet
  if (checkError && (checkError.code === 'PGRST205' || checkError.message.includes('Could not find'))) {
    throw new Error('The invitations table has not been created yet. Please run the migration from APPLY_INVITATIONS_TABLE.md');
  }

  if (existingInvitation) {
    throw new Error('An invitation has already been sent to this email address');
  }

  // Create placeholder user record with pending status
  const userId = crypto.randomUUID();
  const { data: newUser, error: userError } = await supabase
    .from('users')
    .insert({
      id: userId,
      email,
      first_name: firstName || null,
      last_name: lastName || null,
      user_status: 'pending',
    })
    .select()
    .single();

  if (userError) {
    console.error('Error creating pending user:', userError);
    throw new Error('Failed to create user placeholder: ' + userError.message);
  }

  // Add user to organization
  const { error: memberError } = await supabase
    .from('organization_members')
    .insert({
      organization_id: organizationId,
      user_id: userId,
      role,
    });

  if (memberError) {
    console.error('Error adding user to organization:', memberError);
    // Clean up the created user
    await supabase.from('users').delete().eq('id', userId);
    throw new Error('Failed to add user to organization: ' + memberError.message);
  }

  // Generate invitation token
  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

  // Create invitation
  const { data: invitation, error } = await supabase
    .from('invitations')
    .insert({
      organization_id: organizationId,
      email,
      role,
      invited_by: session.user.id,
      token,
      expires_at: expiresAt.toISOString(),
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating invitation:', error);
    
    // Clean up the created user and membership
    await supabase.from('organization_members').delete().eq('user_id', userId);
    await supabase.from('users').delete().eq('id', userId);
    
    // Better error message if table doesn't exist
    if (error.code === 'PGRST205' || error.message.includes('Could not find')) {
      throw new Error('The invitations table has not been created yet. Please run the migration from APPLY_INVITATIONS_TABLE.md');
    }
    
    throw error;
  }

  return { invitation, user: newUser };
}

export async function getOrganizationInvitations(organizationId: string) {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from('invitations')
      .select(`
        *,
        invited_by_user:invited_by(
          first_name,
          last_name,
          email
        )
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      // If table doesn't exist yet, return empty array instead of throwing
      if (error.code === 'PGRST205' || error.message.includes('Could not find')) {
        console.warn('Invitations table not yet created. Please run the migration from APPLY_INVITATIONS_TABLE.md');
        return [];
      }
      console.error('Error fetching invitations:', error);
      throw error;
    }

    return data || [];
  } catch (error: any) {
    // Handle network errors gracefully
    console.error('Error fetching invitations:', error);
    return [];
  }
}

export async function cancelInvitation(invitationId: string) {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');

  // Hard delete instead of update to 'cancelled' to avoid unique constraint violations
  // (organization_id, email, status) when multiple invitations are cancelled for the same email.
  const { error } = await supabase
    .from('invitations')
    .delete()
    .eq('id', invitationId);

  if (error) {
    console.error('Error deleting invitation:', error);
    throw error;
  }

  return { success: true };
}

export async function convertPendingToActive(email: string, authUserId: string) {
  const supabase = getSupabase();
  
  // Find the pending user by email
  const { data: pendingUser, error: findError } = await supabase
    .from('users')
    .select('id, user_status')
    .eq('email', email)
    .eq('user_status', 'pending')
    .maybeSingle();

  if (findError) {
    console.error('Error finding pending user:', findError);
    throw findError;
  }

  if (!pendingUser) {
    // No pending user found - this is normal for users who weren't invited
    return null;
  }

  // Update the user ID to match auth user ID and set status to active
  // This will automatically update all related records if foreign keys have ON UPDATE CASCADE
  const { data: updatedUser, error: updateError } = await supabase
    .from('users')
    .update({
      id: authUserId,
      user_status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', pendingUser.id)
    .select()
    .single();

  if (updateError) {
    console.error('Error converting pending user to active:', updateError);
    throw updateError;
  }

  // Mark any pending invitations as accepted
  const { error: inviteError } = await supabase
    .from('invitations')
    .update({ 
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      accepted_by: authUserId,  // Add this field
    })
    .eq('email', email)
    .eq('status', 'pending');

  if (inviteError) {
    console.error('Error updating invitation status:', inviteError);
    throw new Error(`Failed to accept invitation: ${inviteError.message}`);
  }

  return updatedUser;
}

// ===== Staff Roles Management =====

export async function getStaffRoles() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('staff_roles')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching staff roles:', error);
    throw error;
  }

  return data || [];
}

export async function updateMemberDetails(
  memberId: string,
  memberData: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    avatar_url?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
    role?: 'Admin' | 'Manager' | 'Staff' | 'Viewer';
    default_staff_role_id?: string;
  }
) {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');

  // Get the member to find their user_id
  const { data: member } = await supabase
    .from('organization_members')
    .select('user_id, role, default_staff_role_id')
    .eq('id', memberId)
    .single();

  if (!member) {
    throw new Error('Member not found');
  }

  // Update user details if provided
  const userFields = ['first_name', 'last_name', 'email', 'phone', 'avatar_url', 'address_line1', 'address_line2', 'city', 'state', 'postal_code', 'country'];
  const userUpdates: any = {};
  let hasUserUpdates = false;

  for (const field of userFields) {
    if (memberData[field as keyof typeof memberData] !== undefined) {
      userUpdates[field] = memberData[field as keyof typeof memberData];
      hasUserUpdates = true;
    }
  }

  if (hasUserUpdates) {
    const { error: userError } = await supabase
      .from('users')
      .update(userUpdates)
      .eq('id', member.user_id);

    if (userError) {
      console.error('Error updating user details:', userError);
      throw userError;
    }
  }

  // Update organization member data (role and default_staff_role_id)
  const memberUpdates: any = {};
  let hasMemberUpdates = false;

  if (memberData.role !== undefined && memberData.role !== member.role) {
    memberUpdates.role = memberData.role;
    hasMemberUpdates = true;
  }

  if (memberData.default_staff_role_id !== undefined && memberData.default_staff_role_id !== member.default_staff_role_id) {
    memberUpdates.default_staff_role_id = memberData.default_staff_role_id || null;
    hasMemberUpdates = true;
  }

  if (hasMemberUpdates) {
    const { error: memberError } = await supabase
      .from('organization_members')
      .update(memberUpdates)
      .eq('id', memberId);

    if (memberError) {
      console.error('Error updating member data:', memberError);
      throw memberError;
    }
  }

  // Fetch updated member data
  const { data: updatedMember, error } = await supabase
    .from('organization_members')
    .select(`
      *,
      user:users(
        id,
        first_name,
        last_name,
        email,
        phone,
        avatar_url,
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        country,
        user_status
      )
    `)
    .eq('id', memberId)
    .single();

  if (error) {
    console.error('Error fetching updated member:', error);
    throw error;
  }

  return updatedMember;
}

export async function updateMemberRole(memberId: string, role: 'Admin' | 'Manager' | 'Member') {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('organization_members')
    .update({ role })
    .eq('id', memberId)
    .select()
    .single();

  if (error) {
    console.error('Error updating member role:', error);
    throw error;
  }

  return data;
}

export async function removeMember(memberId: string) {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('organization_members')
    .delete()
    .eq('id', memberId);

  if (error) {
    console.error('Error removing member:', error);
    throw error;
  }

  return { success: true };
}

export async function inviteMember(organizationId: string, email: string, role: 'Admin' | 'Manager' | 'Member') {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');

  // Check if user exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (!existingUser) {
    throw new Error('User with this email does not exist. They must sign up first.');
  }

  // Check if already a member
  const { data: existingMember } = await supabase
    .from('organization_members')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('user_id', existingUser.id)
    .single();

  if (existingMember) {
    throw new Error('User is already a member of this organization');
  }

  // Add member
  const { data, error } = await supabase
    .from('organization_members')
    .insert({
      organization_id: organizationId,
      user_id: existingUser.id,
      role,
    })
    .select(`
      *,
      user:users(
        id,
        first_name,
        last_name,
        email,
        phone,
        avatar_url,
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        country,
        user_status
      )
    `)
    .single();

  if (error) {
    console.error('Error inviting member:', error);
    throw error;
  }

  return data;
}

// ===== Gig Management =====

export async function getGigsForOrganization(organizationId: string) {
  const supabase = getSupabase();
  // Fetch gigs where this organization is a participant
  const { data: gigParticipants, error } = await supabase
    .from('gig_participants')
    .select('*, gig:gigs(*)')
    .eq('organization_id', organizationId);

  if (error) {
    console.error('Error fetching gigs:', error);
    throw error;
  }

  // Extract unique gigs
  const gigsMap = new Map();
  for (const gp of gigParticipants || []) {
    if (gp.gig) {
      gigsMap.set(gp.gig.id, gp.gig);
    }
  }

  const gigs = Array.from(gigsMap.values());

  // For each gig, fetch all participants
  const gigsWithParticipants = await Promise.all(
    gigs.map(async (gig: any) => {
      const { data: participants } = await supabase
        .from('gig_participants')
        .select('*, organization:organization_id(*)')
        .eq('gig_id', gig.id);

      // Legacy support: find venue and act from participants
      const venue = participants?.find(p => p.role === 'Venue')?.organization;
      const act = participants?.find(p => p.role === 'Act')?.organization;

      return {
        ...gig,
        venue,
        act,
      };
    })
  );

  // Sort by start date descending
  gigsWithParticipants.sort((a: any, b: any) => 
    new Date(b.start).getTime() - new Date(a.start).getTime()
  );

  return gigsWithParticipants;
}

export async function getGig(gigId: string) {
  const supabase = getSupabase();
  
  try {
    // Get current user from session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Not authenticated');
    const user = session.user;

    const { data: gig, error } = await supabase
      .from('gigs')
      .select('*')
      .eq('id', gigId)
      .single();

    if (error) {
      console.error('Error fetching gig:', error);
      throw error;
    }

    // Verify user has access through gig participants
    const { data: gigParticipants, error: participantsFetchError } = await supabase
      .from('gig_participants')
      .select('organization_id')
      .eq('gig_id', gigId);

    if (participantsFetchError) {
      console.error('Error fetching gig participants:', participantsFetchError);
      throw participantsFetchError;
    }

    if (!gigParticipants || gigParticipants.length === 0) {
      throw new Error('Access denied - no participants found for this gig');
    }

    const orgIds = gigParticipants.map(gp => gp.organization_id);
    
    // Check if user is member of any participating organization
    const { data: userMemberships, error: membershipsError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .in('organization_id', orgIds);

    if (membershipsError) {
      console.error('Error fetching user memberships:', membershipsError);
      throw membershipsError;
    }

    if (!userMemberships || userMemberships.length === 0) {
      throw new Error('Access denied - you are not a member of any organization participating in this gig');
    }

    // Fetch full participant data with organization details
    const { data: participants, error: fullParticipantsError } = await supabase
      .from('gig_participants')
      .select('*, organization:organization_id(*)')
      .eq('gig_id', gig.id);

    if (fullParticipantsError) {
      console.error('Error fetching full participants:', fullParticipantsError);
      throw fullParticipantsError;
    }

    // Fetch staff slots with roles and assignments
    const { data: staff_slots_raw, error: slotsError } = await supabase
      .from('gig_staff_slots')
      .select(`
        *,
        staff_roles(name),
        gig_staff_assignments(
          *,
          user:user_id(id, first_name, last_name)
        )
      `)
      .eq('gig_id', gig.id);

    if (slotsError) {
      console.error('Error fetching staff slots:', slotsError);
      throw slotsError;
    }

    const staff_slots = staff_slots_raw?.map((slot: any) => ({
      ...slot,
      role: slot.staff_roles?.name || '',
      count: slot.required_count,
      staff_assignments: slot.gig_staff_assignments?.map((assignment: any) => ({
        ...assignment,
        user: assignment.user
      }))
    }));

    // Fetch kit assignments
    const { data: kit_assignments, error: kitError } = await supabase
      .from('gig_kit_assignments')
      .select('*')
      .eq('gig_id', gig.id);

    if (kitError) {
      console.error('Error fetching kit assignments:', kitError);
      throw kitError;
    }

    // Fetch bids
    const { data: bids, error: bidsError } = await supabase
      .from('gig_bids')
      .select('*')
      .eq('gig_id', gig.id);

    if (bidsError) {
      console.error('Error fetching bids:', bidsError);
      throw bidsError;
    }

    return {
      ...gig,
      participants: participants || [],
      staff_slots: staff_slots || [],
      kit_assignments: kit_assignments || [],
      bids: bids || [],
    };
  } catch (err: any) {
    // Re-throw network errors with more context to prevent confusing "Access Denied" messages
    if (isNetworkError(err)) {
      const networkError = new Error('Network error: Unable to connect to server to fetch gig details. Please check your internet connection.');
      networkError.name = 'NetworkError';
      throw networkError;
    }
    throw err;
  }
}

export async function createGig(gigData: {
  title: string; // Required - matches database schema
  start: string; // Required - matches database schema
  end: string; // Required - matches database schema (changed from optional)
  timezone: string; // Required - matches database schema
  status?: string; // Optional - has default
  venue_address?: string; // Optional
  notes?: string; // Optional
  settlement_type?: string; // Optional
  settlement_amount?: number; // Optional
  tags?: string[]; // Optional - has default
  amount_paid?: number; // Optional
  primary_organization_id?: string;
  parent_gig_id?: string;
  hierarchy_depth?: number;
  participants?: Array<{ organization_id: string; role: string; notes?: string }>;
  staff_slots?: Array<{
    role: string;
    organization_id?: string;
    count?: number;
    required_count?: number;
    notes?: string;
    assignments?: Array<{
      user_id: string;
      status?: string;
      rate?: number;
      fee?: number;
      notes?: string;
    }>;
  }>;
}) {
  const supabase = getSupabase();
  try {
    console.log('createGig called with data:', JSON.stringify(gigData, null, 2));
    
    // Get current user from session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Not authenticated');
    const user = session.user;

    const { 
      primary_organization_id,
      parent_gig_id,
      hierarchy_depth = 0,
      participants = [],
      staff_slots = [],
      ...restGigData
    } = gigData;

    console.log('Creating gig with restGigData:', JSON.stringify(restGigData, null, 2));

    // Validate required fields before insert
    if (!restGigData.title) {
      throw new Error('Title is required');
    }
    if (!restGigData.start) {
      throw new Error('Start time is required');
    }
    if (!restGigData.end) {
      throw new Error('End time is required');
    }
    if (!restGigData.timezone) {
      throw new Error('Timezone is required');
    }

    // Prepare insert data
    const insertData = {
      title: restGigData.title,
      start: restGigData.start,
      end: restGigData.end,
      timezone: restGigData.timezone,
      status: restGigData.status || 'DateHold',
      tags: Array.isArray(restGigData.tags) ? restGigData.tags : [],
      notes: restGigData.notes || null,
      amount_paid: restGigData.amount_paid !== undefined && restGigData.amount_paid !== null ? restGigData.amount_paid : null,
      parent_gig_id: parent_gig_id || null,
      hierarchy_depth: hierarchy_depth || 0,
      created_by: user.id,
      updated_by: user.id,
    };
    
    console.log('Inserting gig with data:', JSON.stringify(insertData, null, 2));
    
    // Create gig
    const { data: gig, error } = await supabase
      .from('gigs')
      .insert(insertData)
      .select()
      .single();
    
    console.log('Insert result - gig:', gig);
    console.log('Insert result - error:', error);

    if (error) {
      console.error('Error creating gig:', error);
      throw new Error(`Failed to create gig: ${error.message}`);
    }

    if (!gig) {
      throw new Error('Gig creation returned no data');
    }

    console.log('Gig created successfully:', gig.id);

    // Create participants - UI handles all participant management including primary org
    const participantsToInsert: Array<{
      gig_id: string;
      organization_id: string;
      role: string;
      notes?: string | null;
    }> = [];
    
    // Process participants from UI (already deduplicated)
    participants.forEach((p: any) => {
      if (p.organization_id && p.role) {
        participantsToInsert.push({
          gig_id: gig.id,
          organization_id: p.organization_id,
          role: p.role,
          notes: p.notes || null,
        });
      }
    });

    if (participantsToInsert.length > 0) {
      const { error: participantsError } = await supabase
        .from('gig_participants')
        .insert(participantsToInsert);
      
      if (participantsError) {
        console.error('Error creating participants:', participantsError);
      }
    }

    // Create staff slots with assignments
    if (staff_slots.length > 0) {
      for (const slot of staff_slots) {
        // Get or create staff role
        let staffRoleId: string | null = null;
        
        const { data: existingRole } = await supabase
          .from('staff_roles')
          .select('id')
          .eq('name', slot.role)
          .maybeSingle();

        if (existingRole?.id) {
          staffRoleId = existingRole.id;
        } else {
          const { data: newRole, error: roleError } = await supabase
            .from('staff_roles')
            .insert({ name: slot.role })
            .select('id')
            .single();
          
          if (roleError) {
            console.error('Error creating staff role:', roleError);
            continue;
          }
          
          staffRoleId = newRole?.id || null;
        }

        if (!staffRoleId) {
          console.error('Failed to get or create staff role for:', slot.role);
          continue;
        }
        
        // Ensure we have an organization_id for the slot
        const slotOrgId = slot.organization_id || primary_organization_id;
        if (!slotOrgId) {
          console.error('No organization_id available for staff slot:', slot);
          continue;
        }
        
        const { data: createdSlot, error: slotError } = await supabase
          .from('gig_staff_slots')
          .insert({
            gig_id: gig.id,
            organization_id: slotOrgId,
            staff_role_id: staffRoleId,
            required_count: slot.count || slot.required_count || 1,
            notes: slot.notes || null,
          })
          .select()
          .single();
        
        if (slotError) {
          console.error('Error creating staff slot:', slotError);
          continue;
        }
        
        if (!createdSlot) {
          console.error('Staff slot creation returned no data');
          continue;
        }
        
        // Create staff assignments
        if (slot.assignments?.length) {
          const assignmentsToInsert = slot.assignments
            .filter((a: any) => a.user_id)
            .map((a: any) => ({
              slot_id: createdSlot.id, // Fixed: column name is slot_id, not gig_staff_slot_id
              user_id: a.user_id,
              status: a.status || 'Requested',
              rate: a.rate || null,
              fee: a.fee || null,
              notes: a.notes || null,
            }));
          
          if (assignmentsToInsert.length > 0) {
            const { error: assignmentsError } = await supabase
              .from('gig_staff_assignments')
              .insert(assignmentsToInsert);
            
            if (assignmentsError) {
              console.error('Error creating staff assignments:', assignmentsError);
            }
          }
        }
      }
    }

    // Fetch complete gig with participants
    const { data: participantsData } = await supabase
      .from('gig_participants')
      .select('*, organization:organization_id(*)')
      .eq('gig_id', gig.id);

    const venue = participantsData?.find(p => p.role === 'Venue')?.organization;
    const act = participantsData?.find(p => p.role === 'Act')?.organization;

    const result = {
      ...gig,
      venue,
      act,
      participants: participantsData || [],
    };

    console.log('createGig returning:', result);
    return result;
  } catch (err: any) {
    console.error('createGig error:', err);
    if (isNetworkError(err)) {
      const networkError = new Error('Network error: Unable to connect to server to create gig. Please check your internet connection.');
      networkError.name = 'NetworkError';
      throw networkError;
    }
    throw err;
  }
}

export async function updateGigParticipants(gigId: string, participants: Array<{
  id?: string;
  organization_id: string;
  role: string;
  notes?: string | null;
}>) {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');

  // Get existing participants
  const { data: existingParticipants, error: fetchError } = await supabase
    .from('gig_participants')
    .select('id')
    .eq('gig_id', gigId);

  if (fetchError) {
    console.error('Error fetching existing participants:', fetchError);
    throw fetchError;
  }

  const existingIds = existingParticipants?.map(p => p.id) || [];
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const incomingIds = participants
    .filter(p => p.id && uuidRegex.test(p.id))
    .map(p => p.id!);

  // Delete participants that are no longer in the list
  const idsToDelete = existingIds.filter(id => !incomingIds.includes(id));
  if (idsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('gig_participants')
      .delete()
      .in('id', idsToDelete);
    
    if (deleteError) {
      console.error('Error deleting participants:', deleteError);
      throw deleteError;
    }
  }

  // Update or insert participants
  for (const participant of participants) {
    const isDbId = participant.id && uuidRegex.test(participant.id);
    
    const participantData = {
      organization_id: participant.organization_id,
      role: participant.role,
      notes: participant.notes || null,
    };

    if (isDbId && existingIds.includes(participant.id!)) {
      const { error: updateError } = await supabase
        .from('gig_participants')
        .update(participantData)
        .eq('id', participant.id);
      
      if (updateError) {
        console.error('Error updating participant:', updateError);
        throw updateError;
      }
    } else if (participant.organization_id && participant.role) {
      const { error: insertError } = await supabase
        .from('gig_participants')
        .insert({
          gig_id: gigId,
          ...participantData,
        });
      
      if (insertError) {
        console.error('Error inserting participant:', insertError);
        throw insertError;
      }
    }
  }

  return { success: true };
}

export async function updateGig(gigId: string, gigData: {
  title?: string;
  start?: string;
  end?: string;
  timezone?: string;
  status?: GigStatus;
  tags?: string[];
  notes?: string;
  amount_paid?: number | null;
  participants?: Array<{ 
    id?: string;
    organization_id: string; 
    role: string; 
    notes?: string | null 
  }>;
  staff_slots?: Array<{
    id?: string;
    role: string;
    count?: number;
    notes?: string | null;
    assignments?: Array<{
      id?: string;
      user_id: string;
      status?: string;
      rate?: number | null;
      fee?: number | null;
      notes?: string | null;
    }>;
  }>;
}) {
  const supabase = getSupabase();
  // Get current user from session
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');
  const user = session.user;

  try {
    // Verify user has access to this gig
    const { data: gigParticipants } = await supabase
      .from('gig_participants')
      .select('organization_id')
      .eq('gig_id', gigId);

  if (!gigParticipants || gigParticipants.length === 0) {
    throw new Error('Access denied - no participants found');
  }

  const orgIds = gigParticipants.map(gp => gp.organization_id);
  
  // Check if user is member of any participating organization with Admin or Manager role
  const { data: userMemberships } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .in('organization_id', orgIds);

  if (!userMemberships || userMemberships.length === 0) {
    throw new Error('Access denied - not a member of participating organizations');
  }

  const hasAdminOrManager = userMemberships.some(m => m.role === 'Admin' || m.role === 'Manager');
  if (!hasAdminOrManager) {
    throw new Error('Access denied - only Admins and Managers can update gigs');
  }

  // Get the primary organization ID for staff slots (use first org user is admin/manager of)
  const primary_organization_id = userMemberships.find(m => m.role === 'Admin' || m.role === 'Manager')?.organization_id || userMemberships[0]?.organization_id;

  const { participants, staff_slots, ...restGigData } = gigData;

  // Update gig basic info
  const { error: updateError } = await supabase
    .from('gigs')
    .update({
      ...restGigData,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', gigId);

  if (updateError) {
    console.error('Error updating gig:', updateError);
    throw updateError;
  }

  // Only update participants if explicitly provided
  if (participants !== undefined && Array.isArray(participants)) {
    // Get existing participants
    const { data: existingParticipants } = await supabase
      .from('gig_participants')
      .select('id')
      .eq('gig_id', gigId);

    const existingIds = existingParticipants?.map(p => p.id) || [];
    const incomingIds = participants.filter(p => p.id).map(p => p.id!);

    // Delete participants that are no longer in the list
    const idsToDelete = existingIds.filter(id => !incomingIds.includes(id));
    if (idsToDelete.length > 0) {
      await supabase
        .from('gig_participants')
        .delete()
        .in('id', idsToDelete);
    }

    // Update or insert participants
    for (const participant of participants) {
      if (participant.id && existingIds.includes(participant.id)) {
        // Update existing participant
        await supabase
          .from('gig_participants')
          .update({
            organization_id: participant.organization_id,
            role: participant.role,
            notes: participant.notes || null,
          })
          .eq('id', participant.id);
      } else if (participant.organization_id && participant.role) {
        // Insert new participant
        await supabase
          .from('gig_participants')
          .insert({
            gig_id: gigId,
            organization_id: participant.organization_id,
            role: participant.role,
            notes: participant.notes || null,
          });
      }
    }
  }

  // Only update staff slots if explicitly provided (undefined means don't touch them)
  if (staff_slots !== undefined && Array.isArray(staff_slots)) {
    console.log('🔍 DEBUG - API updateGig - Processing staff_slots:', JSON.stringify(staff_slots, null, 2));
    
    // Get existing staff slots
    const { data: existingSlots } = await supabase
      .from('gig_staff_slots')
      .select('id')
      .eq('gig_id', gigId);

    console.log('🔍 DEBUG - API updateGig - Existing slot IDs:', existingSlots?.map(s => s.id));

    const existingSlotIds = existingSlots?.map(s => s.id) || [];
    const incomingSlotIds = staff_slots.filter(s => s.id).map(s => s.id!);

    console.log('🔍 DEBUG - API updateGig - Incoming slot IDs:', incomingSlotIds);

    // Delete slots that are no longer in the list (cascades to assignments)
    const slotIdsToDelete = existingSlotIds.filter(id => !incomingSlotIds.includes(id));
    if (slotIdsToDelete.length > 0) {
      console.log('🔍 DEBUG - API updateGig - Deleting slots:', slotIdsToDelete);
      await supabase
        .from('gig_staff_slots')
        .delete()
        .in('id', slotIdsToDelete);
    }

    // Update or insert staff slots
    for (const slot of staff_slots) {
      console.log('🔍 DEBUG - API updateGig - Processing slot:', { 
        role: slot.role, 
        hasId: !!slot.id,
        assignmentCount: slot.assignments?.length || 0 
      });
      
      // Get or create staff role
      let staffRoleId: string | null = null;
      
      const { data: existingRole } = await supabase
        .from('staff_roles')
        .select('id')
        .eq('name', slot.role)
        .maybeSingle();

      if (existingRole?.id) {
        staffRoleId = existingRole.id;
      } else {
        const { data: newRole } = await supabase
          .from('staff_roles')
          .insert({ name: slot.role })
          .select('id')
          .single();
        
        staffRoleId = newRole?.id || null;
      }

      if (!staffRoleId) continue;

      let slotId = slot.id;

      if (slot.id && existingSlotIds.includes(slot.id)) {
        // Update existing slot
        await supabase
          .from('gig_staff_slots')
          .update({
            staff_role_id: staffRoleId,
            required_count: slot.count || 1,
            notes: slot.notes || null,
          })
          .eq('id', slot.id);
      } else if (slot.role) {
        // Insert new slot
        const slotOrgId = (slot as any).organization_id || primary_organization_id;
        const { data: newSlot } = await supabase
          .from('gig_staff_slots')
          .insert({
            gig_id: gigId,
            organization_id: slotOrgId,
            staff_role_id: staffRoleId,
            required_count: slot.count || 1,
            notes: slot.notes || null,
          })
          .select('id')
          .single();
        
        slotId = newSlot?.id;
      }

      if (!slotId) continue;

      // Handle assignments for this slot
      if (slot.assignments && slot.assignments.length > 0) {
        // Get existing assignments for this slot
        const { data: existingAssignments } = await supabase
          .from('gig_staff_assignments')
          .select('id')
          .eq('slot_id', slotId); // Fixed: column name is slot_id

        const existingAssignmentIds = existingAssignments?.map(a => a.id) || [];
        const incomingAssignmentIds = slot.assignments.filter(a => a.id).map(a => a.id!);

        // Delete assignments that are no longer in the list
        const assignmentIdsToDelete = existingAssignmentIds.filter(id => !incomingAssignmentIds.includes(id));
        if (assignmentIdsToDelete.length > 0) {
          await supabase
            .from('gig_staff_assignments')
            .delete()
            .in('id', assignmentIdsToDelete);
        }

        // Update or insert assignments
        for (const assignment of slot.assignments) {
          console.log('🔍 DEBUG - API updateGig - Processing assignment:', {
            hasId: !!assignment.id,
            user_id: assignment.user_id,
            status: assignment.status
          });
          
          if (assignment.id && existingAssignmentIds.includes(assignment.id)) {
            // Update existing assignment
            console.log('🔍 DEBUG - API updateGig - Updating existing assignment:', assignment.id);
            const { error: updateError } = await supabase
              .from('gig_staff_assignments')
              .update({
                user_id: assignment.user_id,
                status: assignment.status || 'Requested',
                rate: assignment.rate || null,
                fee: assignment.fee || null,
                notes: assignment.notes || null,
              })
              .eq('id', assignment.id);
            
            if (updateError) {
              console.error('🔍 DEBUG - API updateGig - ERROR updating assignment:', updateError);
            } else {
              console.log('🔍 DEBUG - API updateGig - Assignment updated successfully');
            }
          } else if (assignment.user_id) {
            // Insert new assignment
            console.log('🔍 DEBUG - API updateGig - Inserting new assignment for slot_id:', slotId);
            const insertData = {
              slot_id: slotId,
              user_id: assignment.user_id,
              status: assignment.status || 'Requested',
              rate: assignment.rate || null,
              fee: assignment.fee || null,
              notes: assignment.notes || null,
            };
            console.log('🔍 DEBUG - API updateGig - Insert data:', insertData);
            
            const { data: insertedAssignment, error: insertError } = await supabase
              .from('gig_staff_assignments')
              .insert(insertData)
              .select();
            
            if (insertError) {
              console.error('🔍 DEBUG - API updateGig - ERROR inserting assignment:', insertError);
            } else {
              console.log('🔍 DEBUG - API updateGig - Assignment inserted successfully:', insertedAssignment);
            }
          } else {
            console.log('🔍 DEBUG - API updateGig - Skipping assignment (no user_id)');
          }
        }
      } else {
        // Delete all assignments for this slot if none provided
        await supabase
          .from('gig_staff_assignments')
          .delete()
          .eq('slot_id', slotId);
      }
    }
  }
  // NOTE: If staff_slots is undefined, we don't touch existing staff slots at all

    // Fetch updated gig with participants
    const updatedGig = await getGig(gigId);
    return updatedGig;
  } catch (err: any) {
    if (isNetworkError(err)) {
      const networkError = new Error('Network error: Unable to connect to server to update gig. Please check your internet connection.');
      networkError.name = 'NetworkError';
      throw networkError;
    }
    throw err;
  }
}

export async function deleteGig(gigId: string) {
  const supabase = getSupabase();
  try {
    const { error } = await supabase
      .from('gigs')
      .delete()
      .eq('id', gigId);

    if (error) {
      console.error('Error deleting gig:', error);
      throw error;
    }

    return { success: true };
  } catch (err: any) {
    if (isNetworkError(err)) {
      const networkError = new Error('Network error: Unable to connect to server to delete gig. Please check your internet connection.');
      networkError.name = 'NetworkError';
      throw networkError;
    }
    throw err;
  }
}

// ============================================
// GIG STAFF SLOTS & ASSIGNMENTS MANAGEMENT
// ============================================
// Separate functions for managing staff slots and assignments
// to avoid unnecessary database updates when only gig metadata changes

export async function updateGigStaffSlots(gigId: string, staff_slots: Array<{
  id?: string;
  organization_id: string;
  role: string;
  count?: number;
  notes?: string | null;
  assignments?: Array<{
    id?: string;
    user_id: string;
    status?: string;
    rate?: number | null;
    fee?: number | null;
    notes?: string | null;
  }>;
}>) {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');
  const user = session.user;

  try {
    // Verify user has access to this gig
    const { data: gigParticipants } = await supabase
      .from('gig_participants')
      .select('organization_id')
      .eq('gig_id', gigId);

  if (!gigParticipants || gigParticipants.length === 0) {
    throw new Error('Access denied - no participants found');
  }

  const orgIds = gigParticipants.map(gp => gp.organization_id);
  
  // Check if user is member of any participating organization with Admin or Manager role
  const { data: userMemberships } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .in('organization_id', orgIds);

  if (!userMemberships || userMemberships.length === 0) {
    throw new Error('Access denied - not a member of participating organizations');
  }

  const hasAdminOrManager = userMemberships.some(m => m.role === 'Admin' || m.role === 'Manager');
  if (!hasAdminOrManager) {
    throw new Error('Access denied - only Admins and Managers can update staff slots');
  }

  // Get existing staff slots
  const { data: existingSlots } = await supabase
    .from('gig_staff_slots')
    .select('id')
    .eq('gig_id', gigId);

  const existingSlotIds = existingSlots?.map(s => s.id) || [];
  const incomingSlotIds = staff_slots.filter(s => s.id).map(s => s.id!);

  // Delete slots that are no longer in the list (cascades to assignments)
  const slotIdsToDelete = existingSlotIds.filter(id => !incomingSlotIds.includes(id));
  if (slotIdsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('gig_staff_slots')
      .delete()
      .in('id', slotIdsToDelete);
    
    if (deleteError) {
      console.error('Error deleting staff slots:', deleteError);
      throw deleteError;
    }
  }

  // Update or insert staff slots
  for (const slot of staff_slots) {
    // Get or create staff role
    let staffRoleId: string | null = null;
    
    const { data: existingRole, error: roleError } = await supabase
      .from('staff_roles')
      .select('id')
      .eq('name', slot.role)
      .maybeSingle();

    if (roleError) {
      console.error('Error fetching staff role:', roleError);
      throw roleError;
    }

    if (existingRole?.id) {
      staffRoleId = existingRole.id;
    } else {
      const { data: newRole, error: newRoleError } = await supabase
        .from('staff_roles')
        .insert({ name: slot.role })
        .select('id')
        .single();
      
      if (newRoleError) {
        console.error('Error creating staff role:', newRoleError);
        throw newRoleError;
      }
      
      staffRoleId = newRole?.id || null;
    }

    if (!staffRoleId) continue;

    let slotId = slot.id;

    if (slot.id && existingSlotIds.includes(slot.id)) {
      // Update existing slot
      const { error: updateError } = await supabase
        .from('gig_staff_slots')
        .update({
          staff_role_id: staffRoleId,
          organization_id: slot.organization_id,
          required_count: slot.count || 1,
          notes: slot.notes || null,
        })
        .eq('id', slot.id);
      
      if (updateError) {
        console.error('Error updating staff slot:', updateError);
        throw updateError;
      }
    } else if (slot.role) {
      // Insert new slot
      const { data: newSlot, error: insertError } = await supabase
        .from('gig_staff_slots')
        .insert({
          gig_id: gigId,
          organization_id: slot.organization_id,
          staff_role_id: staffRoleId,
          required_count: slot.count || 1,
          notes: slot.notes || null,
        })
        .select('id')
        .single();
      
      if (insertError) {
        console.error('Error creating staff slot:', insertError);
        throw insertError;
      }
      
      slotId = newSlot?.id;
    }

    if (!slotId) continue;

    // Handle assignments for this slot
    if (slot.assignments && slot.assignments.length > 0) {
      // Get existing assignments for this slot
      const { data: existingAssignments, error: assignError } = await supabase
        .from('gig_staff_assignments')
        .select('id')
        .eq('slot_id', slotId);

      if (assignError) {
        console.error('Error fetching existing assignments:', assignError);
        throw assignError;
      }

      const existingAssignmentIds = existingAssignments?.map(a => a.id) || [];
      const incomingAssignmentIds = slot.assignments.filter(a => a.id).map(a => a.id!);

      // Delete assignments that are no longer in the list
      const assignmentIdsToDelete = existingAssignmentIds.filter(id => !incomingAssignmentIds.includes(id));
      if (assignmentIdsToDelete.length > 0) {
        const { error: deleteAssignError } = await supabase
          .from('gig_staff_assignments')
          .delete()
          .in('id', assignmentIdsToDelete);
        
        if (deleteAssignError) {
          console.error('Error deleting staff assignments:', deleteAssignError);
          throw deleteAssignError;
        }
      }

      // Update or insert assignments
      for (const assignment of slot.assignments) {
        if (assignment.id && existingAssignmentIds.includes(assignment.id)) {
          // Update existing assignment
          const { error: updateAssignError } = await supabase
            .from('gig_staff_assignments')
            .update({
              user_id: assignment.user_id,
              status: assignment.status || 'Requested',
              rate: assignment.rate || null,
              fee: assignment.fee || null,
              notes: assignment.notes || null,
            })
            .eq('id', assignment.id);
          
          if (updateAssignError) {
            console.error('Error updating staff assignment:', updateAssignError);
            throw updateAssignError;
          }
        } else if (assignment.user_id) {
          // Insert new assignment
          const { error: insertAssignError } = await supabase
            .from('gig_staff_assignments')
            .insert({
              slot_id: slotId,
              user_id: assignment.user_id,
              status: assignment.status || 'Requested',
              rate: assignment.rate || null,
              fee: assignment.fee || null,
              notes: assignment.notes || null,
            });
          
          if (insertAssignError) {
            console.error('Error creating staff assignment:', insertAssignError);
            throw insertAssignError;
          }
        }
      }
    } else {
      // Delete all assignments for this slot if none provided
      const { error: deleteAllError } = await supabase
        .from('gig_staff_assignments')
        .delete()
        .eq('slot_id', slotId);
      
      if (deleteAllError) {
        console.error('Error deleting all assignments for slot:', deleteAllError);
        throw deleteAllError;
      }
    }
  }

  return { success: true };
  } catch (err: any) {
    if (isNetworkError(err)) {
      const networkError = new Error('Network error: Unable to connect to server to update staff slots. Please check your internet connection.');
      networkError.name = 'NetworkError';
      throw networkError;
    }
    throw err;
  }
}

// ===== Google Places Integration =====

export async function searchGooglePlaces(query: string, latitude?: number, longitude?: number) {
  // Note: Google Places API calls should ideally go through a backend
  // For now, returning empty array as this requires the Edge Function
  console.warn('Google Places search requires Edge Function to be deployed');
  return { results: [] };
}

export async function getGooglePlaceDetails(placeId: string) {
  // Note: Google Places API calls should ideally go through a backend
  // For now, returning null as this requires the Edge Function
  console.warn('Google Places details requires Edge Function to be deployed');
  return null;
}

// ===== Legacy/Alias Functions for Backward Compatibility =====

export async function getGigs(organizationId: string) {
  return getGigsForOrganization(organizationId);
}

export async function getOrganizations(type?: string) {
  return searchOrganizations(type ? { type } : undefined);
}

// ===== Asset Management =====

export async function getAssets(organizationId: string, filters?: {
  category?: string;
  sub_category?: string;
  insurance_added?: boolean;
  search?: string;
}) {
  const supabase = getSupabase();
  let query = supabase
    .from('assets')
    .select('*')
    .eq('organization_id', organizationId)
    .order('manufacturer_model');

  if (filters?.category) {
    query = query.eq('category', filters.category);
  }

  if (filters?.sub_category) {
    query = query.eq('sub_category', filters.sub_category);
  }

  if (filters?.insurance_added !== undefined) {
    query = query.eq('insurance_policy_added', filters.insurance_added);
  }

  if (filters?.search) {
    query = query.or(`manufacturer_model.ilike.%${filters.search}%,serial_number.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching assets:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get distinct values for a specific field from assets
 * Much more efficient than fetching all assets
 */
export async function getDistinctAssetValues(
  organizationId: string,
  field: 'category' | 'sub_category' | 'type' | 'vendor',
  filterByCategory?: string
): Promise<string[]> {
  const supabase = getSupabase();
  
  let query = supabase
    .from('assets')
    .select(field)
    .eq('organization_id', organizationId)
    .not(field, 'is', null); // Exclude null values

  if (filterByCategory && field === 'sub_category') {
    query = query.eq('category', filterByCategory);
  }

  const { data, error } = await query;

  if (error) {
    console.error(`Error fetching distinct ${field} values:`, error);
    throw error;
  }

  // Extract unique, non-empty values
  const uniqueValues = Array.from(
    new Set(
      (data || [])
        .map((item: any) => item[field])
        .filter((value): value is string => !!value && value.trim() !== '')
    )
  ).sort();

  return uniqueValues;
}

/**
 * Get distinct values for a specific field from kits
 * Used for kit_category autocomplete
 */
export async function getDistinctKitValues(
  organizationId: string,
  field: 'category'
): Promise<string[]> {
  const supabase = getSupabase();
  
  const query = supabase
    .from('kits')
    .select(field)
    .eq('organization_id', organizationId)
    .not(field, 'is', null); // Exclude null values

  const { data, error } = await query;

  if (error) {
    console.error(`Error fetching distinct kit ${field} values:`, error);
    throw error;
  }

  // Extract unique, non-empty values
  const uniqueValues = Array.from(
    new Set(
      (data || [])
        .map((item: any) => item[field])
        .filter((value): value is string => !!value && value.trim() !== '')
    )
  ).sort();

  return uniqueValues;
}

export async function getAsset(assetId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('id', assetId)
    .single();

  if (error) {
    console.error('Error fetching asset:', error);
    throw error;
  }

  return data;
}

export async function createAsset(assetData: {
  organization_id: string;
  category: string;
  manufacturer_model: string;
  serial_number?: string;
  acquisition_date?: string;
  vendor?: string;
  cost?: number;
  replacement_value?: number;
  sub_category?: string;
  type?: string;
  description?: string;
  insurance_policy_added?: boolean;
  insurance_class?: string;
  quantity?: number;
}) {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');
  const user = session.user;

  const { data, error } = await supabase
    .from('assets')
    .insert({
      ...assetData,
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating asset:', error);
    throw error;
  }

  return data;
}

export async function updateAsset(assetId: string, assetData: {
  category?: string;
  manufacturer_model?: string;
  serial_number?: string;
  acquisition_date?: string;
  vendor?: string;
  cost?: number;
  replacement_value?: number;
  sub_category?: string;
  type?: string;
  description?: string;
  insurance_policy_added?: boolean;
}) {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');
  const user = session.user;

  const { data, error } = await supabase
    .from('assets')
    .update({
      ...assetData,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', assetId)
    .select()
    .single();

  if (error) {
    console.error('Error updating asset:', error);
    throw error;
  }

  return data;
}

export async function deleteAsset(assetId: string) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('assets')
    .delete()
    .eq('id', assetId);

  if (error) {
    console.error('Error deleting asset:', error);
    throw error;
  }

  return { success: true };
}

// ===== Kit Management =====

export async function getKits(organizationId: string, filters?: {
  category?: string;
  search?: string;
}) {
  const supabase = getSupabase();
  let query = supabase
    .from('kits')
    .select(`
      *,
      kit_assets!inner(
        quantity,
        asset:assets(*)
      )
    `)
    .eq('organization_id', organizationId)
    .order('name');

  if (filters?.category) {
    query = query.eq('category', filters.category);
  }

  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching kits:', error);
    throw error;
  }

  return data || [];
}

export async function getKit(kitId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('kits')
    .select(`
      *,
      kit_assets(
        id,
        quantity,
        notes,
        asset:assets(*)
      )
    `)
    .eq('id', kitId)
    .single();

  if (error) {
    console.error('Error fetching kit:', error);
    throw error;
  }

  return data;
}

export async function createKit(kitData: {
  organization_id: string;
  name: string;
  category?: string;
  description?: string;
  tags?: string[];
  assets: Array<{
    asset_id: string;
    quantity: number;
    notes?: string;
  }>;
}) {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');
  const user = session.user;

  const { assets, ...restKitData } = kitData;

  // Create kit
  const { data: kit, error: kitError } = await supabase
    .from('kits')
    .insert({
      ...restKitData,
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single();

  if (kitError) {
    console.error('Error creating kit:', kitError);
    throw kitError;
  }

  // Add assets to kit
  if (assets && assets.length > 0) {
    const kitAssets = assets.map(a => ({
      kit_id: kit.id,
      asset_id: a.asset_id,
      quantity: a.quantity,
      notes: a.notes || null,
    }));

    const { error: assetsError } = await supabase
      .from('kit_assets')
      .insert(kitAssets);

    if (assetsError) {
      console.error('Error adding assets to kit:', assetsError);
      // Clean up kit if asset insertion fails
      await supabase.from('kits').delete().eq('id', kit.id);
      throw assetsError;
    }
  }

  return kit;
}

export async function updateKit(kitId: string, kitData: {
  name?: string;
  category?: string;
  description?: string;
  tags?: string[];
  assets?: Array<{
    id?: string;
    asset_id: string;
    quantity: number;
    notes?: string;
  }>;
}) {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');
  const user = session.user;

  const { assets, ...restKitData } = kitData;

  // Update kit basic info
  const { error: updateError } = await supabase
    .from('kits')
    .update({
      ...restKitData,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', kitId);

  if (updateError) {
    console.error('Error updating kit:', updateError);
    throw updateError;
  }

  // Update kit assets if provided
  if (assets) {
    // Get existing kit assets
    const { data: existingAssets } = await supabase
      .from('kit_assets')
      .select('id')
      .eq('kit_id', kitId);

    const existingIds = existingAssets?.map(a => a.id) || [];
    const incomingIds = assets.filter(a => a.id).map(a => a.id!);

    // Delete assets that are no longer in the list
    const idsToDelete = existingIds.filter(id => !incomingIds.includes(id));
    if (idsToDelete.length > 0) {
      await supabase
        .from('kit_assets')
        .delete()
        .in('id', idsToDelete);
    }

    // Update or insert assets
    for (const asset of assets) {
      if (asset.id && existingIds.includes(asset.id)) {
        // Update existing
        await supabase
          .from('kit_assets')
          .update({
            asset_id: asset.asset_id,
            quantity: asset.quantity,
            notes: asset.notes || null,
          })
          .eq('id', asset.id);
      } else {
        // Insert new
        await supabase
          .from('kit_assets')
          .insert({
            kit_id: kitId,
            asset_id: asset.asset_id,
            quantity: asset.quantity,
            notes: asset.notes || null,
          });
      }
    }
  }

  return getKit(kitId);
}

export async function deleteKit(kitId: string) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('kits')
    .delete()
    .eq('id', kitId);

  if (error) {
    console.error('Error deleting kit:', error);
    throw error;
  }

  return { success: true };
}

export async function duplicateKit(kitId: string, newName?: string) {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');
  const user = session.user;

  // Get original kit with assets
  const originalKit = await getKit(kitId);

  // Create new kit
  const { data: newKit, error: kitError } = await supabase
    .from('kits')
    .insert({
      organization_id: originalKit.organization_id,
      name: newName || `${originalKit.name} (Copy)`,
      category: originalKit.category,
      description: originalKit.description,
      tags: originalKit.tags || [],
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single();

  if (kitError) {
    console.error('Error duplicating kit:', kitError);
    throw kitError;
  }

  // Copy assets
  if (originalKit.kit_assets && originalKit.kit_assets.length > 0) {
    const kitAssets = originalKit.kit_assets.map((ka: any) => ({
      kit_id: newKit.id,
      asset_id: ka.asset.id,
      quantity: ka.quantity,
      notes: ka.notes,
    }));

    const { error: assetsError } = await supabase
      .from('kit_assets')
      .insert(kitAssets);

    if (assetsError) {
      console.error('Error copying kit assets:', assetsError);
      await supabase.from('kits').delete().eq('id', newKit.id);
      throw assetsError;
    }
  }

  return newKit;
}

export async function duplicateGig(gigId: string, newTitle?: string) {
  const supabase = getSupabase();
  try {
    const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');
  const user = session.user;

  // Get original gig with related data
  const originalGig = await getGig(gigId);

  // Create new gig
  if (!originalGig.start || !originalGig.end) {
    console.error('Original gig missing start or end dates:', originalGig);
    throw new Error('Original gig missing start or end dates');
  }

  const { data: newGig, error: gigError } = await supabase
    .from('gigs')
    .insert({
      title: newTitle || `${originalGig.title} (Copy)`,
      start: originalGig.start,
      end: originalGig.end,
      timezone: originalGig.timezone,
      status: 'Proposed', // Reset to proposed for the copy
      tags: originalGig.tags || [],
      notes: originalGig.notes,
      amount_paid: originalGig.amount_paid,
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single();

  if (gigError) {
    console.error('Error duplicating gig:', gigError);
    throw gigError;
  }

  // Copy participants
  if (originalGig.participants && originalGig.participants.length > 0) {
    const participants = originalGig.participants.map((gp: any) => ({
      gig_id: newGig.id,
      organization_id: gp.organization_id,
      role: gp.role,
      notes: gp.notes,
    }));

    const { error: participantsError } = await supabase
      .from('gig_participants')
      .insert(participants);

    if (participantsError) {
      console.error('Error copying gig participants:', participantsError);
      await supabase.from('gigs').delete().eq('id', newGig.id);
      throw participantsError;
    }
  }

  // Copy staff slots and assignments
  if (originalGig.staff_slots && originalGig.staff_slots.length > 0) {
    for (const slot of originalGig.staff_slots) {
      const { data: newSlot, error: slotError } = await supabase
        .from('gig_staff_slots')
        .insert({
          gig_id: newGig.id,
          staff_role_id: slot.staff_role_id,
          organization_id: slot.organization_id,
          required_count: slot.required_count,
          notes: slot.notes,
        })
        .select()
        .single();

      if (slotError) {
        console.error('Error copying staff slot:', slotError);
        continue; // Try next slot even if one fails
      }

      // Copy assignments for this slot
      if (slot.staff_assignments && slot.staff_assignments.length > 0) {
        const assignments = slot.staff_assignments.map((sa: any) => ({
          slot_id: newSlot.id,
          user_id: sa.user_id,
          status: sa.status,
          rate: sa.rate,
          fee: sa.fee,
          notes: sa.notes,
        }));

        const { error: assignmentsError } = await supabase
          .from('gig_staff_assignments')
          .insert(assignments);

        if (assignmentsError) {
          console.error('Error copying staff assignments:', assignmentsError);
        }
      }
    }
  }

  // Copy bids
  if (originalGig.bids && originalGig.bids.length > 0) {
    const bids = originalGig.bids.map((bid: any) => ({
      gig_id: newGig.id,
      organization_id: bid.organization_id,
      amount: bid.amount,
      date_given: bid.date_given,
      result: bid.result,
      notes: bid.notes,
      created_by: user.id,
    }));

    const { error: bidsError } = await supabase
      .from('gig_bids')
      .insert(bids);

    if (bidsError) {
      console.error('Error copying bids:', bidsError);
    }
  }

  // Copy equipment assignments (kit assignments)
  if (originalGig.kit_assignments && originalGig.kit_assignments.length > 0) {
    const kitAssignments = originalGig.kit_assignments.map((gka: any) => ({
      gig_id: newGig.id,
      kit_id: gka.kit_id,
      organization_id: gka.organization_id,
      notes: gka.notes,
      assigned_by: user.id, // Add assigned_by which is required in schema
    }));

    const { error: assignmentsError } = await supabase
      .from('gig_kit_assignments')
      .insert(kitAssignments);

    if (assignmentsError) {
      console.error('Error copying kit assignments:', assignmentsError);
      await supabase.from('gigs').delete().eq('id', newGig.id);
      throw assignmentsError;
    }
  }

  return newGig;
  } catch (err: any) {
    if (isNetworkError(err)) {
      const networkError = new Error('Network error: Unable to connect to server to duplicate gig. Please check your internet connection.');
      networkError.name = 'NetworkError';
      throw networkError;
    }
    throw err;
  }
}

// ===== Gig Kit Assignment =====

export async function assignKitToGig(gigId: string, kitId: string, organizationId: string, notes?: string) {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');
  const user = session.user;

  const { data, error } = await supabase
    .from('gig_kit_assignments')
    .insert({
      gig_id: gigId,
      kit_id: kitId,
      organization_id: organizationId,
      notes: notes || null,
      assigned_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error assigning kit to gig:', error);
    throw error;
  }

  return data;
}

export async function removeKitFromGig(assignmentId: string) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('gig_kit_assignments')
    .delete()
    .eq('id', assignmentId);

  if (error) {
    console.error('Error removing kit from gig:', error);
    throw error;
  }

  return { success: true };
}

export async function updateGigKitAssignment(assignmentId: string, updates: { notes?: string }) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('gig_kit_assignments')
    .update(updates)
    .eq('id', assignmentId)
    .select()
    .single();

  if (error) {
    console.error('Error updating kit assignment:', error);
    throw error;
  }

  return data;
}

export async function updateGigKitAssignments(gigId: string, organizationId: string, assignments: Array<{
  id?: string;
  kit_id: string;
  notes?: string | null;
}>) {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');
  const user = session.user;

  // Get existing assignments for this gig and organization
  const { data: existingAssignments, error: fetchError } = await supabase
    .from('gig_kit_assignments')
    .select('id, kit_id')
    .eq('gig_id', gigId)
    .eq('organization_id', organizationId);

  if (fetchError) {
    console.error('Error fetching existing kit assignments:', fetchError);
    throw fetchError;
  }

  const existingAssignmentIds = existingAssignments?.map(a => a.id) || [];
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const incomingAssignmentIds = assignments
    .filter(a => a.id && uuidRegex.test(a.id))
    .map(a => a.id!);

  // Delete assignments that are no longer in the list
  const assignmentIdsToDelete = existingAssignmentIds.filter(id => !incomingAssignmentIds.includes(id));
  if (assignmentIdsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('gig_kit_assignments')
      .delete()
      .in('id', assignmentIdsToDelete);
    
    if (deleteError) {
      console.error('Error deleting kit assignments:', deleteError);
      throw deleteError;
    }
  }

  // Update or insert assignments
  for (const assignment of assignments) {
    const isDbId = assignment.id && uuidRegex.test(assignment.id);
    
    const assignmentData = {
      gig_id: gigId,
      kit_id: assignment.kit_id,
      organization_id: organizationId,
      notes: assignment.notes || null,
    };

    if (isDbId) {
      const { error: updateError } = await supabase
        .from('gig_kit_assignments')
        .update(assignmentData)
        .eq('id', assignment.id);
      
      if (updateError) {
        console.error('Error updating kit assignment:', updateError);
        throw updateError;
      }
    } else {
      const { error: insertError } = await supabase
        .from('gig_kit_assignments')
        .insert({
          ...assignmentData,
          assigned_by: user.id,
        });
      
      if (insertError) {
        console.error('Error inserting kit assignment:', insertError);
        throw insertError;
      }
    }
  }

  return { success: true };
}

export async function getGigKits(gigId: string, organizationId?: string) {
  const supabase = getSupabase();
  let query = supabase
    .from('gig_kit_assignments')
    .select(`
      *,
      kit:kits(
        id,
        name,
        category,
        tag_number,
        rental_value,
        organization_id,
        kit_assets(
          quantity,
          notes,
          asset:assets(*)
        )
      )
    `)
    .eq('gig_id', gigId);

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data, error } = await query.order('assigned_at', { ascending: false });

  if (error) {
    console.error('Error fetching gig kits:', error);
    throw error;
  }

  return data || [];
}

export async function checkKitConflicts(kitId: string, gigId: string, startTime: string, endTime: string) {
  const supabase = getSupabase();
  // Get kit assets
  const kit = await getKit(kitId);
  
  if (!kit.kit_assets || kit.kit_assets.length === 0) {
    return { conflicts: [] };
  }

  const assetIds = kit.kit_assets.map((ka: any) => ka.asset.id);

  // Find all gigs that:
  // 1. Are not the current gig
  // 2. Have overlapping time ranges
  // 3. Have kits assigned that use the same assets
  const { data: overlappingGigs, error } = await supabase
    .from('gigs')
    .select(`
      id,
      title,
      start,
      end,
      gig_kit_assignments!inner(
        kit:kits!inner(
          kit_assets!inner(
            asset_id
          )
        )
      )
    `)
    .neq('id', gigId)
    .lte('start', endTime)
    .gte('end', startTime);

  if (error) {
    console.error('Error checking kit conflicts:', error);
    return { conflicts: [] };
  }

  // Filter to only gigs that use the same assets
  const conflicts: Array<{
    gig_id: string;
    gig_title: string;
    start: string;
    end: string;
    conflicting_assets: string[];
  }> = [];

  for (const gig of overlappingGigs || []) {
    const gigAssetIds = new Set<string>();
    for (const assignment of gig.gig_kit_assignments || []) {
      for (const kitAsset of assignment.kit?.kit_assets || []) {
        gigAssetIds.add(kitAsset.asset_id);
      }
    }

    const conflictingAssetIds = assetIds.filter(id => gigAssetIds.has(id));
    if (conflictingAssetIds.length > 0) {
      conflicts.push({
        gig_id: gig.id,
        gig_title: gig.title,
        start: gig.start,
        end: gig.end,
        conflicting_assets: conflictingAssetIds,
      });
    }
  }

  return { conflicts };
}

// ===== Gig Bids Management =====

export async function getGigBids(gigId: string, organizationId?: string) {
  const supabase = getSupabase();
  let query = supabase
    .from('gig_bids')
    .select('*')
    .eq('gig_id', gigId)
    .order('date_given', { ascending: false });

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching gig bids:', error);
    throw error;
  }

  return data || [];
}

export async function createGigBid(bidData: {
  gig_id: string;
  organization_id: string;
  amount: number;
  date_given: string;
  result?: string;
  notes?: string;
}) {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');
  const user = session.user;

  const { data, error } = await supabase
    .from('gig_bids')
    .insert({
      ...bidData,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating bid:', error);
    throw error;
  }

  return data;
}

export async function updateGigBid(bidId: string, bidData: {
  amount?: number;
  date_given?: string;
  result?: string;
  notes?: string;
}) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('gig_bids')
    .update(bidData)
    .eq('id', bidId)
    .select()
    .single();

  if (error) {
    console.error('Error updating bid:', error);
    throw error;
  }

  return data;
}

export async function deleteGigBid(bidId: string) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('gig_bids')
    .delete()
    .eq('id', bidId);

  if (error) {
    console.error('Error deleting bid:', error);
    throw error;
  }

  return { success: true };
}

export async function updateGigBids(gigId: string, organizationId: string, bids: Array<{
  id?: string;
  amount: number;
  date_given: string;
  result?: string | null;
  notes?: string | null;
}>) {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');
  const user = session.user;

  // Get existing bids for this gig and organization
  const { data: existingBids, error: fetchError } = await supabase
    .from('gig_bids')
    .select('id')
    .eq('gig_id', gigId)
    .eq('organization_id', organizationId);

  if (fetchError) {
    console.error('Error fetching existing bids:', fetchError);
    throw fetchError;
  }

  const existingBidIds = existingBids?.map(b => b.id) || [];
  const incomingBidIds = bids.filter(b => b.id && b.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)).map(b => b.id!);

  // Delete bids that are no longer in the list
  const bidIdsToDelete = existingBidIds.filter(id => !incomingBidIds.includes(id));
  if (bidIdsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('gig_bids')
      .delete()
      .in('id', bidIdsToDelete);
    
    if (deleteError) {
      console.error('Error deleting bids:', deleteError);
      throw deleteError;
    }
  }

  // Update or insert bids
  for (const bid of bids) {
    const isDbId = bid.id && bid.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    
    const bidData = {
      gig_id: gigId,
      organization_id: organizationId,
      amount: bid.amount,
      date_given: bid.date_given,
      result: bid.result || null,
      notes: bid.notes || null,
    };

    if (isDbId) {
      const { error: updateError } = await supabase
        .from('gig_bids')
        .update(bidData)
        .eq('id', bid.id);
      
      if (updateError) {
        console.error('Error updating bid:', updateError);
        throw updateError;
      }
    } else {
      const { error: insertError } = await supabase
        .from('gig_bids')
        .insert({
          ...bidData,
          created_by: user.id,
        });
      
      if (insertError) {
        console.error('Error creating bid:', insertError);
        throw insertError;
      }
    }
  }

  return { success: true };
}

// ===== Gig Participant Management =====

export async function updateGigVenue(gigId: string, organizationId: string | null) {
  const supabase = getSupabase();

  if (organizationId) {
    // First check if there's already a venue participant
    const { data: existing, error: fetchError } = await supabase
      .from('gig_participants')
      .select('id')
      .eq('gig_id', gigId)
      .eq('role', 'Venue')
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    if (existing) {
      // Update existing venue participant
      const { error } = await supabase
        .from('gig_participants')
        .update({ organization_id: organizationId })
        .eq('id', existing.id);

      if (error) throw error;
    } else {
      // Create new venue participant
      const { error } = await supabase
        .from('gig_participants')
        .insert({
          gig_id: gigId,
          organization_id: organizationId,
          role: 'Venue'
        });

      if (error) throw error;
    }
  } else {
    // Remove venue participant if organizationId is null
    const { error } = await supabase
      .from('gig_participants')
      .delete()
      .eq('gig_id', gigId)
      .eq('role', 'Venue');

    if (error) throw error;
  }
}

export async function updateGigAct(gigId: string, organizationId: string | null) {
  const supabase = getSupabase();

  if (organizationId) {
    // First check if there's already an act participant
    const { data: existing, error: fetchError } = await supabase
      .from('gig_participants')
      .select('id')
      .eq('gig_id', gigId)
      .eq('role', 'Act')
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    if (existing) {
      // Update existing act participant
      const { error } = await supabase
        .from('gig_participants')
        .update({ organization_id: organizationId })
        .eq('id', existing.id);

      if (error) throw error;
    } else {
      // Create new act participant
      const { error } = await supabase
        .from('gig_participants')
        .insert({
          gig_id: gigId,
          organization_id: organizationId,
          role: 'Act'
        });

      if (error) throw error;
    }
  } else {
    // Remove act participant if organizationId is null
    const { error } = await supabase
      .from('gig_participants')
      .delete()
      .eq('gig_id', gigId)
      .eq('role', 'Act');

    if (error) throw error;
  }
}