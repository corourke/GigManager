# Sentry Error Monitoring Setup

**Last Updated**: 2026-09-08

Sentry is fully integrated in code but initializes as a **no-op** until its DSN environment variables are provided. This document explains what's wired, what's missing, and the exact steps to activate production error capture.

---

## Current Status

| Layer | Code status | Missing |
|---|---|---|
| Web app — React render errors | ✅ ErrorBoundary wraps full app tree | `VITE_SENTRY_DSN` in hosting dashboard |
| Web app — unhandled promise rejections & JS errors | ✅ Auto-captured by `@sentry/react` v10 default integrations | same |
| `ai-scan` edge function | ✅ `captureException` in top-level catch + explicit `flush()` | `SENTRY_DSN` Supabase secret |
| `server` edge function | ✅ `captureException` in top-level catch + explicit `flush()` | same |

There are **two Sentry projects** — one per runtime:

- **JavaScript React** → used by the web app (`VITE_SENTRY_DSN`)
- **Deno** → used by the edge functions (`SENTRY_DSN`)

---

## Step 1 — Get your DSNs

1. Sign in at [sentry.io](https://sentry.io) and go to **Projects**
2. Open the **JavaScript React** project → **Settings → Client Keys (DSN)** — copy the DSN
3. Open the **Deno** project → **Settings → Client Keys (DSN)** — copy that DSN

A DSN looks like: `https://abc123@o123456.ingest.sentry.io/789`

---

## Step 2 — Set `VITE_SENTRY_DSN` (web app)

Use the DSN from the **JavaScript React** project.

This variable is **baked into the JS bundle at build time** — a new build is required after setting it (step 4). Do not put it in `.env.production.local`; that file is local-only and never deployed.

**Cloudflare Pages:**
1. Go to **dash.cloudflare.com** → Workers & Pages → GigWrangler project
2. **Settings → Environment Variables → Production → Add variable**
3. Name: `VITE_SENTRY_DSN` / Value: your React project DSN
4. Save

**Vercel:**
1. Go to the project on **vercel.com** → **Settings → Environment Variables**
2. Add `VITE_SENTRY_DSN` scoped to **Production** (and Preview if desired)
3. Save

---

## Step 3 — Set `SENTRY_DSN` for edge functions

Use the DSN from the **Deno** project. Run from the project directory:

```bash
supabase secrets set \
  SENTRY_DSN="https://abc123@o123456.ingest.sentry.io/789" \
  SENTRY_ENVIRONMENT="production"
```

Supabase edge functions pick up secrets immediately — no redeploy needed.

Confirm they were saved:

```bash
supabase secrets list
```

`SENTRY_DSN` and `SENTRY_ENVIRONMENT` should appear in the output (values are hidden by design).

> **Why `SENTRY_ENVIRONMENT` matters**: without it, events default to `development` in Sentry and will be filtered out of production dashboards.

---

## Step 4 — Trigger a new web app build

Push any commit to `main`, or trigger a manual redeploy from your hosting dashboard. This picks up the `VITE_SENTRY_DSN` set in step 2.

Edge functions (step 3) are already live — no action needed there.

---

## Step 5 — Verify

After the new build deploys:

1. Open the production site → **DevTools → Network** — filter by `sentry.io`; a session init request should appear within seconds
2. Or open the Console and run `window.__SENTRY__` — a defined object confirms Sentry initialized

**Send a real test event:**

```js
// Run in browser console on the production site
throw new Error("Sentry test — delete me from Issues")
```

Check the Sentry **Issues** page — the error should appear within ~30 seconds. Delete it after confirming.

---

## What gets captured (once active)

**Web app:**
- React render errors (caught by `Sentry.ErrorBoundary` in `src/main.tsx`)
- Unhandled promise rejections and uncaught exceptions (auto-instrumented)
- Release tagged with build timestamp (`gigwrangler@<ISO timestamp>`)

**Edge functions:**
- All unhandled throws in `ai-scan` and `server` functions
- Explicit `Sentry.flush(2000)` before each response ensures events are sent before the Deno isolate tears down

**Not captured (by design):**
- Expected HTTP errors returned as responses (401, 403, 429) — these are not thrown
- Performance traces — `tracesSampleRate: 0` on edge functions
- PII — `sendDefaultPii: false` on the web app

---

## Optional next step — Source maps

Without source maps, stack traces in Sentry point to minified filenames (`index-XXXXXXXX.js`) rather than real source locations. To fix this, add [`@sentry/vite-plugin`](https://docs.sentry.io/platforms/javascript/sourcemaps/uploading/vite/) to `vite.config.ts` and set a `SENTRY_AUTH_TOKEN` in the CI build environment.

---

## Related documentation

- [deployment.md](./deployment.md) — full configuration inventory including all environment variables and secrets
- [setup-guide.md](./setup-guide.md) — local development setup
- `supabase/functions/_shared/sentry.ts` — shared edge function Sentry module
- `src/main.tsx` — web app Sentry initialization and ErrorBoundary
