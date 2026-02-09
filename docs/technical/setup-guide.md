# Setup Guide

**Purpose**: This document provides step-by-step instructions for setting up the GigManager application for both local development and production environments using Supabase.

**Last Updated**: 2026-02-09

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Production Setup](#production-setup)
4. [Supabase CLI Procedures](#supabase-cli-procedures)
5. [Troubleshooting](#troubleshooting)
6. [Checklists](#checklists)

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
The app automatically detects the environment. Ensure your `.env.local` (not committed) or `src/utils/supabase/info.tsx` matches the local settings provided by `supabase status`.

Default local settings:
- **API URL**: `http://127.0.0.1:54321`
- **Anon Key**: (Get from `supabase status` output)

---

## Production Setup

### Option 1: Quick Setup (Email Auth)

1. **Create Supabase Project**: Go to [Supabase Dashboard](https://supabase.com) and create a new project.
2. **Apply Schema**:
   - Navigate to **SQL Editor** in your Supabase project.
   - Copy the contents of `supabase/migrations/20260209000000_initial_schema.sql`.
   - Paste and **Run**.
3. **Configure Auth**:
   - Go to **Authentication -> Providers** and ensure **Email** is enabled.
   - For testing, you may disable "Confirm email" in Auth Settings.
4. **Update App Credentials**: Update `src/utils/supabase/info.tsx` with your production URL and Anon Key.

### Option 2: Google OAuth Setup

1. **Google Cloud Console**:
   - Create a project and configure the OAuth consent screen (External).
   - Create "OAuth 2.0 Client ID" for a Web Application.
   - Authorized Redirect URI: `https://YOUR-PROJECT-ID.supabase.co/auth/v1/callback`
2. **Supabase Configuration**:
   - In Supabase Dashboard, go to **Authentication -> Providers -> Google**.
   - Enable it and paste your Client ID and Client Secret.

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
**Warning: This is destructive!**
```bash
supabase link --project-ref <your-project-id>
supabase db reset --linked
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
