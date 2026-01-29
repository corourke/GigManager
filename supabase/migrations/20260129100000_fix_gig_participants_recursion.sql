-- Migration: Fix RLS Recursion in Gig Participants Policies
-- Created at: 2026-01-29

-- Add helper functions to avoid recursion in RLS policies
CREATE OR REPLACE FUNCTION user_can_manage_gig(gig_id UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM gig_participants gp
    WHERE gp.gig_id = user_can_manage_gig.gig_id
    AND EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = gp.organization_id
      AND om.user_id = user_uuid
      AND om.role IN ('Admin', 'Manager')
    )
  );
$$;

CREATE OR REPLACE FUNCTION user_is_admin_of_gig(gig_id UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM gig_participants gp
    WHERE gp.gig_id = user_is_admin_of_gig.gig_id
    AND EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = gp.organization_id
      AND om.user_id = user_uuid
      AND om.role = 'Admin'
    )
  );
$$;

-- Update gig_participants policies to use the helper function
DROP POLICY IF EXISTS "Admins and Managers can manage gig participants" ON gig_participants;
CREATE POLICY "Admins and Managers can manage gig participants" ON gig_participants
  FOR ALL USING (user_can_manage_gig(gig_id, auth.uid()));

-- Update gig_staff_slots policies to use the helper function
DROP POLICY IF EXISTS "Admins and Managers can manage gig staff slots" ON gig_staff_slots;
CREATE POLICY "Admins and Managers can manage gig staff slots" ON gig_staff_slots
  FOR ALL USING (user_can_manage_gig(gig_id, auth.uid()));

-- Update gig_staff_assignments policies to use the helper function
DROP POLICY IF EXISTS "Admins and Managers can manage all assignments for accessible gigs" ON gig_staff_assignments;
CREATE POLICY "Admins and Managers can manage all assignments for accessible gigs" ON gig_staff_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM gig_staff_slots gss
      WHERE gss.id = gig_staff_assignments.slot_id
      AND user_can_manage_gig(gss.gig_id, auth.uid())
    )
  );

-- Update gigs policies to use the helper function
DROP POLICY IF EXISTS "Admins and Managers of participating orgs can update gigs" ON gigs;
CREATE POLICY "Admins and Managers of participating orgs can update gigs" ON gigs
  FOR UPDATE USING (user_can_manage_gig(id, auth.uid()));

-- Update gig_bids policies to use the helper function
DROP POLICY IF EXISTS "Admins and Managers can view bids for accessible gigs" ON gig_bids;
CREATE POLICY "Admins and Managers can view bids for accessible gigs" ON gig_bids
  FOR SELECT USING (user_can_manage_gig(gig_id, auth.uid()));

DROP POLICY IF EXISTS "Admins and Managers can manage gig bids" ON gig_bids;
CREATE POLICY "Admins and Managers can manage gig bids" ON gig_bids
  FOR ALL USING (user_can_manage_gig(gig_id, auth.uid()));

-- Update gig_kit_assignments policies to use the helper function
DROP POLICY IF EXISTS "Admins and Managers can manage kit assignments" ON gig_kit_assignments;
CREATE POLICY "Admins and Managers can manage kit assignments" ON gig_kit_assignments
  FOR ALL USING (user_can_manage_gig(gig_id, auth.uid()));

-- Update gig_status_history policies to use the helper function
DROP POLICY IF EXISTS "Allow inserting status history for authorized users" ON gig_status_history;
CREATE POLICY "Allow inserting status history for authorized users" ON gig_status_history
  FOR INSERT TO authenticated WITH CHECK (user_can_manage_gig(gig_id, auth.uid()));

-- Update gigs policies to use the helper functions
DROP POLICY IF EXISTS "Admins of participating orgs can delete gigs" ON gigs;
CREATE POLICY "Admins of participating orgs can delete gigs" ON gigs
  FOR DELETE USING (user_is_admin_of_gig(id, auth.uid()));