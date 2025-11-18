-- Migration: Disable RLS on gig_bids table
-- 
-- Reason: The gig_bids table stores organization-specific bid information.
-- Access control is handled at the application layer in /utils/api.tsx,
-- similar to how gig_staff_slots and gig_staff_assignments work.
-- 
-- RLS policies on gig_bids were causing issues where bids couldn't be
-- created or updated properly. Since bids are filtered by organization_id
-- in the application code, we can safely disable RLS.

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view bids for their organizations" ON gig_bids;
DROP POLICY IF EXISTS "Admins and Managers can manage bids" ON gig_bids;
DROP POLICY IF EXISTS "Users can view bids for accessible gigs" ON gig_bids;

-- Disable RLS on gig_bids table
ALTER TABLE gig_bids DISABLE ROW LEVEL SECURITY;

-- ============================================
-- UPDATED RLS STATUS SUMMARY
-- ============================================
-- Tables with RLS DISABLED (access control handled in application layer):
-- ✅ users - Access control in createUser(), updateUser()
-- ✅ organization_members - Access control in getUserOrganizations(), searchUsers()
-- ✅ gig_participants - Access control in getGigsForOrganization(), getGig(), createGig()
-- ✅ gig_staff_slots - Access control in createGig(), updateGig()
-- ✅ gig_staff_assignments - Access control in createGig(), updateGig()
-- ✅ gig_bids - Access control in createGigBid(), updateGigBid(), deleteGigBid()
-- ✅ gig_kit_assignments - Access control in kit management functions
--
-- Tables with RLS ENABLED (safe, no circular dependencies):
-- ✅ organizations
-- ✅ staff_roles
-- ✅ gig_status_history
-- ✅ assets
-- ✅ kits
-- ✅ kit_assets
