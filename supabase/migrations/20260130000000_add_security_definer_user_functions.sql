-- Migration: Add SECURITY DEFINER functions for user operations
-- Created at: 2026-01-30

-- Enable RLS on users table if not already enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER function to get user profile (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_profile_secure(user_uuid UUID)
RETURNS users
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT * FROM users WHERE id = user_uuid;
$$;

-- SECURITY DEFINER function to get user organizations (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_organizations_secure(user_uuid UUID)
RETURNS TABLE(
  user_id UUID,
  organization_id UUID,
  role user_role,
  created_at timestamptz,
  organization jsonb
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
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
$$;

-- Update the users table policies to be more secure
DROP POLICY IF EXISTS "Users can view other user profiles" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;

-- Allow users to view their own profile
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Allow users to view profiles of users in their organizations
CREATE POLICY "Users can view profiles in their organizations" ON users
  FOR SELECT USING (
    id IN (
      SELECT DISTINCT om.user_id
      FROM organization_members om
      WHERE om.organization_id IN (
        SELECT om2.organization_id
        FROM organization_members om2
        WHERE om2.user_id = auth.uid()
      )
    )
  );

-- Allow authenticated users to insert their own profile
CREATE POLICY "Users can insert their own profile" ON users
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);