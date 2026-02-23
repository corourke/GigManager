import { createClient } from '../utils/supabase/client';
import { UserGoogleCalendarSettings, GigSyncStatus } from '../utils/supabase/types';
import { handleApiError } from '../utils/api-error-utils';

const getSupabase = () => createClient();

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
  'https://www.googleapis.com/auth/calendar.events.owned'
];

const REDIRECT_URI = () => `${window.location.origin}/auth/google-calendar/callback`;

export async function getGoogleAuthUrl(): Promise<string> {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI(),
    scope: SCOPES.join(' '),
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_at: Date;
}> {
  const supabase = getSupabase();

  try {
    const { data, error } = await supabase.functions.invoke(
      'server/integrations/google-calendar/exchange-token',
      {
        method: 'POST',
        body: { code, redirect_uri: REDIRECT_URI() },
      }
    );

    if (error) throw error;
    if (data?.error) throw new Error(data.details || data.error);

    if (!data.access_token || !data.refresh_token) {
      throw new Error('Failed to obtain required tokens');
    }

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: new Date(Date.now() + (data.expires_in || 3600) * 1000),
    };
  } catch (error) {
    throw handleApiError(error, 'exchange authorization code for tokens');
  }
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_at: Date;
}> {
  const supabase = getSupabase();

  try {
    const { data, error } = await supabase.functions.invoke(
      'server/integrations/google-calendar/refresh-token',
      {
        method: 'POST',
        body: { refresh_token: refreshToken },
      }
    );

    if (error) throw error;
    if (data?.error) throw new Error(data.details || data.error);

    if (!data.access_token) {
      throw new Error('Failed to refresh access token');
    }

    return {
      access_token: data.access_token,
      expires_at: new Date(Date.now() + (data.expires_in || 3600) * 1000),
    };
  } catch (error) {
    throw handleApiError(error, 'refresh access token');
  }
}

async function getValidAccessToken(userId: string): Promise<{ accessToken: string; settings: UserGoogleCalendarSettings }> {
  const settings = await getUserGoogleCalendarSettings(userId);

  if (!settings) {
    throw new Error('Google Calendar integration not configured');
  }

  let accessToken = settings.access_token;
  if (new Date(settings.token_expires_at) <= new Date()) {
    const refreshed = await refreshAccessToken(settings.refresh_token);
    accessToken = refreshed.access_token;

    await updateUserGoogleCalendarSettings(userId, {
      access_token: refreshed.access_token,
      token_expires_at: refreshed.expires_at.toISOString(),
    });
  }

  return { accessToken, settings };
}

/**
 * Get user's Google Calendar settings
 */
export async function getUserGoogleCalendarSettings(userId: string): Promise<UserGoogleCalendarSettings | null> {
  const supabase = getSupabase();

  try {
    const { data, error } = await supabase
      .from('user_google_calendar_settings')
      .select('id, user_id, calendar_id, calendar_name, access_token, refresh_token, token_expires_at, is_enabled, sync_filters, created_at, updated_at')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }

    return data || null;
  } catch (error) {
    return handleApiError(error, 'get user Google Calendar settings');
  }
}

/**
 * Save or update user's Google Calendar settings
 */
