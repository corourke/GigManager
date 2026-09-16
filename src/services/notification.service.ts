import { createClient } from '../utils/supabase/client';
import { Notification } from '../utils/supabase/types';
import { handleFunctionsError } from '../utils/api-error-utils';

const getSupabase = () => createClient();

/** The caller's unread notifications, most recent first — powers the notification bell. */
export async function getMyNotifications(): Promise<Notification[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.functions.invoke('server/me/notifications', { method: 'GET' });
    if (error) return await handleFunctionsError(error, 'fetch notifications');
    return data || [];
  } catch (err) {
    return await handleFunctionsError(err, 'fetch notifications');
  }
}

/** Mark one notification read (dismiss it from the bell). */
export async function markNotificationRead(notificationId: string): Promise<void> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.functions.invoke(`server/notifications/${notificationId}/read`, { method: 'PUT' });
    if (error) return await handleFunctionsError(error, 'dismiss notification');
  } catch (err) {
    return await handleFunctionsError(err, 'dismiss notification');
  }
}
