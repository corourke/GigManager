import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

// Create Supabase client with service role key
let supabaseAdmin: any;
try {
  supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
} catch (e) {
  console.error('Failed to initialize Supabase Admin client:', e);
}

// ===== Helper Functions =====

/**
 * Extract and verify user from auth header
 */
async function getAuthenticatedUser(authHeader: string | null) {
  if (!authHeader) {
    return { user: null, error: 'No authorization header' };
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return { user: null, error: 'No token provided' };
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    return { user: null, error: error?.message ?? 'Unauthorized' };
  }

  return { user, error: null };
}

/**
 * Verify user is a member of an organization with specified role(s)
 */
async function verifyOrgMembership(
  userId: string,
  orgId: string,
  allowedRoles?: string[]
) {
  console.log(`Verifying membership: user=${userId}, org=${orgId}, allowedRoles=${allowedRoles?.join(',') || 'any'}`);
  
  const { data: membership, error: dbError } = await supabaseAdmin
    .from('organization_members')
    .select('*, organization:organizations(*)')
    .eq('organization_id', orgId)
    .eq('user_id', userId)
    .maybeSingle();

  if (dbError) {
    console.error('Database error in verifyOrgMembership:', dbError);
    return { membership: null, error: `Database error: ${dbError.message}` };
  }

  if (!membership) {
    console.warn(`Membership not found: user=${userId}, org=${orgId}`);
    return { membership: null, error: 'Not a member of this organization' };
  }

  console.log(`Membership found: role=${membership.role}`);

  if (allowedRoles && !allowedRoles.includes(membership.role)) {
    console.warn(`Insufficient permissions: user=${userId}, role=${membership.role}, allowedRoles=${allowedRoles.join(',')}`);
    return { membership: null, error: 'Insufficient permissions' };
  }

  return { membership, error: null };
}

/**
 * Verify user is a member of any of the specified organizations
 */
async function verifyAnyOrgMembership(userId: string, orgIds: string[]) {
  const { data: membership } = await supabaseAdmin
    .from('organization_members')
    .select('*')
    .in('organization_id', orgIds)
    .eq('user_id', userId)
    .limit(1)
    .single();

  return { membership, error: membership ? null : 'Not a member of any participating organization' };
}

/**
 * Get or create staff role by name
 */
async function getOrCreateStaffRole(roleName: string) {
  const { data: existingRole } = await supabaseAdmin
    .from('staff_roles')
    .select('id')
    .eq('name', roleName)
    .maybeSingle();

  if (existingRole?.id) {
    return existingRole.id;
  }

  const { data: newRole, error } = await supabaseAdmin
    .from('staff_roles')
    .insert({ name: roleName })
    .select('id')
    .single();

  if (error || !newRole) {
    console.error('Failed to create staff role:', roleName, error);
    return null;
  }

  return newRole.id;
}

