# Technical Specification: Google Calendar Integration

## Task Assessment
**Difficulty Level**: Hard  
**Rationale**: This feature involves multiple complex components including external API integration (Google Calendar API), new UI views (calendar displays), conflict detection algorithms, OAuth authentication flows, and data synchronization logic. It requires careful handling of timezones, error states, and user permissions.

## Technical Context
- **Language**: TypeScript
- **Frontend Framework**: React 18.3.1 with hooks
- **UI Library**: Shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS 4.0
- **Backend**: Supabase (PostgreSQL database + Edge Functions in Deno 2)
- **Authentication**: Supabase Auth with Google OAuth provider
- **State Management**: React Context (AuthContext, NavigationContext)
- **Testing**: Vitest with @testing-library/react
- **Build Tool**: Vite 6.3.5

## Implementation Approach

### 1. Calendar Views
- Use `react-big-calendar` library for Month/Week views (follows existing dependency patterns)
- Build custom Day view component for detailed hour-by-hour display
- Integrate with existing date utilities (`src/utils/dateUtils.ts`)
- Follow existing component patterns from `src/components/gigs/`

### 2. Google Calendar Integration
- Leverage existing Supabase Auth Google provider for OAuth
- Implement Google Calendar API v3 client using `googleapis` library (add to dependencies)
- Store OAuth tokens securely in Supabase (follow existing auth patterns)
- Implement one-way sync: GigManager → Google Calendar
- Handle rate limiting and error recovery

### 3. Conflict Detection
- Add conflict detection logic to existing services
- Query overlapping assignments using existing database schema
- Display warnings in calendar views and gig detail screens
- Follow existing validation patterns from form utilities

### 4. Data Synchronization
- Trigger sync on gig create/update/delete operations
- Include navigation links in Google Calendar events
- Handle timezone conversions properly
- Implement retry logic for failed syncs

## Source Code Structure Changes

### New Files
- `src/components/calendar/CalendarScreen.tsx` - Main calendar view component
- `src/components/calendar/MonthView.tsx` - Month calendar grid
- `src/components/calendar/WeekView.tsx` - Week calendar display
- `src/components/calendar/DayView.tsx` - Day calendar display
- `src/components/calendar/CalendarFilters.tsx` - Filter panel component
- `src/components/calendar/ConflictWarning.tsx` - Conflict display component
- `src/components/settings/CalendarIntegrationSettings.tsx` - Settings screen
- `src/services/googleCalendar.service.ts` - Google Calendar API client
- `src/services/conflictDetection.service.ts` - Conflict checking logic
- `src/utils/calendarUtils.ts` - Calendar-specific utilities
- `supabase/functions/sync-google-calendar/index.ts` - Edge function for sync

### Modified Files
- `src/services/gig.service.ts` - Add sync hooks on gig operations
- `src/components/GigDetailScreen.tsx` - Add conflict warnings and export options
- `src/components/GigListScreen.tsx` - Add calendar navigation
- `src/App.tsx` - Add calendar routes
- `src/utils/dateUtils.ts` - Extend with calendar-specific date functions

## Data Model / API / Interface Changes

### New Database Tables
```sql
-- User Google Calendar settings
CREATE TABLE user_google_calendar_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  google_calendar_id TEXT NOT NULL,
  sync_enabled BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Gig sync status (optional, for tracking)
CREATE TABLE gig_sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id UUID REFERENCES gigs(id) ON DELETE CASCADE,
  google_event_id TEXT,
  last_synced_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'pending', -- pending, synced, error
  UNIQUE(gig_id)
);
```

### New API Endpoints
- `POST /api/google-calendar/connect` - Initiate OAuth flow
- `GET /api/google-calendar/calendars` - List user's Google calendars
- `POST /api/google-calendar/sync` - Manual sync trigger
- `GET /api/conflicts/check` - Check conflicts for a gig
- `GET /api/calendar/events` - Get gigs in calendar format

### Interface Changes
- Extend `Gig` interface with sync status
- Add `CalendarSettings` interface for user preferences
- Add `Conflict` interface for conflict data

## Verification Approach

### Unit Tests
- Test conflict detection logic in `conflictDetection.service.test.ts`
- Test Google Calendar API client in `googleCalendar.service.test.ts`
- Test calendar utilities in `calendarUtils.test.ts`
- Test calendar components with mocked data

### Integration Tests
- Test OAuth flow with Supabase Auth
- Test sync operations with mock Google API
- Test conflict detection with database queries

### End-to-End Tests
- Calendar view navigation and filtering
- Gig creation with conflict warnings
- Google Calendar sync workflow

### Manual Verification Steps
1. Run `npm run lint` and `npm run typecheck` after changes
2. Test calendar views with sample data
3. Verify OAuth flow in development environment
4. Test sync with a test Google Calendar
5. Check conflict detection with overlapping gigs

### Performance Considerations
- Lazy load calendar components
- Implement pagination for large date ranges
- Cache Google Calendar API responses
- Optimize conflict detection queries with proper indexing

### Security Considerations
- Store OAuth tokens encrypted in Supabase
- Validate all API inputs
- Implement rate limiting for sync operations
- Follow existing security patterns (no secrets in client code)