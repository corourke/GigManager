import { createClient } from '../utils/supabase/client';
import { UserGoogleCalendarSettings, GigSyncStatus } from '../utils/supabase/types';
import { handleApiError } from '../utils/api-error-utils';

const getSupabase = () => createClient();

// Google OAuth configuration
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;

// Google Calendar API scopes
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
];

// For client-side OAuth, we'll use a simpler approach
// In a production app, this would be handled by a backend service
const getOAuth2Client = () => {
  // This is a placeholder - in production, OAuth should be handled server-side
  // For now, we'll implement a basic flow that can be expanded
  return {
    generateAuthUrl: (options: any) => {
      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: `${window.location.origin}/auth/google-calendar/callback`,
        scope: SCOPES.join(' '),
        response_type: 'code',
        access_type: 'offline',
        prompt: 'consent',
      });
      return `https://accounts.google.com/oauth/authorize?${params.toString()}`;
    },
    getToken: async (code: string) => {
      // This should be done server-side in production
      // For now, return a mock response
      return {
        tokens: {
          access_token: 'mock_access_token',
          refresh_token: 'mock_refresh_token',
          expiry_date: Date.now() + 3600000,
        }
      };
    },
    setCredentials: () => {},
    refreshAccessToken: async () => ({
      credentials: {
        access_token: 'refreshed_access_token',
        expiry_date: Date.now() + 3600000,
      }
    }),
  };
};

/**
 * Generate Google OAuth authorization URL
 */
export async function getGoogleAuthUrl(): Promise<string> {
  const oauth2Client = getOAuth2Client();

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // Force refresh token
  });

  return authUrl;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_at: Date;
}> {
  const oauth2Client = getOAuth2Client();

  try {
    const { tokens } = await oauth2Client.getToken(code);
    await oauth2Client.setCredentials(tokens);

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Failed to obtain required tokens');
    }

    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: new Date(tokens.expiry_date || Date.now() + 3600000), // Default 1 hour
    };
  } catch (error) {
    throw handleApiError(error, 'exchange authorization code for tokens');
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_at: Date;
}> {
  const oauth2Client = getOAuth2Client();

  try {
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();
    await oauth2Client.setCredentials(credentials);

    if (!credentials.access_token) {
      throw new Error('Failed to refresh access token');
    }

    return {
      access_token: credentials.access_token,
      expires_at: new Date(credentials.expiry_date || Date.now() + 3600000),
    };
  } catch (error) {
    throw handleApiError(error, 'refresh access token');
  }
}

/**
 * Get authenticated Google Calendar API client
 */
export async function getCalendarClient(userId: string): Promise<any> {
  const settings = await getUserGoogleCalendarSettings(userId);

  if (!settings || !settings.is_enabled) {
    throw new Error('Google Calendar integration not configured or disabled');
  }

  // Check if token is expired and refresh if needed
  let accessToken = settings.access_token;
  if (new Date(settings.token_expires_at) <= new Date()) {
    const refreshed = await refreshAccessToken(settings.refresh_token);
    accessToken = refreshed.access_token;

    // Update stored token
    await updateUserGoogleCalendarSettings(userId, {
      access_token: refreshed.access_token,
      token_expires_at: refreshed.expires_at.toISOString(),
    });
  }

  // Return a mock client for now - in production, this would use gapi or fetch
  return {
    calendarList: {
      list: async () => ({
        data: {
          items: [
            {
              id: settings.calendar_id,
              summary: settings.calendar_name || 'Selected Calendar',
              primary: false,
              accessRole: 'owner',
            }
          ]
        }
      })
    },
    events: {
      insert: async () => ({ data: { id: `event_${Date.now()}` } }),
      update: async () => ({ data: { id: 'existing_event' } }),
      delete: async () => ({}),
    }
  };
}

/**
 * Get user's Google Calendar settings
 */
