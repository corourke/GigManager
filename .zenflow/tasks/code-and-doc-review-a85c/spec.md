# Technical Specification — Code and Documentation Review

## Technical Context

- **Language**: TypeScript (React frontend, Deno edge functions)
- **Build**: Vite 6.3.5, npm
- **Testing**: Vitest 4.0.10 — 193 passing tests across 29 files
- **Backend**: Supabase (PostgreSQL 17, RLS, Edge Functions)
- **Key libs**: `@supabase/supabase-js`, `react-hook-form`, `zod`, `react-markdown`, `date-fns`, `sonner`, `recharts`

---

## Implementation Approach

### C1 — Remove unused `role-helper.tsx`

Delete `src/utils/role-helper.tsx`. Only reference is its own export; no imports anywhere.

### C2 — Remove unused client helpers

In `src/utils/supabase/client.tsx`, remove `getSession()`, `getCurrentUser()`, and `signOut()`. All callers use `createClient()` directly and call `supabase.auth.*` methods inline. The `createClient` export and singleton remain.

### C3 — Remove `DbGigBid` type alias

Remove `export type DbGigBid = DbGigFinancial;` from `src/utils/supabase/types.tsx:149`. Only self-referencing; no external imports.

### C4 — Remove `DbKvStore` interface

Remove the `DbKvStore` interface (lines 168–171) from `src/utils/supabase/types.tsx`. No references anywhere in the codebase.

### C5 — Extract `SETTINGS_COLS` constant

In `src/services/googleCalendar.service.ts`, the string `'id, user_id, calendar_id, calendar_name, access_token, refresh_token, token_expires_at, is_enabled, sync_filters, created_at, updated_at'` is repeated 4 times (lines ~122, ~163, ~177, ~215). Extract to a module-level constant:

```ts
const SETTINGS_COLS = 'id, user_id, calendar_id, calendar_name, access_token, refresh_token, token_expires_at, is_enabled, sync_filters, created_at, updated_at';
```

Replace all inline occurrences.

### C6 — Extract auth-check helper

The pattern `const { data: { session } } = await supabase.auth.getSession(); if (!session?.user) throw new Error('Not authenticated');` is repeated 16 times across `gig.service.ts`, `asset.service.ts`, `kit.service.ts`, and `user.service.ts`.

Create a shared utility in `src/utils/supabase/auth-utils.ts`:

```ts
import { createClient } from './client';

export async function requireAuth() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');
  return { supabase, session, user: session.user };
}
```

Replace inline auth checks. Each callsite currently does `const supabase = getSupabase()` then `supabase.auth.getSession()` — the refactored helper returns `{ supabase, session, user }` to eliminate both lines. Update all 16 callsites in the 4 service files.

**Risk**: This changes the control flow slightly. Tests that mock `supabase.auth.getSession()` will need their mocks updated to work with the new import. Existing tests for these services (asset, kit, gig, organization, user) must be verified.

### C7 — Extract UUID regex constant

In `gig.service.ts`, the regex `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i` appears at lines ~308 and ~746. Extract to a shared utility:

```ts
// src/utils/validation-utils.ts
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
```

### C8 — Sanitize LIKE wildcard input

