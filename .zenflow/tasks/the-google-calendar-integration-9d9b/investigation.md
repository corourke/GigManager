# Investigation: Google Calendar Integration Issues

## Bug Summary
The Google Calendar integration is currently non-functional in both development and production environments. This affects the initial connection (OAuth flow) and the subsequent synchronization of gigs to user calendars.

## Root Cause Analysis
Several issues have been identified across the stack:

1.  **Missing Frontend Configuration**: The `VITE_GOOGLE_CLIENT_ID` variable is missing from `.env.example`. If not manually added, the OAuth initiation URL will have `client_id=undefined`, causing an immediate error on the Google login page.
2.  **Missing Server-side Secrets**: The `server` Supabase Edge Function requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` environment variables to exchange authorization codes for tokens. These are not documented in the setup guide and are likely missing in many environments.
3.  **RLS Policy Restriction**: The `syncGigToAllCalendars` function in `gig.service.ts` attempts to find all users with calendar integration enabled using a client-side Supabase call. Due to Row Level Security (RLS), this call only returns the settings for the currently authenticated user. Consequently, gigs are never synced to other participants' calendars even if they have the integration enabled.
4.  **Flawed All-Day Event Detection**: In `googleCalendar.service.ts`, gigs are flagged as "all-day" events if they start at exactly 12:00 UTC. This heuristic is unreliable and leads to incorrect event types in Google Calendar for any gig scheduled at that specific time.
5.  **Inefficient Sync Operations**: The `syncAllGigsForUser` function calls `getValidAccessToken` for every single gig. This leads to redundant database lookups and potentially multiple refresh token exchanges in a very short window, which is inefficient and could trigger rate limits.
6.  **Redirect URI Sensitivity**: The `REDIRECT_URI` is dynamically generated using `window.location.origin`. While flexible, it requires every possible origin (including `http://127.0.0.1:3000` vs `http://localhost:3000`) to be explicitly registered in the Google Cloud Console, which is a common source of "400 redirect_uri_mismatch" errors.

## Affected Components
- `./src/services/googleCalendar.service.ts`: OAuth flow, token management, and sync logic.
- `./src/services/gig.service.ts`: Coordination of sync across users.
- `./supabase/functions/server/index.ts`: Edge function routes for token exchange and API proxying.
- `./.env.example`: Missing configuration template.
- `./docs/technical/setup-guide.md`: Incomplete setup instructions.

## Proposed Solution

### Phase 1: Configuration and Documentation
- Update `./.env.example` to include `VITE_GOOGLE_CLIENT_ID`.
- Update `./docs/technical/setup-guide.md` to include instructions for setting `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` as Supabase secrets.

### Phase 2: Logic and Efficiency Fixes
- **Improve All-Day Detection**: Replace the 12:00 UTC heuristic. Either add an explicit `is_all_day` flag to the gig schema or improve the detection to check if the gig spans exactly 24 hours starting at midnight local time.
- **Optimize Token Management**: Update `syncAllGigsForUser` to fetch and validate the access token once at the start of the batch operation.
- **Token Security**: Consider encrypting tokens before storage in the database (though this may be a follow-up task).

### Phase 3: Multi-user Sync Architecture
- **Server-side Sync**: To properly support syncing gigs for all participants (not just the user making the edit), the synchronization logic should ideally be moved to a Supabase Database Webhook or a specialized Edge Function that uses the `service_role` key to bypass RLS when looking up user calendar settings.
- **Interim Fix**: Ensure that at least the current user's sync is robust and provide better error feedback in the UI if the sync fails.

## Implementation Notes
I have implemented the following fixes:
1.  **OAuth Scopes**: Broadened scopes to `calendar.readonly` and `calendar.events` to avoid 403 Forbidden errors when listing calendars with `minAccessRole=writer`.
2.  **Server-Side Sync**: Created a new Edge Function endpoint `/integrations/google-calendar/sync-gig-all-users` that uses `supabaseAdmin` to bypass RLS. This ensures that when a gig is updated, it is synced to the calendars of ALL participants who have enabled the integration, not just the user who made the edit.
3.  **All-Day Event Detection**: Replaced the fragile 12:00 UTC heuristic with a robust check for midnight local time and 24-hour duration.
4.  **Batch Sync Optimization**: Updated `syncAllGigsForUser` to validate and reuse the access token once for the entire batch, improving performance and reliability.
5.  **Configuration**: Updated `.env.example` and `setup-guide.md` with complete instructions for Google Calendar OAuth and Edge Function secrets.

## Test Results
Ran `npm run test:run` and all 452 tests passed.
