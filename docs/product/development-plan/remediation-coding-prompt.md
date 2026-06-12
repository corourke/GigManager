# Remediation Implementation Prompt — Actions 1–8

**Source**: [Code & Product Review, June 2026](../code-and-product-review-202606.md) — implements the "Prioritized Action List", items 1–8 (item 9, invoicing/settlement, is a product feature tracked separately).

**How to use**: Give this entire document to a coding agent as its task prompt. Phases are ordered by priority and risk. Each phase ends with a **STOP** gate — the agent must present its work and wait for user approval before starting the next phase. Phases 1–5 are small and sequential; phases 6–7 are larger and may be split across multiple sessions.

---

## Prompt

You are implementing the remediation plan from the code and product review at `docs/product/code-and-product-review-202606.md`. Read that document first — it contains the findings, evidence, and rationale for everything below. Also read `AGENTS.md` and obey it strictly; in particular:

- **Never modify a committed migration.** Schema changes require new migration files. Exception noted in Phase 1: `supabase/migrations/20260611000001_ensure_attachments_bucket.sql` is currently **uncommitted**, so it may be edited in place — verify with `git status` before touching it.
- **Never apply migrations or deploy yourself.** After writing migrations or edge-function changes, enumerate the exact commands for the user (`supabase db push`, `supabase functions deploy`, etc.) and wait for confirmation. All Supabase CLI work targets **development** (`qcrzwsazasaojqoqxwnr`) unless explicitly instructed otherwise; verify with `cat supabase/.temp/project-ref`.
- **Write a failing test before fixing any bug.**
- **Propose before implementing** anything ambiguous; ask when unsure.
- Update `docs/technical/database.md` and `docs/technical/security-scheme.md` when schema or security behavior changes, and check off completed phases in this document.

Work through the phases in order. Do not start a phase until the previous phase's STOP gate has been approved.

---

### Phase 1 — Fix cross-tenant attachment leak (Review §5, finding 1) 🔴

**Problem**: Storage policies on the `attachments` bucket grant SELECT and INSERT on every object to any authenticated user, leaking invoices/financial documents across organizations.

**Tasks**:
1. Establish the path convention `{organization_id}/{...rest}` for all objects in the `attachments` bucket. Audit `src/services/attachment.service.ts` (and any other upload sites — search for `.storage.from(`) and update upload paths to comply. Surface where the `organization_id` comes from at each call site and verify it is the user's *selected, verified* org, not arbitrary client input.
2. Rewrite the four storage policies (in the **uncommitted** `20260611000001_ensure_attachments_bucket.sql` if still uncommitted, otherwise in a new migration) so that:
   - SELECT requires `user_is_member_of_org(((storage.foldername(name))[1])::uuid, auth.uid())`
   - INSERT/UPDATE/DELETE require `user_is_admin_or_manager_of_org(((storage.foldername(name))[1])::uuid, auth.uid())`
   - All policies still constrain `bucket_id = 'attachments'`.
3. Write a data-migration step (SQL or a one-off script, propose which) that moves any **existing** objects not under an org-id prefix into the correct prefix, deriving the org from the owning record (check the `attachments`/purchases tables for the linkage). Also update any stored file-path references to the new paths. If no legacy objects exist in dev/prod, state how you verified that and skip.
4. Add/extend service tests covering: upload path construction includes org id; signed-URL retrieval still works.
5. Update `docs/technical/security-scheme.md` with the storage policy model.

