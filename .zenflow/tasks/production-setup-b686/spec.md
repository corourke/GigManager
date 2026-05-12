# Technical Specification: Production Setup

**Based on**: `requirements.md`  
**Last Updated**: 2026-05-01

---

## 1. Technical Context

| Property | Value |
|---|---|
| Language | TypeScript (frontend), Deno 2 (edge functions) |
| Build tool | Vite 6.3.5 |
| Frontend framework | React 18 + Shadcn/ui |
| Hosting | Cloudflare Pages (free tier) |
| Backend | Supabase (Pro plan for production) |
| Package manager | npm |
| Build output dir | `build/` |
| Env var prefix | `VITE_` (injected at build time by Vite) |

### Existing env var pattern

The app already reads Supabase credentials from build-time environment variables:

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Local development uses `.env.local` (git-ignored) pointing at the dev Supabase project. No code changes are needed for env var separation — Cloudflare Pages injects production values at build time.

---

## 2. Implementation Approach

### 2.1 Rebrand: GigManager → GigWrangler

All occurrences of "GigManager" / "GigMgr" must be replaced with "GigWrangler" / "GigWrnglr". Internal-only identifiers (TypeScript interface names, IDB schema names) should also be updated for consistency.

#### `package.json`
- `"name": "GigManager"` → `"name": "gigwrangler"` (npm convention: lowercase, no spaces)

#### `vite.config.ts`
- PWA manifest `name`: `"GigManager"` → `"GigWrangler"`
- PWA manifest `short_name`: `"GigMgr"` → `"GigWrnglr"`

#### `index.html`
- `<title>GigManager</title>` → `<title>GigWrangler</title>`
- `<meta name="apple-mobile-web-app-title" content="GigManager" />` → `content="GigWrangler"`

#### `src/components/mobile/MobileLayout.tsx`
- Fallback label: `'GigManager'` → `'GigWrangler'`

#### `src/services/googleCalendar.service.ts`
- URL label in event description: `[View in GigManager]` → `[View in GigWrangler]`

#### `src/components/CalendarIntegrationSettings.tsx`
- Three user-visible strings referencing "GigManager" → "GigWrangler"

#### `src/utils/idb/store.ts`
- TypeScript interface `GigManagerDB` → `GigWranglerDB`
- `openDB<GigManagerDB>` → `openDB<GigWranglerDB>`
- Verify IDB database name string and update if it contains "GigManager"

#### `supabase/config.toml`
- No user-visible "GigManager" strings found. `project_id` is left unchanged (references the local dev project slug).

#### `AGENTS.md` and `docs/`
- Lower priority; update references where encountered but not a blocker.

---

### 2.2 Cloudflare Pages: SPA Routing

Cloudflare Pages requires a `_redirects` file in the build output to serve `index.html` for all routes.

**File to add**: `public/_redirects` — Vite copies `public/` into `build/` verbatim.

```
/*    /index.html   200
```

---

### 2.3 Environment Variable Management

No code changes required. Vite already reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the environment.

- **Dev**: `.env.local` (git-ignored, points at dev Supabase project)
- **Production**: Environment variables set in Cloudflare Pages dashboard → **Settings → Environment Variables**

A `.env.example` file (committed, placeholder values only) documents required variables:

```
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

---

## 3. Source Code Changes Summary

| File | Change |
|---|---|
| `package.json` | Rename `name` field to `gigwrangler` |
| `vite.config.ts` | Update PWA manifest `name` and `short_name` |
| `index.html` | Update `<title>` and `apple-mobile-web-app-title` meta |
| `src/components/mobile/MobileLayout.tsx` | Update fallback app name string |
| `src/services/googleCalendar.service.ts` | Update app name in calendar event description link |
| `src/components/CalendarIntegrationSettings.tsx` | Update 3 user-visible strings |
| `src/utils/idb/store.ts` | Rename TypeScript interface and type references |
| `public/_redirects` | **New file** — SPA routing fallback for Cloudflare Pages |
| `.env.example` | **New file** — documents required env vars (placeholder values only) |
| `.gitignore` | Add `backups/` directory |

---

## 4. Data Model / API / Interface Changes

**None.** The production Supabase project will have the same schema as development (applied via migrations).

---

## 5. Manual Setup Checklist

These steps produce no source code changes but must be completed before the production deployment is live. Complete them in order.

### 5.1 Supabase Production Project

- [ ] Create a new Supabase project at [supabase.com](https://supabase.com) on the **Pro plan**
- [ ] Note the production project reference ID (`PROD_REF`) and database password
- [ ] Apply all migrations to the production project:
  ```bash
  supabase db push --db-url "postgresql://postgres:[password]@db.[PROD_REF].supabase.co:5432/postgres"
  ```
- [ ] Deploy edge functions to the production project:
  ```bash
  supabase functions deploy --project-ref [PROD_REF]
  ```
- [ ] Set edge function secrets on the production project:
  ```bash
  supabase secrets set GOOGLE_PLACES_API_KEY=... --project-ref [PROD_REF]
  ```

### 5.2 Supabase Auth Configuration

- [ ] In the production Supabase dashboard → **Authentication → URL Configuration**:
  - Set `Site URL` to `https://gigwrangler.com`
  - Add `https://gigwrangler.com/**` to `Redirect URLs`
