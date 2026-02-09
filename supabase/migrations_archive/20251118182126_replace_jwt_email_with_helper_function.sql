-- Replace JWT-based email check with SECURITY DEFINER helper function
-- This is more reliable than accessing auth.jwt() and avoids permission issues
-- when querying auth.users directly in RLS policies

-- Create helper function to get user email from auth.users
CREATE OR REPLACE FUNCTION get_user_email(user_uuid UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = user_uuid;
$$;

-- Drop existing UPDATE policy
DROP POLICY IF EXISTS "Admins and Managers can update invitations, users can accept their own" ON invitations;

-- Recreate UPDATE policy using helper function instead of JWT
CREATE POLICY "Admins and Managers can update invitations, users can accept their own" ON invitations
  FOR UPDATE USING (
    user_is_admin_or_manager_of_org(organization_id, auth.uid())
    OR
    email = get_user_email(auth.uid())
  )
  WITH CHECK (
    user_is_admin_or_manager_of_org(organization_id, auth.uid())
    OR
    email = get_user_email(auth.uid())
  );