// ===== Main Handler =====
Deno.serve(async (req) => {
  const origin = req.headers.get('Origin') || '*';
  const method = req.method;
  
  // Dynamic CORS headers
  const responseHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-auth, x-supabase-client-version, x-requested-with',
    'Access-Control-Allow-Methods': 'POST, GET, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true',
  };

  console.log(`${method} request received from origin: ${origin}`);

  // Handle CORS preflight as early as possible
  if (method === 'OPTIONS') {
    return new Response('ok', { 
      status: 200, 
      headers: { ...responseHeaders, 'Content-Type': 'text/plain' }
    });
  }

  const url = new URL(req.url);
  let path = url.pathname;

  console.log(`${method} ${path}`);

  // Strip Supabase prefix if present
  if (path.startsWith('/functions/v1')) {
    path = path.substring('/functions/v1'.length);
  }

  // Support both 'server' and 'make-server-de012ad4' prefixes
  if (path.startsWith('/server')) {
    path = path.substring('/server'.length);
  } else if (path.startsWith('/make-server-de012ad4')) {
    path = path.substring('/make-server-de012ad4'.length);
  }

  // Ensure path starts with /
  if (!path.startsWith('/')) {
    path = '/' + path;
  }

  console.log(`Routed path: ${path}`);

  try {
    // Health check
    if (path === '/health' && method === 'GET') {
      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== User Management =====
    
    // Create user profile
    if (path === '/users' && method === 'POST') {
      const authHeader = req.headers.get('Authorization');
      const { user, error: authError } = await getAuthenticatedUser(authHeader);
      
      if (authError || !user) {
        return new Response(JSON.stringify({ error: authError ?? 'Unauthorized' }), {
          status: 401,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      let body;
      try {
        body = await req.json();
      } catch (e) {
        return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
          status: 400,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { first_name, last_name, avatar_url } = body;

      // Check if user profile already exists
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (existingUser) {
        return new Response(JSON.stringify(existingUser), {
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create user profile
      const { data, error } = await supabaseAdmin
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          first_name: first_name ?? user.user_metadata?.first_name ?? '',
          last_name: last_name ?? user.user_metadata?.last_name ?? '',
          avatar_url: avatar_url ?? user.user_metadata?.avatar_url ?? user.user_metadata?.picture,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating user profile:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(data), {
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user profile
    const userMatch = path.match(/^\/users\/([^\/]+)$/);
    if (userMatch && method === 'GET') {
      const userId = userMatch[1];
      const authHeader = req.headers.get('Authorization');
      const { user, error: authError } = await getAuthenticatedUser(authHeader);
      
      if (authError || !user) {
        return new Response(JSON.stringify({ error: authError ?? 'Unauthorized' }), {
          status: 401,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!data) {
        return new Response(JSON.stringify({ error: 'User profile not found' }), {
          status: 404,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(data), {
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update user profile
    if (userMatch && method === 'PUT') {
      const userId = userMatch[1];
      const authHeader = req.headers.get('Authorization');
      const { user, error: authError } = await getAuthenticatedUser(authHeader);
      
      if (authError || !user) {
        return new Response(JSON.stringify({ error: authError ?? 'Unauthorized' }), {
          status: 401,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (user.id !== userId) {
        return new Response(JSON.stringify({ error: 'Cannot update another user\'s profile' }), {
          status: 403,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      const body = await req.json();
      
      // Only include fields that are present in the request body (partial updates)
      const updateData: Record<string, any> = {};
      const allowedFields = [
        'first_name', 'last_name', 'phone', 'address_line1', 'address_line2',
        'city', 'state', 'postal_code', 'country'
      ];

      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          updateData[field] = body[field];
        }
      }

      // Only update if there are fields to update
      if (Object.keys(updateData).length === 0) {
        return new Response(JSON.stringify({ error: 'No fields provided for update' }), {
          status: 400,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Always set updated_at when any field is updated
      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabaseAdmin
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating user profile:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(data), {
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Search users
    if (path === '/users' && method === 'GET') {
      const authHeader = req.headers.get('Authorization');
      const { user, error: authError } = await getAuthenticatedUser(authHeader);
      
      if (authError || !user) {
        return new Response(JSON.stringify({ error: authError ?? 'Unauthorized' }), {
          status: 401,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      const search = url.searchParams.get('search');

      let query = supabaseAdmin
        .from('users')
        .select('*')
        .order('first_name');

      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      const { data, error } = await query.limit(20);

      if (error) {
        console.error('Error searching users:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(data), {
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user's organizations
    const userOrgsMatch = path.match(/^\/users\/([^\/]+)\/organizations$/);
    if (userOrgsMatch && method === 'GET') {
      const userId = userOrgsMatch[1];
      const authHeader = req.headers.get('Authorization');
      const { user, error: authError } = await getAuthenticatedUser(authHeader);
      
      if (authError || !user) {
        return new Response(JSON.stringify({ error: authError ?? 'Unauthorized' }), {
          status: 401,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data, error } = await supabaseAdmin
        .from('organization_members')
        .select('*, organization:organizations(*)')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching user organizations:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(data), {
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== Organization Management =====
    
    // Get all organizations (admin endpoint)
    if (path === '/organizations' && method === 'GET') {
      const authHeader = req.headers.get('Authorization');
      const { user, error: authError } = await getAuthenticatedUser(authHeader);
      
      if (authError || !user) {
        return new Response(JSON.stringify({ error: authError ?? 'Unauthorized' }), {
          status: 401,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Fetch all organizations
      const { data: organizations, error: orgError } = await supabaseAdmin
        .from('organizations')
        .select('*')
        .order('name');

      if (orgError) {
        console.error('Error fetching organizations:', orgError);
        return new Response(JSON.stringify({ error: orgError.message }), {
          status: 400,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(organizations || []), {
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create organization
    if (path === '/organizations' && method === 'POST') {
      const authHeader = req.headers.get('Authorization');
      const { user, error: authError } = await getAuthenticatedUser(authHeader);
      
      if (authError || !user) {
        return new Response(JSON.stringify({ error: authError ?? 'Unauthorized' }), {
          status: 401,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      const body = await req.json();
      const { auto_join = true, ...orgData } = body;

      // Create organization
      const { data: org, error: orgError } = await supabaseAdmin
        .from('organizations')
        .insert(orgData)
        .select()
        .single();

      if (orgError) {
        console.error('Error creating organization:', orgError);
        return new Response(JSON.stringify({ error: orgError.message }), {
          status: 400,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Add creator as Admin member (unless auto_join is false)
      if (auto_join) {
        const { error: memberError } = await supabaseAdmin
          .from('organization_members')
          .insert({
            organization_id: org.id,
            user_id: user.id,
            role: 'Admin',
          });

        if (memberError) {
          console.error('Error adding organization member:', memberError);
          // Try to clean up the created org
          await supabaseAdmin.from('organizations').delete().eq('id', org.id);
          return new Response(JSON.stringify({ error: memberError.message }), {
            status: 400,
            headers: { ...responseHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      return new Response(JSON.stringify(org), {
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update organization
    const orgMatch = path.match(/^\/organizations\/([^\/]+)$/);
    if (orgMatch && method === 'PUT') {
      const orgId = orgMatch[1];
      const authHeader = req.headers.get('Authorization');
      const { user, error: authError } = await getAuthenticatedUser(authHeader);
      
      if (authError || !user) {
        return new Response(JSON.stringify({ error: authError ?? 'Unauthorized' }), {
          status: 401,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check if organization exists
      const { data: org, error: orgError } = await supabaseAdmin
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single();

      if (orgError || !org) {
        return new Response(JSON.stringify({ error: 'Organization not found' }), {
          status: 404,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify user is an Admin of the organization
      const { error: memberError } = await verifyOrgMembership(user.id, orgId, ['Admin']);
      if (memberError) {
        return new Response(JSON.stringify({ error: memberError }), {
          status: 403,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Parse request body
      const body = await req.json();
      
      // Only include fields that are present in the request body (partial updates)
      const updateData: Record<string, any> = {};
      const allowedFields = [
        'name', 'type', 'url', 'phone_number', 'description',
        'address_line1', 'address_line2', 'city', 'state',
        'postal_code', 'country', 'allowed_domains'
      ];

      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          updateData[field] = body[field];
        }
      }

      // Validate required fields if they're being updated
      if (updateData.name !== undefined && !updateData.name) {
        return new Response(JSON.stringify({ error: 'Name is required' }), {
          status: 400,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (updateData.type !== undefined && !updateData.type) {
        return new Response(JSON.stringify({ error: 'Type is required' }), {
          status: 400,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Only update if there are fields to update
      if (Object.keys(updateData).length === 0) {
        return new Response(JSON.stringify({ error: 'No fields provided for update' }), {
          status: 400,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Always set updated_at when any field is updated
      updateData.updated_at = new Date().toISOString();

      // Update organization
      const { data: updatedOrg, error: updateError } = await supabaseAdmin
        .from('organizations')
        .update(updateData)
        .eq('id', orgId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating organization:', updateError);
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 400,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(updatedOrg), {
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Delete organization
    if (orgMatch && method === 'DELETE') {
      const orgId = orgMatch[1];
      const authHeader = req.headers.get('Authorization');
      const { user, error: authError } = await getAuthenticatedUser(authHeader);
      
      if (authError || !user) {
        return new Response(JSON.stringify({ error: authError ?? 'Unauthorized' }), {
          status: 401,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check if organization exists
      const { data: org, error: orgError } = await supabaseAdmin
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single();

      if (orgError || !org) {
        return new Response(JSON.stringify({ error: 'Organization not found' }), {
          status: 404,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify user is an Admin of the organization
      const { error: memberError } = await verifyOrgMembership(user.id, orgId, ['Admin']);
      if (memberError) {
        return new Response(JSON.stringify({ error: memberError }), {
          status: 403,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Delete the organization (cascade will handle members, gigs, etc.)
      const { error: deleteError } = await supabaseAdmin
        .from('organizations')
        .delete()
        .eq('id', orgId);

      if (deleteError) {
        console.error('Error deleting organization:', deleteError);
        return new Response(JSON.stringify({ error: deleteError.message }), {
          status: 400,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Join or add member to organization
    const orgMembersMatch = path.match(/^\/organizations\/([^\/]+)\/members$/);
    if (orgMembersMatch && method === 'POST') {
      const orgId = orgMembersMatch[1];
      const authHeader = req.headers.get('Authorization');
      const { user, error: authError } = await getAuthenticatedUser(authHeader);
      
      if (authError || !user) {
        return new Response(JSON.stringify({ error: authError ?? 'Unauthorized' }), {
          status: 401,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check if organization exists
      const { data: org, error: orgError } = await supabaseAdmin
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single();

      if (orgError || !org) {
        return new Response(JSON.stringify({ error: 'Organization not found' }), {
          status: 404,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      let body;
      try {
        body = await req.json();
      } catch (e) {
        body = {};
      }

      const targetUserId = body.user_id || user.id;
      const targetRole = body.role || 'Viewer';

      // If adding someone else, must be Admin or Manager
      if (targetUserId !== user.id) {
        const { membership: currentUserMembership, error: permError } = await verifyOrgMembership(user.id, orgId, ['Admin', 'Manager']);
        if (permError) {
          return new Response(JSON.stringify({ error: permError }), {
            status: 403,
            headers: { ...responseHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Only Admins can add other Admins
        if (targetRole === 'Admin' && currentUserMembership.role !== 'Admin') {
          return new Response(JSON.stringify({ error: 'Only Admins can add other Admins' }), {
            status: 403,
            headers: { ...responseHeaders, 'Content-Type': 'application/json' },
          });
        }
      } else {
        // Self-joining is always Viewer for now
        if (targetRole !== 'Viewer') {
          return new Response(JSON.stringify({ error: 'Self-joining can only be as Viewer' }), {
            status: 400,
            headers: { ...responseHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // Check if target user is already a member
      const { data: existingMember } = await supabaseAdmin
        .from('organization_members')
        .select('*')
        .eq('organization_id', orgId)
        .eq('user_id', targetUserId)
        .maybeSingle();

      if (existingMember) {
        return new Response(JSON.stringify({ error: 'User is already a member of this organization' }), {
          status: 400,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Add user to organization
      const { data: membership, error: memberError } = await supabaseAdmin
        .from('organization_members')
        .insert({
          organization_id: orgId,
          user_id: targetUserId,
          role: targetRole,
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

      if (memberError) {
        console.error('Error joining organization:', memberError);
        return new Response(JSON.stringify({ error: memberError.message }), {
          status: 400,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ organization: org, role: membership.role, member: membership }), {
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== Team Management =====
    
    // Get organization members with auth data
    if (orgMembersMatch && method === 'GET') {
      const orgId = orgMembersMatch[1];
      
      const authHeader = req.headers.get('Authorization');
      const { user, error: authError } = await getAuthenticatedUser(authHeader);
      
      if (authError || !user) {
        return new Response(JSON.stringify({ error: authError ?? 'Unauthorized' }), {
          status: 401,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify user is a member of the organization
      const { error: memberError } = await verifyOrgMembership(user.id, orgId);
      if (memberError) {
        return new Response(JSON.stringify({ error: memberError }), {
          status: 403,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get organization members with public user data
      const { data: members, error } = await supabaseAdmin
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
        .eq('organization_id', orgId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching organization members:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Enrich with auth.users data (last_sign_in_at)
      const enrichedMembers = await Promise.all(
        (members || []).map(async (member) => {
          // Get auth.users data using service role
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(member.user_id);
          
          return {
            ...member,
            user: {
              ...member.user,
              last_sign_in_at: authUser?.user?.last_sign_in_at || null,
            }
          };
        })
      );

      return new Response(JSON.stringify(enrichedMembers), {
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update organization member
    const orgMemberMatch = path.match(/^\/organizations\/([^\/]+)\/members\/([^\/]+)$/);
    if (orgMemberMatch && method === 'GET') {
      const orgId = orgMemberMatch[1];
      const memberId = orgMemberMatch[2];
      
      const authHeader = req.headers.get('Authorization');
      const { user, error: authError } = await getAuthenticatedUser(authHeader);
      
      if (authError || !user) {
        return new Response(JSON.stringify({ error: authError ?? 'Unauthorized' }), {
          status: 401,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify user is a member of the organization
      const { error: memberError } = await verifyOrgMembership(user.id, orgId);
      if (memberError) {
        return new Response(JSON.stringify({ error: memberError }), {
          status: 403,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get organization member with public user data
      const { data: member, error } = await supabaseAdmin
        .from('organization_members')
        .select(`
          *,
          user:users(*)
        `)
        .eq('id', memberId)
        .eq('organization_id', orgId)
        .single();

      if (error || !member) {
        return new Response(JSON.stringify({ error: 'Member not found' }), {
          status: 404,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Enrich with auth.users data (last_sign_in_at)
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(member.user_id);
      
      const enrichedMember = {
        ...member,
        user: {
          ...member.user,
          last_sign_in_at: authUser?.user?.last_sign_in_at || null,
        }
      };

      return new Response(JSON.stringify(enrichedMember), {
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (orgMemberMatch && method === 'PUT') {
      const orgId = orgMemberMatch[1];
      const memberId = orgMemberMatch[2];
      
      const authHeader = req.headers.get('Authorization');
      const { user, error: authError } = await getAuthenticatedUser(authHeader);
      
      if (authError || !user) {
        return new Response(JSON.stringify({ error: authError ?? 'Unauthorized' }), {
          status: 401,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify user is Admin or Manager of the organization
      const { membership: currentUserMembership, error: memberError } = await verifyOrgMembership(user.id, orgId, ['Admin', 'Manager']);
      if (memberError) {
        return new Response(JSON.stringify({ error: memberError }), {
          status: 403,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      const body = await req.json();
      
      // Get target member to check if they exist and what their user_id is
      const { data: targetMember, error: targetError } = await supabaseAdmin
        .from('organization_members')
        .select('*')
        .eq('id', memberId)
        .eq('organization_id', orgId)
        .single();

      if (targetError || !targetMember) {
        return new Response(JSON.stringify({ error: 'Member not found in this organization' }), {
          status: 404,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 1. Update user profile data if provided
      const userFields = ['first_name', 'last_name', 'phone', 'avatar_url', 'address_line1', 'address_line2', 'city', 'state', 'postal_code', 'country'];
      const userUpdates: any = {};
      let hasUserUpdates = false;

      for (const field of userFields) {
        if (body[field] !== undefined) {
          userUpdates[field] = body[field];
          hasUserUpdates = true;
        }
      }

      if (hasUserUpdates) {
        const { error: userUpdateError } = await supabaseAdmin
          .from('users')
          .update(userUpdates)
          .eq('id', targetMember.user_id);

        if (userUpdateError) {
          console.error('Error updating user profile:', userUpdateError);
          return new Response(JSON.stringify({ error: userUpdateError.message }), {
            status: 400,
            headers: { ...responseHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // 2. Update member organization-specific data (role, default_staff_role_id)
      const memberUpdates: any = {};
      let hasMemberUpdates = false;

      if (body.role !== undefined) {
        // Only Admins can change roles to/from Admin
        if ((body.role === 'Admin' || targetMember.role === 'Admin') && currentUserMembership.role !== 'Admin') {
          return new Response(JSON.stringify({ error: 'Only Admins can change Admin roles' }), {
            status: 403,
            headers: { ...responseHeaders, 'Content-Type': 'application/json' },
          });
        }
        memberUpdates.role = body.role;
        hasMemberUpdates = true;
      }

      if (body.default_staff_role_id !== undefined) {
        memberUpdates.default_staff_role_id = body.default_staff_role_id || null;
        hasMemberUpdates = true;
      }

      if (hasMemberUpdates) {
        const { error: memberUpdateError } = await supabaseAdmin
          .from('organization_members')
          .update(memberUpdates)
          .eq('id', memberId);

        if (memberUpdateError) {
          console.error('Error updating organization member:', memberUpdateError);
          return new Response(JSON.stringify({ error: memberUpdateError.message }), {
            status: 400,
            headers: { ...responseHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // Return the updated member with user data
      const { data: updatedMember, error: fetchError } = await supabaseAdmin
        .from('organization_members')
        .select(`
          *,
          user:users(*)
        `)
        .eq('id', memberId)
        .single();

      if (fetchError) {
        console.error('Error fetching updated member:', fetchError);
      }

      return new Response(JSON.stringify(updatedMember || { success: true }), {
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Remove organization member
    if (orgMemberMatch && method === 'DELETE') {
      const orgId = orgMemberMatch[1];
      const memberId = orgMemberMatch[2];
      
      const authHeader = req.headers.get('Authorization');
      const { user, error: authError } = await getAuthenticatedUser(authHeader);
      
      if (authError || !user) {
        return new Response(JSON.stringify({ error: authError ?? 'Unauthorized' }), {
          status: 401,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify user is Admin or Manager of the organization
      const { membership: currentUserMembership, error: memberError } = await verifyOrgMembership(user.id, orgId, ['Admin', 'Manager']);
      if (memberError) {
        return new Response(JSON.stringify({ error: memberError }), {
          status: 403,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get target member to check if they exist and what their role is
      const { data: targetMember, error: targetError } = await supabaseAdmin
        .from('organization_members')
        .select('*')
        .eq('id', memberId)
        .eq('organization_id', orgId)
        .single();

      if (targetError || !targetMember) {
        return new Response(JSON.stringify({ error: 'Member not found in this organization' }), {
          status: 404,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Prevention: cannot remove yourself (use leave organization instead, if we implement it)
      if (targetMember.user_id === user.id) {
        return new Response(JSON.stringify({ error: 'Cannot remove yourself from the organization' }), {
          status: 400,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Prevention: only Admins can remove other Admins
      if (targetMember.role === 'Admin' && currentUserMembership.role !== 'Admin') {
        return new Response(JSON.stringify({ error: 'Only Admins can remove other Admins' }), {
          status: 403,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error: deleteError } = await supabaseAdmin
        .from('organization_members')
        .delete()
        .eq('id', memberId);

      if (deleteError) {
        console.error('Error removing organization member:', deleteError);
        return new Response(JSON.stringify({ error: deleteError.message }), {
          status: 400,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Cancel invitation
    const invitationMatch = path.match(/^\/invitations\/([^\/]+)$/);
    if (invitationMatch && method === 'DELETE') {
      const invitationId = invitationMatch[1];
      
      const authHeader = req.headers.get('Authorization');
      const { user, error: authError } = await getAuthenticatedUser(authHeader);
      
      if (authError || !user) {
        return new Response(JSON.stringify({ error: authError ?? 'Unauthorized' }), {
          status: 401,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get invitation to find organization_id
      const { data: invitation, error: inviteError } = await supabaseAdmin
        .from('invitations')
        .select('*')
        .eq('id', invitationId)
        .single();

      if (inviteError || !invitation) {
        return new Response(JSON.stringify({ error: 'Invitation not found' }), {
          status: 404,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify user is Admin or Manager of the organization
      const { error: memberError } = await verifyOrgMembership(user.id, invitation.organization_id, ['Admin', 'Manager']);
      if (memberError) {
        return new Response(JSON.stringify({ error: memberError }), {
          status: 403,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error: deleteError } = await supabaseAdmin
        .from('invitations')
        .delete()
        .eq('id', invitationId);

      if (deleteError) {
        console.error('Error cancelling invitation:', deleteError);
        return new Response(JSON.stringify({ error: deleteError.message }), {
          status: 400,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Invite user to organization
    const invitationsMatch = path.match(/^\/organizations\/([^\/]+)\/invitations$/);
    if (invitationsMatch && method === 'POST') {
      const orgId = invitationsMatch[1];
      
      const authHeader = req.headers.get('Authorization');
      const { user, error: authError } = await getAuthenticatedUser(authHeader);
      
      if (authError || !user) {
        return new Response(JSON.stringify({ error: authError ?? 'Unauthorized' }), {
          status: 401,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify user is Admin or Manager of the organization
      const { error: memberError } = await verifyOrgMembership(user.id, orgId, ['Admin', 'Manager']);
      if (memberError) {
        return new Response(JSON.stringify({ error: memberError }), {
          status: 403,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      let body;
      try {
        body = await req.json();
      } catch (e) {
        return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
          status: 400,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { email, role, first_name, last_name } = body;

      if (!email || !role) {
        return new Response(JSON.stringify({ error: 'Email and role are required' }), {
          status: 400,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 1. Call the RPC to handle DB records
      const { data, error: rpcError } = await supabaseAdmin.rpc('invite_user_to_organization', {
        p_organization_id: orgId,
        p_email: email,
        p_role: role,
        p_first_name: first_name || null,
        p_last_name: last_name || null,
        p_inviter_id: user.id,
      });

      if (rpcError) {
        console.error('Error calling invite_user_to_organization RPC:', rpcError);
        return new Response(JSON.stringify({ 
          error: rpcError.message || 'Failed to process invitation in database',
          details: rpcError.details,
          hint: rpcError.hint,
          code: rpcError.code
        }), {
          status: 400,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 2. Trigger Supabase Auth invitation email
      // This will create a user in auth.users if they don't exist
      // and send them an email with a link to join.
      const origin = req.headers.get('origin') || 'http://localhost:3000';
      const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${origin}/accept-invitation`,
        data: {
          organization_id: orgId,
          invited_by: user.id,
          first_name: first_name || '',
          last_name: last_name || '',
        }
      });

      if (inviteError) {
        console.warn('Error sending invitation email:', inviteError);
        // We don't fail the whole request if email fails, but we should return the DB result
        return new Response(JSON.stringify({ 
          ...data, 
          email_sent: false, 
          email_error: inviteError.message 
        }), {
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ ...data, email_sent: true }), {
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create user and add to organization
    const membersCreateMatch = path.match(/^\/organizations\/([^\/]+)\/members\/create$/);
    if (membersCreateMatch && method === 'POST') {
      const orgId = membersCreateMatch[1];
      
      const authHeader = req.headers.get('Authorization');
      const { user, error: authError } = await getAuthenticatedUser(authHeader);
      
      if (authError || !user) {
        return new Response(JSON.stringify({ error: authError ?? 'Unauthorized' }), {
          status: 401,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify user is Admin or Manager of the organization
      const { error: memberError } = await verifyOrgMembership(user.id, orgId, ['Admin', 'Manager']);
      if (memberError) {
        return new Response(JSON.stringify({ error: memberError }), {
          status: 403,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      const body = await req.json();
      const { email, first_name, last_name, password, role } = body;

      if (!email || !first_name || !last_name || !password || !role) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create auth user
      const { data: authData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm since email server not configured
        user_metadata: {
          first_name,
          last_name,
        },
      });

      if (createAuthError || !authData.user) {
        console.error('Error creating auth user:', createAuthError);
        return new Response(JSON.stringify({ error: createAuthError?.message || 'Failed to create user' }), {
          status: 400,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create user profile
      const { data: userProfile, error: profileError } = await supabaseAdmin
        .from('users')
        .insert({
          id: authData.user.id,
          email,
          first_name,
          last_name,
        })
        .select()
        .single();

      if (profileError) {
        console.error('Error creating user profile:', profileError);
        // Clean up auth user
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return new Response(JSON.stringify({ error: profileError.message }), {
          status: 400,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Add user to organization
      const { data: memberData, error: memberInsertError } = await supabaseAdmin
        .from('organization_members')
        .insert({
          organization_id: orgId,
          user_id: authData.user.id,
          role,
        })
        .select(`
          *,
          user:users(
            id,
            first_name,
            last_name,
            email
          )
        `)
        .single();

      if (memberInsertError) {
        console.error('Error adding member to organization:', memberInsertError);
        // Clean up user profile and auth user
        await supabaseAdmin.from('users').delete().eq('id', authData.user.id);
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return new Response(JSON.stringify({ error: memberInsertError.message }), {
          status: 400,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(memberData), {
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== Gig Management =====
    
    // Get gigs for organization
    if (path === '/gigs' && method === 'GET') {
      const authHeader = req.headers.get('Authorization');
      const { user, error: authError } = await getAuthenticatedUser(authHeader);
      
      if (authError || !user) {
        return new Response(JSON.stringify({ error: authError ?? 'Unauthorized' }), {
          status: 401,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      const organizationId = url.searchParams.get('organization_id');

      if (!organizationId) {
        return new Response(JSON.stringify({ error: 'organization_id is required' }), {
          status: 400,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify user has access to this organization
      const { error: membershipError } = await verifyOrgMembership(user.id, organizationId);
      if (membershipError) {
        return new Response(JSON.stringify({ error: membershipError }), {
          status: 403,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Fetch gigs where this organization is a participant
      const { data: gigParticipants, error } = await supabaseAdmin
        .from('gig_participants')
        .select('*, gig:gigs(*)')
        .eq('organization_id', organizationId);

      if (error) {
        console.error('Error fetching gigs:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
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
        gigs.map(async (gig) => {
          const { data: participants } = await supabaseAdmin
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
      gigsWithParticipants.sort((a, b) => 
        new Date(b.start).getTime() - new Date(a.start).getTime()
      );

      return new Response(JSON.stringify(gigsWithParticipants), {
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get single gig
    const gigMatch = path.match(/^\/gigs\/([^\/]+)$/);
    if (gigMatch && method === 'GET') {
      const gigId = gigMatch[1];
      const authHeader = req.headers.get('Authorization');
      const { user, error: authError } = await getAuthenticatedUser(authHeader);
      
      if (authError || !user) {
        return new Response(JSON.stringify({ error: authError ?? 'Unauthorized' }), {
          status: 401,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: gig, error } = await supabaseAdmin
        .from('gigs')
        .select('*')
        .eq('id', gigId)
        .single();

      if (error) {
        console.error('Error fetching gig:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify user has access through gig participants
      const { data: gigParticipants } = await supabaseAdmin
        .from('gig_participants')
        .select('organization_id')
        .eq('gig_id', gigId);

      if (!gigParticipants || gigParticipants.length === 0) {
        return new Response(JSON.stringify({ error: 'Access denied' }), {
          status: 403,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      const orgIds = gigParticipants.map(gp => gp.organization_id);
      const { error: membershipError } = await verifyAnyOrgMembership(user.id, orgIds);
      if (membershipError) {
        return new Response(JSON.stringify({ error: membershipError }), {
          status: 403,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Fetch full participant data with organization details
      const { data: participants } = await supabaseAdmin
        .from('gig_participants')
        .select('*, organization:organization_id(*)')
        .eq('gig_id', gig.id);

      return new Response(JSON.stringify({
        ...gig,
        participants: participants || [],
      }), {
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create gig
    if (path === '/gigs' && method === 'POST') {
      const authHeader = req.headers.get('Authorization');
      const { user, error: authError } = await getAuthenticatedUser(authHeader);
      
      if (authError || !user) {
        return new Response(JSON.stringify({ error: authError ?? 'Unauthorized' }), {
          status: 401,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      const body = await req.json();
      const { 
        primary_organization_id,
        parent_gig_id,
        hierarchy_depth = 0,
        participants = [],
        staff_slots = [],
        ...gigData 
      } = body;

      // Verify user has permission to create gigs (must be Admin or Manager)
      let primaryOrgType = 'Production';
      if (primary_organization_id) {
        const { membership, error: membershipError } = await verifyOrgMembership(
          user.id, 
          primary_organization_id, 
          ['Admin', 'Manager']
        );

        if (membershipError || !membership) {
          return new Response(JSON.stringify({ error: 'Insufficient permissions. Only Admins and Managers can create gigs.' }), {
            status: 403,
            headers: { ...responseHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get the organization type for the default role
        if (membership.organization?.type) {
          primaryOrgType = membership.organization.type;
        }
      }

      // Create gig
      const { data: gig, error } = await supabaseAdmin
        .from('gigs')
        .insert({
          ...gigData,
          parent_gig_id,
          hierarchy_depth,
          created_by: user.id,
          updated_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating gig:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create participants
      const participantsToInsert: Array<{
        gig_id: string;
        organization_id: string;
        role: string;
        notes?: string | null;
      }> = [];
      
      if (primary_organization_id) {
        participantsToInsert.push({
          gig_id: gig.id,
          organization_id: primary_organization_id,
          role: primaryOrgType,
          notes: null,
        });
      }
      
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
        const { error: participantsError } = await supabaseAdmin
          .from('gig_participants')
          .insert(participantsToInsert);
        
        if (participantsError) {
          console.error('Error creating participants:', participantsError);
        }
      }

      // Create staff slots with assignments
      if (staff_slots.length > 0) {
        for (const slot of staff_slots) {
          const staffRoleId = await getOrCreateStaffRole(slot.role);
          if (!staffRoleId) continue;
          
          const { data: createdSlot, error: slotError } = await supabaseAdmin
            .from('gig_staff_slots')
            .insert({
              gig_id: gig.id,
              organization_id: slot.organization_id || primary_organization_id,
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
          
          // Create staff assignments
          if (slot.assignments?.length > 0) {
            const assignmentsToInsert = slot.assignments
              .filter((a: any) => a.user_id)
              .map((a: any) => ({
                gig_staff_slot_id: createdSlot.id,
                user_id: a.user_id,
                status: a.status || 'Requested',
                rate: a.rate || null,
                fee: a.fee || null,
                notes: a.notes || null,
              }));
            
            if (assignmentsToInsert.length > 0) {
              const { error: assignmentsError } = await supabaseAdmin
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
      const { data: participantsData } = await supabaseAdmin
        .from('gig_participants')
        .select('*, organization:organization_id(*)')
        .eq('gig_id', gig.id);

      const venue = participantsData?.find(p => p.role === 'Venue')?.organization;
      const act = participantsData?.find(p => p.role === 'Act')?.organization;

      return new Response(JSON.stringify({
        ...gig,
        venue,
        act,
        participants: participantsData || [],
      }), {
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update gig
    if (gigMatch && method === 'PUT') {
      const gigId = gigMatch[1];
      const authHeader = req.headers.get('Authorization');
      const { user, error: authError } = await getAuthenticatedUser(authHeader);
      
      if (authError || !user) {
        return new Response(JSON.stringify({ error: authError ?? 'Unauthorized' }), {
          status: 401,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      const body = await req.json();
      const { participants, staff_slots, ...gigData } = body;

      // Get existing gig
      const { data: gig } = await supabaseAdmin
        .from('gigs')
        .select('*')
        .eq('id', gigId)
        .single();

      if (!gig) {
        return new Response(JSON.stringify({ error: 'Gig not found' }), {
          status: 404,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify user has Admin or Manager access
      const { data: gigParticipants } = await supabaseAdmin
        .from('gig_participants')
        .select('organization_id')
        .eq('gig_id', gigId);

      if (!gigParticipants || gigParticipants.length === 0) {
        return new Response(JSON.stringify({ error: 'Access denied' }), {
          status: 403,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      const orgIds = gigParticipants.map(gp => gp.organization_id);
      const { data: memberships } = await supabaseAdmin
        .from('organization_members')
        .select('*')
        .in('organization_id', orgIds)
        .eq('user_id', user.id)
        .in('role', ['Admin', 'Manager']);

      if (!memberships || memberships.length === 0) {
        return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
          status: 403,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Update gig
      const { data: updatedGig, error } = await supabaseAdmin
        .from('gigs')
        .update({ ...gigData, updated_by: user.id, updated_at: new Date().toISOString() })
        .eq('id', gigId)
        .select()
        .single();

      if (error) {
        console.error('Error updating gig:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Update participants if provided
      if (participants !== undefined) {
        const { data: existingParticipants } = await supabaseAdmin
          .from('gig_participants')
          .select('id, organization_id, role')
          .eq('gig_id', gigId);

        const existingIds = new Set((existingParticipants || []).map(p => p.id));
        const incomingParticipants = participants
          .filter((p: any) => p.organization_id && p.role)
          .map((p: any) => ({
            id: p.id || null,
            organization_id: p.organization_id,
            role: p.role,
            notes: p.notes || null,
          }));

        const incomingIds = new Set(incomingParticipants.filter((p: any) => p.id).map((p: any) => p.id));

        // Delete removed participants
        const idsToDelete = Array.from(existingIds).filter(id => !incomingIds.has(id));
        if (idsToDelete.length > 0) {
          await supabaseAdmin
            .from('gig_participants')
            .delete()
            .in('id', idsToDelete);
        }

        // Update existing and insert new participants
        for (const p of incomingParticipants) {
          if (p.id && existingIds.has(p.id)) {
            await supabaseAdmin
              .from('gig_participants')
              .update({
                organization_id: p.organization_id,
                role: p.role,
                notes: p.notes,
              })
              .eq('id', p.id);
          } else {
            await supabaseAdmin
              .from('gig_participants')
              .insert({
                gig_id: gigId,
                organization_id: p.organization_id,
                role: p.role,
                notes: p.notes,
              });
          }
        }
      }

      // Update staff slots if provided
      if (staff_slots !== undefined) {
        const { data: existingSlots } = await supabaseAdmin
          .from('gig_staff_slots')
          .select('id, staff_role_id, organization_id, required_count, notes, assignments:gig_staff_assignments(id, user_id, status, rate, fee, notes)')
          .eq('gig_id', gigId);

        const existingSlotIds = new Set((existingSlots || []).map(s => s.id));
        const incomingSlots = staff_slots.filter((s: any) => s.role && s.role.trim() !== '');
        const processedSlotIds = new Set();

        for (const slot of incomingSlots) {
          const staffRoleId = await getOrCreateStaffRole(slot.role);
          if (!staffRoleId) continue;

          let slotId = slot.id;

          // Update existing or insert new slot
          if (slotId && existingSlotIds.has(slotId)) {
            await supabaseAdmin
              .from('gig_staff_slots')
              .update({
                staff_role_id: staffRoleId,
                organization_id: slot.organization_id || null,
                required_count: slot.count || slot.required_count || 1,
                notes: slot.notes || null,
              })
              .eq('id', slotId);
            
            processedSlotIds.add(slotId);
          } else {
            const { data: newSlot } = await supabaseAdmin
              .from('gig_staff_slots')
              .insert({
                gig_id: gigId,
                staff_role_id: staffRoleId,
                organization_id: slot.organization_id || null,
                required_count: slot.count || slot.required_count || 1,
                notes: slot.notes || null,
              })
              .select('id')
              .single();

            if (newSlot) {
              slotId = newSlot.id;
              processedSlotIds.add(slotId);
            }
          }

          // Handle assignments for this slot
          if (slot.assignments && slot.assignments.length > 0) {
            const { data: existingAssignments } = await supabaseAdmin
              .from('gig_staff_assignments')
              .select('id, user_id')
              .eq('gig_staff_slot_id', slotId);

            const existingAssignmentIds = new Set((existingAssignments || []).map(a => a.id));
            const incomingAssignments = slot.assignments.filter((a: any) => a.user_id && a.user_id.trim() !== '');
            const processedAssignmentIds = new Set();

            for (const assignment of incomingAssignments) {
              if (assignment.id && existingAssignmentIds.has(assignment.id)) {
                await supabaseAdmin
                  .from('gig_staff_assignments')
                  .update({
                    user_id: assignment.user_id,
                    status: assignment.status || 'Requested',
                    rate: assignment.rate || null,
                    fee: assignment.fee || null,
                    notes: assignment.notes || null,
                  })
                  .eq('id', assignment.id);
                
                processedAssignmentIds.add(assignment.id);
              } else {
                const { data: newAssignment } = await supabaseAdmin
                  .from('gig_staff_assignments')
                  .insert({
                    gig_staff_slot_id: slotId,
                    user_id: assignment.user_id,
                    status: assignment.status || 'Requested',
                    rate: assignment.rate || null,
                    fee: assignment.fee || null,
                    notes: assignment.notes || null,
                  })
                  .select('id')
                  .single();

                if (newAssignment) {
                  processedAssignmentIds.add(newAssignment.id);
                }
              }
            }

            // Delete removed assignments
            const assignmentIdsToDelete = Array.from(existingAssignmentIds).filter(id => !processedAssignmentIds.has(id));
            if (assignmentIdsToDelete.length > 0) {
              await supabaseAdmin
                .from('gig_staff_assignments')
                .delete()
                .in('id', assignmentIdsToDelete);
            }
          } else {
            // Delete all assignments for this slot
            await supabaseAdmin
              .from('gig_staff_assignments')
              .delete()
              .eq('gig_staff_slot_id', slotId);
          }
        }

        // Delete removed slots (cascade will handle assignments)
        const slotIdsToDelete = Array.from(existingSlotIds).filter(id => !processedSlotIds.has(id));
        if (slotIdsToDelete.length > 0) {
          await supabaseAdmin
            .from('gig_staff_slots')
            .delete()
            .in('id', slotIdsToDelete);
        }
      }

      // Fetch updated participants
      const { data: updatedParticipants } = await supabaseAdmin
        .from('gig_participants')
        .select('*, organization:organization_id(*)')
        .eq('gig_id', gigId);

      const venue = updatedParticipants?.find(p => p.role === 'Venue')?.organization;
      const act = updatedParticipants?.find(p => p.role === 'Act')?.organization;

      return new Response(JSON.stringify({
        ...updatedGig,
        venue,
        act,
      }), {
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Delete gig
    if (gigMatch && method === 'DELETE') {
      const gigId = gigMatch[1];
      const authHeader = req.headers.get('Authorization');
      const { user, error: authError } = await getAuthenticatedUser(authHeader);
      
      if (authError || !user) {
        return new Response(JSON.stringify({ error: authError ?? 'Unauthorized' }), {
          status: 401,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify user has admin access through gig participants
      const { data: gigParticipants } = await supabaseAdmin
        .from('gig_participants')
        .select('organization_id')
        .eq('gig_id', gigId);

      if (!gigParticipants || gigParticipants.length === 0) {
        return new Response(JSON.stringify({ error: 'Gig not found or access denied' }), {
          status: 403,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      const orgIds = gigParticipants.map(gp => gp.organization_id);
      const { data: adminMemberships } = await supabaseAdmin
        .from('organization_members')
        .select('*')
        .in('organization_id', orgIds)
        .eq('user_id', user.id)
        .eq('role', 'Admin');

      if (!adminMemberships || adminMemberships.length === 0) {
        return new Response(JSON.stringify({ error: 'Insufficient permissions. Only Admins can delete gigs.' }), {
          status: 403,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error } = await supabaseAdmin
        .from('gigs')
        .delete()
        .eq('id', gigId);

      if (error) {
        console.error('Error deleting gig:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== Google Places Integration =====
    
    // Search Google Places
    if (path === '/integrations/google-places/search' && method === 'GET') {
      const authHeader = req.headers.get('Authorization');
      const { user, error: authError } = await getAuthenticatedUser(authHeader);
      
      if (authError || !user) {
        return new Response(JSON.stringify({ error: authError ?? 'Unauthorized' }), {
          status: 401,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      const query = url.searchParams.get('query');
      const latitude = url.searchParams.get('latitude');
      const longitude = url.searchParams.get('longitude');
      
      if (!query) {
        return new Response(JSON.stringify({ error: 'Query parameter is required' }), {
          status: 400,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
      
      if (!apiKey) {
        console.error('Google Maps API key not configured');
        return new Response(JSON.stringify({ error: 'Google Maps API key not configured' }), {
          status: 500,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      const apiUrl = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
      apiUrl.searchParams.append('query', query);
      apiUrl.searchParams.append('key', apiKey);
      
      if (latitude && longitude) {
        apiUrl.searchParams.append('location', `${latitude},${longitude}`);
        apiUrl.searchParams.append('radius', '50000');
      }

      const response = await fetch(apiUrl.toString());
      const data = await response.json();

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        console.error('Google Places API error:', data);
        return new Response(JSON.stringify({ 
          error: `Google Places API error: ${data.status}`,
          details: data.error_message 
        }), {
          status: 500,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Filter results for relevance to event industry
      const relevantKeywords = [
        'sound', 'audio', 'lighting', 'stage', 'staging', 'production',
        'event', 'venue', 'entertainment', 'music', 'concert', 'theater',
        'theatre', 'show', 'performance', 'rental', 'av', 'pro audio'
      ];

      const scoredResults = (data.results || []).map((place: any) => {
        const name = (place.name || '').toLowerCase();
        let score = 0;
        
        if (name.startsWith(query.toLowerCase())) score += 50;
        else if (name.includes(query.toLowerCase())) score += 20;
        
        for (const keyword of relevantKeywords) {
          if (name.includes(keyword.toLowerCase())) score += 30;
        }
        
        return {
          place_id: place.place_id,
          name: place.name,
          formatted_address: place.formatted_address,
          types: place.types,
          score,
        };
      });

      const filteredResults = scoredResults.filter((r: any) => r.score >= 0);
      filteredResults.sort((a: any, b: any) => b.score - a.score);
      
      const results = filteredResults.slice(0, 10).map((r: any) => ({
        place_id: r.place_id,
        name: r.name,
        formatted_address: r.formatted_address,
      }));

      return new Response(JSON.stringify({ results }), {
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get Google Place details
    const placesMatch = path.match(/^\/integrations\/google-places\/(.+)$/);
    if (placesMatch && method === 'GET') {
      const placeId = placesMatch[1];
      const authHeader = req.headers.get('Authorization');
      const { user, error: authError } = await getAuthenticatedUser(authHeader);
      
      if (authError || !user) {
        return new Response(JSON.stringify({ error: authError ?? 'Unauthorized' }), {
          status: 401,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
      
      if (!apiKey) {
        console.error('Google Maps API key not configured');
        return new Response(JSON.stringify({ error: 'Google Maps API key not configured' }), {
          status: 500,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      const apiUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
      apiUrl.searchParams.append('place_id', placeId);
      apiUrl.searchParams.append('fields', 'name,formatted_address,formatted_phone_number,website,address_components,editorial_summary');
      apiUrl.searchParams.append('key', apiKey);

      const response = await fetch(apiUrl.toString());
      const data = await response.json();

      if (data.status !== 'OK') {
        console.error('Google Places API error:', data);
        return new Response(JSON.stringify({ 
          error: `Google Places API error: ${data.status}`,
          details: data.error_message 
        }), {
          status: 500,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      const place = data.result;
      
      return new Response(JSON.stringify({
        place_id: place.place_id || placeId,
        name: place.name,
        formatted_address: place.formatted_address,
        formatted_phone_number: place.formatted_phone_number,
        website: place.website,
        editorial_summary: place.editorial_summary?.overview,
        address_components: place.address_components || [],
      }), {
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== Dashboard Stats =====
    
    // Get dashboard statistics
    const dashboardMatch = path.match(/^\/organizations\/([^\/]+)\/dashboard$/);
    if (dashboardMatch && method === 'GET') {
      const orgId = dashboardMatch[1];
      const authHeader = req.headers.get('Authorization');
      const { user, error: authError } = await getAuthenticatedUser(authHeader);

      if (authError || !user) {
        return new Response(JSON.stringify({ error: authError ?? 'Unauthorized' }), {
          status: 401,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Verify user is a member of the organization (dashboard access allowed for Staff, Manager, Admin)
      const { membership, error: memberError } = await verifyOrgMembership(user.id, orgId, ['Admin', 'Manager', 'Staff']);
      if (memberError) {
        return new Response(JSON.stringify({ error: memberError }), {
          status: 403,
          headers: { ...responseHeaders, 'Content-Type': 'application/json' },
        });
      }

      const isAdminOrManager = ['Admin', 'Manager'].includes(membership.role);

      // Get gigs by status
      const { data: gigsByStatus } = await supabaseAdmin
        .from('gig_participants')
        .select('gig_id, gigs!inner(id, status)')
        .eq('organization_id', orgId);

      const statusCounts = {
        DateHold: 0,
        Proposed: 0,
        Booked: 0,
        Completed: 0,
        Cancelled: 0,
        Settled: 0,
      };

      (gigsByStatus || []).forEach((gp: any) => {
        const status = gp.gigs?.status;
        if (status && statusCounts.hasOwnProperty(status)) {
          statusCounts[status]++;
        }
      });

      // Get asset values
      const { data: assets } = await supabaseAdmin
        .from('assets')
        .select('cost, replacement_value, insurance_policy_added')
        .eq('organization_id', orgId);

      let totalAssetValue = 0;
      let totalInsuredValue = 0;

      if (isAdminOrManager) {
        (assets || []).forEach((asset: any) => {
          if (asset.cost) {
            totalAssetValue += parseFloat(asset.cost);
          }
          if (asset.insurance_policy_added && asset.replacement_value) {
            totalInsuredValue += parseFloat(asset.replacement_value);
          }
        });
      }

      // Get kits rental value
      const { data: kits } = await supabaseAdmin
        .from('kits')
        .select('rental_value')
        .eq('organization_id', orgId);

      let totalRentalValue = 0;
      if (isAdminOrManager) {
        (kits || []).forEach((kit: any) => {
          if (kit.rental_value) {
            totalRentalValue += parseFloat(kit.rental_value);
          }
        });
      }

      // Calculate revenue for different periods
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      const startOfYear = new Date(now.getFullYear(), 0, 1);

      // Revenue calculations using gig_financials
      let revenueThisMonth = 0;
      let revenueLastMonth = 0;
      let revenueThisYear = 0;

      if (isAdminOrManager) {
        // Revenue this month
        const { data: thisMonthFin } = await supabaseAdmin
          .from('gig_financials')
          .select('amount')
          .eq('organization_id', orgId)
          .eq('type', 'Payment Recieved')
          .gte('date', startOfMonth.toISOString().split('T')[0]);
        
        revenueThisMonth = (thisMonthFin || []).reduce((sum: number, f: any) => sum + parseFloat(f.amount), 0);

        // Revenue last month
        const { data: lastMonthFin } = await supabaseAdmin
          .from('gig_financials')
          .select('amount')
          .eq('organization_id', orgId)
          .eq('type', 'Payment Recieved')
          .gte('date', startOfLastMonth.toISOString().split('T')[0])
          .lte('date', endOfLastMonth.toISOString().split('T')[0]);
        
        revenueLastMonth = (lastMonthFin || []).reduce((sum: number, f: any) => sum + parseFloat(f.amount), 0);

        // Revenue this year
        const { data: thisYearFin } = await supabaseAdmin
          .from('gig_financials')
          .select('amount')
          .eq('organization_id', orgId)
          .eq('type', 'Payment Recieved')
          .gte('date', startOfYear.toISOString().split('T')[0]);
        
        revenueThisYear = (thisYearFin || []).reduce((sum: number, f: any) => sum + parseFloat(f.amount), 0);
      }

      // Get upcoming gigs (next 30 days)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const { data: upcomingGigsData } = await supabaseAdmin
        .from('gig_participants')
        .select(`
          gig_id,
          gigs!inner(
            id,
            title,
            start,
            status
          )
        `)
        .eq('organization_id', orgId)
        .gte('gigs.start', now.toISOString())
        .lte('gigs.start', thirtyDaysFromNow.toISOString())
        .in('gigs.status', ['DateHold', 'Proposed', 'Booked'])
        .order('gigs(start)', { ascending: true })
        .limit(10);

      // For each upcoming gig, get Act and Venue organizations
      const upcomingGigs = await Promise.all(
        (upcomingGigsData || []).map(async (gp: any) => {
          const gigId = gp.gigs.id;

          // Get Act organization
          const { data: actParticipant } = await supabaseAdmin
            .from('gig_participants')
            .select('organization:organizations(name)')
            .eq('gig_id', gigId)
            .eq('role', 'Act')
            .maybeSingle();

          // Get Venue organization
          const { data: venueParticipant } = await supabaseAdmin
            .from('gig_participants')
            .select('organization:organizations(name)')
            .eq('gig_id', gigId)
            .eq('role', 'Venue')
            .maybeSingle();

          // Get staffing statistics
          const { data: slots } = await supabaseAdmin
            .from('gig_staff_slots')
            .select(`
              id,
              required_count,
              gig_staff_assignments(
                id,
                status
              )
            `)
            .eq('gig_id', gigId);

          let unfilledSlots = 0;
          let unconfirmedAssignments = 0;
          let rejectedAssignments = 0;
          let confirmedAssignments = 0;

          (slots || []).forEach((slot: any) => {
            const assignments = slot.gig_staff_assignments || [];
            const confirmedCount = assignments.filter((a: any) => a.status === 'Confirmed').length;
            const unconfirmedCount = assignments.filter((a: any) => a.status !== 'Confirmed' && a.status !== 'Rejected').length;
            const rejectedCount = assignments.filter((a: any) => a.status === 'Rejected').length;

            confirmedAssignments += confirmedCount;
            unconfirmedAssignments += unconfirmedCount;
            rejectedAssignments += rejectedCount;

            if (confirmedCount < slot.required_count) {
              unfilledSlots += (slot.required_count - confirmedCount);
            }
          });

          return {
            id: gp.gigs.id,
            title: gp.gigs.title,
            start: gp.gigs.start,
            status: gp.gigs.status,
            act: actParticipant?.organization?.name || 'N/A',
            venue: venueParticipant?.organization?.name || 'N/A',
            staffing: {
              unfilledSlots,
              unconfirmedAssignments,
              rejectedAssignments,
              confirmedAssignments,
            },
          };
        })
      );

      return new Response(JSON.stringify({
        gigsByStatus: statusCounts,
        assetValues: {
          totalAssetValue,
          totalInsuredValue,
          totalRentalValue,
        },
        revenue: {
          thisMonth: revenueThisMonth,
          lastMonth: revenueLastMonth,
          thisYear: revenueThisYear,
        },
        upcomingGigs,
      }), {
        headers: { ...responseHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 404 - Route not found
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...responseHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Server error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
      status: 500,
      headers: { ...responseHeaders, 'Content-Type': 'application/json' },
    });
  }
});