- [ ] In Google Cloud Console → **OAuth 2.0 Client** (if Google OAuth is configured):
  - Add `https://gigwrangler.com` to **Authorized redirect URIs**

### 5.3 Supabase Backup Verification

- [ ] In the production Supabase dashboard → **Database → Backups**:
  - Confirm automated daily backups are active
  - Confirm retention window is at least 7 days
  - Confirm PITR (Point-in-Time Recovery) is enabled

### 5.4 Cloudflare Pages Setup

- [ ] Create a new Cloudflare Pages project named `gigwrangler`
- [ ] Configure build settings in the dashboard:
  - Build command: `npm run build`
  - Build output directory: `build`
- [ ] Add production environment variables in **Settings → Environment Variables**:
  - `VITE_SUPABASE_URL` — production Supabase project URL
  - `VITE_SUPABASE_ANON_KEY` — production Supabase anon key
- [ ] Add `gigwrangler.com` as a custom domain in **Custom domains**
- [ ] Verify HTTPS is active on `gigwrangler.com`

### 5.5 First Production Deploy

Run after all Cloudflare Pages setup is complete:

```bash
npm run build
npx wrangler pages deploy build/ --project-name gigwrangler
```

Or upload the `build/` directory via the Cloudflare Pages dashboard.

---

## 6. Pre-Migration Backup Runbook

> **Run this before every significant migration applied to production.**

```bash
supabase db dump \
  --db-url "postgresql://postgres:[password]@db.[PROD_REF].supabase.co:5432/postgres" \
  -f ./backups/prod-backup-$(date +%Y%m%d-%H%M%S).sql
```

- Store dump files **outside the repository** (encrypted local disk or private cloud storage)
- The `backups/` directory is git-ignored

---

## 7. Verification

### Automated (run after code changes)

```bash
npm run build       # Verify build succeeds with rebrand changes
npm run test:run    # Verify no tests broken by renames
```

Post-build checks:
- [ ] `build/_redirects` exists and contains `/* /index.html 200`
- [ ] `build/index.html` `<title>` is "GigWrangler"
- [ ] `build/manifest.webmanifest` shows `"name": "GigWrangler"`

### Manual (run after deployment)

- [ ] `https://gigwrangler.com` loads the app and browser tab shows "GigWrangler"
- [ ] Login completes and connects to the **production** Supabase project (verify via Supabase dashboard → Auth → Users)
- [ ] `npm run dev` still works against the dev Supabase project unchanged
- [ ] Google Calendar event descriptions show "GigWrangler" links
- [ ] PWA install prompt shows "GigWrangler"

---

## 8. Future Considerations

These items are explicitly out of scope for this task but should be tracked for future work:

- [ ] **Custom PWA icons/splash screens** with GigWrangler branding (current icons are generic)
- [ ] **Custom Supabase email templates** branded as GigWrangler (currently uses Supabase defaults)
- [ ] **Automated CI/CD pipeline** — GitHub Actions → Cloudflare Pages on merge to `main`
- [ ] **Staging environment** — a third Supabase project + Cloudflare Pages preview branch for testing migrations safely
- [ ] **Mobile app production deployment** — `stage-plot-app` (React Native / Expo) is not yet deployed to production
- [ ] **Monitoring and alerting** — uptime checks (e.g., Better Uptime), error tracking (e.g., Sentry)
- [ ] **CDN cache invalidation strategy** for PWA updates (currently relies on `skipWaiting: true` in workbox config; users may see stale versions briefly)
- [ ] **Backup offsite storage** — automate `supabase db dump` to a private S3 bucket or encrypted GitHub repo on a schedule
