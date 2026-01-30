-- Migration: Fix RLS recursion in secure RPC functions and users policy
-- Created at: 2026-01-30

-- 1. Convert secure RPC functions to plpgsql to truly bypass RLS
-- SECURITY DEFINER in LANGUAGE sql is inlined and DOES NOT bypass RLS in many cases.
-- We DROP first because CREATE OR REPLACE cannot change return types.

DROP FUNCTION IF EXISTS get_user_profile_secure(UUID);
CREATE OR REPLACE FUNCTION get_user_profile_secure(user_uuid UUID)
RETURNS SETOF users
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT * FROM users WHERE id = user_uuid;
END;
$$;

DROP FUNCTION IF EXISTS get_user_organizations_secure(UUID);
CREATE OR REPLACE FUNCTION get_user_organizations_secure(user_uuid UUID)
RETURNS TABLE(
  user_id UUID,
  organization_id UUID,
  role user_role,
  created_at timestamptz,
  organization jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    om.user_id,
    om.organization_id,
    om.role,
    om.created_at,
    jsonb_build_object(
      'id', o.id,
      'name', o.name,
      'description', o.description,
      'created_at', o.created_at,
      'updated_at', o.updated_at
    ) as organization
  FROM organization_members om
  JOIN organizations o ON o.id = om.organization_id
  WHERE om.user_id = user_uuid;
END;
$$;

-- 2. Update users table policy to use non-recursive helper
-- The previous policy queried organization_members directly, which could trigger recursion.
DROP POLICY IF EXISTS "Users can view profiles in their organizations" ON users;
CREATE POLICY "Users can view profiles in their organizations" ON users
  FOR SELECT USING (
    auth.uid() = id OR
    id IN (SELECT member_user_id FROM get_user_ids_in_same_orgs(auth.uid()))
  );
