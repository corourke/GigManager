import { createClient } from '../utils/supabase/client';
import { 
  Organization, 
  OrganizationRole, 
  UserRole
} from '../utils/supabase/types';
import { handleApiError, handleFunctionsError } from '../utils/api-error-utils';
import { sanitizeLikeInput } from '../utils/validation-utils';

const getSupabase = () => createClient();

/**
 * Search for organizations
 */
export async function searchOrganizations(filters?: { type?: OrganizationRole; search?: string }): Promise<Organization[]> {
  const supabase = getSupabase();
  try {
    let query = supabase
      .from('organizations')
      .select('*')
      .order('name');

    if (filters?.type) {
      query = query.contains('roles', [filters.type]);
    }

    if (filters?.search) {
      query = query.ilike('name', `%${sanitizeLikeInput(filters.search)}%`);
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
  return searchOrganizations(type ? { type: type as OrganizationRole } : undefined);
}

/**
 * Create a new organization and add the creator as Admin
 */
export async function createOrganization(orgData: {
  name: string;
  roles: OrganizationRole[];
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
  autoJoin?: boolean;
}): Promise<Organization> {
  try {
    const supabase = getSupabase();
    const { autoJoin, ...rest } = orgData;
    const { data, error } = await supabase.functions.invoke('server/organizations', {
      method: 'POST',
      body: {
        ...rest,
        auto_join: autoJoin ?? true,
      }
    });

    if (error) return await handleFunctionsError(error, 'create organization');
    return data;
  } catch (err) {
    return await handleFunctionsError(err, 'create organization');
  }
}

/**
 * Update organization details
 */
export async function updateOrganization(organizationId: string, orgData: {
  name?: string;
  roles?: OrganizationRole[];
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
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.functions.invoke(`server/organizations/${organizationId}`, {
      method: 'PUT',
      body: orgData
    });

    if (error) return await handleFunctionsError(error, 'update organization');
    return data;
  } catch (err) {
    return await handleFunctionsError(err, 'update organization');
  }
}

/**
 * Join an organization as a Viewer
 */
export async function joinOrganization(orgId: string): Promise<{ organization: Organization; role: UserRole }> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.functions.invoke(`server/organizations/${orgId}/members`, {
      method: 'POST',
      body: {} // No user_id or role means self-join as Viewer
    });

    if (error) return await handleFunctionsError(error, 'join organization');
    return data;
  } catch (err) {
    return await handleFunctionsError(err, 'join organization');
  }
}

/**
 * Fetch a single organization member by ID using the Edge Function
 */
export async function getOrganizationMember(organizationId: string, memberId: string) {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.functions.invoke(`server/organizations/${organizationId}/members/${memberId}`, {
      method: 'GET'
    });

    if (error) {
      await handleFunctionsError(error, 'fetch organization member');
    }
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
    const { data, error } = await supabase.functions.invoke(`server/organizations/${organizationId}/members`, {
      method: 'GET'
    });

    if (error) {
      await handleFunctionsError(error, 'fetch organization members with auth');
    }
    return data;
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
  role: 'Admin' | 'Manager' | 'Member' | 'Staff' | 'Viewer'
) {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.functions.invoke(`server/organizations/${organizationId}/members`, {
      method: 'POST',
      body: {
        user_id: userId,
        role: role === 'Member' ? 'Staff' : role
      }
    });

    if (error) return await handleFunctionsError(error, 'add user to organization');
    // Return the member data from the response
    return data.member;
  } catch (err) {
    return await handleFunctionsError(err, 'add user to organization');
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

    if (error) return await handleFunctionsError(error, 'invite user to organization');
    return data as { invitation: any; user: any; email_sent: boolean; resend?: boolean };
  } catch (err) {
    return await handleFunctionsError(err, 'invite user to organization');
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
        invited_by_user:users!invitations_invited_by_fkey(
          first_name,
          last_name,
          email
        )
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === 'PGRST205' || error.message.includes('Could not find')) return null;
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
  try {
    const supabase = getSupabase();
    const { error } = await supabase.functions.invoke(`server/invitations/${invitationId}`, {
      method: 'DELETE'
    });

    if (error) {
      await handleFunctionsError(error, 'cancel invitation');
    }
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
  organizationId: string,
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
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.functions.invoke(`server/organizations/${organizationId}/members/${memberId}`, {
      method: 'PUT',
      body: memberData
    });

    if (error) {
      await handleFunctionsError(error, 'update member details');
    }
    return data;
  } catch (err) {
    return handleApiError(err, 'update member details');
  }
}

/**
 * Update a member's role in the organization
 */