export async function getUserGoogleCalendarSettings(userId: string): Promise<UserGoogleCalendarSettings | null> {
  const supabase = getSupabase();

  try {
    const { data, error } = await supabase
      .from('user_google_calendar_settings')
      .select('*')
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
    const { data, error } = await supabase
      .from('user_google_calendar_settings')
      .upsert({
        user_id: userId,
        ...settings,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
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
      .select()
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

/**
 * Get user's available Google Calendars
 */
export async function getUserCalendars(userId: string): Promise<Array<{
  id: string;
  name: string;
  primary?: boolean;
  accessRole: string;
}>> {
  const calendar = await getCalendarClient(userId);

  try {
    const response = await calendar.calendarList.list();
    return (response.data.items || []).map(cal => ({
      id: cal.id!,
      name: cal.summary || 'Unnamed Calendar',
      primary: cal.primary || false,
      accessRole: cal.accessRole || 'reader',
    }));
  } catch (error) {
    throw handleApiError(error, 'get user calendars');
  }
}

/**
 * Create or update a Google Calendar event for a gig
 */
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
  const calendar = await getCalendarClient(userId);
  const settings = await getUserGoogleCalendarSettings(userId);

  if (!settings) {
    throw new Error('Google Calendar settings not found');
  }

  try {
    // Check if event already exists
    const existingSync = await getGigSyncStatus(gigId, userId);

    const eventData = {
      summary: gigData.title,
      description: `${gigData.description || ''}\n\n[View in GigManager](${window.location.origin}/gigs/${gigId})`,
      start: {
        dateTime: new Date(gigData.start).toISOString(),
        timeZone: gigData.timezone,
      },
      end: {
        dateTime: new Date(gigData.end).toISOString(),
        timeZone: gigData.timezone,
      },
      location: gigData.location,
    };

    let eventId: string;

    if (existingSync?.google_event_id) {
      // Update existing event
      await calendar.events.update({
        calendarId: settings.calendar_id,
        eventId: existingSync.google_event_id,
        requestBody: eventData,
      });
      eventId = existingSync.google_event_id;
    } else {
      // Create new event
      const response = await calendar.events.insert({
        calendarId: settings.calendar_id,
        requestBody: eventData,
      });
      eventId = response.data.id!;
    }

    // Update sync status
    await updateGigSyncStatus(gigId, userId, {
      google_event_id: eventId,
      sync_status: 'synced',
      last_synced_at: new Date().toISOString(),
      sync_error: null,
    });

    return { eventId, syncedAt: new Date() };
  } catch (error) {
    // Update sync status with error
    await updateGigSyncStatus(gigId, userId, {
      sync_status: 'failed',
      sync_error: error instanceof Error ? error.message : 'Unknown error',
      last_synced_at: new Date().toISOString(),
    });
    throw handleApiError(error, 'sync gig to calendar');
  }
}

/**
 * Delete a Google Calendar event for a gig
 */
export async function deleteGigFromCalendar(userId: string, gigId: string): Promise<void> {
  const calendar = await getCalendarClient(userId);
  const settings = await getUserGoogleCalendarSettings(userId);
  const syncStatus = await getGigSyncStatus(gigId, userId);

  if (!settings || !syncStatus?.google_event_id) {
    return; // Nothing to delete
  }

  try {
    await calendar.events.delete({
      calendarId: settings.calendar_id,
      eventId: syncStatus.google_event_id,
    });

    // Update sync status
    await updateGigSyncStatus(gigId, userId, {
      google_event_id: null,
      sync_status: 'synced',
      last_synced_at: new Date().toISOString(),
      sync_error: null,
    });
  } catch (error) {
    // If event doesn't exist, just update status
    if (error instanceof Error && error.message.includes('404')) {
      await updateGigSyncStatus(gigId, userId, {
        google_event_id: null,
        sync_status: 'synced',
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
      .select('*')
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
): Promise<GigSyncStatus[]> {
  const supabase = getSupabase();

  try {
    const { data, error } = await supabase
      .from('gig_sync_status')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    return handleApiError(error, 'get sync logs');
  }
}

/**
 * Get sync status summary for a user
 */
export async function getSyncStatusSummary(userId: string): Promise<{
  total: number;
  synced: number;
  pending: number;
  failed: number;
  lastSyncedAt: string | null;
}> {
  const supabase = getSupabase();

  try {
    const { data, error } = await supabase
      .from('gig_sync_status')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    const logs = data || [];
    const synced = logs.filter(l => l.sync_status === 'synced').length;
    const pending = logs.filter(l => l.sync_status === 'pending').length;
    const failed = logs.filter(l => l.sync_status === 'failed').length;

    const lastSynced = logs
      .filter(l => l.last_synced_at)
      .sort((a, b) => new Date(b.last_synced_at!).getTime() - new Date(a.last_synced_at!).getTime())[0];

    return {
      total: logs.length,
      synced,
      pending,
      failed,
      lastSyncedAt: lastSynced?.last_synced_at || null,
    };
  } catch (error) {
    return handleApiError(error, 'get sync status summary');
  }
}

/**
 * Update gig sync status
 */
export async function updateGigSyncStatus(
  gigId: string,
  userId: string,
  updates: Partial<Omit<GigSyncStatus, 'id' | 'gig_id' | 'user_id' | 'created_at'>>
): Promise<GigSyncStatus> {
  const supabase = getSupabase();

  try {
    const { data, error } = await supabase
      .from('gig_sync_status')
      .upsert({
        gig_id: gigId,
        user_id: userId,
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    return handleApiError(error, 'update gig sync status');
  }
}