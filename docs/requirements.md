# Gig Manager - Requirements Document

## 1. Application Overview

**Name:** Gig Manager  
**Purpose:** Production and event management web application for production companies, sound/lighting companies, and event producers to manage events, equipment, and staff.

**Target Users:**
- Production companies
- Sound/lighting companies
- Event producers
- Venues
- Acts/Performers
- Agencies
- Equipment rental companies
- Staging companies

---

## 2. Authentication & Authorization

### 2.1 Authentication Method
- **Google OAuth** via Supabase Auth (PRIMARY METHOD)
- After successful sign-in, redirect users to the application
- Support for social login through Google provider
- Session management via Supabase Auth
- **Additional Authentication Methods Available:**
  - Email/password authentication (if enabled in Supabase)
  - Other OAuth providers (GitHub, Facebook, etc.) can be enabled in Supabase dashboard
  - Magic link authentication (if configured)
- Users must complete provider setup in Supabase dashboard following provider-specific instructions

### 2.2 Post-Authentication Profile Collection (IMPLEMENTED ✓)
After successful authentication (first-time users):
1. Check if user profile exists in database
2. If no profile exists, show ProfileCompletionScreen
3. Collect required user information:
   - Full name (required)
   - Phone number (optional)
   - Preferred role (Admin, Manager, Staff, Viewer)
4. Create user profile in database with collected information
5. Proceed to organization selection flow

### 2.3 User Roles
The application supports four distinct user roles with different permission levels:
- **Admin** - Full access to organization data and settings
- **Manager** - Can create and manage gigs, equipment, and staff
- **Staff** - Limited access to assigned gigs and tasks
- **Viewer** - Read-only access to organization data

### 2.4 Organization-Based Access Control
- Users belong to one or more organizations
- Access to data is scoped by organization membership
- User profile includes `org_id` field for primary organization association
- Row-Level Security (RLS) policies enforce organization-based data access

---

## 3. Organization Types

The application supports the following organization types:

1. **Production** - Production companies
2. **Sound** - Sound companies
3. **Lighting** - Lighting companies
4. **Staging** - Staging companies
5. **Rentals** - Equipment rental companies
6. **Venue** - Event venues
7. **Act** - Performers/Acts
8. **Agency** - Booking/talent agencies

---

## 4. Database Architecture

### 4.1 Migration from Mock Data
- Migrate from mock data to real Supabase PostgreSQL database
- Maintain ability to use mock sample data for testing/demonstration
- Support both mock and live data modes

### 4.2 Key Schema Changes

#### Date/Time Field Consolidation
- **OLD:** Separate `date`, `start_time`, `end_time` fields
- **NEW:** Combined `start` and `end` DateTime fields
- Provides more accurate timestamp representation

#### Enum Value Updates
**GigStatus Enum:**
- `"date-hold"` → `"DateHold"`
- `"confirmed"` → `"Confirmed"`
- `"completed"` → `"Completed"`
- `"cancelled"` → `"Cancelled"`

**Other standardized enums:**
- Pascal case for multi-word values
- Consistent naming convention across all enums

### 4.3 Database Schema (Prisma)

#### Core Tables

**users**
- `id` (UUID, primary key)
- `email` (String, unique)
- `name` (String, optional)
- `avatar_url` (String, optional)
- `phone` (String, optional) - Note: Field name is `phone`, not `phone_number`
- `role` (UserRole enum)
- `org_id` (UUID, foreign key to organizations)
- `created_at` (DateTime)
- `updated_at` (DateTime)

**organizations**
- `id` (UUID, primary key)
- `name` (String)
- `type` (OrganizationType enum)
- `email` (String, optional)
- `phone` (String, optional)
- `address` (String, optional)
- `city` (String, optional)
- `state` (String, optional)
- `zip` (String, optional)
- `country` (String, optional)
- `website` (String, optional)
- `notes` (Text, optional)
- `created_at` (DateTime)
- `updated_at` (DateTime)

**gigs**
- `id` (UUID, primary key)
- `organization_id` (UUID, foreign key)
- `title` (String)
- `description` (Text, optional)
- `venue` (String, optional)
- `location` (String, optional)
- `start` (DateTime) - Consolidated from date + start_time
- `end` (DateTime) - Consolidated from end_time
- `status` (GigStatus enum)
- `budget` (Decimal, optional)
- `notes` (Text, optional)
- `created_at` (DateTime)
- `updated_at` (DateTime)

