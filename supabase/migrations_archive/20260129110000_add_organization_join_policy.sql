-- Migration: Add policy allowing users to join organizations as Viewers
-- Created at: 2026-01-29

-- Allow authenticated users to join organizations as Viewers
CREATE POLICY "Users can join organizations as viewers" ON organization_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    role = 'Viewer'
  );