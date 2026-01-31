-- Migration: Add INSERT policy for users table to allow invitations
-- Created at: 2026-01-31

-- Allow Admins and Managers to insert pending users during invitation
CREATE POLICY "Admins and Managers can insert pending users" ON users
  FOR INSERT TO authenticated
  WITH CHECK (
    user_status = 'pending' AND
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = auth.uid() 
      AND role IN ('Admin', 'Manager')
    )
  );

-- Allow Admins and Managers to delete pending users if invitation fails
CREATE POLICY "Admins and Managers can delete pending users" ON users
  FOR DELETE TO authenticated
  USING (
    user_status = 'pending' AND
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = auth.uid() 
      AND role IN ('Admin', 'Manager')
    )
  );
