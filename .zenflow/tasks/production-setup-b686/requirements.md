# Product Requirements Document: Production Setup

**Feature**: Production Environment Setup  
**App Name**: GigWrangler (formerly GigManager)  
**Domain**: gigwrangler.com  
**Last Updated**: 2026-05-01  
**Status**: Draft

---

## 1. Overview

GigWrangler needs a publicly hosted production environment that is entirely separate from the local development environment. This includes a production Supabase database, public web hosting, a database backup strategy, and a full rebrand of the application from "GigManager" to "GigWrangler" throughout the codebase and configuration.

---

## 2. Goals

1. **Environment separation** — Production and development must use independent Supabase projects with no shared data.
2. **Public hosting** — The web app must be publicly accessible at `gigwrangler.com`.
3. **Rebrand** — All user-visible text, metadata, configuration files, and source code references to "GigManager" must be updated to "GigWrangler".
4. **Data protection** — Production data must have an automated backup strategy that allows recovery in the event of accidental deletion, corruption, or catastrophic failure.
5. **Low operational overhead** — Solutions should require minimal ongoing maintenance given a solo/small-team context.

---

## 3. Scope

**In scope:**
- Web application (React/Vite SPA) and HTML/CSS promotional website
- Supabase project separation (dev vs. prod)
- Frontend hosting on a CDN-backed static host
- Custom domain setup (`gigwrangler.com`)
- Database backup strategy for the production Supabase project
- Environment variable management for prod vs. dev
- Rebrand of "GigManager" → "GigWrangler" across source code, config, and metadata

**Out of scope (for now):**
- Mobile app (stage-plot-app) production deployment
- Automated CI/CD pipelines (manual deploys are acceptable)
- Staging/QA environments beyond dev and prod

---

## 4. User Stories

- **As the app owner**, I want a live production URL at `gigwrangler.com` where real users can access the app, so that the app is publicly usable.
- **As the app owner**, I want the production database to be isolated from development, so that local testing and migrations cannot affect live data.
- **As the app owner**, I want daily automated backups of the production database with point-in-time recovery, so that data can be restored after accidental loss or corruption.
- **As the app owner**, I want to deploy updates manually when I'm ready, so I maintain full control over what goes live.
- **As a user**, I want the app to present itself as "GigWrangler" everywhere I see it (app title, browser tab, install prompt, emails), so the branding is consistent.

---

## 5. Requirements

### 5.1 Environment Separation

- The production Supabase project must be a completely independent project from the development project (separate database, separate auth, separate edge functions, separate storage).
- The application must read its Supabase connection credentials (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) from environment variables at build time.
- Local development continues to use `.env.local` pointing at the development Supabase project.
- Production builds must use environment variables injected by the hosting platform, pointing at the production Supabase project.
- Schema migrations applied to production must be done deliberately via `supabase db push` targeting the production project — never automatically.

### 5.2 Web Hosting

**Recommended platform: Cloudflare Pages**

