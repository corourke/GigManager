# Full SDD workflow

## Configuration
- **Artifacts Path**: {@artifacts_path} → `.zenflow/tasks/{task_id}`

---

## Agent Instructions

If you are blocked and need user clarification, mark the current step with `[!]` in plan.md before stopping.

---

## Workflow Steps

### [x] Step: Requirements
<!-- chat-id: 5d99d062-b02e-4905-848b-1b4326ee5a43 -->

Create a Product Requirements Document (PRD) based on the feature description.

1. Review existing codebase to understand current architecture and patterns
2. Analyze the feature definition and identify unclear aspects
3. Ask the user for clarifications on aspects that significantly impact scope or user experience
4. Make reasonable decisions for minor details based on context and conventions
5. If user can't clarify, make a decision, state the assumption, and continue

Save the PRD to `{@artifacts_path}/requirements.md`.

### [x] Step: Technical Specification
<!-- chat-id: d9cf4578-95e8-4062-91b7-61fe4652399e -->

Create a technical specification based on the PRD in `{@artifacts_path}/requirements.md`.

1. Review existing codebase architecture and identify reusable components
2. Define the implementation approach

Save to `{@artifacts_path}/spec.md` with:
- Technical context (language, dependencies)
- Implementation approach referencing existing code patterns
- Source code structure changes
- Data model / API / interface changes
- Delivery phases (incremental, testable milestones)
- Verification approach using project lint/test commands

### [x] Step: Planning
<!-- chat-id: a8cb25b5-2e19-4c58-b631-8fc7a488697f -->

Broke spec into 5 implementation steps (matching delivery phases). Each step includes verification via `npm run build && npm run test:run`.

### [x] Step: Dead Code Removal (C1–C4)
<!-- chat-id: ec3488e9-e83e-47de-9eb8-8d55647874c3 -->

Remove all identified unused code. Low risk — no callers to break.

- [x] **C1**: Delete `src/utils/role-helper.tsx` (unused `getRoleSelectItems()`)
- [x] **C2**: Remove `getSession()`, `getCurrentUser()`, `signOut()` from `src/utils/supabase/client.tsx` (keep `createClient` export)
- [x] **C3**: Remove `DbGigBid` type alias from `src/utils/supabase/types.tsx:149`
- [x] **C4**: Remove `DbKvStore` interface from `src/utils/supabase/types.tsx:168–171`
- [x] Verify: `npm run build && npm run test:run` — all 193 tests pass

### [x] Step: Code Deduplication (C5–C7)
<!-- chat-id: c52a1a31-5471-4617-abc9-4aa5a0cec43d -->

Extract shared constants and helpers to reduce repetition. Medium risk — changes import structure.

- [x] **C7**: Added `UUID_REGEX` to existing `src/utils/validation-utils.ts`
- [x] **C6**: Created `src/utils/supabase/auth-utils.ts` with `requireAuth()` helper that returns `{ supabase, session, user }`
- [x] **C5**: Extracted `SETTINGS_COLS` module-level constant in `src/services/googleCalendar.service.ts`, replaced 4 inline occurrences
- [x] **C6 cont.**: Replaced inline auth-check boilerplate in `gig.service.ts` (8), `asset.service.ts` (3), `kit.service.ts` (3), `user.service.ts` (2) — 16 callsites total with `requireAuth()`
- [x] **C7 cont.**: Replaced 3 inline UUID regexes in `gig.service.ts` with imported `UUID_REGEX` (including `.match()` → `UUID_REGEX.test()` in `updateGigFinancials`)
- [x] No test mock changes needed — existing `createClient` mocks work transparently with `requireAuth()`
- [x] Verify: `npm run build && npm run test:run` — all 200 tests pass across 30 test files

### [x] Step: Security Fixes (C8–C9)
<!-- chat-id: 51fc244f-cd23-4fd6-82d2-b38228e4cd2d -->

Sanitize LIKE wildcard input and move access token out of URL. Medium risk — changes runtime behavior.

