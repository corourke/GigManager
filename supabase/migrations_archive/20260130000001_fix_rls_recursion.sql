-- Migration: Fix RLS recursion by using plpgsql SECURITY DEFINER functions
-- Created at: 2026-01-30

-- 1. Redefine helper functions as plpgsql to prevent inlining and ensure RLS bypass
-- These functions run with the privileges of the creator (postgres) and bypass RLS.

CREATE OR REPLACE FUNCTION user_organization_ids(user_uuid UUID)
RETURNS TABLE(organization_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT om.organization_id 
  FROM organization_members om
  WHERE om.user_id = user_uuid;
END;
$$;

CREATE OR REPLACE FUNCTION user_is_member_of_org(org_id UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id 
    AND user_id = user_uuid
  );
END;
$$;

CREATE OR REPLACE FUNCTION user_is_admin_of_org(org_id UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id 
    AND user_id = user_uuid
    AND role = 'Admin'
  );
END;
$$;

CREATE OR REPLACE FUNCTION user_is_admin_or_manager_of_org(org_id UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id 
    AND user_id = user_uuid
    AND role IN ('Admin', 'Manager')
  );
END;
$$;

CREATE OR REPLACE FUNCTION user_has_access_to_gig(gig_id UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM gig_participants gp
    WHERE gp.gig_id = user_has_access_to_gig.gig_id
    AND EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = gp.organization_id
      AND om.user_id = user_uuid
    )
  );
END;
$$;

-- New helper for user profile visibility to avoid cross-table recursion
CREATE OR REPLACE FUNCTION get_user_ids_in_same_orgs(user_uuid UUID)
RETURNS TABLE(member_user_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT om.user_id
  FROM organization_members om
  WHERE om.organization_id IN (
    SELECT om2.organization_id
    FROM organization_members om2
    WHERE om2.user_id = user_uuid
  );
END;
$$;

-- 2. Update organization_members policy
-- Use the SECURITY DEFINER function to break the recursion
DROP POLICY IF EXISTS "Users can view members of their organizations" ON organization_members;
CREATE POLICY "Users can view members of their organizations" ON organization_members
  FOR SELECT USING (
    user_id = auth.uid() OR 
    organization_id IN (SELECT organization_id FROM user_organization_ids(auth.uid()))
  );

-- 3. Update users policy
-- Use the new helper to avoid triggering organization_members RLS recursively
DROP POLICY IF EXISTS "Users can view profiles in their organizations" ON users;
CREATE POLICY "Users can view profiles in their organizations" ON users
  FOR SELECT USING (
    auth.uid() = id OR
    id IN (SELECT member_user_id FROM get_user_ids_in_same_orgs(auth.uid()))
  );

-- 4. Rollback script (for reference)
-- To rollback, you would need to revert functions to their SQL versions 
-- and restore previous policies.