**gig_participants** (NEW TABLE)
- `id` (UUID, primary key)
- `gig_id` (UUID, foreign key to gigs)
- `organization_id` (UUID, foreign key to organizations)
- `role` (String) - e.g., "Sound Provider", "Lighting Provider"
- `status` (ParticipantStatus enum)
- `notes` (Text, optional)
- `created_at` (DateTime)
- `updated_at` (DateTime)

**equipment**
- `id` (UUID, primary key)
- `organization_id` (UUID, foreign key)
- `name` (String)
- `category` (String)
- `model` (String, optional)
- `serial_number` (String, optional)
- `status` (EquipmentStatus enum)
- `quantity` (Int)
- `daily_rate` (Decimal, optional)
- `replacement_cost` (Decimal, optional)
- `notes` (Text, optional)
- `created_at` (DateTime)
- `updated_at` (DateTime)

**gig_equipment**
- `id` (UUID, primary key)
- `gig_id` (UUID, foreign key)
- `equipment_id` (UUID, foreign key)
- `quantity` (Int)
- `notes` (Text, optional)
- `created_at` (DateTime)

**staff_roles** (NEW TABLE)
- `id` (UUID, primary key)
- `organization_id` (UUID, foreign key)
- `name` (String) - e.g., "Sound Engineer", "Lighting Tech"
- `description` (Text, optional)
- `created_at` (DateTime)
- `updated_at` (DateTime)

**gig_staff**
- `id` (UUID, primary key)
- `gig_id` (UUID, foreign key)
- `user_id` (UUID, foreign key)
- `staff_role_id` (UUID, foreign key, optional)
- `role` (String) - Legacy field, may be deprecated in favor of staff_role_id
- `rate` (Decimal, optional)
- `notes` (Text, optional)
- `created_at` (DateTime)

**org_annotations** (NEW TABLE)
- `id` (UUID, primary key)
- `organization_id` (UUID, foreign key)
- `target_org_id` (UUID, foreign key to organizations)
- `notes` (Text)
- `tags` (String array, optional)
- `created_at` (DateTime)
- `updated_at` (DateTime)
- Purpose: Allow organizations to add private notes/tags about other organizations

---

## 5. Row-Level Security (RLS)

### 5.1 Access Control Requirements
- Users can only see gigs where `gig.organization_id` matches their `user.org_id`
- RLS policies must be implemented on all tables
- Ensure data isolation between organizations
- Admin users have broader access within their organization

### 5.2 RLS Policy Rules
- **SELECT:** Users can read records where organization_id = auth.user.org_id
- **INSERT:** Users can create records for their organization
- **UPDATE:** Users can update records belonging to their organization
- **DELETE:** Admin/Manager roles can delete records for their organization

---

## 6. Real-Time Features

### 6.1 Real-Time Updates
Implement Supabase real-time subscriptions for:
- **INSERT operations** - New gigs, equipment, staff assignments
- **UPDATE operations** - Changes to existing records
- **DELETE operations** - Removed records

### 6.2 Use Cases
- Live dashboard updates when new gigs are created
- Equipment availability changes reflected immediately
- Staff assignment notifications
- Multi-user collaboration without page refresh

---

## 7. User Onboarding Flow

### 7.1 Profile Completion (IMPLEMENTED ✓)
After Google OAuth sign-in:
1. Check if user profile exists in database
2. If no profile, show ProfileCompletionScreen
3. Collect: name, phone number, preferred role
4. Create user profile in database
5. Redirect to organization selection

### 7.2 Organization Selection (IMPLEMENTED ✓)
After profile completion:
1. **Smart Auto-Selection** (IMPLEMENTED ✓):
   - If user is a member of only ONE organization, automatically bypass the organization selection screen
   - Directly redirect to the main application with that organization set as active
   - Improves UX by reducing unnecessary navigation steps

