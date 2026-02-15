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

### [ ] Step: Conflict Detection Logic

Implement conflict detection for staff, equipment, and venue overlaps.

- Create conflictDetection.service.ts with overlap checking
- Add conflict queries to existing services
- Implement real-time validation in forms
- Write unit tests for conflict detection
- Run tests and linters

---

### [ ] Step: Conflict UI Integration

Integrate conflict warnings into calendar views and gig screens.

- Add ConflictWarning component
- Display conflicts in calendar grid and gig details
- Add resolution options and override capabilities
- Update existing gig screens with conflict indicators
- Write component tests
- Run tests and manual verification

---

### [ ] Step: Calendar Integration Settings

Create settings screen for Google Calendar integration configuration.

- Implement CalendarIntegrationSettings component
- Add sync settings (frequency, filters)
- Display sync logs and connection status
- Integrate with existing settings navigation
- Write tests and verify UI

---

### [ ] Step: Route and Navigation Updates

Update app routing and navigation to include calendar features.

- Add calendar routes to App.tsx
- Update navigation menus
- Add calendar links to gig screens
- Test navigation flow

---

### [ ] Step: Final Testing and Verification

Perform comprehensive testing and create implementation report.

- Run full test suite (npm test)
- Manual testing of all features
- Performance testing for calendar views
- Write report.md with implementation details and challenges
- Final lint and typecheck