export async function updateMemberRole(organizationId: string, memberId: string, role: 'Admin' | 'Manager' | 'Member' | 'Staff' | 'Viewer') {
  return updateMemberDetails(organizationId, memberId, { role: role as any });
}

/**
 * Remove a member from an organization
 */
export async function removeMember(organizationId: string, memberId: string) {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.functions.invoke(`server/organizations/${organizationId}/members/${memberId}`, {
      method: 'DELETE'
    });

    if (error) {
      await handleFunctionsError(error, 'remove member');
    }
    return { success: true };
  } catch (err) {
    return handleApiError(err, 'remove member');
  }
}

/**
 * Fetch contacts for an organization — org members who are either a
 * login-less rolodex entry (user_status = 'contact') or the org's flagged
 * primary contact (a real team member can also be the point of contact).
 */
export async function getOrganizationContacts(organizationId: string) {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from('organization_members')
      .select(`
        id,
        organization_id,
        user_id,
        role,
        contact_title,
        is_primary_contact,
        created_at,
        user:users(
          id,
          first_name,
          last_name,
          email,
          phone,
          user_status
        )
      `)
      .eq('organization_id', organizationId)
      .order('is_primary_contact', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).filter(
      (m: any) => m.user?.user_status === 'contact' || m.is_primary_contact
    );
  } catch (err) {
    return handleApiError(err, 'fetch organization contacts');
  }
}

/**
 * Add a new contact to an organization — links an existing person by email,
 * or creates a new login-less (user_status = 'contact') person.
 */
export async function addOrganizationContact(
  organizationId: string,
  contact: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    title?: string;
    isPrimary?: boolean;
  }
) {
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase.rpc('add_organization_contact', {
      p_organization_id: organizationId,
      p_email: contact.email,
      p_first_name: contact.firstName,
      p_last_name: contact.lastName,
      p_phone: contact.phone || undefined,
      p_title: contact.title || undefined,
      p_is_primary: contact.isPrimary ?? false,
    });

    if (error) throw error;
    return data;
  } catch (err) {
    return handleApiError(err, 'add organization contact');
  }
}

/**
 * Update a contact's title/name/phone. Routed through a SECURITY DEFINER RPC
 * rather than direct table writes — the `users` table only allows a row's
 * own owner to UPDATE it, so an org Admin editing a fellow member's name or
 * phone has no RLS policy to write under otherwise. Does not touch
 * is_primary_contact — use setOrganizationPrimaryContact for that (it has to
 * clear the previous primary atomically).
 */
export async function updateOrganizationContact(
  memberId: string,
  updates: { title?: string; firstName: string; lastName: string; phone?: string }
) {
  const supabase = getSupabase();
  try {
    const { error } = await supabase.rpc('update_organization_contact', {
      p_member_id: memberId,
      p_first_name: updates.firstName,
      p_last_name: updates.lastName,
      p_phone: updates.phone || null,
      p_title: updates.title || null,
    } as any);
    if (error) throw error;
    return { success: true };
  } catch (err) {
    return handleApiError(err, 'update organization contact');
  }
}

/**
 * Flag a member as the organization's primary contact, atomically clearing
 * any previous primary contact for that org.
 */
export async function setOrganizationPrimaryContact(memberId: string) {
  const supabase = getSupabase();
  try {
    const { error } = await supabase.rpc('set_organization_primary_contact', {
      p_member_id: memberId,
    });
    if (error) throw error;
    return { success: true };
  } catch (err) {
    return handleApiError(err, 'set organization primary contact');
  }
}

/**
 * Clear a member's primary-contact flag, leaving the org with no primary
 * contact (as opposed to setOrganizationPrimaryContact, which always
 * promotes a replacement).
 */
export async function unsetOrganizationPrimaryContact(memberId: string) {
  const supabase = getSupabase();
  try {
    const { error } = await supabase.rpc('unset_organization_primary_contact', {
      p_member_id: memberId,
    });
    if (error) throw error;
    return { success: true };
  } catch (err) {
    return handleApiError(err, 'unset organization primary contact');
  }
}

/**
 * Remove a contact from an organization. Uses its own RPC rather than
 * removeMember/the Edge Function — that path is guarded against being an
 * Admin/Manager of the target org specifically, which would block removing
 * a contact from e.g. a venue you don't belong to but share a gig with.
 */
export async function removeOrganizationContact(memberId: string) {
  const supabase = getSupabase();
  try {
    const { error } = await supabase.rpc('remove_organization_contact', {
      p_member_id: memberId,
    });
    if (error) throw error;
    return { success: true };
  } catch (err) {
    return handleApiError(err, 'remove organization contact');
  }
}

