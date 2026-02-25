# Code and Documentation Review — Requirements

## Objective

Perform a comprehensive code review and documentation audit of the GigManager codebase. Fix code issues and correct/fill documentation gaps. All 193 existing tests must continue to pass. Test changes are only permitted when the underlying code functionality is changing.

---

## Scope

### 1. Code Issues

#### 1.1 Dead / Unused Code

| # | Item | Location | Detail |
|---|------|----------|--------|
| C1 | Unused `role-helper.tsx` | `src/utils/role-helper.tsx` | `getRoleSelectItems()` is not imported anywhere in the codebase. Remove the file. |
| C2 | Unused client helpers | `src/utils/supabase/client.tsx` | `getSession()`, `getCurrentUser()`, and `signOut()` are exported but never imported by any other file. All callers use `createClient()` directly. Remove the three helpers. |
| C3 | `DbGigBid` type alias | `src/utils/supabase/types.tsx:149` | Marked "for backward compatibility" but nothing references it. Remove. |
| C4 | `DbKvStore` interface | `src/utils/supabase/types.tsx:168–171` | Not referenced anywhere. There is no corresponding service or usage. Remove. |

#### 1.2 Repeated / Duplicated Code

| # | Item | Location | Detail |
|---|------|----------|--------|
| C5 | Duplicated `SETTINGS_COLS` string | `src/services/googleCalendar.service.ts` (lines ~163, ~177) | The same column-select string is defined twice within `saveUserGoogleCalendarSettings`. Also repeated in `updateUserGoogleCalendarSettings` (line ~215) and `getUserGoogleCalendarSettings` (line ~122). Extract to a module-level constant. |
| C6 | Auth-check boilerplate | Multiple services | Every mutating service function calls `supabase.auth.getSession()` and checks `!session?.user`. This is repeated identically in `asset.service`, `kit.service`, `gig.service`, `googleCalendar.service`. Refactor. |
| C7 | UUID regex repeated | `gig.service.ts` lines ~308 and ~746 | The same UUID regex is defined inline twice. Extract to a shared constant or utility. |

#### 1.3 Security Risks

| # | Item | Location | Detail |
|---|------|----------|--------|
| C8 | Unsanitized `ilike` filter input | `asset.service.ts:36`, `kit.service.ts:32`, `user.service.ts:165`, `organization.service.ts:29` | User-provided search strings are interpolated directly into Supabase PostgREST filter expressions (e.g., `%${search}%`). Characters like `%` and `_` in the input could widen results beyond intent. Sanitize LIKE wildcards in search input. |
| C9 | Access token passed in URL query param | `googleCalendar.service.ts:254` | The Google access token is passed via `?access_token=…` in the Edge Function URL when fetching calendars. This can leak into server logs. Move the token to the request body or headers instead. |
| C10 | Console logging in production | Throughout codebase (43+ files) | Numerous `console.log` statements including `handleLogin()` and route tracing in `App.tsx`, plus extensive `[TRACE]` logging in `AuthContext.tsx`. These should be removed or gated behind a dev-mode flag per the project's own ZENFLOW guidelines ("Avoid committing code that contains console.log"). |

#### 1.4 Maintainability Concerns

| # | Item | Location | Detail |
|---|------|----------|--------|
| C11 | Typo in DB enum: `Payment Recieved` | `constants.ts:67`, `gig.service.ts:255`, migrations, mock-data | "Recieved" is misspelled (should be "Received"). The enum is baked into the database migration and referenced throughout code and docs. **Do not fix** — requires a DB migration, which is out of scope. Document as a known issue. |
| C12 | 800+ line `App.tsx` | `src/App.tsx` | The file contains all routing, state management, and 30+ handler functions. This is fragile and hard to maintain. **Note**: Document as a future refactoring opportunity but do not refactor now — it would be a large change requiring substantial test updates. |
| C13 | 1100+ line `gig.service.ts` | `src/services/gig.service.ts` | Very large service file. Document as future split opportunity. |

### 2. Documentation Issues

#### 2.1 Incorrect / Outdated References

