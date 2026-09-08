# Deployment

**Purpose**: Single source of truth for how GigWrangler reaches production — the pipeline, every third-party service involved, the complete configuration inventory, and how to recover when something goes wrong.

**Last Updated**: 2026-09-07

> For *local development* setup, see [setup-guide.md](./setup-guide.md). This document covers production only.

---

## Table of Contents

1. [Topology](#topology)
2. [The Production Deploy](#the-production-deploy)
3. [Dev Deploys](#dev-deploys)
4. [Continuous Integration](#continuous-integration)
5. [Service Reference](#service-reference)
6. [Configuration Inventory](#configuration-inventory)
7. [Rollback and Recovery](#rollback-and-recovery)
8. [Rebuilding Production From Scratch](#rebuilding-production-from-scratch)
9. [Known Gaps](#known-gaps)

---

## Topology

```
                          gigwrangler.com
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  Cloudflare Pages      │   project: gigwrangler
                    │  static SPA + CDN      │   build/ (Vite output)
                    │  _redirects → SPA      │   HTTPS + custom domain
                    └───────────┬────────────┘
                                │  VITE_* baked in at BUILD time
                                ▼
                    ┌────────────────────────┐
                    │  Supabase (prod)       │   ref: hqnnhtxcxedisasvtbqv
                    │  hqnnhtxcxedisasvtbqv  │
                    ├────────────────────────┤
                    │ Postgres 17 + RLS      │
                    │ Auth (email + Google)  │
                    │ Storage                │
                    │ Edge Functions (Deno)  │──┐
                    └────────────────────────┘  │
                                                │ secrets set via CLI
                        ┌───────────────────────┼───────────────────────┐
                        ▼           ▼           ▼           ▼           ▼
                    Google       Google      Anthropic    Resend      Sentry
                    Places      Calendar     (ai-scan)   (email)    (errors)
```

**At a glance**

| Concern | Answer |
|---|---|
| Web host | Cloudflare Pages, project `gigwrangler` |
| Domain | `gigwrangler.com` (HTTPS via Cloudflare) |
| DNS | Cloudflare — same account as Pages |
| Backend | Supabase project `hqnnhtxcxedisasvtbqv` (Pro plan) |
| Build tool | Vite 6 → `build/` |
| Deploy trigger | **Manual** — a human runs `./deploy_prod.sh` from `main` |
| Automated CD | **None.** GitHub Actions runs quality gates only, never deploys |
| Vercel / Netlify | **Not used.** Evaluated and rejected — see [Why Cloudflare Pages](#why-cloudflare-pages) |
| Staging environment | **None.** Two environments only: dev and prod |

---

## The Production Deploy

Everything is orchestrated by [`deploy_prod.sh`](../../deploy_prod.sh) at the repo root. It is the authoritative runbook; this section explains what it does and why.

```bash
./deploy_prod.sh
```

The script mirrors all output to a timestamped log at `./backups/deploy-<timestamp>.log` for post-mortems.

### Stage 1 — Pre-flight gates (nothing is touched yet)

| Gate | Rationale |
|---|---|
| `git status --porcelain` is empty | You deploy what is committed, not what is on your disk |
| Current branch is `main` | Production only ever ships `main` |
| Local `HEAD == origin/main` | Prevents shipping a commit nobody else has seen, or missing one |
| CI concluded `success` for that exact SHA | Reuses the GitHub Actions run rather than trusting local state |
| `npm ci` | Installs from the lockfile, not whatever `node_modules` happens to hold |
| `npm run typecheck && lint && test:run` | Local belt to CI's braces |

All gates run **before** the Supabase CLI is linked to prod, so a gate failure never leaves the CLI pointed at production.

### Stage 2 — Target prod and confirm

Links to `hqnnhtxcxedisasvtbqv`, then **hard-verifies** the link by reading `supabase/.temp/project-ref` back and comparing. This is the ritual mandated by [AGENTS.md](../../AGENTS.md) — never trust that `supabase link` did what you asked. The script then prints pending migrations and requires the operator to type `deploy`.

### Stage 3 — Backups

Requires Docker (the script will start Docker Desktop on macOS and wait up to 60s). Two dumps land in `./backups/` (git-ignored):

- `prod-schema-backup-<timestamp>.sql` — `public` + `auth` schemas
- `prod-data-backup-<timestamp>.sql` — data only, `--use-copy`

Both are size-checked; an empty dump aborts the deploy before anything mutates.

### Stage 4 — Deploy, in this order

1. **Migrations** — `supabase db push --yes`
2. **Edge functions** — `supabase functions deploy`
3. **Frontend** — `npm run build` then `npx wrangler pages deploy build/ --project-name gigwrangler`

> **Migrations ship before code, which imposes a hard constraint:** every migration in a release must be backward-compatible with the *currently deployed* code. Expand-only — add nullable columns and new tables freely, but no drops, renames, or `NOT NULL` tightening in the same release as the code that depends on them. This ordering means a failed `db push` never leaves new code running against an old schema. Contracting changes go in a *follow-up* release, after the code that stopped using the old shape is live.

### Stage 5 — Smoke check

Polls `https://gigwrangler.com` up to 6 times (10s apart) for HTTP 200. A failure here is loud but late — the deploy has already completed, so the message tells you to verify production manually.

### Always — the exit trap

A single `trap ... EXIT` registered before any other logic guarantees that **every** exit path (success, `die`, a failed command under `set -e`, Ctrl-C) relinks the Supabase CLI back to dev. On failure it also reports blast radius: whether production was mutated, and the paths of both backups.

### Escape hatches

All opt-in, all documented in the script header. Use sparingly and know why:

| Variable | Effect |
|---|---|
| `SKIP_CI_CHECK=1` | Skip the "CI is green for HEAD" gate |
| `SKIP_NPM_CI=1` | Reuse existing `node_modules` instead of `npm ci` |
| `SKIP_LOCAL_GATES=1` | Skip local typecheck/lint/tests (rely on CI green) |
| `SKIP_HEALTHCHECK=1` | Skip the post-deploy smoke check |
| `AUTO_CONFIRM=yes` | Skip the interactive confirmation prompt |
| `PROD_URL=<url>` | Override the smoke-check URL |

---

## Dev Deploys

[`deploy_dev.sh`](../../deploy_dev.sh) pushes migrations and edge functions to the **dev** Supabase project (`qcrzwsazasaojqoqxwnr`). It encodes the same link → hard-verify → deploy ritual, and its exit trap likewise guarantees the CLI is left on dev.

```bash
./deploy_dev.sh           # link, verify, db push, functions deploy
./deploy_dev.sh --check   # dry run: verify link, list pending migrations
                          # and functions, deploy nothing
```

No branch/cleanliness/test gates and no backups — dev is where unmerged work lands and its data is disposable. The script refuses to continue if the verified ref is prod or anything other than dev.

**There is no dev frontend deploy.** Dev frontend work runs locally via `npm run dev` against the dev Supabase project.

---

## Continuous Integration

[`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) runs on every push and pull request to `main`:

1. `npm ci`
2. `npm run typecheck` — TypeScript strict mode
3. `npm run lint` — ESLint flat config
4. `npm run test:run` — full Vitest suite
5. `npm run build` — production Vite build

**CI never deploys.** Its only relationship to production is that `deploy_prod.sh` refuses to run unless CI concluded `success` for the exact commit being deployed.

No repository secrets are required: the build step uses obviously-fake placeholders for `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. The client validates only their *presence* at runtime, and nothing contacts Supabase during a build.

---

## Service Reference

### Cloudflare Pages

Hosts the built SPA, terminates HTTPS, serves the CDN, and owns the custom domain.

| Setting | Value |
|---|---|
| Project name | `gigwrangler` |
| Build command | `npm run build` |
| Build output directory | `build` |
| Custom domain | `gigwrangler.com` |
| DNS | Cloudflare, same account |
| SPA routing | [`public/_redirects`](../../public/_redirects) → `/*  /index.html  200` |

`public/` is copied into `build/` verbatim by Vite, which is how `_redirects` reaches the deploy. Without it, Cloudflare returns 404 for every client-side route (`/gigs/123`, `/settings`, …) on hard refresh or deep link.

DNS for `gigwrangler.com` is managed in Cloudflare alongside the Pages project, so the custom domain binds without any external nameserver change and HTTPS is issued automatically. One account is therefore the single point of failure for hosting, DNS, and TLS — losing access to it takes the site down with no independent lever to recover.

Deploys are pushed from a developer machine with the Wrangler CLI:

```bash
npm run build
npx wrangler pages deploy build/ --project-name gigwrangler
```

**There is no committed `wrangler.toml`.** All Pages configuration — build settings, environment variables, custom domain — lives in the Cloudflare dashboard. See [Known Gaps](#known-gaps).

Environment variables are set in **dashboard → Settings → Environment variables**. Because Vite inlines `VITE_*` values at build time, **changing one requires a redeploy** to take effect. See the [Configuration Inventory](#configuration-inventory) for the full list.

#### Why Cloudflare Pages

Chosen over Vercel and Netlify during the original production bring-up ([requirements.md §5](../../.zenflow/tasks/production-setup-b686/requirements.md)):

- Free tier with unlimited bandwidth and no monthly build-minute cap (Netlify's free tier caps at 300 min/mo; Vercel enforces 100 GB bandwidth/mo)
- Native custom domains with automatic HTTPS via Cloudflare's CDN
- Manual deploys supported via `wrangler pages deploy` or dashboard upload

**Vercel is not part of this stack.** It appears in the repo only as a rejected alternative.

### Supabase

Provides Postgres, Auth, Storage, and Edge Functions. Two projects, no staging:

| Environment | Project Ref | Consumed by |
|---|---|---|
| Development | `qcrzwsazasaojqoqxwnr` | `npm run dev` via `.env.local` |
| Production | `hqnnhtxcxedisasvtbqv` | Cloudflare Pages via dashboard env vars |

> ⚠️ **Verify the linked project before ANY remote Supabase command.** `supabase db push`, `functions deploy`, and `secrets set` all act on whatever is linked, with no confirmation of their own.
>
> ```bash
> cat supabase/.temp/project-ref
> ```
>
> Both deploy scripts do this automatically. Do it by hand for one-off commands.

**Auth URL configuration** (dashboard → Authentication → URL Configuration):
- Site URL: `https://gigwrangler.com`
- Redirect URLs include: `https://gigwrangler.com/**`

**Edge functions** deployed to prod: `server` (the consolidated API — users, organizations, gigs, dashboard, Google integrations, WebAuthn, email) and `ai-scan` (receipt/invoice extraction). `_shared/` holds CORS and Sentry helpers and is not itself a function.

**Backups** are two-layered:
- Supabase-managed: automated daily backups + PITR (Pro plan), configured in dashboard → Database → Backups
- Deploy-time: schema and data dumps into `./backups/` before every prod migration, taken by `deploy_prod.sh`

### Vite

The build tool. [`vite.config.ts`](../../vite.config.ts) configures:

- `@vitejs/plugin-react-swc` and the Tailwind v4 Vite plugin
- `vite-plugin-pwa` with `registerType: 'autoUpdate'`, workbox `skipWaiting` + `clientsClaim`, and a `navigateFallbackAllowlist` of `/^(?!\/api\/).*/` so every client-side react-router route falls back to `index.html` instead of being rejected by the service worker
- `build.outDir: 'build'`, `build.target: 'esnext'`
- `define.__BUILD_TIMESTAMP__` — injected at build time and used as the Sentry release identifier

Environment variables must be prefixed `VITE_` to be exposed to client code, and are **inlined at build time** — they are not runtime configuration. [`src/utils/supabase/info.tsx`](../../src/utils/supabase/info.tsx) throws on startup if `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is missing, which turns a misconfigured deploy into an immediate visible failure rather than silent connection to the wrong database.

### Sentry

Error monitoring across three surfaces. **All three no-op when their DSN env var is unset**, so local dev and tests are unaffected.

| Surface | Init location | Env vars |
|---|---|---|
| Web app | [`src/main.tsx`](../../src/main.tsx) — `Sentry.init` + top-level `Sentry.ErrorBoundary` | `VITE_SENTRY_DSN` |
| `server` edge function | [`supabase/functions/_shared/sentry.ts`](../../supabase/functions/_shared/sentry.ts), captured in the top-level catch | `SENTRY_DSN`, `SENTRY_ENVIRONMENT` |
| `ai-scan` edge function | same shared helper | `SENTRY_DSN`, `SENTRY_ENVIRONMENT` |

The web app tags events with `environment` (Vite mode) and `release` (`gigwrangler@<build timestamp>`), and sets `sendDefaultPii: false`. Edge functions flush explicitly before responding, because Deno isolates can terminate the moment a response is returned. The Sentry Deno import is version-pinned so `functions deploy` is reproducible.

Setting `VITE_SENTRY_DSN` in Cloudflare requires a **redeploy** — it is a build-time value.

### Google

Three separate integrations, each with its own credentials.

**1. Google OAuth (sign-in)** — configured entirely in Supabase, not in app code.
- Google Cloud Console: OAuth consent screen (External) + OAuth 2.0 Client ID (Web Application)
- Authorized redirect URI: `https://hqnnhtxcxedisasvtbqv.supabase.co/auth/v1/callback`
- Supabase dashboard → Authentication → Providers → Google: enable, paste Client ID + Secret

**2. Google Places API (New)** — address search and place details in the `server` function.
- Google Cloud API key with "Places API (New)" enabled
- Edge function secret: `GOOGLE_PLACES_API_KEY`

**3. Google Calendar** — gig sync, OAuth 2.0 with a token exchange in the edge function.
- Google Calendar API enabled; OAuth 2.0 Client ID (Web Application)
- Authorized JavaScript origins: `http://localhost:3000`, `https://gigwrangler.com`
- Authorized redirect URIs: `http://localhost:3000/auth/google-calendar/callback`, `https://gigwrangler.com/auth/google-calendar/callback`
- Frontend build-time var: `VITE_GOOGLE_CLIENT_ID`
- Edge function secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

> **Support note:** OAuth scope and per-calendar sharing are independent permission layers. A user can be "Connected" with a calendar selected while holding only *read* access on it, and every sync then fails with `403 / "You need to have writer access to this calendar."` The picker only offers calendars Google reports as `writer` or `owner`, but cannot fix sharing that was never granted. Full detail in [setup-guide.md](./setup-guide.md#3-google-calendar-integration).

### Anthropic

The `ai-scan` edge function uses Claude to extract structured data from invoices and receipts.

- Edge function secret: `ANTHROPIC_API_KEY`
- PDF scanning requires a **Tier 1+** Anthropic account; Tier 0 supports images only and the UI falls back to manual entry
- Connectivity diagnostic: `POST /functions/v1/ai-scan` with header `x-diagnostic: true`

### Resend

Transactional email (organization invitations) from the `server` function, via a raw `fetch` rather than an SDK.

- Edge function secrets: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- **Both are set in dev and prod, and delivery is confirmed working.**
- Sends are **best-effort**: if `RESEND_API_KEY` is unset the call logs a warning and returns `{ sent: false }` rather than failing the request that triggered it. An unconfigured environment drops invitation emails silently — which is why `RESEND_API_KEY` belongs on any post-deploy verification pass.
- `RESEND_FROM_EMAIL` must stay set. Its code fallback in [`lib/email.ts`](../../supabase/functions/server/lib/email.ts) is `GigManager <onboarding@resend.dev>` — Resend's sandbox sender, which only delivers to the account owner's verified address, and which still carries the pre-rebrand name. Unsetting the secret would therefore both break delivery and regress branding, with no error.

### WebAuthn / passkeys

The `server` function's passkey routes read relying-party config from [`supabase/functions/server/lib/webauthnConfig.ts`](../../supabase/functions/server/lib/webauthnConfig.ts), which **defaults to localhost values**:

```ts
export const RP_NAME = Deno.env.get('RP_NAME')  || 'GigWrangler';
export const RP_ID   = Deno.env.get('RP_ID')    || 'localhost';
export const ORIGIN  = Deno.env.get('ORIGIN')   || 'http://localhost:3000';
```

> ⚠️ In production `RP_ID` must be `gigwrangler.com` and `ORIGIN` must be `https://gigwrangler.com`. If they are left at their defaults, registration and authentication fail origin/RPID validation — **passkeys break with no startup error and no deploy-time warning.** These are the only production secrets whose absence degrades a feature silently rather than loudly.

---

## Configuration Inventory

Derived from the code that actually reads each value, not from any prior checklist. This is the definitive list.

### Frontend — build-time (`VITE_*`)

Set in **Cloudflare Pages → Settings → Environment variables**. Inlined by Vite at build time; **a change requires a redeploy.**

| Variable | Required | Read by | Effect if missing |
|---|---|---|---|
| `VITE_SUPABASE_URL` | **Yes** | `src/utils/supabase/info.tsx` | App throws on startup |
| `VITE_SUPABASE_ANON_KEY` | **Yes** | `src/utils/supabase/info.tsx` | App throws on startup |
| `VITE_GOOGLE_CLIENT_ID` | For Calendar | Calendar integration components | Google Calendar connect flow unavailable |
| `VITE_SENTRY_DSN` | Optional | `src/main.tsx` | Sentry no-ops; no error reporting |

Local equivalents live in `.env.local` (git-ignored). [`.env.example`](../../.env.example) documents the shape with placeholder values.

### Edge functions — Supabase secrets

Set with `supabase secrets set NAME=VALUE` against the **verified** target project. List with `supabase secrets list`.

| Secret | Required | Used by | Effect if missing |
|---|---|---|---|
| `GOOGLE_PLACES_API_KEY` | For address search | `server` → places routes | Place search returns errors |
| `GOOGLE_CLIENT_ID` | For Calendar | `server` → calendar token exchange | Calendar OAuth fails |
| `GOOGLE_CLIENT_SECRET` | For Calendar | `server` → calendar token exchange | Calendar OAuth fails |
| `ANTHROPIC_API_KEY` | For AI scan | `ai-scan` | Receipt/invoice scanning fails |
| `RESEND_API_KEY` | For email | `server` → `lib/email.ts` | **Silent** — invitation emails skipped |
| `RESEND_FROM_EMAIL` | For real delivery | `server` → `lib/email.ts` | Falls back to Resend sandbox sender |
| `RP_ID` | **Yes in prod** | `server` → webauthn | **Silent** — defaults to `localhost`, passkeys break |
| `ORIGIN` | **Yes in prod** | `server` → webauthn | **Silent** — defaults to `http://localhost:3000`, passkeys break |
| `RP_NAME` | Optional | `server` → webauthn | Defaults to `GigWrangler` (correct) |
| `SENTRY_DSN` | Optional | `_shared/sentry.ts` | Sentry no-ops in functions |
| `SENTRY_ENVIRONMENT` | Optional | `_shared/sentry.ts` | Defaults to `development` — set to `production` |

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are **injected automatically by the Supabase platform**. Do not set them by hand.

**Confirmation status (2026-09-07).** `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are set in both dev and prod, with delivery verified. The remaining secrets have not been audited against the live projects — most are inferable from working features, but the two that fail *silently* (`RP_ID`, `ORIGIN`) cannot be, since a broken passkey flow produces no error anywhere. Confirm them directly:

```bash
cat supabase/.temp/project-ref   # must read hqnnhtxcxedisasvtbqv
supabase secrets list
```

---

## Rollback and Recovery

### Frontend rollback

Cloudflare Pages keeps every deployment. Roll back in **dashboard → Deployments → (a previous build) → Rollback**. This is instant and requires no local tooling — the fastest lever when a bad frontend ships.

Note that a rollback restores the *frontend only*. If the bad release also migrated the database, see below.

### Database rollback

There is no automatic down-migration. Recovery options, in order of preference:

1. **Roll forward** — write a corrective migration. Almost always right for a schema mistake.
2. **Supabase PITR** — dashboard → Database → Backups. Restores to a point in time; loses writes after that point.
3. **Deploy-time dumps** — `./backups/prod-schema-backup-<ts>.sql` and `prod-data-backup-<ts>.sql`, taken immediately before the migrations that shipped.

Restoring a data-only dump trips foreign-key checks, because rows are inserted in dump order rather than dependency order. Wrap the import:

```sql
SET session_replication_role = 'replica';
-- [dump contents]
SET session_replication_role = 'origin';
```

### Edge function rollback

Redeploy from an earlier commit:

```bash
git checkout <good-sha>
cat supabase/.temp/project-ref   # verify prod before proceeding
supabase functions deploy
git checkout main
```

---

## Rebuilding Production From Scratch

The one-time bring-up, should production ever need to be recreated. Originally executed as [`.zenflow/tasks/production-setup-b686/`](../../.zenflow/tasks/production-setup-b686/spec.md).

**1. Supabase project**
- Create a project on the **Pro plan** (required for PITR); note the new ref and DB password
- `supabase link --project-ref <new-ref>` → verify → `supabase db push`
- `supabase functions deploy`
- Set every secret in the [inventory](#edge-functions--supabase-secrets) above
- Authentication → URL Configuration: Site URL `https://gigwrangler.com`, redirect `https://gigwrangler.com/**`
- Authentication → Providers → Google: enable, paste Client ID + Secret
- Database → Backups: confirm daily backups active, retention ≥ 7 days, PITR enabled

**2. Google Cloud Console**
- OAuth consent screen (External)
- OAuth 2.0 Client ID with the origins and redirect URIs listed under [Google](#google)
- Enable Places API (New) and Google Calendar API; issue the Places API key

**3. Cloudflare Pages**
- Create project `gigwrangler`; build command `npm run build`, output directory `build`
- Add all four `VITE_*` variables from the [inventory](#frontend--build-time-vite_)
- Add custom domain `gigwrangler.com`; verify HTTPS is active. DNS is already managed in the same Cloudflare account, so no external nameserver change is needed and the certificate issues automatically

**4. First deploy**
- Update `PROD_REF` in both `deploy_prod.sh` and `deploy_dev.sh` if the ref changed
- `./deploy_prod.sh`

**5. Verify**
- `https://gigwrangler.com` loads; tab title reads "GigWrangler"
- Sign-in completes and the user appears in the prod Supabase dashboard → Auth → Users
- A deep link (e.g. `https://gigwrangler.com/gigs`) survives a hard refresh — confirms `_redirects` shipped
- Passkey registration succeeds — confirms `RP_ID` / `ORIGIN` are set
- An organization invitation email arrives — confirms Resend
- A deliberate client error appears in Sentry

---

## Known Gaps

Tracked here rather than lost. None of these block a deploy today; all of them would slow down an incident or a rebuild.

| Gap | Impact |
|---|---|
| **Cloudflare dashboard config is not in the repo** — no `wrangler.toml`, no record of which env vars are actually set | Rebuilding the Pages project means reconstructing settings from this doc and hoping it is current. Drift between dashboard and doc is undetectable. |
| **`RP_ID` / `ORIGIN` unverified in prod** | Documented here for the first time; whether they are actually set on `hqnnhtxcxedisasvtbqv` has not been confirmed. Run `supabase secrets list` against prod to check. If unset, passkeys are already broken with no error anywhere. |
| **Single-account blast radius** — hosting, DNS, and TLS all live in one Cloudflare account | Loss of access to that account takes the site down with no independent recovery path |
| **No staging environment** | Migrations are first exercised against production data during the prod deploy itself. Dev is the only rehearsal, and its data is not representative. |
| **No automated CD** | Every production release depends on one person with a working local toolchain, Docker running, and `gh` authenticated |
| **`website/index.html`** — a standalone marketing landing page exists in the repo, not wired into the Vite build | Unclear whether it is deployed, where, or how it is updated |
| **Prod Supabase plan/PITR/retention values not recorded** | The bring-up checklist says to verify them; the values actually configured are not written down anywhere |

---

## Related Documentation

- [setup-guide.md](./setup-guide.md) — local development setup, plus per-service configuration detail
- [tech-stack.md](./tech-stack.md) — technology choices and rationale
- [database.md](./database.md) — schema, RLS policies, migrations
- [security-scheme.md](./security-scheme.md) — authorization model
- [AGENTS.md](../../AGENTS.md) — Supabase environment table and the verify-before-remote-command ritual
- [`deploy_prod.sh`](../../deploy_prod.sh) / [`deploy_dev.sh`](../../deploy_dev.sh) — the executable runbooks
