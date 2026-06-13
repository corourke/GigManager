# Setup Guide

**Purpose**: This document provides step-by-step instructions for setting up the GigManager application for both local development and production environments using Supabase.

**Last Updated**: 2026-02-09

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Environment Switching](#environment-switching)
4. [Production Setup](#production-setup)
5. [Continuous Integration & Deploy Gates](#continuous-integration--deploy-gates)
6. [Edge Functions & External Integrations](#edge-functions--external-integrations)
7. [Supabase CLI Procedures](#supabase-cli-procedures)
8. [Troubleshooting](#troubleshooting)
9. [Checklists](#checklists)

---

## Prerequisites

- **Node.js**: version 18+ installed
- **Docker**: Required for local Supabase development (Desktop or Colima)
- **Supabase CLI**: Install via `npm install -g supabase`
- **Supabase Account**: Sign up at https://supabase.com for production hosting

---

## Local Development Setup

GigManager uses the Supabase CLI to provide a complete local development environment, including PostgreSQL, Auth, and Edge Functions.

### 1. Project Initialization
The project is already initialized with Supabase configuration in `supabase/config.toml`. If you are starting fresh:
```bash
npm install
supabase init
```

### 2. Start Local Supabase
This command starts the Docker containers and applies the consolidated migration and seed data.
```bash
supabase start
```
*Note: This may take several minutes the first time as it downloads Docker images.*

### 3. Verify Database State
You can check if the database is properly seeded by running:
```bash
# Count gigs in the local database
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "SELECT count(*) FROM gigs;"
```

### 4. Configure Frontend
The app automatically detects the environment. Ensure your `.env.local` (not committed)  matches the local settings provided by `supabase status`.

Default local settings:
- **API URL**: `http://127.0.0.1:54321`
- **Anon Key**: (Get from `supabase status` output)

#### 5. Access the Dashboard

The local Supabase Dashboard (Supabase Studio) is available at **http://127.0.0.1:54323**.  *Note: This matches the `[studio]` port in `supabase/config.toml`.*

#### 6. Reset Local Database

To wipe the database, re-run all migrations, and re-populate the seed data, run:

```bash
supabase db reset
```

---

## Environment Switching

The frontend application uses environment variables to connect to the correct Supabase instance. You can switch between local and production by updating your `.env.local` file.

### 1. Local Development
To connect to your local Docker-based Supabase instance:
```env
# .env.local
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=your-local-anon-key-from-supabase-status
```

### 2. Production
To connect to your hosted Supabase project:
```env
# .env.local
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key
```

### 3. Verification
The application exports these values in `src/utils/supabase/info.tsx`. If these variables are missing, the app will throw an error on startup to prevent accidental connections to the wrong database.

---

## Production Setup

### 1. Project Creation
- Create a new project in the [Supabase Dashboard](https://supabase.com).
- Note your **Project Reference ID** (found in project settings).

### 2. Apply Consolidated Schema
You must apply the consolidated schema to your remote database. There are two ways to do this:

#### Method A: Supabase Dashboard (Recommended for initial setup)
1. Open the **SQL Editor** in your Supabase project.
2. Click **New Query**.
3. Copy the entire contents of `supabase/migrations/20260209000000_initial_schema.sql`.
4. Paste the SQL into the editor and click **Run**.
5. Verify that all tables, functions, and RLS policies were created successfully.

#### Method B: Supabase CLI
1. Link your local project to the remote one:
   ```bash
   supabase link --project-ref <your-project-id>
   ```
2. Push the migrations:
   ```bash
   supabase db push
   ```

### 3. Configure Authentication
- Go to **Authentication -> Providers** and ensure **Email** is enabled.
- (Optional) Configure **Google OAuth** as described in the next section.
- For development/testing, you may want to disable "Confirm email" in **Auth Settings** to allow immediate signups.

### 4. Deploy Edge Functions
If your project uses Edge Functions, deploy them using the CLI:
```bash
supabase functions deploy server --project-ref <your-project-id>
```

---

## Continuous Integration & Deploy Gates

### GitHub Actions CI

`.github/workflows/ci.yml` runs on every push and pull request to `main`:

1. `npm ci`
2. `npm run typecheck` — TypeScript strict mode against the root `tsconfig.json`
3. `npm run lint` — ESLint flat config (`eslint.config.js`)
4. `npm run test:run` — full Vitest suite
5. `npm run build` — production Vite build

No repository secrets are required: the build step uses obviously-fake placeholder values for `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (the client only validates their presence at runtime, and nothing contacts Supabase during a build).

### Production deploy gates (`deploy_prod.sh`)

The deploy script refuses to run unless all of the following hold, checked **before** linking to the prod Supabase project:

- `git status --porcelain` is empty (no uncommitted/untracked changes)
- the current branch is `main`
- `npm run typecheck`, `npm run lint`, and `npm run test:run` all pass

After the gates, the script keeps its existing safety behavior: explicit prod-ref verification, schema + data backups before migrations, and an exit trap that relinks to dev. The trap is registered before the gates, so **every** exit path — including a gate failure — leaves the CLI linked to dev.

### Dev deploys (`deploy_dev.sh`)

Pushes migrations and deploys edge functions to the **dev** Supabase project, encoding the AGENTS.md safety ritual (link → hard-verify project-ref → deploy). No branch/cleanliness/test gates and no backups: dev is where unmerged work lands and its data is disposable.

```bash
./deploy_dev.sh           # link to dev, verify, db push, functions deploy
./deploy_dev.sh --check   # dry run: verifies link state, lists pending
                          # migrations and functions, deploys nothing
```

The script refuses to continue if the verified project-ref is prod (or anything other than dev), and its exit trap guarantees the CLI is left linked to dev on every exit path. Run `--check` first when unsure — the migration list shows which migrations the remote is missing.

---

## Error Monitoring (Sentry)

Sentry is integrated in three places, all **no-ops when the DSN env var is unset** (local dev and tests are unaffected):

| Surface | Init location | Env vars |
|---------|--------------|----------|
| Web app | `src/main.tsx` (`Sentry.init` + top-level `ErrorBoundary`) | `VITE_SENTRY_DSN` |
| `server` edge function | `supabase/functions/_shared/sentry.ts`, capture in the top-level catch | `SENTRY_DSN`, `SENTRY_ENVIRONMENT` |
| `ai-scan` edge function | same shared helper | `SENTRY_DSN`, `SENTRY_ENVIRONMENT` |

The web app tags events with `environment` (Vite mode) and `release` (`gigwrangler@<build timestamp>`). Edge functions flush events explicitly before responding because isolates can terminate immediately after the response.

### Setup

1. Create a Sentry organization/project at [sentry.io](https://sentry.io) — one **React** project for the web app and (optionally separate) one **Deno** project for edge functions. Copy each DSN.
2. **Web (production)**: in the Cloudflare Pages dashboard → gigwrangler project → Settings → Environment variables, add `VITE_SENTRY_DSN`. Redeploy for it to take effect (build-time variable).
3. **Edge functions (dev first)**:
   ```bash
   cat supabase/.temp/project-ref   # verify target before setting secrets
   supabase secrets set SENTRY_DSN=<dsn> SENTRY_ENVIRONMENT=development
   ```
   Repeat against prod with `SENTRY_ENVIRONMENT=production` when ready.
4. Verify: throw a test error (e.g. temporarily `throw new Error('sentry test')` in a button handler, or trigger a 500 in a function) and confirm the event appears in Sentry.

---

## Google OAuth Setup (Optional)

1. **Google Cloud Console**:
   - Create a project and configure the OAuth consent screen (External).
   - Create "OAuth 2.0 Client ID" for a Web Application.
   - Authorized Redirect URI: `https://YOUR-PROJECT-ID.supabase.co/auth/v1/callback`
2. **Supabase Configuration**:
   - In Supabase Dashboard, go to **Authentication -> Providers -> Google**.
   - Enable it and paste your Client ID and Client Secret.

## Edge Functions & External Integrations

GigManager uses Supabase Edge Functions for complex server-side logic and external integrations, such as Google Places and AI-powered invoice scanning.

### 1. Google Places API Configuration
The `server` edge function requires a `GOOGLE_PLACES_API_KEY` to perform place searches. This should be a Google Cloud API key with the "Places API (New)" enabled.

Set up the Google Cloud API key here: `https://console.cloud.google.com/`

#### Local Development
Edge Functions do not automatically read from your root `.env.local`. You must provide the key specifically to the functions runtime:

1. Create a file at `supabase/functions/server/.env` (or use the root `.env.local`).
2. Add your key:
   ```env
   GOOGLE_PLACES_API_KEY=your_actual_google_places_key
   ```
3. When running functions locally, use the `--env-file` flag:
   ```bash
   supabase functions serve server --env-file .env.local
   ```

#### Production
You must set the secret in your remote Supabase project:
```bash
supabase secrets set GOOGLE_PLACES_API_KEY=your_actual_google_places_key
```

### 2. AI Scanning Configuration (Anthropic)
The `ai-scan` edge function uses Anthropic's Claude models to extract structured data from invoices and receipts.

1. **API Key**: Obtain an API key from the [Anthropic Console](https://console.anthropic.com/).
2. **Model Support**:
   - **Claude 3.6 Sonnet (Latest)**: Used by default (`claude-sonnet-4-6`). This model has native PDF support and high extraction accuracy.
3. **PDF Support Requirement**: 
   - **Tier 1+ Required**: To use PDF scanning support, your Anthropic API account must be **Tier 1 or higher** (requires at least $5 in credits and a successful payment). 
   - **Tier 0 (Free/Build)**: Accounts on the free tier only support **image scanning** (JPG, PNG, WebP). PDF uploads will trigger a manual entry fallback in the UI.
4. **Verification**: 
   To verify if your API key has access to the latest models, run this command in your terminal (replace `YOUR_KEY_HERE`):
   ```bash
   curl https://api.anthropic.com/v1/messages \
     --header "x-api-key: YOUR_KEY_HERE" \
     --header "anthropic-version: 2023-06-01" \
     --header "content-type: application/json" \
     --data '{
       "model": "claude-sonnet-4-6",
       "max_tokens": 10,
       "messages": [{"role": "user", "content": "test"}]
     }'
   ```
   - **Success**: Returns a JSON message object.
   - **Failure**: Returns a `404` error (model not found) or `400` (bad request), confirming the model is unavailable for your current configuration.

5. **Diagnostic Test (via Supabase)**:
   To verify that your Supabase Edge Function is correctly configured and can reach Anthropic, run:
   ```bash
   curl -i -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/ai-scan \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -H "x-diagnostic: true"
   ```
   - **Success**: Returns `Anthropic connectivity successful`, confirming the function can communicate with the API using your stored secret.
   - **Failure**: Returns an error message with details from the Anthropic API (e.g., "invalid api key" or "model not found").

6. **Local Development**: Add the key to your `.env.local`:
   ```env
   ANTHROPIC_API_KEY=your_anthropic_key
   ```
   Run the function locally:
   ```bash
   supabase functions serve ai-scan --env-file .env.local
   ```
3. **Production**: Set the secret in Supabase:
   ```bash
   supabase secrets set ANTHROPIC_API_KEY=your_anthropic_key
   ```

### 3. Google Calendar Integration
The Google Calendar integration requires OAuth 2.0 credentials and specific Edge Function secrets.

#### OAuth Configuration
1. Create a project in the [Google Cloud Console](https://console.cloud.google.com/).
2. Enable the **Google Calendar API**.
3. Configure the **OAuth Consent Screen** (External).
4. Create **OAuth 2.0 Client IDs** for a Web Application.
   - **Authorized JavaScript Origins**: 
     - `http://localhost:3000` (Local)
     - `https://your-app-domain.com` (Production)
   - **Authorized Redirect URIs**: 
     - `http://localhost:3000/auth/google-calendar/callback`
     - `https://your-app-domain.com/auth/google-calendar/callback`

#### Environment Variables
Add the client ID to your frontend environment variables:
```env
# .env.local
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

#### Edge Function Secrets
Set the client ID and secret as Supabase secrets so the Edge Function can perform token exchanges:
```bash
supabase secrets set GOOGLE_CLIENT_ID=your-google-client-id
supabase secrets set GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 4. Secrets Management
- **List Secrets**: `supabase secrets list`
- **Set Secret**: `supabase secrets set NAME=VALUE`
- **Unset Secret**: `supabase secrets unset NAME`

---

## Supabase CLI Procedures

### Deploying Edge Functions
```bash
supabase functions deploy server --project-ref <your-project-id>
```

### Managing Migrations
- **Apply to Remote**: `supabase db push` (pushes unapplied local migrations).
- **Check Status**: `supabase migration list` (compares local vs remote).
- **Repair History**: `supabase migration repair --status applied <timestamp>` (manually marks as applied).

### Schema and Data Dumps
- **Dump Schema**: `supabase db dump -f schema_dump.sql`
- **Dump Data**: `supabase db dump --data-only --use-copy -f data_dump.sql`
- **Convert to Seed**: Use `supabase/dump/convert_seed.py` to convert COPY commands to INSERTs for `seed.sql`.

### Resetting Remote Database

**Warning: This is destructive!** It will wipe all data and schema in your production database and re-apply migrations.

#### Method A: Supabase CLI (Preferred)
1. Ensure your project is linked:
   ```bash
   supabase link --project-ref <your-project-id>
   ```
2. Reset the linked database:
   ```bash
   supabase db reset --linked
   ```
   *Note: This command will prompt for confirmation. It drops the `public` schema and re-runs all local migrations.*

#### Method B: Supabase Dashboard (Manual)
If the CLI reset fails or you want a fresh start without local migrations:
1. Go to **Project Settings -> Database**.
2. Scroll to the bottom and look for **Reset Database** (if available) or manually drop the public schema in the **SQL Editor**:
   ```sql
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   GRANT ALL ON SCHEMA public TO postgres;
   GRANT ALL ON SCHEMA public TO anon;
   GRANT ALL ON SCHEMA public TO authenticated;
   GRANT ALL ON SCHEMA public TO service_role;
   ```
3. Re-apply the consolidated schema by following [Apply Consolidated Schema](#2-apply-consolidated-schema).
4. **Redeploy Edge Functions**: If you have modified any Edge Functions, remember to redeploy them:
   ```bash
   supabase functions deploy server --project-ref <your-project-id>
   ```

---

## Troubleshooting

### Common Database Issues
- **"relation 'gigs' does not exist"**: Usually caused by an empty `search_path`. Ensure your SQL files set `search_path` to `public, extensions`.
- **"trailing junk after numeric literal"**: Occurs when `seed.sql` contains `COPY` commands that the CLI cannot parse. Use `INSERT` statements instead.
- **RLS Policy errors**: Verify that the user has the correct organization membership in the `organization_members` table.

### Authentication Issues
- **"Email not confirmed"**: Disable "Confirm email" in Supabase settings for dev/testing.
- **Google OAuth Redirect Loop**: Check that redirect URIs in Google Console match your Supabase project URL exactly.

### Local Development Issues
- **Docker not running**: Ensure Docker Desktop or Colima is active before running `supabase start`.
- **Port conflicts**: If port 54321 or 54322 is taken, modify `supabase/config.toml`.

### Common Edge Function Issues
- **500 (Internal Server Error)**: Often caused by missing environment variables. Check the logs (`supabase functions serve` output locally) to see if a specific key like `GOOGLE_PLACES_API_KEY` is missing.
- **CORS Errors**: Ensure the function returns the correct `Access-Control-Allow-Origin` headers. The `server` function includes a helper for this.

---

## Checklists

### New Developer Onboarding
- [ ] Install Node.js 18+ and Docker.
- [ ] Run `npm install`.
- [ ] Run `supabase start`.
- [ ] Run `npm run dev` and sign up.

### Production Deployment
- [ ] Enable Email confirmation / Configure OAuth.
- [ ] Set up custom SMTP provider.
- [ ] Review and test all RLS policies.
- [ ] Configure session timeouts.
- [ ] Create database backup schedule.

---

Enjoy managing your gigs! 🎭🎪🎬
