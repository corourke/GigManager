import { createClient } from '../utils/supabase/client';
import { projectId } from '../utils/supabase/info';
import { 
  Organization, 
  OrganizationType, 
  UserRole,
  OrganizationMembershipWithOrg,
  User
} from '../utils/supabase/types';
import { handleApiError } from '../utils/api-error-utils';

const getSupabase = () => createClient();
const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/server`;

/**
 * Search for organizations
 */
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
    if (error) throw error;
    return data || [];
  } catch (err) {
    return handleApiError(err, 'search organizations');
  }
}

/**
 * Fetch all organizations, optionally filtered by type
 */
export async function getOrganizations(type?: string): Promise<Organization[]> {
  return searchOrganizations(type ? { type: type as OrganizationType } : undefined);
}

/**
 * Create a new organization and add the creator as Admin
 */
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
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Not authenticated');
    const user = session.user;

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert(orgData)
      .select()
      .single();

    if (orgError) throw orgError;

    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: org.id,
        user_id: user.id,
        role: 'Admin',
      });

    if (memberError) {
      await supabase.from('organizations').delete().eq('id', org.id);
      throw memberError;
    }

    return org;
  } catch (err) {
    return handleApiError(err, 'create organization');
  }
}

/**
 * Update organization details
 */
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
    const { data, error } = await supabase
      .from('organizations')
      .update({
        ...orgData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', organizationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    return handleApiError(err, 'update organization');
  }
}

/**
 * Join an organization as a Viewer
 */
export async function joinOrganization(orgId: string): Promise<{ organization: Organization; role: UserRole }> {
  const supabase = getSupabase();
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Not authenticated');
    const user = session.user;

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single();

    if (orgError || !org) throw new Error('Organization not found');

    const { data: existingMember } = await supabase
      .from('organization_members')
      .select('*')
      .eq('organization_id', orgId)
      .eq('user_id', user.id)
      .single();

    if (existingMember) throw new Error('Already a member of this organization');

    const { data: membership, error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: orgId,
        user_id: user.id,
        role: 'Viewer',
      })
      .select()
      .single();

    if (memberError) throw memberError;

    return { organization: org, role: membership.role };
  } catch (err) {
    return handleApiError(err, 'join organization');
  }
}

/**
 * Fetch a single organization member by ID
 */
export async function getOrganizationMember(memberId: string) {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from('organization_members')
      .select(`
        *,
        user:users(*)
      `)
      .eq('id', memberId)
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    return handleApiError(err, 'fetch organization member');
  }
}

/**
 * Fetch organization members using the Edge Function for elevated privileges
 */
export async function getOrganizationMembersWithAuth(organizationId: string) {
  try {
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
  } catch (err) {
    return handleApiError(err, 'fetch organization members with auth');
  }
}

/**
 * Fetch organization members directly from Supabase
 */
export async function getOrganizationMembers(organizationId: string) {
  const supabase = getSupabase();
  try {
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

    if (error) throw error;
    return data || [];
  } catch (err) {
    return handleApiError(err, 'fetch organization members');
  }
}

/**
 * Add an existing user to an organization
 */
export async function addExistingUserToOrganization(
  organizationId: string,
  userId: string,
  role: 'Admin' | 'Manager' | 'Member'
) {
  const supabase = getSupabase();
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Not authenticated');

    const { data: existingMember } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingMember) throw new Error('User is already a member of this organization');

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

    if (error) throw error;
    return data;
  } catch (err) {
    return handleApiError(err, 'add user to organization');
  }
}

/**
 * Invite a new user to an organization (creates pending user and invitation)
 */
export async function inviteUserToOrganization(
  organizationId: string,
  email: string,
  role: UserRole | 'Member',
  firstName?: string,
  lastName?: string
) {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase.functions.invoke(`server/organizations/${organizationId}/invitations`, {
      method: 'POST',
      body: {
        email,
        role: role === 'Member' ? 'Staff' : role,
        first_name: firstName || null,
        last_name: lastName || null,
      }
    });

    if (error) throw error;
    return data as { invitation: any; user: any; email_sent: boolean };
  } catch (err) {
    return handleApiError(err, 'invite user to organization');
  }
}

/**
 * Fetch pending invitations for an organization
 */
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
      if (error.code === 'PGRST205' || error.message.includes('Could not find')) return [];
      throw error;
    }
    return data || [];
  } catch (err) {
    return handleApiError(err, 'fetch invitations');
  }
}

/**
 * Cancel a pending invitation
 */
export async function cancelInvitation(invitationId: string) {
  const supabase = getSupabase();
  try {
    const { error } = await supabase
      .from('invitations')
      .delete()
      .eq('id', invitationId);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    return handleApiError(err, 'cancel invitation');
  }
}

/**
 * Convert a pending user to active when they sign up
 */
export async function convertPendingToActive(email: string, authUserId: string) {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase.rpc('convert_pending_user_to_active', {
      p_email: email,
      p_auth_user_id: authUserId,
    });

    if (error) throw error;
    return data;
  } catch (err) {
    return handleApiError(err, 'convert pending user to active');
  }
}

/**
 * Get available staff roles
 */
export async function getStaffRoles() {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from('staff_roles')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (err) {
    return handleApiError(err, 'fetch staff roles');
  }
}

/**
 * Update member details including user profile info and organization role
 */
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
  try {
    const { data: member } = await supabase
      .from('organization_members')
      .select('user_id, role, default_staff_role_id')
      .eq('id', memberId)
      .single();

    if (!member) throw new Error('Member not found');

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

      if (userError) throw userError;
    }

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

      if (memberError) throw memberError;
    }

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

    if (error) throw error;
    return updatedMember;
  } catch (err) {
    return handleApiError(err, 'update member details');
  }
}

/**
 * Update a member's role in the organization
 */
export async function updateMemberRole(memberId: string, role: 'Admin' | 'Manager' | 'Member') {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from('organization_members')
      .update({ role })
      .eq('id', memberId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    return handleApiError(err, 'update member role');
  }
}

/**
 * Remove a member from an organization
 */
export async function removeMember(memberId: string) {
  const supabase = getSupabase();
  try {
    const { error } = await supabase
      .from('organization_members')
      .delete()
      .eq('id', memberId);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    return handleApiError(err, 'remove member');
  }
}

/**
 * Invite an existing user to an organization
 */
export async function inviteMember(organizationId: string, email: string, role: 'Admin' | 'Manager' | 'Member') {
  const supabase = getSupabase();
  try {
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (!existingUser) throw new Error('User with this email does not exist. They must sign up first.');

    const { data: existingMember } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('user_id', existingUser.id)
      .single();

    if (existingMember) throw new Error('User is already a member of this organization');

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

    if (error) throw error;
    return data;
  } catch (err) {
    return handleApiError(err, 'invite member');
  }
}
