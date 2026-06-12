# GigWrangler Code Base & Product Review

**Reviewer stance:** senior web application developer (React/Vite/Tailwind/Supabase), with a product-manager pass at the end.
**TL;DR:** This is a genuinely impressive solo-built application with an unusually strong documentation culture and a sound architectural foundation (Supabase + RLS multi-tenancy). However, it is **not ready for release beyond the owner**: the static quality gates (TypeScript checking and linting) are silently broken, there is no CI, two tests currently fail, and I found at least two real security issues — most notably a **cross-tenant data leak in file attachments** and an **unauthenticated endpoint that spends Anthropic API credits**. All are fixable in days-to-weeks, not months.

---

## 1. Frameworks & Technology Choices

**Observations**

- Frontend: React 18 + TypeScript, Vite 6, Tailwind CSS v4 (token-based, no config file), shadcn/ui on Radix primitives, react-hook-form + Zod, Vitest + React Testing Library, PWA via `vite-plugin-pwa`.
- Backend: Supabase — Postgres 17 with Row-Level Security, Edge Functions (Deno), Storage, Auth; deployed to Cloudflare Pages.
- No router library and no server-state library (no react-router, no TanStack Query/SWR).

**Opinion**

The stack is modern, pragmatic, and well-matched to a small team: Supabase removes a huge amount of backend surface area, shadcn/Radix gives accessible components without lock-in, and Zod + react-hook-form is the right form story. I would have made nearly identical choices.

The two omissions are the real architectural debts:

1. **Hand-rolled routing.** [App.tsx](src/App.tsx) maintains a `Route` union type with ~30 values, persists the current screen and selected IDs to `localStorage`, and special-cases pathnames for invitations, OAuth callbacks, and `/dev-demo`. This means no deep links ("send me the link to that gig" doesn't work), fragile back-button behavior, and a growing pile of navigation edge-case code that a router gives you for free.
2. **No server-state/caching layer.** Every screen hand-rolls `useState` + `useEffect` + loading/error flags around service calls. This is the single biggest cause of the oversized components (below) — TanStack Query would eliminate hundreds of lines and add caching, retries, and request deduplication.

**Recommendations**

- Adopt **TanStack Router or react-router** and make every screen URL-addressable. This is also a product feature (shareable links), not just hygiene.
- Adopt **TanStack Query** for all reads; migrate screen-by-screen.

---

## 2. Quality Gates & Testing — the most urgent engineering finding

**Observations**

- `npm run typecheck` → **does not run at all.** There is **no `tsconfig.json` in the repo root** (only inside `stage-plot-app/`), so `tsc --noEmit` just prints help text and exits. The coding guide claims "TypeScript (Strict)" — it is not enforced anywhere. There are **526 occurrences of `: any` / `as any`** in `src/`.
- `npm run lint` → **fails immediately.** ESLint 10 is installed but there is no `eslint.config.js`.
- `npm run test:run` → **523 pass, 2 fail** (62 files, 525 tests). The failures are in [AssetListScreen.test.tsx:106](src/components/AssetListScreen.test.tsx:106) ("Tracking Status:" filter), almost certainly tied to the uncommitted filter changes in the working tree.
- **No CI whatsoever** — no `.github/`, no pipeline. Deploys to production run from a developer laptop via [deploy_prod.sh](deploy_prod.sh).
- The test suite itself is honest about its goals ([testing.md](docs/development/testing.md)): utility/service tests are real; UI tests are render-smoke tests. There are also good manual test checklists for the calendar and gig accounting.

**Opinion**

The testing *culture* is better than most early-stage projects — 525 real tests, service-level coverage, and the AGENTS.md rule "write a failing test before fixing bugs" is exactly right. But the silent failure of typecheck and lint is dangerous in a specific way: this codebase is heavily AI-agent-developed (AGENTS.md, ZENFLOW), and typecheck/lint are precisely the guardrails that keep agent-generated code honest. Right now an agent (or human) can "pass typecheck" because typecheck checks nothing. The 526 `any`s are the visible symptom.

To its credit, `deploy_prod.sh` is thoughtfully defensive — schema + data backups before every prod migration, explicit project-ref verification, a trap to relink to dev. That's better operational discipline than many funded startups. But it deploys whatever is on the laptop, with no gate that tests even pass.

**Recommendations (do these first — roughly a day of work)**

1. Add a root `tsconfig.json` with `"strict": true` (expect a large initial error count; burn it down or start with `strict: false` + `noImplicitAny: true`).
2. Add `eslint.config.js` (typescript-eslint + react-hooks plugins at minimum).
3. Fix the two failing tests.
4. Add a GitHub Actions workflow: typecheck → lint → `vitest run` → `vite build` on every push; make `deploy_prod.sh` refuse to run if the working tree is dirty or tests fail.

---

## 3. Code Structure & Quality

**Observations**

- ~56K lines of TypeScript in `src/`. Clean top-level layout: `components/`, `services/`, `contexts/`, `hooks/`, `utils/`, `config/`.
- A proper **service layer** (`src/services/*.service.ts`) isolates all Supabase access — this is the best structural decision in the codebase, and services have co-located tests.
- **Mega-files**, violating the project's own <500-line guideline: [TeamScreen.tsx](src/components/TeamScreen.tsx) (1,179), [GigFinancialsSection.tsx](src/components/gig/GigFinancialsSection.tsx) (1,111), [ImportScreen.tsx](src/components/ImportScreen.tsx) (1,076), [AssetScreen.tsx](src/components/AssetScreen.tsx) (1,020), [gig.service.ts](src/services/gig.service.ts) (1,588). The coding guide itself lists App.tsx and gig.service.ts as known refactoring debt.
- 177 `console.log/warn/error` calls in non-test code (many gated behind `import.meta.env.DEV`, many not).
- The single edge function [server/index.ts](supabase/functions/server/index.ts) is **3,322 lines** of manual `if (path === ...)` routing, with the auth-header extraction boilerplate copy-pasted ~30 times.
- Figma Make scaffolding remnants persist: `kv_store.ts` with a hardcoded `kv_store_de012ad4` table, `RP_NAME = 'Field Ops Mobile'`, `debug-schema.ts` at the repo root, a tracked `uncommitted_changes.patch`, and `dev-dist/` build artifacts committed to git.
- A second, entire application — `stage-plot-app/`, an Expo/React Native app (62 tracked files) — lives in the repo with no workspace tooling connecting it.

**Opinion**

The bones are good: service layer, typed Supabase client (`createSupabaseClient<Database>`), shared error handling in `api-error-utils.ts`, Zod everywhere. Component quality is consistent in style. But the mega-components are where bugs will live — they mix data fetching, form state, permissions logic, and rendering, and the render-smoke tests can't meaningfully cover them. The edge function is the worst offender: 3,300 lines of hand-routed, service-role-credentialed code where every endpoint re-implements auth — this is both a maintainability and a security concern (see §5).

**Recommendations**

- Refactor the edge function onto **Hono** (the standard for Supabase functions) with auth/membership middleware — this collapses the 30 copies of auth boilerplate into one and makes "did this endpoint forget the check?" structurally impossible.
- Split `gig.service.ts` along the lines the coding guide already proposes; extract data-fetching hooks from the biggest screens as part of the TanStack Query migration.
- Repo hygiene: delete `dev-dist/` from git, `debug-schema.ts`, `uncommitted_changes.patch`; move `stage-plot-app/` to its own repo or adopt npm workspaces.

---

## 4. Styling & Design System

**Observations**

- Tailwind v4 with design tokens in `src/styles/globals.css`, consumed by shadcn/ui components. A real [STYLE_GUIDE.md](docs/design/STYLE_GUIDE.md) defines tokens, a "metadata label" typography rule, interaction states, and web/mobile patterns — written explicitly as ground truth for AI agents.
- **Pending design work:** `docs/design/mockups/` contains a full set of static HTML redesign mockups — nine web screens (dashboard, gig list/detail, calendar, equipment, financials, team, CSV import, calendar settings), mobile screens, and a component sheet. These represent a designed-but-not-yet-implemented UI refresh; `calendar.html` has uncommitted edits, so this work is active.
- Some legacy hardcoded color classes (`bg-purple-100 text-purple-700` style config maps in `constants.ts`) predate the token system.

**Opinion**

This is a healthier styling story than most Tailwind codebases — tokens exist, a style guide exists, and shadcn keeps component styling consistent. The mockup-first redesign approach is sensible. The main risk is **drift**: the app today doesn't match the mockups, and the constants-based color maps bypass the token system, so dark mode or theming work will snag on them.

**Recommendation:** when implementing the redesign, migrate the `*_CONFIG` color maps in [constants.ts](src/utils/supabase/constants.ts) to semantic tokens at the same time, and treat the component sheet as the contract.

---

## 5. Database Design & Security

**Observations — the good (and there's a lot of it)**

- The schema is well-designed for the domain: orgs, members with role enums, gigs with participant intersection, staff slots/assignments, assets/kits/kit-assets, financials, status history, sync status. [database.md](docs/technical/database.md) (1,255 lines) and [security-scheme.md](docs/technical/security-scheme.md) document it thoroughly.
- **RLS is real, not decorative.** Policies use `SECURITY DEFINER` helper functions (`user_is_member_of_org`, `user_can_manage_gig`, etc.), the intersection-based gig access model is correctly expressed, and financials are restricted to Admin/Manager of the owning org. This is the hardest part of multi-tenant Supabase and it's been done properly.
- Migration discipline is good: 28 well-named migrations, RPCs for atomic operations (`atomic_purchase_rpc`), an "never edit committed migrations" rule in AGENTS.md, and pre-deploy prod backups.
- Secrets are handled correctly: only the anon key ships to the client; Google client secret, Places key, and Anthropic key live in edge-function env vars; `.env*` files are gitignored; attachments are served via signed URLs (1-hour expiry) in [attachment.service.ts:167](src/services/attachment.service.ts:167).

**Observations — the problems**

1. **🔴 Cross-tenant attachment leak.** The storage policies (re-asserted in the new uncommitted migration [20260611000001_ensure_attachments_bucket.sql](supabase/migrations/20260611000001_ensure_attachments_bucket.sql)) grant SELECT on **every object in the `attachments` bucket to any authenticated user** (`USING (bucket_id = 'attachments')`). Any logged-in user of *any* organization can read *every* organization's uploaded invoices and financial documents. Given that financial data is otherwise the most tightly guarded table in the schema, this directly contradicts the security model. INSERT is equally unscoped, and UPDATE/DELETE are owner-scoped rather than org-role-scoped.
2. **🔴 Unauthenticated paid endpoint.** [ai-scan/index.ts:112-158](supabase/functions/ai-scan/index.ts:112) honors an `x-diagnostic: true` header **before any auth check**, and responds by making a live Anthropic API call and returning the API key prefix. With `Access-Control-Allow-Origin: *`, anyone on the internet can hammer this to drain the Anthropic budget. The main scan path is authenticated but has **no org-membership check, no file-size limit, and no rate limit** — any authenticated user gets unmetered Claude usage.
3. **🟡 Service-role + manual checks in the monolith function.** `server/index.ts` runs entirely with the service-role key, bypassing RLS, and relies on each of ~30 endpoints remembering `getAuthenticatedUser` + `verifyOrgMembership`. I didn't audit all 3,322 lines, but the pattern guarantees that a single missed check is a full-tenant bypass. The Hono-middleware refactor (§3) is a security fix, not just cleanup.
4. **🟡 CORS anti-pattern.** The server function reflects any `Origin` while setting `Access-Control-Allow-Credentials: true`. Auth is Bearer-token rather than cookie-based, so this isn't currently exploitable, but it's a tripwire if cookies are ever introduced. Pin allowed origins.
5. **🟡 Open creation policies.** `gigs` INSERT is `WITH CHECK (true)` for any authenticated user, and all organizations are world-readable to authenticated users. Both are documented as deliberate (org discovery), but for a public release they enable spam/enumeration; pair them with rate limiting and an abuse plan.
6. **🟢 Minor:** the mobile "lock" (`useMobileLock` + WebAuthn) is client-side cosmetic — the Supabase session in localStorage remains fully valid while "locked." Fine as UX, just don't describe it as a security control.

**Recommendations**

- Fix the attachments policies now: enforce a `{org_id}/...` path convention and scope all four policies with `user_is_member_of_org((storage.foldername(name))[1]::uuid, auth.uid())` (manager/admin for writes). Since the bucket migration is uncommitted, this is the perfect moment.
- Remove the ai-scan diagnostic bypass (or require an admin secret), add an org-membership check, a ~10 MB file cap, and per-user rate limiting.
- Pin CORS origins to the production and dev hosts.

---

## 6. Documentation

**Observation/Opinion:** This is the strongest documentation set I've seen in a project of this size — full requirements (1,143 lines), database and security schemes, a real competitive analysis with sourced pricing (Rentman, Current RMS, and others), a persona-driven roadmap, manual test checklists, a user-documentation plan, and operationally serious AI-agent guardrails in AGENTS.md (prod-link verification, migration rules). The only criticism: docs occasionally describe aspirations as facts — "TypeScript (Strict)", "200 passing tests" (now 525) — and a stale doc is a hazard when AI agents treat docs as ground truth. Add "verify against the code" dates or generate stats into docs.

---

## 7. Product Manager's View

**Functionality.** For a 0.1.0 with 436 commits over ~7 months, the breadth is remarkable: multi-tenant gig collaboration, full gig lifecycle with status history, equipment/kits with conflict detection, financials with IRS Schedule C categorization and mileage, **AI invoice scanning** (genuinely differentiating — none of the analyzed competitors have it), CSV import, Google Calendar sync, and a PWA mobile mode with barcode scanning and WebAuthn. The roadmap's self-assessment is candid and correct: multi-tenant collaboration and hierarchical events are real architectural differentiators that Rentman/Current RMS lack, while **quoting → invoicing → settlement is the biggest competitive gap**, and it's table stakes for every paying segment.

**Fit for release to a broader audience?** **Not yet — but close to a controlled beta.** My assessment:

- **Blockers for any external users:** the attachment leak and the unauthenticated AI endpoint (§5); the two failing tests; restoration of typecheck/lint + CI so regressions can't ship silently.
- **Blockers for an *open* release:** no billing/subscription, no onboarding flow, no terms/privacy, no error monitoring (no Sentry or equivalent — you are blind to user-side failures), no rate limiting, single-laptop deploys, and no URL deep-linking (a collaboration product where you can't share a link to a gig undercuts its own core differentiator).
- **What I'd do:** fix the two security items and quality gates (≈1 week), add Sentry, then run a **closed beta of 3–5 friendly organizations** — the multi-tenant model only proves itself with real cross-org collaboration. Hold the broad/public launch until invoicing/settlement exists, because that's what every persona will compare against Rentman/Current RMS on day one.

---

## Prioritized Action List

| # | Action | Effort | Why |
|---|--------|--------|-----|
| 1 | Scope attachment storage policies per-org | Hours | Active cross-tenant data leak |
| 2 | Auth-gate ai-scan diagnostic; add size/rate limits | Hours | Open spend/abuse vector |
| 3 | Add root `tsconfig.json` (strict) + ESLint config; fix 2 failing tests | 1–3 days | Quality gates currently check nothing |
| 4 | GitHub Actions CI; gate `deploy_prod.sh` on green | 1 day | No safety net on prod deploys |
| 5 | Add Sentry (web + edge functions) | 1 day | Required before any external users |
| 6 | Refactor edge function onto Hono with auth middleware | ~1 week | Removes the missed-check security pattern |
| 7 | Adopt router + TanStack Query; shrink mega-components | 2–4 weeks, incremental | Deep links, less state bug surface |
| 8 | Repo hygiene: remove `dev-dist/`, debug files; split out `stage-plot-app` | Hours | Cleanliness, smaller clone |
| 9 | Build quoting/invoicing/settlement before broad launch | Major | Stated #1 competitive gap |

**Bottom line for management:** the foundation (architecture, database security model, documentation, domain fit) is well above average and worth continued investment. The gaps are concentrated in *enforcement* — the guardrails exist on paper but several aren't actually running — plus two concrete security defects. With roughly two focused weeks on items 1–6, this moves from "owner-only" to "credible closed beta."