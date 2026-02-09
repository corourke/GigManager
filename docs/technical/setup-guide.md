# Setup Guide

**Purpose**: This document provides step-by-step instructions for setting up the GigManager application with Supabase.

**Last Updated**: 2026-02-09

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Option 1: Email Authentication Setup](#option-1-email-authentication-setup-5-minutes)
3. [Option 2: Google OAuth Setup](#option-2-google-oauth-setup-15-minutes)
4. [Database Migration](#database-migration)
5. [Testing Your Setup](#testing-your-setup)
6. [Troubleshooting](#troubleshooting)
7. [Production Checklist](#production-checklist)

---

## Prerequisites

- Supabase account (sign up at https://supabase.com)
- Supabase project created
- Node.js 18+ installed
- Project dependencies installed (`npm install`)

**For Google OAuth (Option 2):**
- Google account
- Access to Google Cloud Console

---

## Option 1: Email Authentication Setup (5 minutes)

Get real authentication and database with minimal setup.

### Step 1: Run the Database Migration

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `/supabase/migrations/001_initial_schema.sql`
5. Paste into the SQL editor
6. Click **Run** or press Cmd/Ctrl + Enter
7. Wait for "Success" message

✅ **Database tables created with Row-Level Security!**

**What this creates:**
- All 16 database tables
- Row-Level Security (RLS) policies
- Automatic triggers for timestamps and audit logging
- Seed data for common staff roles (FOH, Lighting, Stage, etc.)

### Step 2: Enable Email Authentication

1. In Supabase Dashboard, go to **Authentication → Providers**
2. Find **Email** provider
3. Make sure it's **enabled** (it usually is by default)
4. Scroll down to **Email Auth Settings**
5. For testing, you can **disable "Confirm email"** (optional)
6. Click **Save**

✅ **Email authentication ready!**

### Step 3: Configure Your App

1. **Verify Supabase credentials** in `/src/utils/supabase/info.tsx`:
   ```typescript
   export const SUPABASE_URL = 'https://YOUR-PROJECT-ID.supabase.co'
   export const SUPABASE_ANON_KEY = 'your-anon-key'
   ```
2. **Save the file**

✅ **App configured to use Supabase!**

### Step 4: Test It Out

1. **Start the app:**
   ```bash
   npm run dev
   ```
2. **Click "Sign Up" tab**
3. **Create an account:**
   - First Name: Your name
   - Last Name: Your last name
   - Email: your.email@example.com
   - Password: password123 (or stronger!)
4. **Click "Create Account"**
5. **You're in!** 🎉

✅ **You now have a real account with persistent data!**

### Step 5: Create Your First Organization

1. After signing in, you'll see "Create Your First Organization"
2. Click "Create Organization"
3. Fill in the details:
   - Name: "My Production Company"
   - Type: Choose your organization type
   - Add optional details (phone, address, website)
4. Click "Create Organization"
5. You'll be taken to the Dashboard

✅ **Organization created! You are the Admin.**

### Step 6: Create Your First Gig

1. From the Dashboard, click "Gigs" or "+ New Gig"
2. Fill in gig details:
   - Title: "Summer Concert 2025"
   - Date: Pick a date
   - Times: Set start and end times
   - Timezone: Select your timezone
   - Status: "Proposed" or "Booked"
   - Add tags, venue, notes, etc.
3. Click "Create Gig"
4. Your gig appears in the list!

✅ **First gig created!**

---

## Option 2: Google OAuth Setup (15 minutes)

Enable users to sign in with their Google accounts.

### Prerequisites

- Completed Option 1 (database migration and email auth)
- Google account
- Access to Google Cloud Console

### Step 1: Google Cloud Console Setup

1. Go to https://console.cloud.google.com/
2. Create a new project or select an existing one:
   - Click project dropdown → "New Project"
   - Name: "Gig Manager" (or your preferred name)
   - Click "Create"
3. **Configure OAuth Consent Screen:**
   - In the search bar, type "OAuth consent screen"
   - Click "OAuth consent screen"
   - Choose **"External"** and click "Create"
   - Fill in required fields:
     - App name: "Gig Manager"
     - User support email: Your email
     - Developer contact: Your email
   - Click "Save and Continue" through all screens
   - No scopes need to be added (default is fine)
   - Click "Back to Dashboard"

### Step 2: Create OAuth Credentials

1. In Google Cloud Console, go to **Credentials**
2. Click **"Create Credentials"** → **"OAuth 2.0 Client ID"**
3. Choose **"Web application"**
4. Name: "Gig Manager Web Client"
5. **Add Authorized JavaScript origins:**
   ```
   https://YOUR-PROJECT-ID.supabase.co
   ```
6. **Add Authorized redirect URIs:**
   ```
   https://YOUR-PROJECT-ID.supabase.co/auth/v1/callback
   ```
   (Replace YOUR-PROJECT-ID with your actual Supabase project reference ID)
7. Click **"Create"**
8. **Copy the Client ID and Client Secret** (you'll need these in Step 3)

💡 **Tip:** You can find your Supabase project ID in your Supabase dashboard URL: `https://app.supabase.com/project/YOUR-PROJECT-ID`

### Step 3: Configure in Supabase

1. In Supabase Dashboard, go to **Authentication → Providers**
2. Find **Google** provider in the list
3. Toggle it **ON**
4. Paste your **Client ID** from Google Cloud Console
5. Paste your **Client Secret** from Google Cloud Console
6. Click **Save**

✅ **Google OAuth configured!**

### Step 4: Test Google Sign-In

1. Open your app (or refresh if already open)
2. On the login screen, click **"Continue with Google"**
3. You'll be redirected to Google sign-in page
4. Choose your Google account
5. Approve the permissions (first time only)
6. You'll be redirected back and logged in!
7. Complete your profile if prompted
8. Create or select an organization

✅ **Google authentication working!**

---

## Database Migration

### Migration Files

All database migrations are located in `/supabase/migrations/`:
- `001_initial_schema.sql` - Initial schema with all tables, RLS policies, and seed data

### Schema Overview

**Core Tables:**
- `users` - User profiles (extends Supabase auth.users)
- `organizations` - Companies, venues, acts, etc.
- `organization_members` - User memberships with roles

**Gig Management:**
- `gigs` - Event records with status, dates, and details
- `gig_participants` - Organizations participating in gigs
- `gig_status_history` - Automatic audit log
- `gig_bids` - Bid tracking

**Staffing:**
- `staff_roles` - Global staff role templates
- `gig_staff_slots` - Staff positions needed for gigs
- `gig_staff_assignments` - Actual staff assignments

**Equipment:**
- `assets` - Equipment and inventory
- `kits` - Reusable equipment collections
- `kit_assets` - Kit composition
- `gig_kit_assignments` - Equipment assigned to gigs

**Features:**
- Row-Level Security (RLS) on all tables
- Automatic timestamp updates
- Automatic status change logging
- Multi-tenant data isolation

See [database.md](./database.md) for complete schema documentation.

---

## Testing Your Setup

### 1. Test Authentication

**Email/Password:**
- Sign up with email and password
- Verify you're redirected to profile completion
- Check that user profile is created

**Google OAuth:**
- Click "Continue with Google"
- Authorize the app
- Verify you're redirected back
- Check that user profile is created

### 2. Test Organization Management

- Create a new organization
- Verify you're added as Admin
- Check organization appears in selection screen
- Switch between organizations (if you have multiple)

### 3. Test Gig Management

- Create a new gig
- Edit inline in the list view
- Open detail view
- Verify changes save to database
- Delete a test gig

### 4. Test Real-Time Updates

- Open app in two browser windows
- Create/edit gig in one window
- Watch it update in the other window
- No refresh required!

This is powered by Supabase Realtime (PostgreSQL CDC).

### 5. Test Permissions

- Invite a user with Staff role
- Verify they can view but not edit
- Test Manager permissions (can edit, not delete)
- Confirm Admin has full access

### 6. Test Data Isolation

- Create second organization
- Create gig in first organization
- Verify gig not visible in second organization
- Test RLS policies are working

---

## Troubleshooting

### Common Issues

#### "Cannot read properties of undefined"
**Cause:** Database migration not run or Supabase connection issue  
**Solution:**
- Make sure you ran the database migration
- Verify Supabase credentials are correct

#### "Email not confirmed" error
**Cause:** Email confirmation required but not completed  
**Solution:**
- Go to Supabase Dashboard → Authentication → Settings
- Disable "Confirm email" for testing
- Or check your email for confirmation link

#### "Authentication failed" on login
**Cause:** Google OAuth misconfigured  
**Solution:**
- Verify Google OAuth is properly configured in Supabase
- Check that redirect URIs match exactly (including https://)
- Ensure the OAuth consent screen is published
- Confirm Client ID and Secret are correct in Supabase

#### Google OAuth redirect loop
**Cause:** Mismatched redirect URIs  
**Solution:**
- Verify redirect URI in Google Console matches your Supabase project
- Make sure Client ID and Secret are correct
- Check that Google provider is enabled in Supabase
- Clear browser cookies and try again

#### "Access denied to this organization"
**Cause:** User not added to organization  
**Solution:**
- User needs entry in `organization_members` table
- Check role is set correctly
- Verify `organization_id` matches

#### No gigs showing up
**Cause:** No organization selected or no gigs created  
**Solution:**
- Make sure you created an organization first
- Check that you're viewing the correct organization
- Try creating a test gig to see if it appears
- Verify gig has your organization as a participant

#### Tables not created
**Cause:** Migration SQL didn't run successfully  
**Solution:**
- Run the full migration SQL in SQL Editor
- Check for error messages in Supabase logs
- Verify UUID extension is enabled
- Check for syntax errors in migration file

#### Real-time updates not working
**Cause:** Realtime not enabled or RLS blocking  
**Solution:**
- Check Supabase Realtime is enabled (Project Settings > API)
- Verify table has proper RLS policies
- Check browser console for subscription errors
- Verify user has SELECT permission on table

#### Session expired / logged out randomly
**Cause:** Normal session expiration  
**Solution:**
- This is normal - sessions expire after a period
- Just sign in again
- Session duration can be configured in Supabase settings

### Debugging Tools

**Supabase Dashboard:**
- **Table Editor**: Inspect data directly
- **SQL Editor**: Run ad-hoc queries
- **Logs**: View API errors and performance
- **Auth**: Manage users and sessions

**Browser DevTools:**
- **Network tab**: Check API requests
- **Console**: View subscription events and errors
- **Application tab**: Inspect session storage

**Testing Queries:**

Run these in Supabase SQL Editor to verify setup:

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Check staff roles seed data
SELECT * FROM staff_roles;

-- Check your user profile
SELECT * FROM users WHERE email = 'your.email@example.com';
```

---

## Production Checklist

### Security

- [ ] Enable email confirmation in Supabase Auth
- [ ] Configure proper OAuth consent screen (published)
- [ ] Set up custom SMTP provider (SendGrid, AWS SES, etc.)
- [ ] Enable rate limiting on authentication endpoints
- [ ] Review and test all RLS policies
- [ ] Set up password strength requirements
- [ ] Configure session timeout appropriately

### Performance

- [ ] Enable Supabase connection pooling
- [ ] Configure appropriate database indices (already in migration)
- [ ] Set up CDN for static assets
- [ ] Enable gzip compression
- [ ] Optimize bundle size (code splitting)
- [ ] Implement pagination for large lists

### Monitoring

- [ ] Set up Supabase monitoring and alerts
- [ ] Configure error tracking (Sentry, etc.)
- [ ] Set up uptime monitoring
- [ ] Create database backups schedule
- [ ] Monitor API usage and costs

### Domain & Deployment

- [ ] Configure custom domain in Supabase
- [ ] Set up SSL certificates
- [ ] Configure CORS properly
- [ ] Update OAuth redirect URIs for production domain
- [ ] Test authentication flows on production domain

### Documentation

- [ ] Document deployment process
- [ ] Create runbook for common issues
- [ ] Document backup and restore procedures
- [ ] Create user onboarding guide

---

## Success Checklist

- [ ] Database migration completed successfully
- [ ] Email authentication enabled and tested
- [ ] Created test account successfully
- [ ] Created first organization
- [ ] Created first gig
- [ ] Google OAuth configured and tested (optional)
- [ ] Tested real-time updates between browser windows
- [ ] Verified RLS policies working (data isolation)
- [ ] Tested all user roles (Admin, Manager, Staff, Viewer)

**All checked?** Congratulations! Your Gig Manager is fully operational! 🚀

---

## Quick Links

- **Supabase Dashboard**: https://app.supabase.com/
- **Google Cloud Console**: https://console.cloud.google.com/
- **Supabase Auth Docs**: https://supabase.com/docs/guides/auth
- **Supabase Realtime Docs**: https://supabase.com/docs/guides/realtime

---

## Related Documentation

- **Database Schema**: See [database.md](./database.md) for complete schema documentation
- **Tech Stack**: See [tech-stack.md](./tech-stack.md) for technology overview
- **Requirements**: See [../product/requirements.md](../product/requirements.md) for feature requirements
- **Workflows**: See [../product/workflows/](../product/workflows/) for UI flows
- **Coding Guide**: See [../development/ai-agents/coding-guide.md](../development/ai-agents/coding-guide.md) for implementation patterns

---

Enjoy managing your gigs! 🎭🎪🎬
