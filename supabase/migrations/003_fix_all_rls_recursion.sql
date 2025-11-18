-- ============================================
-- COMPREHENSIVE FIX: Disable RLS on All Tables with Circular Dependencies
-- ============================================
-- This migration disables RLS on tables where policies create circular dependencies
-- Access control for these tables is handled at the application layer in /utils/api.tsx

-- ============================================
-- STEP 1: Disable RLS on gigs table
-- ============================================
-- Problem: Policies reference organization_id column that no longer exists,
--          or query gig_participants which creates circular dependencies
-- Solution: Disable RLS and filter at application layer

ALTER TABLE gigs DISABLE ROW LEVEL SECURITY;

-- Drop all gig policies (from both old and new schemas)
DROP POLICY IF EXISTS "Users can view gigs from their organizations" ON gigs;
DROP POLICY IF EXISTS "Admins and Managers can create gigs" ON gigs;
DROP POLICY IF EXISTS "Admins and Managers can update gigs" ON gigs;
DROP POLICY IF EXISTS "Admins can delete gigs" ON gigs;
DROP POLICY IF EXISTS "Users can view gigs they participate in" ON gigs;
DROP POLICY IF EXISTS "Admins and Managers can update gigs they participate in" ON gigs;
DROP POLICY IF EXISTS "Admins can delete gigs they participate in" ON gigs;

-- ============================================
-- STEP 2: Disable RLS on gig_participants
-- ============================================
-- Problem: Policies query gig_participants while protecting gig_participants (direct self-query recursion)
-- Solution: Disable RLS and filter at application layer

ALTER TABLE gig_participants DISABLE ROW LEVEL SECURITY;

-- Drop problematic policies
DROP POLICY IF EXISTS "Users can view participants for accessible gigs" ON gig_participants;
DROP POLICY IF EXISTS "Admins and Managers can manage participants" ON gig_participants;

-- ============================================
-- STEP 3: Disable RLS on gig_staff_slots
-- ============================================
-- Problem: Policies query gig_participants which has circular dependency issues
-- Solution: Disable RLS and filter at application layer

ALTER TABLE gig_staff_slots DISABLE ROW LEVEL SECURITY;

-- Drop problematic policies
DROP POLICY IF EXISTS "Users can view staff slots for accessible gigs" ON gig_staff_slots;
DROP POLICY IF EXISTS "Admins and Managers can manage staff slots" ON gig_staff_slots;

-- ============================================
-- STEP 4: Disable RLS on gig_staff_assignments
-- ============================================
-- Problem: Policies query through gig_staff_slots which has circular dependency issues
-- Solution: Disable RLS and filter at application layer

ALTER TABLE gig_staff_assignments DISABLE ROW LEVEL SECURITY;

-- Drop problematic policies
DROP POLICY IF EXISTS "Users can view staff assignments for accessible gigs" ON gig_staff_assignments;
DROP POLICY IF EXISTS "Admins and Managers can manage staff assignments" ON gig_staff_assignments;
DROP POLICY IF EXISTS "Users can view own staff assignments" ON gig_staff_assignments;

-- ============================================
-- STEP 5: Disable RLS on gig_kit_assignments (if exists)
-- ============================================
-- Problem: Policies query through gig_participants which has circular dependency issues
-- Solution: Disable RLS and filter at application layer

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gig_kit_assignments') THEN
        ALTER TABLE gig_kit_assignments DISABLE ROW LEVEL SECURITY;
        
        -- Drop problematic policies
        EXECUTE 'DROP POLICY IF EXISTS "Users can view kit assignments for accessible gigs" ON gig_kit_assignments';
        EXECUTE 'DROP POLICY IF EXISTS "Admins and Managers can manage kit assignments" ON gig_kit_assignments';
    END IF;
END $$;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these queries to verify the changes:

-- 1. Check RLS status on all tables
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public'
-- ORDER BY tablename;

-- 2. Verify problematic tables have RLS disabled
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE tablename IN ('gigs', 'organization_members', 'gig_participants', 'gig_staff_slots', 'gig_staff_assignments', 'gig_kit_assignments')
-- AND schemaname = 'public';

-- Expected result: rowsecurity = false for all listed tables

-- ============================================
-- SUMMARY
-- ============================================
-- Tables with RLS DISABLED (circular dependency prevention):
-- ✅ users - Access control in searchUsers() (allows cross-org searches for gig staffing)
-- ✅ gigs - Access control in getGig(), createGig(), updateGig()
-- ✅ organization_members - Access control in getUserOrganizations(), searchUsers()
-- ✅ gig_participants - Access control in getGigsForOrganization(), getGig(), createGig()
-- ✅ gig_staff_slots - Access control in createGig(), updateGig()
-- ✅ gig_staff_assignments - Access control in createGig(), updateGig()
-- ✅ gig_kit_assignments - Access control in kit management functions
--
-- Tables with RLS ENABLED (safe, no circular dependencies):
-- ✅ organizations
-- ✅ staff_roles
-- ✅ gig_status_history
-- ✅ gig_bids
-- ✅ org_annotations
-- ✅ assets
-- ✅ kits (if exists)
-- ✅ kit_assets (if exists)

-- Done! All circular dependency issues should now be resolved.

-- Add insurance_class and quantity columns to assets table
ALTER TABLE assets 
ADD COLUMN IF NOT EXISTS insurance_class TEXT,
ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;

-- Add tag_number and rental_value columns to kits table
ALTER TABLE kits
ADD COLUMN IF NOT EXISTS tag_number TEXT,
ADD COLUMN IF NOT EXISTS rental_value DECIMAL(10,2);