# Setup Guide

**Purpose**: This document provides step-by-step instructions for setting up the GigManager application for both local development and production environments using Supabase.

**Last Updated**: 2026-02-09

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Environment Switching](#environment-switching)
4. [Production Setup](#production-setup)
5. [Edge Functions & External Integrations](#edge-functions--external-integrations)
6. [Supabase CLI Procedures](#supabase-cli-procedures)
7. [Troubleshooting](#troubleshooting)
8. [Checklists](#checklists)

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

## Google OAuth Setup (Optional)

1. **Google Cloud Console**:
   - Create a project and configure the OAuth consent screen (External).
   - Create "OAuth 2.0 Client ID" for a Web Application.
   - Authorized Redirect URI: `https://YOUR-PROJECT-ID.supabase.co/auth/v1/callback`
2. **Supabase Configuration**:
   - In Supabase Dashboard, go to **Authentication -> Providers -> Google**.
   - Enable it and paste your Client ID and Client Secret.

## Edge Functions & External Integrations

GigManager uses Supabase Edge Functions for complex server-side logic and external integrations, such as Google Places.

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

### 2. Secrets Management
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
