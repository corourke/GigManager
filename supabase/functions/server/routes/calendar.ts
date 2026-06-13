import type { App } from '../lib/types.ts';
import { requireUser } from '../lib/auth.ts';
import { requireGigAccess } from '../lib/gigAccess.ts';
import { supabaseAdmin } from '../lib/supabaseAdmin.ts';

// Google Calendar integration. All routes operate on the caller's own OAuth
// tokens (per-user); sync-gig-all-users additionally requires gig access (Q-D).
export function registerCalendar(app: App) {
  app.post('/integrations/google-calendar/exchange-token', requireUser, async (c) => {
    const { code, redirect_uri } = await c.req.json();
    if (!code || !redirect_uri) {
      return c.json({ error: 'code and redirect_uri are required' }, 400);
    }
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      return c.json({ error: 'Google Calendar credentials not configured on server' }, 500);
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri, grant_type: 'authorization_code' }),
    });
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      console.error('Google token exchange error:', tokenData);
      return c.json({ error: 'Token exchange failed', details: tokenData.error_description || tokenData.error }, 400);
    }
    return c.json({ access_token: tokenData.access_token, refresh_token: tokenData.refresh_token, expires_in: tokenData.expires_in });
  });

  app.post('/integrations/google-calendar/refresh-token', requireUser, async (c) => {
    const { refresh_token } = await c.req.json();
    if (!refresh_token) {
      return c.json({ error: 'refresh_token is required' }, 400);
    }
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      return c.json({ error: 'Google Calendar credentials not configured on server' }, 500);
    }
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ refresh_token, client_id: clientId, client_secret: clientSecret, grant_type: 'refresh_token' }),
    });
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      console.error('Google token refresh error:', tokenData);
      return c.json({ error: 'Token refresh failed', details: tokenData.error_description || tokenData.error }, 400);
    }
    return c.json({ access_token: tokenData.access_token, expires_in: tokenData.expires_in });
  });

  app.post('/integrations/google-calendar/calendars', requireUser, async (c) => {
    const { access_token: accessToken } = await c.req.json();
    if (!accessToken) {
      return c.json({ error: 'access_token is required' }, 400);
    }
    const calResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const calData = await calResponse.json();
    if (!calResponse.ok) {
      console.error('Google Calendar list error:', calData);
      return c.json({ error: 'Failed to list calendars', details: calData.error?.message }, calResponse.status as any);
    }
    const calendars = (calData.items || []).map((cal: any) => ({
      id: cal.id, name: cal.summary || 'Unnamed Calendar', primary: cal.primary || false, accessRole: cal.accessRole || 'reader',
    }));
    return c.json({ calendars });
  });

  app.post('/integrations/google-calendar/events', requireUser, async (c) => {
    const { access_token, calendar_id, event_data, event_id } = await c.req.json();
    if (!access_token || !calendar_id || !event_data) {
      return c.json({ error: 'access_token, calendar_id, and event_data are required' }, 400);
    }
    const apiUrl = event_id
      ? `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar_id)}/events/${encodeURIComponent(event_id)}`
      : `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar_id)}/events`;
    const method_ = event_id ? 'PUT' : 'POST';

    const eventResponse = await fetch(apiUrl, {
      method: method_,
      headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(event_data),
    });
    const eventResult = await eventResponse.json();
    if (!eventResponse.ok) {
      console.error('Google Calendar event error:', eventResult);
      return c.json({ error: 'Failed to create/update event', details: eventResult.error?.message }, eventResponse.status as any);
    }
    return c.json({ event_id: eventResult.id });
  });

  app.delete('/integrations/google-calendar/events', requireUser, async (c) => {
    const { access_token, calendar_id, event_id } = await c.req.json();
    if (!access_token || !calendar_id || !event_id) {
      return c.json({ error: 'access_token, calendar_id, and event_id are required' }, 400);
    }
    const deleteUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar_id)}/events/${encodeURIComponent(event_id)}`;
    const deleteResponse = await fetch(deleteUrl, { method: 'DELETE', headers: { Authorization: `Bearer ${access_token}` } });
    if (!deleteResponse.ok && deleteResponse.status !== 410) {
      const errorData = await deleteResponse.json().catch(() => ({}));
      console.error('Google Calendar delete error:', errorData);
      return c.json({ error: 'Failed to delete event', details: (errorData as any).error?.message }, deleteResponse.status as any);
    }
    return c.json({ success: true });
  });

  // Sync a gig to all relevant users' calendars. Q-D fix: requireGigAccess on
  // the body gig_id (was previously any-authenticated). Background work is
  // fire-and-forget, preserving the legacy behavior.
  app.post(
    '/integrations/google-calendar/sync-gig-all-users',
    requireUser,
    requireGigAccess(undefined, async (c) => (await c.req.json()).gig_id),
    async (c) => {
      const { gig_id } = await c.req.json();
      const origin = c.req.header('Origin') || '*';

      (async () => {
        try {
          const { data: gig, error: gigError } = await supabaseAdmin
            .from('gigs')
            .select(`*, participants:gig_participants(*, organization:organization_id(*)), staff_assignments:gig_staff_slots(assignments:gig_staff_assignments(user_id))`)
            .eq('id', gig_id).single();
          if (gigError || !gig) {
            console.error(`Error fetching gig ${gig_id} for sync:`, gigError);
            return;
          }

          const participantOrgIds = gig.participants?.map((p: any) => p.organization_id) || [];
          const { data: orgMembers } = await supabaseAdmin
            .from('organization_members').select('user_id').in('organization_id', participantOrgIds);
          const assignedUserIds = gig.staff_assignments?.flatMap((s: any) => s.assignments?.map((a: any) => a.user_id)) || [];
          const memberUserIds = orgMembers?.map((m: any) => m.user_id) || [];
          const relevantUserIds = [...new Set([...assignedUserIds, ...memberUserIds])];
          if (relevantUserIds.length === 0) return;

          const { data: userSettings, error: settingsError } = await supabaseAdmin
            .from('user_google_calendar_settings').select('*').eq('is_enabled', true).in('user_id', relevantUserIds);
          if (settingsError) {
            console.error('Error fetching calendar settings for sync:', settingsError);
            return;
          }
          if (!userSettings || userSettings.length === 0) return;

          const venue = gig.participants?.find((p: any) => p.role === 'Venue')?.organization;
          const location = venue
            ? `${venue.name}${venue.address_line1 ? `, ${venue.address_line1}` : ''}${venue.city ? `, ${venue.city}` : ''}`
            : undefined;

          const startDate = new Date(gig.start);
          const endDate = gig.end ? new Date(gig.end) : null;
          const isMidnight = (date: Date, timeZone: string) => {
            try {
              const formatter = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false });
              const parts = formatter.formatToParts(date);
              const hour = parts.find((p) => p.type === 'hour')?.value;
              const minute = parts.find((p) => p.type === 'minute')?.value;
              const second = parts.find((p) => p.type === 'second')?.value;
              return (hour === '00' || hour === '24') && minute === '00' && second === '00';
            } catch {
              return date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0;
            }
          };
          const isAllDay = endDate
            ? (isMidnight(startDate, gig.timezone) && isMidnight(endDate, gig.timezone) && (endDate.getTime() - startDate.getTime() >= 86400000))
            : isMidnight(startDate, gig.timezone);

          let startProp: Record<string, string>;
          let endProp: Record<string, string>;
          if (isAllDay) {
            startProp = { date: startDate.toISOString().split('T')[0] };
            endProp = { date: endDate ? endDate.toISOString().split('T')[0] : new Date(startDate.getTime() + 86400000).toISOString().split('T')[0] };
          } else {
            startProp = { dateTime: startDate.toISOString(), timeZone: gig.timezone };
            const effectiveEnd = endDate && endDate.getTime() > startDate.getTime() ? endDate : new Date(startDate.getTime() + 3600000);
            endProp = { dateTime: effectiveEnd.toISOString(), timeZone: gig.timezone };
          }

          const eventData = {
            summary: gig.title,
            description: `${gig.notes || ''}\n\n[View in GigWrangler](${origin || 'http://localhost:3000'}/gigs/${gig_id})`,
            start: startProp,
            end: endProp,
            location,
          };

          const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
          const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

          for (const settings of userSettings) {
            try {
              let accessToken = settings.access_token;
              if (new Date(settings.token_expires_at) <= new Date()) {
                if (!clientId || !clientSecret) { console.error('Missing Google credentials for token refresh'); continue; }
                const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                  body: new URLSearchParams({ refresh_token: settings.refresh_token, client_id: clientId, client_secret: clientSecret, grant_type: 'refresh_token' }),
                });
                if (tokenResponse.ok) {
                  const tokenData = await tokenResponse.json();
                  accessToken = tokenData.access_token;
                  await supabaseAdmin.from('user_google_calendar_settings').update({
                    access_token: accessToken,
                    token_expires_at: new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString(),
                    updated_at: new Date().toISOString(),
                  }).eq('id', settings.id);
                } else {
                  console.error(`Failed to refresh token for user ${settings.user_id}`);
                  continue;
                }
              }

              const { data: existingSync } = await supabaseAdmin
                .from('gig_sync_status').select('google_event_id').eq('gig_id', gig_id).eq('user_id', settings.user_id).maybeSingle();

              const apiUrl = existingSync?.google_event_id
                ? `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(settings.calendar_id)}/events/${encodeURIComponent(existingSync.google_event_id)}`
                : `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(settings.calendar_id)}/events`;
              const method_ = existingSync?.google_event_id ? 'PUT' : 'POST';

              const eventResponse = await fetch(apiUrl, {
                method: method_,
                headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(eventData),
              });

              if (eventResponse.ok) {
                const eventResult = await eventResponse.json();
                await supabaseAdmin.from('gig_sync_status').upsert({
                  gig_id, user_id: settings.user_id, google_event_id: eventResult.id,
                  sync_status: existingSync?.google_event_id ? 'updated' : 'synced',
                  last_synced_at: new Date().toISOString(), sync_error: null,
                }, { onConflict: 'gig_id,user_id' });
              } else {
                const errData = await eventResponse.json().catch(() => ({}));
                await supabaseAdmin.from('gig_sync_status').upsert({
                  gig_id, user_id: settings.user_id, sync_status: 'failed',
                  sync_error: errData.error?.message || 'Google API error', last_synced_at: new Date().toISOString(),
                }, { onConflict: 'gig_id,user_id' });
              }
            } catch (userSyncError) {
              console.error(`Error syncing for user ${settings.user_id}:`, userSyncError);
            }
          }
        } catch (syncError) {
          console.error('Background sync failed:', syncError);
        }
      })();

      return c.json({ success: true, message: 'Sync process started' });
    }
  );
}
