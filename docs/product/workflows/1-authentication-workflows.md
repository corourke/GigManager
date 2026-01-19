# Authentication & Organization Workflows

**Purpose**: This document describes user authentication, profile management, and organization selection/creation workflows.

**Last Updated**: 2026-01-18

---

## Overview

These workflows cover the initial user experience: logging in, completing user profiles, selecting or creating organizations, and switching between organizations.

---

## Flow 1: User Login & Organization Selection

**User Journey:**

1. User visits app → Redirected to `/login`
2. User sees login options:
   - "Sign in with Google" (OAuth)
   - Email/Password form (with Sign Up tab)
   - Other SSO providers if they are enabled in Supabase
3. After authentication:
   - New users create a user profile by authenticating for the first time.
     - If new user and no profile exists → Profile completion screen → organization selection
   - If profile exists (not a new user) → organization selection
4. Organization selection:
   - User is a member of one organization → Redirect to Gig List
   - User is a member of two or more organizations → Show organization picker
   - User is not a member of any organization (is a new user) 
     - Email domain matches an existing organizations → add user to that organization as 'Staff'
     - Email domain does not match an existing organization
       - Select an existing organization (possibly using search tools)
       - OR → "Create your first organization" screen
5. User selects organization → Redirect to Gig List


**Screens Required:**
- **Login Screen** (`/login`)
  - Clean, centered interface
  - Tabs (Sign In / Sign Up)
  - Email/password form (then "OR") buttons for other SSO providers (including Google OAuth) as enabled
  - Loading state during authentication
  - Error state with retry option
- **Profile Completion Screen** (for new users)
  - Collect: first name, last name, phone number, email
  - Simple form, single page
  - Auto-populated from OAuth when available
- **Organization Selection Screen** (`/org/switch`)
  - Grid/list of organization cards. 
  - Display organizations that user is a member of.
  - Each card shows: name, type, user's role
  - Search bar to filter organizations
  - "Create New Organization" button
  - Empty state: "You're not yet a member of an organization, choose "

**Mobile Considerations:**
- Biometric authentication option (Face ID/Touch ID)
- Full-screen forms
- Native OAuth redirect handling

---

## Flow 2: Create New Organization

**User Journey:**
1. User clicks "Create Organization"
2. Screen title: "Create New Organization" with subtitle: "Search for your business or enter details manually"
3. Google Places search interface (optional):
   1. "Find Your Business", "Search for your business on Google to auto-fill organization details"
   2. Search for business name "Search for your business name" prompt text with "Search" button
   3. Select from results to auto-populate fields
   4. Or skip and enter manually

4. Fill organization form:
   - Name (required)
   - Type (required): Production, Sound, Lighting, Staging, Rentals, Venue, Act, Agency
   - Contact info (optional): phone, email, address
   - Description (optional, Markdown)
5. Submit → User automatically becomes Admin
6. Redirect to new organization's dashboard



**Screens Required:**
- **Create Organization Form** (`/org/create`)
  - Search for business via Google Places API matches on partial name, prefer businesses closer to user location and prefer businesses within the entertainment industry.
  - Progressive disclosure: Required fields first, optional expandable
  - Organization type selector (visual with icons)
  - Address fields grouped
  - Markdown editor for description
  - Loading state during submission
  - Validation errors inline

**Mobile Considerations:**
- Multi-step form (Step 1: Basic, Step 2: Contact, Step 3: Details)
- Progress indicator
- Native keyboard types (email, phone, address)

---

## Related Documentation

- **Requirements**: See [requirements.md](../requirements.md) for feature requirements
- **Database Schema**: See [technical/database.md](../../technical/database.md) for data model
- **Coding Guide**: See [development/ai-agents/coding-guide.md](../../development/ai-agents/coding-guide.md) for implementation patterns
