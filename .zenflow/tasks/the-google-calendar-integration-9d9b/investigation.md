# Investigation: Google Calendar Integration Issues

## Bug Summary
The Google Calendar integration is failing in both development and production environments. Users report:
1. `403 Forbidden` errors when attempting to list calendars.
2. `406 Not Acceptable` errors when querying `user_google_calendar_settings` and `gig_sync_status`.
3. Warnings about unverified app during OAuth flow.
4. Failures in syncing gigs for all participants due to RLS and architectural limitations.

## Root Cause Analysis

### 1. 403 Forbidden (Calendar List)
The Edge Function `/integrations/google-calendar/calendars` requests `calendarList` with `minAccessRole=writer`. 
- **Finding**: This filter often requires the full `https://www.googleapis.com/auth/calendar` scope. The app currently requests `calendar.readonly` and `calendar.events`.
- **Finding**: Some users may only have read access to their primary calendar or the selected calendar, causing Google to reject the `writer` filter if the scope doesn't support it or if no such calendars exist.

### 2. 406 Not Acceptable (Supabase Queries)
The frontend uses `.maybeSingle()` or `.single()` for queries that are returning multiple rows or encountering RLS issues.
- **`user_google_calendar_settings`**: The `UNIQUE(user_id, calendar_id)` constraint allows multiple rows per `user_id` if `calendar_id` differs. The code assumes 1 row per user, and `.maybeSingle()` fails with `406` if duplicates exist.
- **`gig_sync_status`**: Similar issue if duplicate records somehow exist (e.g., if the unique constraint was missing or if `upsert` logic failed).
- **RLS**: If RLS hides rows, `insert` might conflict with hidden rows, or `update` might affect 0 rows while `.single()` expects 1.

### 3. sync_status Enum Mismatch
- **Finding**: The database enum `sync_status` only contains `('pending', 'synced', 'failed')`.
- **Finding**: The Edge Function and frontend code attempt to use `'updated'` and `'removed'`, which are added in a later migration (`20260221...`). If this migration hasn't been applied or if the code is out of sync with the DB state, it will fail.

### 4. All-Day Event Logic
- **Finding**: The current detection logic uses `Date.getHours()` which is UTC-based in the Edge Function. This fails for gigs in other timezones where "midnight" in local time is not midnight in UTC.

### 5. Multi-User Sync (RLS)
- **Finding**: Client-side syncing only works for the current user. When a gig is updated, it should sync for all participants.
- **Finding**: The current Edge Function implementation attempts this but uses `supabaseAdmin` to bypass RLS, which is correct, but it relies on `user_google_calendar_settings` being globally readable or queried via admin.

## Proposed Solution

### 1. Fix OAuth Scopes and Calendar Listing
- Broaden requested scopes to include `https://www.googleapis.com/auth/calendar` if necessary, or better:
- Remove `minAccessRole=writer` from the Google API call and filter the results in the Edge Function or frontend to avoid 403s.

### 2. Database Integrity and Robustness
- Add a migration to change `UNIQUE(user_id, calendar_id)` to `UNIQUE(user_id)` in `user_google_calendar_settings` to enforce the "one calendar per user" rule.
- Replace `.single()` with `.maybeSingle()` in all non-insert settings queries.
- Use `upsert()` instead of `insert/update` in the frontend to avoid race conditions and RLS-hidden conflicts.

### 3. Enum Consistency
- Ensure all environments have the updated `sync_status` enum.
- Update the migration history if needed.

### 4. Improve All-Day Logic
- Use the gig's `timezone` field to correctly identify if an event starts/ends at midnight in its local time.

### 5. Server-Side Sync Optimization
- Ensure the Edge Function route `/sync-gig-all-users` is robustly handling token refreshes and batching updates.
- Verify that the `service_role` key is correctly used to bypass RLS for multi-user synchronization.
