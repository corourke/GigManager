-- Fix RLS policy to allow invited users to accept their own invitations
-- This addresses the issue where invited users (Staff/Viewer roles) couldn't
-- update their invitation status due to restrictive RLS policies

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Admins and Managers can update invitations" ON invitations;

-- Create a new policy that allows:
-- 1. Admins and Managers to update any invitations in their organization
-- 2. Invited users to accept their own invitations (update status to 'accepted')
CREATE POLICY "Admins and Managers can update invitations, users can accept their own"
  ON invitations
  FOR UPDATE
  USING (
    -- Allow Admins and Managers to update any invitation
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('Admin', 'Manager')
    )
    OR 
    -- Allow invited users to accept their own invitation
    -- (matching by email from auth.users)
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  WITH CHECK (
    -- Same conditions for the check constraint
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('Admin', 'Manager')
    )
    OR 
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Add comment explaining the policy
COMMENT ON POLICY "Admins and Managers can update invitations, users can accept their own" 
  ON invitations IS 'Allows Admins/Managers to manage invitations, and allows invited users to accept their own invitations during authentication';