export async function saveUserGoogleCalendarSettings(
  userId: string,
  settings: {
    calendar_id: string;
    calendar_name?: string;
    access_token: string;
    refresh_token: string;
    token_expires_at: string;
    is_enabled?: boolean;
    sync_filters?: Record<string, any>;
  }
): Promise<UserGoogleCalendarSettings> {
  const supabase = getSupabase();

  try {
    // Check if user already has settings (app supports only one calendar per user)
    const { data: existing } = await supabase
      .from('user_google_calendar_settings')
      .select('id')
      .eq('user_id', userId)
      .single();

    let result;
    if (existing) {
      const SETTINGS_COLS = 'id, user_id, calendar_id, calendar_name, access_token, refresh_token, token_expires_at, is_enabled, sync_filters, created_at, updated_at';
      // Update existing settings
      const { data, error } = await supabase
        .from('user_google_calendar_settings')
        .update({
          ...settings,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select(SETTINGS_COLS)
        .single();
      if (error) throw error;
      result = data;
    } else {
      const SETTINGS_COLS = 'id, user_id, calendar_id, calendar_name, access_token, refresh_token, token_expires_at, is_enabled, sync_filters, created_at, updated_at';
      // Insert new settings
      const { data, error } = await supabase
        .from('user_google_calendar_settings')
        .insert({
          user_id: userId,
          ...settings,
          updated_at: new Date().toISOString(),
        })
        .select(SETTINGS_COLS)
        .single();
      if (error) throw error;
      result = data;
    }

    return result;
  } catch (error) {
    return handleApiError(error, 'save user Google Calendar settings');
  }
}

/**
 * Update user's Google Calendar settings
 */
export async function updateUserGoogleCalendarSettings(
  userId: string,
  updates: Partial<Omit<UserGoogleCalendarSettings, 'id' | 'user_id' | 'created_at'>>
): Promise<UserGoogleCalendarSettings> {
  const supabase = getSupabase();

  try {
    const { data, error } = await supabase
      .from('user_google_calendar_settings')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select('id, user_id, calendar_id, calendar_name, access_token, refresh_token, token_expires_at, is_enabled, sync_filters, created_at, updated_at')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    return handleApiError(error, 'update user Google Calendar settings');
  }
}

/**
 * Delete user's Google Calendar settings
 */
export async function deleteUserGoogleCalendarSettings(userId: string): Promise<void> {
  const supabase = getSupabase();

  try {
    const { error } = await supabase
      .from('user_google_calendar_settings')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
  } catch (error) {
    return handleApiError(error, 'delete user Google Calendar settings');
  }
}

export async function getUserCalendars(userId: string): Promise<Array<{
  id: string;
  name: string;
  primary?: boolean;
  accessRole: string;
}>> {
  const supabase = getSupabase();
  const { accessToken } = await getValidAccessToken(userId);

  try {
    const { data, error } = await supabase.functions.invoke(
      `server/integrations/google-calendar/calendars?access_token=${encodeURIComponent(accessToken)}`,
      { method: 'GET' }
    );

    if (error) throw error;
    if (data?.error) throw new Error(data.details || data.error);

    return data.calendars || [];
  } catch (error) {
    throw handleApiError(error, 'get user calendars');
  }
}

export async function syncGigToCalendar(
  userId: string,
  gigId: string,
  gigData: {
    title: string;
    start: string;
    end: string;
    timezone: string;
    description?: string;
    location?: string;
  }
): Promise<{ eventId: string; syncedAt: Date }> {
  const supabase = getSupabase();
  const { accessToken, settings } = await getValidAccessToken(userId);

  if (!settings.is_enabled || !settings.calendar_id) {
    throw new Error('Google Calendar sync not enabled or no calendar selected');
  }

  try {
    const existingSync = await getGigSyncStatus(gigId, userId);

    const startDate = new Date(gigData.start);
    const endDate = gigData.end ? new Date(gigData.end) : null;
    const isAllDay = startDate.getUTCHours() === 12 && startDate.getUTCMinutes() === 0 && (!endDate || (endDate.getUTCHours() === 12 && endDate.getUTCMinutes() === 0));

    let startProp: Record<string, string>;
    let endProp: Record<string, string>;

    if (isAllDay) {
      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate
        ? new Date(endDate.getTime() + 86400000).toISOString().split('T')[0]
        : new Date(startDate.getTime() + 86400000).toISOString().split('T')[0];
      startProp = { date: startStr };
      endProp = { date: endStr };
    } else {
      startProp = { dateTime: startDate.toISOString(), timeZone: gigData.timezone };
      const effectiveEnd = endDate && endDate.getTime() > startDate.getTime()
        ? endDate
        : new Date(startDate.getTime() + 3600000);
      endProp = { dateTime: effectiveEnd.toISOString(), timeZone: gigData.timezone };
    }

    const eventData = {
      summary: gigData.title,
      description: `${gigData.description || ''}\n\n[View in GigManager](${window.location.origin}/gigs/${gigId})`,
      start: startProp,
      end: endProp,
      location: gigData.location,
    };

    const { data, error } = await supabase.functions.invoke(
      'server/integrations/google-calendar/events',
      {
        method: 'POST',
        body: {
          access_token: accessToken,
          calendar_id: settings.calendar_id,
          event_data: eventData,
          event_id: existingSync?.google_event_id || undefined,
        },
      }
    );

    if (error) throw error;
    if (data?.error) throw new Error(data.details || data.error);

    const eventId = data.event_id;

    const syncStatus = existingSync?.google_event_id ? 'updated' : 'synced';
    await updateGigSyncStatus(gigId, userId, {
      google_event_id: eventId,
      sync_status: syncStatus,
      last_synced_at: new Date().toISOString(),
      sync_error: null,
    });

    return { eventId, syncedAt: new Date() };
  } catch (error) {
    await updateGigSyncStatus(gigId, userId, {
      sync_status: 'failed',
      sync_error: error instanceof Error ? error.message : 'Unknown error',
      last_synced_at: new Date().toISOString(),
    });
    throw handleApiError(error, 'sync gig to calendar');
  }
}

export async function deleteGigFromCalendar(userId: string, gigId: string): Promise<void> {
  const supabase = getSupabase();
  const syncStatus = await getGigSyncStatus(gigId, userId);

  if (!syncStatus?.google_event_id) {
    return;
  }

  try {
    const { accessToken, settings } = await getValidAccessToken(userId);

    if (!settings.calendar_id) return;

    const { data, error } = await supabase.functions.invoke(
      'server/integrations/google-calendar/events',
      {
        method: 'DELETE',
        body: {
          access_token: accessToken,
          calendar_id: settings.calendar_id,
          event_id: syncStatus.google_event_id,
        },
      }
    );

    if (error) throw error;

    await updateGigSyncStatus(gigId, userId, {
      google_event_id: null,
      sync_status: 'removed',
      last_synced_at: new Date().toISOString(),
      sync_error: null,
    });
  } catch (error) {
    if (error instanceof Error && (error.message.includes('404') || error.message.includes('410'))) {
      await updateGigSyncStatus(gigId, userId, {
        google_event_id: null,
        sync_status: 'removed',
        last_synced_at: new Date().toISOString(),
        sync_error: null,
      });
    } else {
      await updateGigSyncStatus(gigId, userId, {
        sync_status: 'failed',
        sync_error: error instanceof Error ? error.message : 'Unknown error',
        last_synced_at: new Date().toISOString(),
      });
      throw handleApiError(error, 'delete gig from calendar');
    }
  }
}

/**
 * Get gig sync status
 */
export async function getGigSyncStatus(gigId: string, userId: string): Promise<GigSyncStatus | null> {
  const supabase = getSupabase();

  try {
    const { data, error } = await supabase
      .from('gig_sync_status')
      .select('id, gig_id, user_id, google_event_id, last_synced_at, sync_status, sync_error, created_at, updated_at')
      .eq('gig_id', gigId)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data || null;
  } catch (error) {
    return handleApiError(error, 'get gig sync status');
  }
}

/**
 * Get recent sync logs for a user
 */
export async function getSyncLogs(
  userId: string,
  limit: number = 20
): Promise<(GigSyncStatus & { gig_title?: string })[]> {
  const supabase = getSupabase();

  try {
    const { data, error } = await supabase
      .from('gig_sync_status')
      .select('id, gig_id, user_id, google_event_id, last_synced_at, sync_status, sync_error, created_at, updated_at, gig:gigs(title, start)')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).map((row: any) => ({
      ...row,
      gig_title: row.gig?.title,
      gig_start: row.gig?.start,
      gig: undefined,
    }));
  } catch (error) {
    return handleApiError(error, 'get sync logs');
  }
}

/**
 * Get sync status summary for a user, accounting for sync filters
 */
export async function getSyncStatusSummary(userId: string): Promise<{
  total: number;
  synced: number;
  notSynced: number;
  failed: number;
  removed: number;
  lastSyncedAt: string | null;
}> {
  const supabase = getSupabase();

  try {
    const settings = await getUserGoogleCalendarSettings(userId);
    const allowedStatuses = getFilteredStatuses(settings?.sync_filters);

    const { data, error } = await supabase
      .from('gig_sync_status')
      .select('id, gig_id, user_id, google_event_id, last_synced_at, sync_status, sync_error, created_at, updated_at, gig:gigs(status)')
      .eq('user_id', userId);

    if (error) throw error;

    const logs = (data || []) as (typeof data extends (infer T)[] | null ? T : never)[];
    const synced = logs.filter(l => (l.sync_status === 'synced' || l.sync_status === 'updated') && l.google_event_id).length;
    const removed = logs.filter(l => l.sync_status === 'removed').length;
    const failed = logs.filter(l => l.sync_status === 'failed').length;
    const notSynced = logs.filter(l => {
      const gigStatus = (l as any).gig?.status;
      return gigStatus && !allowedStatuses.has(gigStatus) && l.sync_status !== 'removed' && l.sync_status !== 'failed';
    }).length;

    const lastSynced = logs
      .filter(l => l.last_synced_at)
      .sort((a, b) => new Date(b.last_synced_at!).getTime() - new Date(a.last_synced_at!).getTime())[0];

    return {
      total: logs.length,
      synced,
      notSynced,
      failed,
      removed,
      lastSyncedAt: lastSynced?.last_synced_at || null,
    };
  } catch (error) {
    return handleApiError(error, 'get sync status summary');
  }
}

function getFilteredStatuses(syncFilters: Record<string, any> | undefined): Set<string> {
  const statuses = new Set<string>();
  const filters = syncFilters || {};

  if (filters.sync_confirmed !== false) {
    statuses.add('Booked');
    statuses.add('Completed');
    statuses.add('Settled');
  }
  if (filters.sync_tentative !== false) {
    statuses.add('DateHold');
    statuses.add('Proposed');
  }
  if (filters.sync_cancelled === true) {
    statuses.add('Cancelled');
  }
  return statuses;
}

export async function syncAllGigsForUser(
  userId: string,
  organizationId: string,
  onProgress?: (synced: number, total: number) => void
): Promise<{ synced: number; failed: number; total: number }> {
  const supabase = getSupabase();

  const settings = await getUserGoogleCalendarSettings(userId);
  const allowedStatuses = getFilteredStatuses(settings?.sync_filters);

  const { data: participatingGigs, error: partError } = await supabase
    .from('gig_participants')
    .select('gig_id')
    .eq('organization_id', organizationId);

  if (partError) throw handleApiError(partError, 'fetch gigs for sync');
  if (!participatingGigs || participatingGigs.length === 0) {
    return { synced: 0, failed: 0, total: 0 };
  }

  const gigIds = participatingGigs.map(g => g.gig_id);

  const { data: gigs, error: gigsError } = await supabase
    .from('gigs')
    .select(`
      id, title, start, end, timezone, notes, status,
      participants:gig_participants(
        role,
        organization:organizations(name, address_line1, city)
      )
    `)
    .in('id', gigIds);

  if (gigsError) throw handleApiError(gigsError, 'fetch gig details for sync');
  if (!gigs || gigs.length === 0) {
    return { synced: 0, failed: 0, total: 0 };
  }

  const gigsToSync = gigs.filter(g => allowedStatuses.has(g.status));
  const gigsToRemove = gigs.filter(g => !allowedStatuses.has(g.status));

  const totalOps = gigsToSync.length + gigsToRemove.length;
  let synced = 0;
  let failed = 0;
  let progress = 0;

  for (const gig of gigsToRemove) {
    try {
      await deleteGigFromCalendar(userId, gig.id);
    } catch {
      // Ignore delete failures for filtered-out gigs
    }
    progress++;
    onProgress?.(progress, totalOps);
  }

  for (const gig of gigsToSync) {
    try {
      const venue = (gig.participants as any[])?.find((p: any) => p.role === 'Venue')?.organization;
      const location = venue
        ? `${venue.name}${venue.address_line1 ? `, ${venue.address_line1}` : ''}${venue.city ? `, ${venue.city}` : ''}`
        : undefined;

      await syncGigToCalendar(userId, gig.id, {
        title: gig.title,
        start: gig.start,
        end: gig.end,
        timezone: gig.timezone,
        description: gig.notes,
        location,
      });
      synced++;
    } catch {
      failed++;
    }
    progress++;
    onProgress?.(progress, totalOps);
  }

  return { synced, failed, total: gigsToSync.length };
}

export async function updateGigSyncStatus(
  gigId: string,
  userId: string,
  updates: Partial<Omit<GigSyncStatus, 'id' | 'gig_id' | 'user_id' | 'created_at'>>
): Promise<GigSyncStatus> {
  const supabase = getSupabase();

  try {
    const { data, error } = await supabase
      .from('gig_sync_status')
      .upsert(
        {
          gig_id: gigId,
          user_id: userId,
          ...updates,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'gig_id,user_id' }
      )
      .select('id, gig_id, user_id, google_event_id, last_synced_at, sync_status, sync_error, created_at, updated_at')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    return handleApiError(error, 'update gig sync status');
  }
}