Rationale:
- Free tier with unlimited bandwidth and no monthly build minute caps (unlike Netlify's 300 min/mo free limit).
- Global CDN with edge caching — ideal for a Vite SPA with a `build/` output directory.
- Native support for custom domains and automatic HTTPS via Cloudflare's CDN.
- Environment variables set per-project in the dashboard, keeping production credentials out of the repository.
- Manual deploys are supported via `wrangler pages deploy` CLI or direct dashboard upload.
- Compatible with the existing Vite build output (`build/` directory) and PWA assets.

Alternative considered: Vercel (also free for personal use, similar DX, but enforces 100 GB bandwidth/mo on free tier and less generous edge function limits).

**Requirements:**
- The app must be deployed from the `build/` output of `npm run build`.
- The hosting platform must support Single-Page Application (SPA) routing (all routes must serve `index.html` — this requires a `_redirects` or equivalent rule).
- The custom domain `gigwrangler.com` must resolve to the hosted app with HTTPS.
- Production Supabase credentials (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) must be configured as environment variables on the hosting platform (not committed to the repository).

### 5.3 Rebrand: GigManager → GigWrangler

All occurrences of "GigManager" and "GigMgr" in the following locations must be updated to "GigWrangler" and "GigWrnglr" (or similar short form) respectively:

- `package.json` — `name` field
- `vite.config.ts` — PWA manifest `name` and `short_name`
- `index.html` — `<title>` tag and any meta tags
- `src/components/` — any user-visible display strings referencing the app name
- `supabase/config.toml` — any descriptive fields (note: `project_id` does not need to change)
- Google Calendar integration labels (in `src/services/googleCalendar.service.ts` and `src/components/CalendarIntegrationSettings.tsx`)
- PWA icons and splash screens (existing generic icons are acceptable initially; custom branded icons are a future consideration)

Documentation files (`docs/`, `scripts/README.md`, `AGENTS.md`) should also be updated but are lower priority and can be addressed as discovered.

### 5.4 Database Backup Strategy

**Recommended: Supabase Pro plan ($25/month)**

Rationale:
- Within the stated ~$25/month budget.
- Pro plan includes:
  - **Daily automated backups** with 7-day retention — sufficient for most recovery scenarios.
  - **Point-in-time recovery (PITR)** up to 7 days — allows restoring to any specific moment, not just daily snapshots.
  - No project pausing (free tier pauses after 1 week of inactivity, which would break a live production app).
  - Higher API rate limits and longer log retention.
- Hosting can remain on Cloudflare Pages free tier, keeping total cost at ~$25/month.

**Backup requirements:**
- Daily automated backups must be enabled and verified to be running.
- The backup retention window must be at minimum 7 days.
- Recovery must be possible in the event of:
  - Accidental table truncation or data deletion
  - A bad migration that corrupts data
  - Supabase infrastructure failure
- The production database must also be backed up manually (via `supabase db dump`) before any significant migration is applied, stored in a local or cloud location outside Supabase (e.g., an encrypted file on the developer's machine or a private GitHub repository).

### 5.5 Supabase Auth Configuration

- The production Supabase project's Auth settings must be updated with the correct `site_url` (`https://gigwrangler.com`) and `additional_redirect_urls` to allow OAuth and email-link redirects to work in production.
- Google OAuth credentials (if configured) must be updated to include the production domain as an authorized redirect URI in the Google Cloud Console.

### 5.6 Edge Functions

- Edge functions currently deployed to the development project must be deployed to the production Supabase project via `supabase functions deploy`.
- Edge function secrets (e.g., `GOOGLE_PLACES_API_KEY`) must be set on the production project via `supabase secrets set`.

---

## 6. Constraints

- **Budget**: ~$25/month total (Supabase Pro covers this; hosting must be free tier).
- **Deployment**: Manual deploys only — no CI/CD pipeline required.
- **No staging environment**: There are only two environments: development (local Supabase + localhost) and production (Cloudflare Pages + Supabase Pro). Migrations should be tested locally before being applied to production.

---

## 7. Success Criteria

- The web app is publicly accessible at `https://gigwrangler.com` and presents itself as "GigWrangler" throughout.
- Logging into the app on the production URL connects to the production Supabase database, not the development one.
- Local `npm run dev` continues to work against the development Supabase project unchanged.
- The production Supabase project is on the Pro plan with automated daily backups confirmed active.
- A manual `supabase db dump` runbook exists for pre-migration backups.
- All source-code references to "GigManager" are replaced with "GigWrangler".

---

## 8. Out-of-Scope / Future Considerations

- Custom email templates branded as GigWrangler (Supabase email auth templates)
- Custom PWA icons/splash screens with GigWrangler branding
- Automated deployment pipeline (GitHub Actions → Cloudflare Pages)
- Staging environment
- Mobile app (stage-plot-app) production deployment
- Monitoring / alerting (e.g., Sentry, uptime checks)
- CDN cache invalidation strategy for PWA updates (currently handled by `skipWaiting: true` in workbox config)