- [x] **C8**: Add `sanitizeLikeInput()` to `src/utils/validation-utils.ts` — escapes `%`, `_`, `\` in search strings
- [x] **C8 cont.**: Apply `sanitizeLikeInput()` in `asset.service.ts:36`, `kit.service.ts:32`, `user.service.ts:165`, `organization.service.ts:29`
- [x] **C9**: In `googleCalendar.service.ts:254`, change `fetchUserCalendars` to pass access token via POST body instead of URL query param
- [x] **C9 cont.**: Update `supabase/functions/server/index.ts` calendars endpoint to read token from request body
- [x] Add unit tests for `sanitizeLikeInput()` in a test file for `validation-utils.ts`
- [x] Verify: `npm run build && npm run test:run` — all 200 tests pass (7 new sanitizeLikeInput tests)

### [x] Step: Console.log Cleanup (C10)
<!-- chat-id: 1716512d-63a0-4017-a651-8a2f6259dea4 -->

Remove or gate production console statements. Low risk.

- [x] Remove `console.log` from `App.tsx` (3 statements: `handleLogin`, `handleSelectOrganization`, `currentRoute`)
- [x] Gate `[TRACE]` logs in `AuthContext.tsx` behind `import.meta.env.DEV` (21 statements)
- [x] Gate `[TRACE]` logs in `LoginScreen.tsx` behind `import.meta.env.DEV` (6 statements)
- [x] Remove `console.log` from `Dashboard.tsx` (3 statements)
- [x] Remove `console.log` from `conflictDetection.service.ts` (7 statements + dead code cleanup)
- [x] Remove `console.log` from `CalendarScreen.tsx` (1), `GigListScreen.tsx` (1), `OrganizationScreen.tsx` (1 → converted to `console.warn`)
- [x] Keep: `console.warn` in `dateUtils.ts`, `console.error` in `api-error-utils.ts` and service catch blocks, `console.log` in test files
- [x] Verify: `npm run build && npm run test:run` — all 200 tests pass

### [x] Step: Documentation Fixes (D1–D15, C11–C13)
<!-- chat-id: 2a0a3171-6d30-48a2-ae29-a4f8aa4b16ea -->

Fix all documentation errors, fill gaps, add known-issue and future-refactoring notes.

- [x] **D1**: Fix Prisma reference in `docs/technical/database.md:28` → point to SQL migration + `constants.ts`
- [x] **D2**: Fix `api.tsx` reference in `docs/technical/database.md:78` → `src/services/*.service.ts`
- [x] **D3**: Fix `schema.sql` reference in `docs/technical/database.md:85` → `supabase/migrations/`
- [x] **D5**: Fix PostgreSQL version in `docs/README.md` and `docs/technical/database.md` → "PostgreSQL 17"
- [x] **D12**: Fix `schema.sql` reference in `docs/technical/database.md:828` → `supabase/migrations/`
- [x] **D13**: Add Google Calendar integration tables (`user_google_calendar_settings`, `gig_sync_status`) to `docs/technical/database.md`; mention in `docs/README.md` features
- [x] **C11**: Document `Payment Recieved` typo as known issue in `docs/technical/database.md`
- [x] **D4**: Fix non-existent doc references in `docs/README.md` (remove dead links, fix `coding-guide.md` path)
- [x] **D10**: Fix test count in `docs/README.md` → "200 passing tests across 30 test files"
- [x] **D15**: Link `SmartDataTable.md` from `docs/README.md`
- [x] **D6**: Remove phantom libraries (`react-slick`, `react-responsive-masonry`, `react-dnd`, `motion/react`, `popper.js`) from `docs/technical/tech-stack.md`
- [x] **D7**: Fix `@uiw/react-md-editor` → `react-markdown` in `docs/technical/tech-stack.md`
- [x] **D8**: Remove non-existent `figma/` and `guidelines/` dirs from `docs/technical/tech-stack.md`
- [x] **D14**: Add Edge Functions documentation section in `docs/technical/tech-stack.md`
- [x] **D11**: Fix API location in `docs/development/coding-guide.md` → `src/services/*.service.ts`
- [x] **C12**: Document `App.tsx` size as future refactoring opportunity in `docs/development/coding-guide.md`
- [x] **C13**: Document `gig.service.ts` size as future refactoring opportunity in `docs/development/coding-guide.md`
- [x] **D9**: Update `Last Updated` dates on all modified docs
- [x] Verify: `npm run test:run` — all 200 tests pass across 30 test files