| # | Item | Location | Detail |
|---|------|----------|--------|
| D1 | Prisma reference | `docs/technical/database.md:28` | States "All enum types are defined in the Prisma schema as the single source of truth." Prisma is not used. The source of truth is `src/utils/supabase/constants.ts` and the SQL migration. Fix. |
| D2 | `api.tsx` file reference | `docs/technical/database.md:78` | File structure shows `src/utils/api.tsx` — this file does not exist. The API layer is in `src/services/*.service.ts` and `src/utils/api-error-utils.ts`. Fix. |
| D3 | `schema.sql` reference | `docs/technical/database.md:85` | References `supabase/schema.sql` which does not exist. Schema is defined via migrations in `supabase/migrations/`. Fix. |
| D4 | Non-existent docs referenced in README | `docs/README.md` | Multiple references to files/directories that don't exist: `docs/product/feature-catalog.md`, `docs/product/workflows/`, `docs/development/development-plan.md`, `docs/development/ai-agents/coding-guide.md`. Fix links or remove references. |
| D5 | PostgreSQL version inconsistency | `docs/README.md:135`, `docs/technical/database.md:28,31` | Docs say "PostgreSQL 15+". The `.zencoder/rules/repo.md` says "PostgreSQL 17". Align to actual version (17 per `supabase/.temp/postgres-version`). |
| D6 | Tech stack lists phantom libraries | `docs/technical/tech-stack.md:94–98` | Lists `react-slick`, `react-responsive-masonry`, `react-dnd`, `motion/react`, `popper.js` — none of these are in `package.json` or imported anywhere. Remove. |
| D7 | `@uiw/react-md-editor` reference | `docs/technical/tech-stack.md:108` | Claims `@uiw/react-md-editor` is used in `MarkdownEditor.tsx`. The component actually uses `react-markdown`. Fix. |
| D8 | File structure shows non-existent directories | `docs/technical/tech-stack.md:117–122` | Shows `figma/` and `guidelines/` directories that don't exist. Fix to match reality. |
| D9 | `Last Updated` dates stale | Various docs | Several docs have old "Last Updated" dates. Update as docs are modified. |
| D10 | Test count outdated | `docs/README.md:142` | Says "60 passing tests (26 form-utils, 12 api, 22 component)". Actual count is 193 passing tests across 29 test files. Fix. |
| D11 | Coding guide says API in `api.tsx` | `docs/development/coding-guide.md:62` | States "API functions belong in `src/utils/api.tsx`". This file doesn't exist; APIs are in `src/services/`. Fix. |
| D12 | `supabase/schema.sql` reference in database.md changelog | `docs/technical/database.md:828` | References `supabase/schema.sql` which doesn't exist. Fix. |

#### 2.2 Documentation Gaps

| # | Item | Detail |
|---|------|--------|
| D13 | No calendar integration docs in main docs | Google Calendar integration (added in migration `20260210`) is significant but not mentioned in `docs/technical/database.md` tables section, `docs/README.md` features, or `docs/technical/tech-stack.md`. Add brief coverage. |
| D14 | Edge Functions not documented | `supabase/functions/server/` contains the server Edge Function handling organization CRUD, invitations, and Google Calendar integration. No technical documentation exists for these endpoints. Add a brief section in the setup or tech docs. |
| D15 | SmartDataTable not referenced from main docs | `docs/technical/SmartDataTable.md` exists but is not linked from `docs/README.md` or `docs/technical/` index. Add link. |

---

## Constraints

1. **All 193 tests must continue to pass** after changes.
2. **Test changes are only allowed** if the underlying code functionality changes (not to make failing tests pass).
3. **No database migrations** — the `Payment Recieved` typo and any schema changes are out of scope.
4. **No large architectural refactors** — items like splitting `App.tsx` or `gig.service.ts` are documented as future work only.
5. **Console.log removal** should focus on non-error, non-trace statements. Consider replacing `[TRACE]` logs in `AuthContext.tsx` with a conditional debug flag rather than removing entirely, as they serve diagnostic purposes.
6. **Security fixes** (C8, C9) should be implemented carefully to avoid breaking existing functionality.

---

## Success Criteria

- All identified dead code (C1–C4) removed.
- Duplicated constants extracted (C5, C7).
- Search input sanitized for LIKE wildcards (C8).
- Access token moved out of URL query params (C9).
- Production console.log statements removed or gated (C10).
- All documentation errors (D1–D12) corrected.
- Documentation gaps (D13–D15) filled with concise content.
- All 193 tests pass.
- No new test failures introduced.
