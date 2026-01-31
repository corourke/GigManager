-- Migration: Re-enable RLS and ensure all helpers are plpgsql
-- Created at: 2026-01-30

-- 1. Re-enable RLS on tables that were disabled for diagnostics
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- 2. Convert get_user_email to plpgsql to ensure it's not inlined
CREATE OR REPLACE FUNCTION get_user_email(user_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT email FROM auth.users WHERE id = user_uuid);
END;
$$;

-- 3. Ensure organization_members has a safe SELECT policy
-- (Already handled in previous migrations, but good to ensure)
DROP POLICY IF EXISTS "Users can view members of their organizations" ON organization_members;
CREATE POLICY "Users can view members of their organizations" ON organization_members
  FOR SELECT USING (
    user_id = auth.uid() OR 
    organization_id IN (SELECT organization_id FROM user_organization_ids(auth.uid()))
  );
