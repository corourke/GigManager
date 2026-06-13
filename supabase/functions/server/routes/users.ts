import type { App } from '../lib/types.ts';
import { requireUser } from '../lib/auth.ts';
import { supabaseAdmin } from '../lib/supabaseAdmin.ts';

const PROFILE_UPDATE_FIELDS = [
  'first_name', 'last_name', 'phone', 'address_line1', 'address_line2',
  'city', 'state', 'postal_code', 'country', 'timezone',
];

// User profile + directory. Per Q-A, the directory reads (#3, #5, #6) remain
// authenticated-only for now (tightening tracked in the inventory doc).
export function registerUsers(app: App) {
  // Create caller's own profile
  app.post('/users', requireUser, async (c) => {
    const user = c.get('user');

    let body: any;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }
    const { first_name, last_name, avatar_url } = body;

    const { data: existingUser } = await supabaseAdmin
      .from('users').select('*').eq('id', user.id).single();
    if (existingUser) {
      return c.json(existingUser);
    }

    const meta = (user as any).user_metadata ?? {};
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({
        id: user.id,
        email: user.email,
        first_name: first_name ?? meta.first_name ?? '',
        last_name: last_name ?? meta.last_name ?? '',
        avatar_url: avatar_url ?? meta.avatar_url ?? meta.picture,
      })
      .select().single();

    if (error) {
      console.error('Error creating user profile:', error);
      return c.json({ error: error.message }, 400);
    }
    return c.json(data);
  });

  // Search users (Q-A: authed-only)
  app.get('/users', requireUser, async (c) => {
    const search = c.req.query('search');
    let query = supabaseAdmin.from('users').select('*').order('first_name');
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    }
    const { data, error } = await query.limit(20);
    if (error) {
      console.error('Error searching users:', error);
      return c.json({ error: error.message }, 400);
    }
    return c.json(data);
  });

  // Get a user profile (Q-A: authed-only)
  app.get('/users/:id', requireUser, async (c) => {
    const userId = c.req.param('id');
    const { data, error } = await supabaseAdmin
      .from('users').select('*').eq('id', userId).maybeSingle();
    if (error) {
      console.error('Error fetching user:', error);
      return c.json({ error: error.message }, 400);
    }
    if (!data) {
      return c.json({ error: 'User profile not found' }, 404);
    }
    return c.json(data);
  });

  // Update a user profile — self only
  app.put('/users/:id', requireUser, async (c) => {
    const userId = c.req.param('id');
    const user = c.get('user');
    if (user.id !== userId) {
      return c.json({ error: "Cannot update another user's profile" }, 403);
    }

    const body = await c.req.json();
    const updateData: Record<string, any> = {};
    for (const field of PROFILE_UPDATE_FIELDS) {
      if (body[field] !== undefined) updateData[field] = body[field];
    }
    if (Object.keys(updateData).length === 0) {
      return c.json({ error: 'No fields provided for update' }, 400);
    }
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('users').update(updateData).eq('id', userId).select().single();
    if (error) {
      console.error('Error updating user profile:', error);
      return c.json({ error: error.message }, 400);
    }
    return c.json(data);
  });

  // Get a user's organizations (Q-A: authed-only)
  app.get('/users/:id/organizations', requireUser, async (c) => {
    const userId = c.req.param('id');
    const { data, error } = await supabaseAdmin
      .from('organization_members')
      .select('*, organization:organizations(*)')
      .eq('user_id', userId);
    if (error) {
      console.error('Error fetching user organizations:', error);
      return c.json({ error: error.message }, 400);
    }
    return c.json(data);
  });
}
