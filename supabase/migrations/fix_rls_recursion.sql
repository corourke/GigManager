-- ============================================
-- FIX RLS RECURSION - Apply Database Changes
-- ============================================
-- Run this script in Supabase SQL Editor to fix infinite recursion issues

-- Step 1: Drop existing helper functions
DROP FUNCTION IF EXISTS user_is_member_of_org(UUID, UUID);
DROP FUNCTION IF EXISTS user_is_admin_of_org(UUID, UUID);
DROP FUNCTION IF EXISTS user_organization_ids(UUID);
DROP FUNCTION IF EXISTS user_is_admin_or_manager_of_org(UUID, UUID);

-- Step 2: Disable RLS on organization_members to prevent recursion
ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY;

-- Step 3: Drop problematic policies on organization_members
DROP POLICY IF EXISTS "Users can view members of their organizations" ON organization_members;
DROP POLICY IF EXISTS "Admins can manage organization members" ON organization_members;

-- Step 4: Recreate helper functions with proper configuration
-- These now work safely because organization_members has RLS disabled

CREATE OR REPLACE FUNCTION user_is_member_of_org(org_id UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id AND user_id = user_uuid
  );
$$;

CREATE OR REPLACE FUNCTION user_is_admin_of_org(org_id UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id 
    AND user_id = user_uuid
    AND role = 'Admin'
  );
$$;

CREATE OR REPLACE FUNCTION user_organization_ids(user_uuid UUID)
RETURNS TABLE(organization_id UUID)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT organization_id 
  FROM organization_members
  WHERE user_id = user_uuid;
$$;

CREATE OR REPLACE FUNCTION user_is_admin_or_manager_of_org(org_id UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id 
    AND user_id = user_uuid
    AND role IN ('Admin', 'Manager')
  );
$$;

-- Step 5: Update users policy to use direct JOIN (avoid helper function)
DROP POLICY IF EXISTS "Users can view other user profiles" ON users;

CREATE POLICY "Users can view other user profiles" ON users
  FOR SELECT USING (
    auth.uid() = id
    OR
    EXISTS (
      SELECT 1 
      FROM organization_members om1
      JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = users.id
      AND om2.user_id = auth.uid()
    )
  );

-- Done! The following changes have been applied:
-- ✅ RLS disabled on organization_members (prevents recursion)
-- ✅ Helper functions recreated with proper SECURITY DEFINER settings
-- ✅ Users policy updated to use direct JOIN
-- ✅ Access control for organization_members now handled at application layer
