import type { App, AppContext } from '../lib/types.ts';
import { requireUser } from '../lib/auth.ts';
import { supabaseAdmin } from '../lib/supabaseAdmin.ts';

export function registerNotifications(app: App) {
  // Unread notifications for the caller — powers the notification bell.
  // Domain tables (access_requests) remain the source of truth for
  // resolvable state; these rows are the one-shot "something happened" feed.
  app.get('/me/notifications', requireUser, async (c: AppContext) => {
    const user = c.get('user');
    const { data, error } = await supabaseAdmin
      .from('notifications').select('*')
      .eq('recipient_id', user.id).is('read_at', null)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching notifications:', error);
      return c.json({ error: error.message }, 400);
    }
    return c.json(data || []);
  });

  // Mark one notification read (dismiss from the bell).
  app.put('/notifications/:id/read', requireUser, async (c: AppContext) => {
    const id = c.req.param('id');
    const user = c.get('user');
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id).eq('recipient_id', user.id)
      .select('id').maybeSingle();
    if (error) {
      console.error('Error marking notification read:', error);
      return c.json({ error: error.message }, 400);
    }
    if (!data) {
      return c.json({ error: 'Notification not found' }, 404);
    }
    return c.json({ success: true });
  });
}
