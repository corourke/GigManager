-- Migration: Nuclear cleanup of users table policies
-- Created at: 2026-01-30

-- 1. Drop EVERYTHING on users table to ensure no hidden/overlapping policies
DROP POLICY IF EXISTS "Users can view other user profiles" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can view profiles in their organizations" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;

-- 2. Re-create minimal, safe policies
-- Self-view
CREATE POLICY "self_view" ON users
  FOR SELECT USING (auth.uid() = id);

-- Org-view (using the PLPGSQL helper which bypasses RLS)
CREATE POLICY "org_view" ON users
  FOR SELECT USING (
    id IN (SELECT member_user_id FROM get_user_ids_in_same_orgs(auth.uid()))
  );

-- Self-update
CREATE POLICY "self_update" ON users
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Self-insert
CREATE POLICY "self_insert" ON users
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
