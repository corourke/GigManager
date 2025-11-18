# Supabase Setup Guide for Gig Manager

This guide will help you set up your Supabase backend to work with the Gig Manager application.

## Prerequisites

- A Supabase account (sign up at https://supabase.com)
- A Supabase project created

## Step 1: Run Database Migrations

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `/supabase/migrations/001_initial_schema.sql`
5. Paste it into the SQL editor
6. Click **Run** to execute the migration

This will create all tables, indexes, Row-Level Security (RLS) policies, and seed data for staff roles.

## Step 2: Configure Google OAuth

The application uses Google OAuth for authentication. You must configure this in your Supabase dashboard:

1. Go to **Authentication** → **Providers** in your Supabase dashboard
2. Find **Google** in the list of providers
3. Toggle it **ON**
4. Follow the detailed setup instructions at: https://supabase.com/docs/guides/auth/social-login/auth-google

### Quick Overview of Google OAuth Setup:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to **Credentials** → **Create Credentials** → **OAuth client ID**
5. Configure the OAuth consent screen
6. Set Application type to **Web application**
7. Add Authorized JavaScript origins:
   - `https://<your-project-ref>.supabase.co`
8. Add Authorized redirect URIs:
   - `https://<your-project-ref>.supabase.co/auth/v1/callback`
9. Copy the **Client ID** and **Client Secret**
10. Paste them into your Supabase Google provider settings
11. Save the changes

## Step 3: Verify Configuration

Your Supabase project should now have:

✅ All database tables created with proper relationships  
✅ Row-Level Security (RLS) policies enabled  
✅ Google OAuth configured for authentication  
✅ Automatic triggers for timestamp updates and status logging

## Step 4: Switch from Mock Data to Real Data

In `/App.tsx`, change the constant:

```typescript
const USE_MOCK_DATA = false; // Change from true to false
```

This will enable real Supabase authentication and data storage.

## Database Schema Overview

The database follows the Prisma schema structure with these main tables:

### Core Tables
- **users** - User profiles (extends Supabase auth.users)
- **organizations** - Production companies, venues, acts, etc.
- **organization_members** - User memberships in organizations with roles

### Gig Management
- **gigs** - Main gig records with status, dates, and details
- **gig_participants** - Organizations participating in a gig (venue, act, production, etc.)
- **gig_status_history** - Automatic audit log of status changes
- **gig_bids** - Bid tracking for gigs

### Staffing
- **staff_roles** - Global staff role templates (FOH, Lighting, etc.)
- **gig_staff_slots** - Staff positions needed for a gig
- **gig_staff_assignments** - Actual staff assigned to positions

### Additional Features
- **org_annotations** - Private notes about other organizations
- **assets** - Equipment and asset management

## Row-Level Security (RLS)

All tables have RLS enabled with policies that ensure:

- Users can only see gigs from organizations they belong to
- Only Admins and Managers can create/update gigs
- Only Admins can delete gigs
- Organization data is properly isolated
- Staff can view but not modify (Viewer role)

## Real-Time Updates

The application automatically subscribes to database changes for gigs:

- New gigs appear instantly for all users
- Updates sync across all clients immediately
- Deletions are reflected in real-time

This is powered by Supabase's real-time PostgreSQL change data capture.

## Common Issues

### "Authentication failed" on login
- Verify Google OAuth is properly configured
- Check that redirect URIs match exactly (including https://)
- Ensure the OAuth consent screen is published

### "Access denied to this organization"
- User needs to be added to the organization via organization_members table
- At least one user must exist with Admin role for each organization

### Tables not created
- Make sure you ran the entire migration SQL
- Check for errors in the SQL editor
- Verify UUID extension is enabled

## Mock Data Mode

If you want to test without setting up Supabase immediately:

1. Keep `USE_MOCK_DATA = true` in `/App.tsx`
2. The app will use local mock data
3. No authentication or database required
4. Data will not persist between sessions

## Support

For Supabase-specific issues, refer to:
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord Community](https://discord.supabase.com)

For Google OAuth issues:
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
