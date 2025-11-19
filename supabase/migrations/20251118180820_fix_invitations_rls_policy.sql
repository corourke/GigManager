-- Fix invitations table RLS policies to use SECURITY DEFINER helper function
-- This resolves permission denied errors when cancelling invitations
-- The issue was that subqueries accessing organization_members (which references users)
-- caused permission errors during policy evaluation

-- Drop existing UPDATE policy
DROP POLICY IF EXISTS "Admins and Managers can update invitations, users can accept their own" ON invitations;

-- Recreate UPDATE policy using helper function
CREATE POLICY "Admins and Managers can update invitations, users can accept their own" ON invitations
  FOR UPDATE USING (
    user_is_admin_or_manager_of_org(organization_id, auth.uid())
    OR
    email = (auth.jwt() ->> 'email')
  )
  WITH CHECK (
    user_is_admin_or_manager_of_org(organization_id, auth.uid())
    OR
    email = (auth.jwt() ->> 'email')
  );

-- Drop existing DELETE policy
DROP POLICY IF EXISTS "Admins and Managers can delete invitations" ON invitations;

-- Recreate DELETE policy using helper function
CREATE POLICY "Admins and Managers can delete invitations" ON invitations
  FOR DELETE USING (
    user_is_admin_or_manager_of_org(organization_id, auth.uid())
  );

