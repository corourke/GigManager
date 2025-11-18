# Gig Manager - Quick Start Guide

Get your Gig Manager app up and running in minutes!

## Option 1: Quick Start with Mock Data (No Setup)

Perfect for testing the UI and features without any configuration.

1. **Open `/App.tsx`**
2. **Set line 51 to:**
   ```typescript
   const USE_MOCK_DATA = true;
   ```
3. **Start the app**
4. **Click any sign-in button** - You'll be logged in with demo data
5. **Explore the features:**
   - View sample gigs
   - Create new gigs
   - Edit gig details inline
   - View dashboard with statistics

✅ **No Supabase setup required!**

---

## Option 2: Full Setup with Email Authentication (5 minutes)

Get real authentication and database with minimal setup.

### Step 1: Run the Database Migration

1. Go to your Supabase project dashboard
2. Click "SQL Editor" in the sidebar
3. Click "New query"
4. Copy the entire contents of `/supabase/migrations/001_initial_schema.sql`
5. Paste into the SQL editor
6. Click "Run" or press Cmd/Ctrl + Enter
7. Wait for "Success" message

✅ **Database tables created with Row-Level Security!**

### Step 2: Enable Email Authentication

1. In Supabase Dashboard, go to **Authentication → Providers**
2. Find **Email** provider
3. Make sure it's **enabled** (it usually is by default)
4. Scroll down to **Email Auth Settings**
5. For testing, you can **disable "Confirm email"** (optional)
6. Click **Save**

✅ **Email authentication ready!**

### Step 3: Configure Your App

1. **Open `/App.tsx`**
2. **Set line 51 to:**
   ```typescript
   const USE_MOCK_DATA = false;
   ```
3. **Save the file**

✅ **App configured to use real Supabase!**

### Step 4: Test It Out

1. **Start the app**
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
   - Add optional details
4. Click "Create Organization"
5. You'll be taken to the Dashboard

✅ **Organization created!**

### Step 6: Create Your First Gig

1. From the Dashboard, click "Gigs" or "+ New Gig"
2. Fill in gig details:
   - Title: "Summer Concert 2025"
   - Date: Pick a date
   - Times: Set start and end times
   - Status: "Proposed" or "Booked"
   - Add tags, venue, notes, etc.
3. Click "Create Gig"
4. Your gig appears in the list!

✅ **First gig created!**

---

## Option 3: Full Setup with Google OAuth (15 minutes)

Want to allow users to sign in with Google? Follow these steps.

### Prerequisites:
- Completed Option 2 (database migration and email auth)
- Google account
- Access to Google Cloud Console

### Step 1: Google Cloud Console Setup

1. Go to https://console.cloud.google.com/
2. Create a new project or select existing one
3. In the search bar, type "OAuth consent screen"
4. Click "OAuth consent screen"
5. Choose "External" and click "Create"
6. Fill in required fields:
   - App name: "Gig Manager"
   - User support email: Your email
   - Developer contact: Your email
7. Click "Save and Continue" through all screens

### Step 2: Create OAuth Credentials

1. In Google Cloud Console, go to "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client ID"
3. Choose "Web application"
4. Name: "Gig Manager Web Client"
5. Add Authorized redirect URI:
   ```
   https://YOUR-PROJECT-ID.supabase.co/auth/v1/callback
   ```
   (Replace YOUR-PROJECT-ID with your actual Supabase project ID)
6. Click "Create"
7. **Copy the Client ID and Client Secret**

### Step 3: Configure in Supabase

1. In Supabase Dashboard, go to **Authentication → Providers**
2. Find **Google** provider
3. Toggle it **ON**
4. Paste your **Client ID** from Google
5. Paste your **Client Secret** from Google
6. Click **Save**

✅ **Google OAuth configured!**

### Step 4: Test Google Sign-In

1. Open your app
2. On the login screen, click **"Continue with Google"**
3. You'll be redirected to Google sign-in
4. Choose your Google account
5. Approve the permissions
6. You'll be redirected back and logged in!

✅ **Google authentication working!**

---

## Real-Time Collaboration Test

Want to see real-time updates in action?

1. **Sign in on two different browsers** (or incognito + regular)
2. **Create a gig in one browser**
3. **Watch it appear instantly in the other browser!** ✨
4. **Edit a gig in one browser**
5. **See the changes live in the other!** 🎯

This is powered by Supabase Realtime!

---

## What's Next?

### Customize Your App:
- **Add more organizations** - Support multiple production companies
- **Invite team members** - Add users to your organization
- **Track equipment** - Use the Assets feature (coming soon)
- **Manage staff** - Assign crew to gigs (coming soon)

### Enable More Features:
- **GitHub OAuth** - Let users sign in with GitHub
- **Microsoft OAuth** - Enterprise sign-in support
- **Email Templates** - Customize confirmation emails
- **Password Reset** - Add "Forgot Password" link

### Go to Production:
- **Enable email confirmation** - Verify user emails
- **Set up custom domain** - Use your own domain
- **Configure email provider** - Use SendGrid, AWS SES, etc.
- **Enable rate limiting** - Protect against abuse
- **Set up monitoring** - Track errors and usage

---

## Troubleshooting

### "Cannot read properties of undefined"
- Make sure you ran the database migration
- Check that `USE_MOCK_DATA` is set to `false`

### "Email not confirmed" error
- Go to Supabase Dashboard → Authentication → Settings
- Disable "Confirm email" for testing
- Or check your email for confirmation link

### Google OAuth redirect loop
- Verify redirect URI in Google Console matches your Supabase project
- Make sure Client ID and Secret are correct
- Check that Google provider is enabled in Supabase

### No gigs showing up
- Make sure you created an organization first
- Check that you're viewing the correct organization
- Try creating a test gig to see if it appears

### Session expired / logged out randomly
- This is normal - sessions expire after a period
- Just sign in again
- Session duration can be configured in Supabase settings

---

## Getting Help

- **Check the docs:**
  - `/AUTHENTICATION_SETUP.md` - Auth configuration
  - `/SUPABASE_INTEGRATION_COMPLETE.md` - Full integration guide
  - `/TECH_STACK.md` - Technology overview

- **Check the console:**
  - Open browser DevTools (F12)
  - Look for error messages in Console tab
  - Check Network tab for failed requests

- **Check Supabase:**
  - Go to your project dashboard
  - Check Logs for errors
  - Verify tables were created
  - Check RLS policies are enabled

---

## Success Checklist

- [ ] Database migration completed
- [ ] Email authentication enabled
- [ ] App configured to use real data (`USE_MOCK_DATA = false`)
- [ ] Created test account successfully
- [ ] Created first organization
- [ ] Created first gig
- [ ] Google OAuth configured (optional)
- [ ] Tested real-time updates (optional)

**All checked?** Congratulations! Your Gig Manager is fully operational! 🚀

---

## Quick Links

- **Supabase Dashboard:** https://app.supabase.com/
- **Google Cloud Console:** https://console.cloud.google.com/
- **Supabase Auth Docs:** https://supabase.com/docs/guides/auth
- **Supabase SQL Editor:** Click "SQL Editor" in your Supabase dashboard

---

Enjoy managing your gigs! 🎭🎪🎬
