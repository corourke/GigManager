# Spec and build

## Configuration
- **Artifacts Path**: {@artifacts_path} → `.zenflow/tasks/{task_id}`

---

## Agent Instructions

Ask the user questions when anything is unclear or needs their input. This includes:
- Ambiguous or incomplete requirements
- Technical decisions that affect architecture or user experience
- Trade-offs that require business context

Do not make assumptions on important decisions — get clarification first.

---

## Workflow Steps

### [x] Step: Technical Specification
<!-- chat-id: 883bee5c-99ae-47c0-b77f-379386ae6934 -->

Completed: Created technical specification in spec.md assessing difficulty as "hard" due to multiple complex components including external API integration, new UI views, and synchronization logic.

---

### [x] Step: Database Schema Setup
<!-- chat-id: 90de5805-b70a-4085-b676-f84f2fffdc65 -->

Create database migrations for Google Calendar integration tables (user_google_calendar_settings, gig_sync_status).

- Create migration files in supabase/migrations/
- Apply migrations to development database
- Verify schema with database queries

---

### [x] Step: Calendar View Components
<!-- chat-id: 19af1a6c-760c-495d-974d-35ada08238e3 -->

Implement Month, Week, and Day calendar view components using react-big-calendar.

- Install react-big-calendar dependency
- Create CalendarScreen component with integrated Month/Week/Day views using react-big-calendar's built-in views (more maintainable than separate components)
- Integrate with existing gig data and date utilities
- Add navigation and basic filtering (status-based)
- Write unit tests for components with proper async handling
- Run npm run lint and npm run typecheck

---

### [x] Step: Calendar Filters and Navigation
<!-- chat-id: aaac9a29-7363-4e5a-9ef8-cb1d16d2e64a -->

Add advanced filtering and navigation controls to calendar views.

- Implement CalendarFilters component with status, venue, staff, act filters
- Add date picker and view type toggles
- Integrate filters with existing gig service
- Write unit tests for filter logic
- Run tests and linters

---

### [x] Step: Google Calendar OAuth Integration
<!-- chat-id: ccd2ac04-ce10-4b72-8028-5feb3b4458a2 -->

Implement OAuth flow and Google Calendar API client.

- Set up Google Calendar API credentials
- Create googleCalendar.service.ts with OAuth and API methods
- Store tokens securely in Supabase
- Add settings screen for calendar selection
- Write unit tests for API client
- Test OAuth flow manually

---

### [x] Step: One-Way Sync Implementation
<!-- chat-id: cc40415c-b4ee-49cf-9fab-f200a38efc2c -->

Implement automatic sync of gigs to Google Calendar.

- Add sync hooks to gig.service.ts for create/update/delete
- Create sync logic with event creation/updates/deletion
- Include navigation links in calendar events
- Handle timezone conversions and error recovery
- Write integration tests for sync operations
- Run tests and verify sync with test calendar

---

### [x] Step: Conflict Detection Logic
<!-- chat-id: 810a232b-474d-4386-a850-4362e0749dc0 -->

Implement conflict detection for staff, equipment, and venue overlaps.

- Create conflictDetection.service.ts with overlap checking
- Add conflict queries to existing services
- Implement real-time validation in forms
- Write unit tests for conflict detection
- Run tests and linters

---

### [x] Step: Conflict UI Integration
<!-- chat-id: cc848680-b492-402f-951d-6a02430b9002 -->

Completed: Integrated conflict warnings into calendar views and gig screens.

- Created ConflictWarning component with alert and card display modes
- Added conflict detection to CalendarScreen with distinctive red coloring for conflicting gigs
- Added conflict warnings above calendar display and in calendar grid
- Updated GigDetailScreen to show conflict indicators
- Added resolution options and override capabilities (placeholder implementation)
- Wrote comprehensive unit tests for ConflictWarning component
- Ran full test suite and build verification - all tests pass

---

### [x] Step: Calendar Integration Settings
<!-- chat-id: 7fa8735d-fbaa-42f3-80ca-4e73ece29600 -->

Completed: Created full settings screen for Google Calendar integration configuration.

- Enhanced CalendarIntegrationSettings component with sync settings (frequency, status filters), sync status summary, and sync log display
- Added getSyncLogs and getSyncStatusSummary service functions to googleCalendar.service.ts
- Created SettingsScreen component accessible from AppHeader Settings menu
- Added 'settings' route to App.tsx and wired navigation via NavigationContext
- Wired AppHeader Settings dropdown to navigate to settings screen
- Auth callback now redirects to settings screen after completion
- Wrote 10 comprehensive unit tests for CalendarIntegrationSettings (all passing)
- Full test suite passes (172 tests across 29 files), build succeeds

---

### [x] Step: Route and Navigation Updates
<!-- chat-id: ac66ccad-3428-4598-bda7-403593574ff6 -->

Completed: Updated app routing and navigation to include calendar features.

- Calendar route already existed in App.tsx (calendar route type and CalendarScreen rendering)
- Added onNavigateToCalendar to NavigationContext interface and provider
- Updated NavigationMenu component to include Calendar navigation item with proper active state detection
- Updated AppHeader to pass calendar navigation to NavigationMenu
- Added Calendar navigation to NavigationProvider in App.tsx
- Updated CalendarScreen to pass currentRoute="calendar" to AppHeader
- Added "Calendar View" button to GigListScreen PageHeader actions
- Added "View in Calendar" button to GigDetailScreen action buttons
- Updated App.tsx to pass onNavigateToCalendar to both GigListScreen and GigDetailScreen
- Ran full build and test suite - all tests pass (172 tests across 29 files)

---

### [x] Step: Final Testing and Verification
<!-- chat-id: b961b857-5916-4643-9329-e987b588986c -->

Completed: All verification checks passed.

- Run full test suite: **172 tests passed** across 29 test files
- Production build: **Successful** (3325 modules, no errors)
- No lint/typecheck scripts available; build validates TypeScript
- Report written to report.md with implementation details
- Identified 5 untracked files that need staging and migration that needs applying