**Acceptance**: policies scoped per-org; uploads land under org prefix; tests green; user given the `db push` command and a manual cross-org verification step (user A in org X cannot fetch a signed URL for org Y's file path).

**STOP — present migration SQL, code diff, and verification steps; wait for approval and for the user to apply the migration.**

---

### Phase 2 — Lock down ai-scan function (Review §5, finding 2) 🔴

**Problem**: `supabase/functions/ai-scan/index.ts` honors `x-diagnostic: true` **before auth**, making a live Anthropic call (open spend vector, key-prefix disclosure). The main path has no org check, no size limit, no rate limit.

**Tasks**:
1. Remove the pre-auth diagnostic path entirely, or move it **behind** authentication *and* an `ADMIN_DIAGNOSTIC_SECRET` env-var check (propose which; default to removal). Never return the API key prefix.
2. After `getUser()`, verify the caller is a member of the organization the scan is for (require an `organization_id` field in the request and check membership against `organization_members`; reject otherwise).
3. Enforce a 10 MB file-size cap (check `file.size` before reading) and an allowlist of content types (pdf, jpeg, png, webp, gif). Reject otherwise with 413/415.
4. Add basic per-user rate limiting (e.g., N scans per hour tracked in a small table or the existing kv store — propose the mechanism before building).
5. Replace `Access-Control-Allow-Origin: '*'` with a pinned origin list (see Phase 6 task 4 for the shared helper; a local constant is fine for now).

**Acceptance**: no unauthenticated code path triggers an Anthropic call; org membership enforced; limits in place. Enumerate the `supabase functions deploy ai-scan` step for the user (dev first).

**STOP — present diff and deployment steps; wait for approval.**

---

### Phase 3 — Restore TypeScript and ESLint gates; fix failing tests (Review §2)

**Problem**: No root `tsconfig.json` (so `npm run typecheck` checks nothing), no `eslint.config.js` (so `npm run lint` errors), 2 failing tests in `src/components/AssetListScreen.test.tsx`, ~526 `any` usages.

**Tasks**:
1. Create a root `tsconfig.json` appropriate for Vite + React 18 + SWC (bundler module resolution, `jsx: react-jsx`, `paths` for the `@/` alias matching `vite.config.ts`, include `src`). Exclude `stage-plot-app`, `supabase/functions` (Deno), `build`, `dev-dist`.
2. Run `tsc --noEmit` and report the error count. Strategy: enable `"strict": true` from day one but use targeted, pragmatic fixes; if the error count exceeds ~150, propose a burn-down split (e.g., `strict: true` with `noImplicitAny` temporarily off, plus a tracked follow-up) **before** mass-editing files. Do not weaken types with `any`/`as` casts to silence errors — fix or explicitly `// @ts-expect-error` with a reason.
3. Create `eslint.config.js` (flat config): `typescript-eslint` recommended, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`. Ignore `build/`, `dev-dist/`, `stage-plot-app/`, `supabase/functions/`. Auto-fix what's safe; report remaining warnings rather than blanket-disabling rules.
4. Investigate the two `AssetListScreen.test.tsx` failures ("Tracking Status:" filter). Determine whether the test or the component is wrong relative to intended behavior (the uncommitted filter changes in the working tree are the likely cause) — if the intent is unclear, **ask the user** which behavior is correct before changing either side.
5. Verify `npm run typecheck`, `npm run lint`, and `npm run test:run` all pass.
6. Update `docs/development/coding-guide.md` and `docs/development/testing.md` to reflect reality (test counts, strictness status).

**Acceptance**: all three commands exit 0 locally.

**STOP — report error counts found/fixed and any burn-down debt created; wait for approval.**

---

### Phase 4 — CI pipeline and deploy gate (Review §2)

**Tasks**:
1. Add `.github/workflows/ci.yml`: on push and PR to `main` — checkout, setup-node 20 with npm cache, `npm ci`, `npm run typecheck`, `npm run lint`, `npm run test:run`, `npm run build`. No deploy steps and no secrets needed (the build may require `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`; if so, use obviously-fake placeholder values via env — the env validation in `src/utils/supabase/info.tsx` only checks presence).
2. Harden `deploy_prod.sh`: refuse to run if `git status --porcelain` is non-empty, if the current branch isn't `main`, or if `npm run typecheck && npm run lint && npm run test:run` fails. Run these **before** linking to prod.
3. Document the CI setup in `docs/technical/setup-guide.md`.

**Acceptance**: workflow file passes locally simulated steps (run each command); deploy script verified to bail on a dirty tree (test with a scratch file, then clean up).

**STOP — present workflow and script diff; wait for approval. The first real CI run requires the user to push.**

---

### Phase 5 — Error monitoring with Sentry (Review §7)

**Tasks**:
1. Add `@sentry/react` to the web app: init in `src/main.tsx` gated on a `VITE_SENTRY_DSN` env var (no-op when unset, so dev/test are unaffected), with a top-level React ErrorBoundary that renders a friendly fallback. Wire release/environment from `import.meta.env.MODE` and the existing `__BUILD_TIMESTAMP__`.
2. Add Sentry capture to both edge functions (`server`, `ai-scan`) using Sentry's Deno SDK, gated on a `SENTRY_DSN` env var; wrap the top-level handlers so unhandled errors are captured and re-thrown as clean 500s.
3. Update `.env.example`, and enumerate for the user: where to create the Sentry project, which env vars to set in Cloudflare Pages and `supabase secrets set` (dev first).
4. Keep `console.*` noise out of production: while you're in `main.tsx`, do **not** attempt a global console cleanup (that's Phase 7 territory at most) — just ensure Sentry doesn't double-log.

**Acceptance**: app builds and runs with DSN unset; with a test DSN, a thrown test error appears in Sentry (give the user a manual verification step).

**STOP — wait for approval and user-provided DSNs.**

---

### Phase 6 — Refactor `server` edge function onto Hono (Review §3, §5 finding 3)

**Problem**: `supabase/functions/server/index.ts` is 3,322 lines of manual path routing running with the service-role key; auth/membership checks are copy-pasted per endpoint, so one omission is a tenant bypass. CORS reflects any origin with credentials enabled.

**Approach — this is the riskiest phase; work incrementally and propose a module plan before writing code.**

**Tasks**:
1. Inventory every endpoint in the current file (method + path + auth requirement + org-role requirement). Produce a table and **STOP for review** — this table is the security spec for the refactor, and the user must confirm the intended authorization level of each endpoint (this is also the audit the review said was outstanding).
2. Introduce Hono with middleware: (a) pinned-origin CORS (shared constant for prod + dev origins, no `*`, no credential reflection), (b) `requireUser` middleware that validates the Bearer token once and attaches the user, (c) `requireOrgRole(roles)` helper middleware. Split routes into modules (`routes/users.ts`, `routes/organizations.ts`, `routes/gigs.ts`, `routes/calendar.ts`, `routes/places.ts`, `routes/webauthn.ts`) keeping the **same external paths** so the frontend needs no changes.
3. Migrate endpoints module-by-module, preserving behavior exactly (this is a refactor, not a redesign). Where the inventory revealed a **missing** auth/membership check, fix it and call it out explicitly in the summary.
4. Remove dead Figma Make scaffolding if confirmed unused: `kv_store.ts` usage (grep for `kv.` imports), the `Field Ops Mobile` RP_NAME (rename via env-var defaults consistent with the real domain). Ask before deleting anything that has data behind it (the `kv_store_de012ad4` table).
5. Testing: edge functions currently have no tests. Propose lightweight coverage — at minimum, extract pure helpers (auth parsing, role checks) into testable modules with Vitest tests; full Deno integration tests are optional, propose if worthwhile.
6. Deploy to **dev** only (enumerate commands for the user) and provide a manual smoke checklist covering each route group, plus regression checks for Google Calendar OAuth and WebAuthn flows.

**Acceptance**: route parity confirmed against the inventory table; all routes behind middleware; CORS pinned; dev smoke checklist passes.

**STOP twice — once after the endpoint inventory (task 1), once before dev deployment.**

---

### Phase 7 — URL routing and server-state layer (Review §1, §3) — incremental

**Approach**: This is a multi-session effort. Propose a migration plan first; then execute screen-by-screen with tests green after each step. Do not big-bang rewrite `App.tsx`.

**Tasks**:
1. **Router**: Adopt `react-router` (v7, library mode). Map the existing `Route` union in `src/App.tsx` to real URLs (`/gigs`, `/gigs/:gigId`, `/assets/:assetId`, `/calendar`, `/settings`, etc., plus the existing special paths `/accept-invitation`, `/auth/google-calendar/callback`, `/dev-demo`). Replace the `localStorage`-persisted `currentRoute`/`selectedGigId` mechanism with URL state; keep `selectedOrganization` persistence. Update `public/_redirects` SPA fallback if needed. Preserve the mobile/desktop split. Acceptance: every screen is deep-linkable, refresh-safe, and back-button-safe; gate `/dev-demo` behind `import.meta.env.DEV`.
2. **TanStack Query**: add `@tanstack/react-query` with a provider; define query-key conventions (`['gigs', orgId]`, etc.) in one module. Migrate reads screen-by-screen starting with the worst offenders identified in the review — `TeamScreen.tsx`, `gig/GigFinancialsSection.tsx`, `ImportScreen.tsx`, `AssetScreen.tsx` — replacing hand-rolled `useState`/`useEffect`/loading-flag plumbing with `useQuery`/`useMutation` + invalidation. Services stay the single Supabase access layer; components stop calling `createClient` patterns directly where they do.
3. **Component splits**: as each screen is migrated, extract data hooks (`useTeamMembers`, `useGigFinancials`, …) and split components to comply with the existing <500-line guideline. Split `src/services/gig.service.ts` along the lines already proposed in `docs/development/coding-guide.md` (`gigParticipant.service.ts`, `gigFinancial.service.ts`, …).
4. Keep `npm run typecheck && npm run lint && npm run test:run` green after **every** screen migration; update tests as components split.

**STOP after the migration plan, and after each screen group.**

---

### Phase 8 — Repository hygiene (Review §3)

**Tasks**:
1. `git rm -r --cached dev-dist/` and add `dev-dist/` to `.gitignore`.
2. `git rm --cached uncommitted_changes.patch` (already gitignored; confirm the file content is not needed first — show the user a summary before deleting the working copy).
3. Remove `debug-schema.ts` from the repo root (confirm nothing imports it: grep first).
4. `stage-plot-app/`: **ask the user** whether to (a) extract to its own repo (provide the `git filter-repo`/subtree commands for them to run) or (b) keep in-repo under npm workspaces. Do not perform history rewriting yourself.
5. Verify `npm run build` and the test suite still pass; confirm `.gitignore` covers `.certs/`, `backups/`, `.env*` (it does — just re-verify nothing tracked slipped through with `git ls-files | grep -E '\.env|\.certs|backups/'`).

**Acceptance**: clean `git status`, no build artifacts or debug files tracked, decision recorded for `stage-plot-app`.

**STOP — final summary across all phases; update the checkboxes below.**

---

## Progress Tracker

- [x] Phase 1 — Attachment storage policies scoped per-org (+ migration applied by user)
- [x] Phase 2 — ai-scan locked down (+ deployed to dev by user)
- [ ] Phase 3 — tsconfig (strict) + ESLint + 2 failing tests fixed
- [ ] Phase 4 — GitHub Actions CI + deploy script gates
- [ ] Phase 5 — Sentry (web + edge), DSNs configured by user
- [ ] Phase 6 — Server function on Hono with auth middleware (+ endpoint inventory approved)
- [ ] Phase 7 — Router + TanStack Query adopted; mega-components split
- [ ] Phase 8 — Repo hygiene complete; stage-plot-app decision recorded

## Global Constraints (apply to every phase)

- Target the **dev** Supabase project for all CLI operations; never deploy to prod without explicit instruction.
- No new dependencies beyond those named here without proposing them first.
- Match existing code style (services pattern, Zod validation, sonner toasts, shadcn components).
- Every phase must leave `npm run test:run` green (and, from Phase 3 onward, `typecheck` + `lint` green).
- When behavior or schema changes, update the corresponding doc in `docs/` in the same change.
