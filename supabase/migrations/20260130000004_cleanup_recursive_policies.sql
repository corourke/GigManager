-- Migration: Cleanup potentially remaining recursive policies
-- Created at: 2026-01-30

-- 1. Cleanup users table policies
DROP POLICY IF EXISTS "Users can view other user profiles" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;

-- 2. Ensure only the non-recursive SELECT policy remains on users
-- This is already defined in 20260130000002_fix_rpc_recursion.sql
-- but we repeat it here to be absolutely sure it's the active one.
DROP POLICY IF EXISTS "Users can view profiles in their organizations" ON users;
CREATE POLICY "Users can view profiles in their organizations" ON users
  FOR SELECT USING (
    auth.uid() = id OR
    id IN (SELECT member_user_id FROM get_user_ids_in_same_orgs(auth.uid()))
  );

-- 3. Cleanup organization_members table policies
DROP POLICY IF EXISTS "Users can view members of their organizations" ON organization_members;
CREATE POLICY "Users can view members of their organizations" ON organization_members
  FOR SELECT USING (
    user_id = auth.uid() OR 
    organization_id IN (SELECT organization_id FROM user_organization_ids(auth.uid()))
  );
