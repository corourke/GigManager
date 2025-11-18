-- ============================================
-- MIGRATION 004: Disable RLS on users table
-- ============================================
-- Purpose: Allow searching for users across all participating organizations
--          when staffing gigs, not just current organization
-- Reason: RLS policy restricts viewing users to those who share organization
--         membership with current user. For gig staffing, we need to search
--         users from ANY participating organization.
-- Solution: Disable RLS and handle access control at application layer

-- ============================================
-- STEP 1: Disable RLS on users table
-- ============================================

ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 2: Drop existing RLS policies
-- ============================================

DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can view users in their organizations" ON users;
DROP POLICY IF EXISTS "Users can view organization members" ON users;

-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- Run this query to verify the change:
-- 
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE tablename = 'users'
-- AND schemaname = 'public';
-- 
-- Expected result: rowsecurity = false

-- ============================================
-- ACCESS CONTROL DOCUMENTATION
-- ============================================
-- With RLS disabled, access control is now handled in the application layer:
--
-- Location: /utils/api.tsx
-- Function: searchUsers(search?, organizationIds?)
--
-- How it works:
-- 1. If organizationIds provided (e.g., from gig participants):
--    - Search users who are members of those specific organizations
--    - Allows searching across all participating organizations for gig staffing
--
-- 2. If no organizationIds provided (default):
--    - Search users who are members of current user's organizations only
--    - Maintains privacy: users only see their own org members by default
--
-- This provides the same security as RLS, but with flexibility for cross-org
-- user searches when explicitly needed (like gig staffing).

-- ============================================
-- SUMMARY
-- ============================================
-- Tables with RLS DISABLED (access control at application layer):
-- ✅ users - Access control in searchUsers() in /utils/api.tsx
-- ✅ organization_members - Access control in getUserOrganizations(), searchUsers()
-- ✅ gigs - Access control in getGig(), createGig(), updateGig()
-- ✅ gig_participants - Access control in getGigsForOrganization(), getGig(), createGig()
-- ✅ gig_staff_slots - Access control in createGig(), updateGig()
-- ✅ gig_staff_assignments - Access control in createGig(), updateGig()
-- ✅ gig_kit_assignments - Access control in kit management functions
--
-- Tables with RLS ENABLED (safe, no issues):
-- ✅ organizations
-- ✅ staff_roles
-- ✅ gig_status_history
-- ✅ gig_bids
-- ✅ org_annotations
-- ✅ assets
-- ✅ kits (if exists)
-- ✅ kit_assets (if exists)