In `asset.service.ts:36`, `kit.service.ts:32`, `user.service.ts:165`, and `organization.service.ts:29`, user-provided search strings are interpolated directly into `.ilike()` / `.or()` PostgREST filter expressions. Special characters `%`, `_`, and `\` in the input could widen query results.

Create a sanitization utility:

```ts
// src/utils/validation-utils.ts (same file as UUID_REGEX)
export function sanitizeLikeInput(input: string): string {
  return input.replace(/[%_\\]/g, '\\$&');
}
```

Apply before interpolation at all 4 locations. The Supabase PostgREST `.ilike()` filter supports `\` as an escape character for `%` and `_`.

### C9 — Move access token out of URL query params

In `googleCalendar.service.ts:254`, the Google access token is passed via URL query param:

```ts
`server/integrations/google-calendar/calendars?access_token=${encodeURIComponent(accessToken)}`
```

Change to pass via request body or headers instead:

```ts
const { data, error } = await supabase.functions.invoke(
  'server/integrations/google-calendar/calendars',
  {
    method: 'POST',
    body: { access_token: accessToken },
  }
);
```

**Requires corresponding change in the Edge Function** (`supabase/functions/server/index.ts`) to read the token from the request body instead of URL query params for the calendars endpoint.

### C10 — Remove/gate production console.log statements

42 `console.log`/`console.warn`/`console.info` statements across ~10 source files.

**Approach by file:**

| File | Action |
|------|--------|
| `App.tsx` (3 statements) | Remove `handleLogin()`, `handleSelectOrganization()`, `currentRoute` logs |
| `AuthContext.tsx` (19 `[TRACE]` statements) | Gate behind `import.meta.env.DEV` check using a module-level `const DEBUG = import.meta.env.DEV;` flag and `if (DEBUG)` guards |
| `LoginScreen.tsx` (4 `[TRACE]` statements) | Gate behind same `import.meta.env.DEV` check |
| `Dashboard.tsx` (3 statements) | Remove |
| `conflictDetection.service.ts` (7 statements) | Remove — these are diagnostic logs not needed in production |
| `CalendarScreen.tsx` (1 statement) | Remove |
| `GigListScreen.tsx` (1 statement) | Remove |
| `OrganizationScreen.tsx` (1 geolocation log) | Remove |
| `dateUtils.ts` (1 `console.warn`) | Keep — this is a legitimate runtime warning for invalid timezone |
| `api-error-utils.ts` (2 `console.error`) | Keep — error logging is appropriate |
| `csvImport.test.ts` (1 `console.log`) | Keep — it's in a test file |

**Not touched**: `console.error` calls in service catch blocks (these are legitimate error logging).

### C11 — Document `Payment Recieved` typo

Add a brief note in `docs/technical/database.md` under the Enum Types section documenting the known misspelling. No code changes.

### C12 — Document `App.tsx` size

Note in `docs/development/coding-guide.md` as a future refactoring opportunity.

### C13 — Document `gig.service.ts` size

Note in `docs/development/coding-guide.md` as a future refactoring opportunity.

---

## Documentation Changes

### D1 — Fix Prisma reference in `database.md:28`

Replace "All enum types are defined in the Prisma schema as the single source of truth" with "All enum types are defined in the SQL migration (`supabase/migrations/20260209000000_initial_schema.sql`) and mirrored in `src/utils/supabase/constants.ts`."

### D2 — Fix `api.tsx` reference in `database.md:78`

Replace `src/utils/api.tsx` with correct path structure showing `src/services/*.service.ts` and `src/utils/api-error-utils.ts`.

### D3 — Fix `schema.sql` reference in `database.md:85`

Remove `supabase/schema.sql` from file structure. Schema is defined via `supabase/migrations/`.

### D4 — Fix non-existent doc references in `docs/README.md`

- `docs/product/feature-catalog.md` — does not exist → remove all references
- `docs/product/workflows/` — does not exist → remove all references
- `docs/development/development-plan.md` — does not exist → remove all references
- `docs/development/ai-agents/coding-guide.md` — does not exist → fix to `docs/development/coding-guide.md`

### D5 — Fix PostgreSQL version

Update `docs/README.md:135` and `docs/technical/database.md:28,31` from "PostgreSQL 15+" to "PostgreSQL 17".

### D6 — Remove phantom libraries from `tech-stack.md`

Remove `react-slick`, `react-responsive-masonry`, `react-dnd`, `motion/react`, `popper.js` from the "UI Enhancements" section. None are in `package.json`.

### D7 — Fix `@uiw/react-md-editor` reference

Replace with `react-markdown` in `tech-stack.md:108`. The `MarkdownEditor.tsx` component uses `import ReactMarkdown from 'react-markdown'`.

### D8 — Fix file structure in `tech-stack.md`

Remove `figma/` and `guidelines/` directories from the file structure diagram. Neither exists.

### D9 — Update `Last Updated` dates

Update dates on all modified docs to reflect the current date.

### D10 — Fix test count in `docs/README.md:142`

Replace "60 passing tests (26 form-utils, 12 api, 22 component)" with "193 passing tests across 29 test files".

### D11 — Fix API location in `coding-guide.md:62`

Replace "API functions belong in `src/utils/api.tsx`" with "API functions belong in `src/services/*.service.ts`, with shared error handling in `src/utils/api-error-utils.ts`."

### D12 — Fix `schema.sql` reference in `database.md:828`

Replace "supabase/schema.sql" reference with "supabase/migrations/".

### D13 — Add Google Calendar integration documentation

Add a brief section in `docs/technical/database.md` under tables covering `user_google_calendar_settings` and `gig_sync_status`. Add mention in `docs/README.md` features section.

### D14 — Document Edge Functions

Add a brief section in `docs/technical/tech-stack.md` or `docs/technical/database.md` describing the `supabase/functions/server/` Edge Function and its endpoints:
- Organization CRUD (`/organizations`)
- Invitations (`/invitations`)
- Google Calendar integration (`/integrations/google-calendar/*`)

### D15 — Link SmartDataTable docs

Add a link to `docs/technical/SmartDataTable.md` from `docs/README.md` in the Technical Documentation section.

---

## Source Code Structure Changes

### New Files

| File | Purpose |
|------|---------|
| `src/utils/supabase/auth-utils.ts` | Shared `requireAuth()` helper |
| `src/utils/validation-utils.ts` | `UUID_REGEX` constant and `sanitizeLikeInput()` function |

### Deleted Files

| File | Reason |
|------|--------|
| `src/utils/role-helper.tsx` | Unused (C1) |

### Modified Files — Code

| File | Changes |
|------|---------|
| `src/utils/supabase/client.tsx` | Remove 3 unused helper functions (C2) |
| `src/utils/supabase/types.tsx` | Remove `DbGigBid`, `DbKvStore` (C3, C4) |
| `src/services/googleCalendar.service.ts` | Extract `SETTINGS_COLS` constant (C5); move access token to POST body (C9) |
| `src/services/gig.service.ts` | Use `requireAuth()` (C6); use `UUID_REGEX` (C7) |
| `src/services/asset.service.ts` | Use `requireAuth()` (C6); sanitize search input (C8) |
| `src/services/kit.service.ts` | Use `requireAuth()` (C6); sanitize search input (C8) |
| `src/services/user.service.ts` | Use `requireAuth()` (C6); sanitize search input (C8) |
| `src/services/organization.service.ts` | Sanitize search input (C8) |
| `supabase/functions/server/index.ts` | Update calendars endpoint to read token from body (C9) |
| `src/App.tsx` | Remove 3 console.log statements (C10) |
| `src/contexts/AuthContext.tsx` | Gate [TRACE] logs behind `import.meta.env.DEV` (C10) |
| `src/components/LoginScreen.tsx` | Gate [TRACE] logs behind `import.meta.env.DEV` (C10) |
| `src/components/Dashboard.tsx` | Remove 3 console.log statements (C10) |
| `src/services/conflictDetection.service.ts` | Remove 7 console.log statements (C10) |
| `src/components/CalendarScreen.tsx` | Remove 1 console.log (C10) |
| `src/components/GigListScreen.tsx` | Remove 1 console.log (C10) |
| `src/components/OrganizationScreen.tsx` | Remove 1 console.log (C10) |

### Modified Files — Documentation

| File | Changes |
|------|---------|
| `docs/technical/database.md` | D1, D2, D3, D5, D12, D13 (Prisma ref, file paths, PG version, schema.sql ref, calendar tables) |
| `docs/README.md` | D4, D5, D10, D13, D15 (dead links, PG version, test count, calendar feature, SmartDataTable link) |
| `docs/technical/tech-stack.md` | D6, D7, D8, D14 (phantom libs, markdown editor, file structure, Edge Functions) |
| `docs/development/coding-guide.md` | D11, C12, C13 (API location, future refactoring notes) |

---

## Delivery Phases

### Phase 1: Dead Code Removal (C1–C4)
Remove unused files, exports, and type aliases. Low risk — no callers to break.
**Verify**: `npm run build && npm run test:run`

### Phase 2: Code Deduplication (C5–C7)
Extract shared constants and helpers. Medium risk — changes import structure.
**Verify**: `npm run build && npm run test:run`

### Phase 3: Security Fixes (C8–C9)
Sanitize LIKE input and move access token. Medium risk — changes runtime behavior.
**Verify**: `npm run build && npm run test:run`

### Phase 4: Console.log Cleanup (C10)
Remove or gate console statements. Low risk.
**Verify**: `npm run build && npm run test:run`

### Phase 5: Documentation Fixes (D1–D15, C11–C13)
Fix all documentation errors, fill gaps, add known-issue notes.
**Verify**: Manual review of changed docs. `npm run test:run` (no code changes in this phase).

---

## Verification Approach

After each phase:

```bash
npm run build
npm run test:run
```

All 193 tests must pass. No test modifications unless the underlying code functionality changes (e.g., C6 changes how auth is invoked, which may require mock adjustments in test files).

Final check:
```bash
npx vitest run --reporter=verbose 2>&1 | tail -5
```

Expected: `Tests 193 passed (193)`.