2. **Organization Selection Screen** (shown only if user belongs to multiple organizations OR has no organizations):
   - Display list of user's current organizations
   - Allow selection of existing organization
   - Allow creation of new organization with name and type
   - **Enhanced Organization Search** (IMPLEMENTED ✓):
     - Search for ANY organization in the system (not just user's current organizations)
     - Display ALL matching organizations in search results
     - View organization details (name, type, location)
     - Request to join organization as Viewer role
     - Backend endpoint: `/make-server-de012ad4/organizations/join`

3. Update user.org_id with selected/created organization
4. Redirect to main application

### 7.3 Critical Fixes Applied
- ✓ Fixed database column mismatch: `phone` vs `phone_number`
- ✓ Fixed user fetch error handling when profiles don't exist
- ✓ Fixed organization type enum value mismatches in OrganizationSelectionScreen
- ✓ Proper error handling for authentication failures
- ✓ Session management and redirect flow

---

## 8. Application Screens

### 8.1 Consistent Navigation and Page Header (IMPLEMENTED ✓)

All application screens must include a consistent navigation system:

#### AppHeader Component
- **Location:** Displayed at the top of every screen in the main application
- **Content:**
  - Application logo/branding ("Gig Manager")
  - Current organization name
  - User's role in the current organization
  - User profile menu with logout option
- **Functionality:**
  - Provides context to users about which organization they're viewing
  - Shows their permission level (role) in that organization
  - Allows quick access to account settings and logout
  - Maintains consistent branding across all pages
- **Implementation:**
  - Reusable component imported across all main application screens
  - Fetches current user and organization data from Supabase
  - Updates dynamically when organization context changes

#### Navigation Benefits
- Users always know which organization they're viewing
- Clear visibility of their role/permissions
- Consistent user experience across the application
- Easy access to account management functions

### 8.2 Screens Requiring Supabase Integration

#### Dashboard (PENDING)
- Overview of upcoming gigs
- Equipment utilization metrics
- Staff availability
- Real-time updates via Supabase subscriptions
- Organization-scoped data display

#### CreateGigScreen (PENDING)
- Form to create new gigs
- Save directly to Supabase database
- Support for consolidated start/end DateTime fields
- Organization participant selection
- Equipment assignment
- Staff assignment

#### GigDetailScreen (PENDING)
- Display comprehensive gig information
- Show participants, equipment, staff
- Edit capabilities based on user role
- Real-time updates when data changes
- Delete functionality for admins/managers

#### GigListScreen (PENDING)
- List all gigs for user's organization
- Filter by status, date range
- Real-time list updates
- Pagination or infinite scroll
- Quick actions (edit, delete, view)

### 8.3 Data Fetching Requirements
- Replace all mock data calls with Supabase queries
- Implement proper error handling
- Show loading states
- Cache data appropriately
- Use RLS policies for automatic data filtering

---

## 9. Technical Implementation Details

### 9.1 Supabase Configuration
- Use Supabase client with anon key for frontend operations
- Store credentials in environment variables
- Configure Google OAuth provider in Supabase dashboard
- Set up redirect URLs for OAuth flow

### 9.2 Frontend Architecture
- React with TypeScript
- Supabase client for database operations
- Real-time subscriptions for live updates
- Form validation and error handling
- Responsive design for mobile/desktop

### 9.3 Data Operations
```typescript
// Example pattern for data fetching with RLS
const { data, error } = await supabase
  .from('gigs')
  .select('*, organization:organizations(*)')
  .order('start', { ascending: true });

// RLS automatically filters to user's organization
```

### 9.4 Error Handling
- Graceful degradation when database is unavailable
- Clear error messages for users
- Logging of errors for debugging
- Fallback to mock data if enabled

---

## 10. Migration Strategy

### 10.1 Phased Approach
1. ✓ **Phase 1:** Authentication and onboarding (COMPLETED)
   - Google OAuth integration
   - Profile completion
   - Organization selection

2. **Phase 2:** Core screens migration (IN PROGRESS)
   - Dashboard screen
   - Gig list screen
   - Create gig screen
   - Gig detail screen

3. **Phase 3:** Advanced features
   - Equipment management
   - Staff management
   - Organization annotations
   - Participant management

### 10.2 Data Migration
- Keep mock data system available
- Add toggle for mock vs. live data (development mode)
- Ensure schema compatibility
- Test with sample data before production

---

## 11. Security Requirements

### 11.1 Authentication Security
- Use Supabase Auth for session management
- Implement proper token refresh
- Secure redirect handling after OAuth
- Logout functionality

### 11.2 Authorization Security
- Enforce role-based permissions in UI
- RLS policies as backend enforcement
- Validate user actions on server side
- Prevent privilege escalation

### 11.3 Data Security
- All sensitive data encrypted at rest
- HTTPS for all communications
- No sensitive data in logs
- Proper sanitization of user inputs

---

## 12. Google Places API Integration

### 12.1 Purpose
Allow users to quickly find and auto-fill their business information when creating organizations by searching Google Places.

### 12.2 Features
- **Text Search**: Search for businesses by name, address, or keywords
  - When searching, allow for a partial match with the beginning of a business name, so 'Milbourne' would match 'Milbourne Sound'.
  - List businesses in proximity to the user first
  - Prefer to omit vendor that are clearly not associated with entertainment, staging, lighting, sound, music, venues, etc. If in doubt, include the organization in the list.
  - List a maximum of 10 busineses.
- **Auto-fill**: Automatically populate organization form with:
  - Business name
  - Full address (street, city, state, postal code, country)
  - Phone number
  - Website URL
  - Business description (from editorial summary)
- **Place Details**: Fetch comprehensive information for selected places
- **Fallback**: Manual entry option if business not found

### 12.3 Technical Implementation

#### Backend Endpoints
**Search Places:**
- `GET /make-server-de012ad4/places/search?query={query}`
- Uses Google Places API Text Search
- Returns up to 5 results with basic information
- Requires authentication

**Get Place Details:**
- `GET /make-server-de012ad4/places/:placeId`
- Uses Google Places API Place Details
- Fetches complete information including phone, website, address components
- Requires authentication

#### API Key Management
- Google Maps API key stored as `GOOGLE_MAPS_API_KEY` environment variable
- Key is never exposed to frontend
- All API calls proxied through backend server
- Proper error handling for API quota/billing issues

#### Frontend Integration
- Search interface in CreateOrganizationScreen
- Real-time search with loading states
- Display results with business name, address, phone, website
- Parse address components to fill individual form fields
- Mock data fallback for development/testing

### 12.4 Setup Requirements
**User must obtain and configure Google Maps API key:**
1. Enable Google Places API in Google Cloud Console
2. Create API key with Places API access
3. Upload key to `GOOGLE_MAPS_API_KEY` environment variable
4. Ensure billing is enabled on Google Cloud project

**Required Google APIs:**
- Places API (New) or Places API (Legacy)
- Enable both "Place Search" and "Place Details" APIs

### 12.5 Error Handling
- Graceful fallback when API key not configured
- Clear error messages for API failures
- Handle rate limiting and quota exceeded errors
- Log errors server-side for debugging
- User-friendly messages in frontend

### 12.6 Data Privacy
- User search queries are sent to Google Places API
- No search data is stored in application database
- Selected place information is only stored when user creates organization
- Complies with Google Places API Terms of Service

---

## 13. Current Implementation Status

### Completed ✓
- **Authentication & Authorization:**
  - Google OAuth authentication flow via Supabase Auth
  - Support for multiple authentication methods (configurable in Supabase)
  - Post-authentication profile collection screen
  - User profile creation and completion
  - Session management and redirect flow
  
- **Organization Management:**
  - Organization selection and creation
  - Smart auto-selection for single-organization users (bypasses org selection screen)
  - Enhanced organization search (displays ALL matching organizations, not just user's)
  - Backend endpoint for joining organizations as Viewer role
  - Google Places API integration for organization lookup
  
- **Google Places API Integration:**
  - Backend endpoints for search and place details
  - Frontend search interface in CreateOrganizationScreen
  - Auto-fill organization form from Google Places data
  - Mock data fallback for development
  
- **Navigation & UX:**
  - Consistent AppHeader component across all screens
  - Display of organization name and user role in header
  - User profile menu with logout functionality
  - Context-aware navigation

- **Database & Security:**
  - Database schema implementation (Prisma)
  - Row-Level Security policies
  - Error handling for authentication
  - Field name fixes (phone vs phone_number)
  - Enum value standardization

### In Progress 🔄
- Dashboard screen Supabase integration
- CreateGigScreen Supabase integration
- GigDetailScreen Supabase integration
- GigListScreen Supabase integration

### Pending ⏳
- Equipment management screens
- Staff management screens
- Organization annotations interface
- Participant management interface
- Real-time subscription implementation
- Advanced filtering and search
- Reports and analytics

---

## 14. Notes and Considerations

### 14.1 Google OAuth Setup
- User must configure Google OAuth provider in Supabase dashboard
- Follow instructions at: https://supabase.com/docs/guides/auth/social-login/auth-google
- Required for authentication to work properly

### 14.2 Database Constraints
- Organization_id is required for most entities
- Ensure referential integrity
- Use UUIDs for all primary keys
- Timestamps use server-side defaults

### 14.3 User Experience
- Smooth onboarding flow
- Clear error messages
- Loading states for async operations
- Responsive design for all screen sizes
- Intuitive navigation

---

## Document Version
**Last Updated:** November 7, 2025  
**Status:** Living document - updated as requirements evolve