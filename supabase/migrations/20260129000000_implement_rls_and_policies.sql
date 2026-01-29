-- Migration: Implement RLS and Policies for Phase 1 (REFINED)
-- Created at: 2026-01-29

-- 1. Helper Functions (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION user_has_access_to_gig(gig_id UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM gig_participants gp
    WHERE gp.gig_id = user_has_access_to_gig.gig_id
    AND EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = gp.organization_id
      AND om.user_id = user_uuid
    )
  );
$$;

CREATE OR REPLACE FUNCTION get_user_role_in_org(org_id UUID, user_uuid UUID)
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM organization_members
  WHERE organization_id = org_id AND user_id = user_uuid;
$$;

-- 2. Enable RLS on previously disabled tables
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE gigs ENABLE ROW LEVEL SECURITY;
ALTER TABLE gig_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE gig_staff_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE gig_staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE gig_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE gig_kit_assignments ENABLE ROW LEVEL SECURITY;

-- 3. Update existing Users policies to avoid recursion
DROP POLICY IF EXISTS "Users can view other user profiles" ON users;
CREATE POLICY "Users can view other user profiles" ON users
  FOR SELECT USING (
    auth.uid() = id OR 
    EXISTS (SELECT 1 FROM user_organization_ids(auth.uid()))
  );

-- 4. Consolidated Organizations policies
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON organizations;
DROP POLICY IF EXISTS "Users can view all organizations for participant selection" ON organizations;
DROP POLICY IF EXISTS "Anyone can view all organizations for participant selection" ON organizations;
CREATE POLICY "Anyone can view all organizations for participant selection" ON organizations
  FOR SELECT USING (true);

-- 5. Organization members policies
DROP POLICY IF EXISTS "Users can view members of their organizations" ON organization_members;
CREATE POLICY "Users can view members of their organizations" ON organization_members
  FOR SELECT USING (
    user_id = auth.uid() OR 
    organization_id IN (SELECT organization_id FROM user_organization_ids(auth.uid()))
  );

DROP POLICY IF EXISTS "Admins can manage organization members" ON organization_members;
CREATE POLICY "Admins can manage organization members" ON organization_members
  FOR ALL USING (
    user_is_admin_of_org(organization_id, auth.uid())
  );

-- 6. Gigs policies
DROP POLICY IF EXISTS "Users can view gigs they are participating in" ON gigs;
CREATE POLICY "Users can view gigs they are participating in" ON gigs
  FOR SELECT USING (user_has_access_to_gig(id, auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can create gigs" ON gigs;
CREATE POLICY "Authenticated users can create gigs" ON gigs
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Admins and Managers of participating orgs can update gigs" ON gigs;
CREATE POLICY "Admins and Managers of participating orgs can update gigs" ON gigs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM gig_participants gp
      WHERE gp.gig_id = gigs.id
      AND user_is_admin_or_manager_of_org(gp.organization_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins of participating orgs can delete gigs" ON gigs;
CREATE POLICY "Admins of participating orgs can delete gigs" ON gigs
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM gig_participants gp
      WHERE gp.gig_id = gigs.id
      AND user_is_admin_of_org(gp.organization_id, auth.uid())
    )
  );

-- 7. Gig status history policies
DROP POLICY IF EXISTS "Users can view status history for accessible gigs" ON gig_status_history;
CREATE POLICY "Users can view status history for accessible gigs" ON gig_status_history
  FOR SELECT USING (user_has_access_to_gig(gig_id, auth.uid()));

DROP POLICY IF EXISTS "Allow inserting status history" ON gig_status_history;
DROP POLICY IF EXISTS "Allow inserting status history for authorized users" ON gig_status_history;
CREATE POLICY "Allow inserting status history for authorized users" ON gig_status_history
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM gig_participants gp
      WHERE gp.gig_id = gig_status_history.gig_id
      AND user_is_admin_or_manager_of_org(gp.organization_id, auth.uid())
    )
  );

-- 8. Gig participants policies
DROP POLICY IF EXISTS "Users can view participants for accessible gigs" ON gig_participants;
CREATE POLICY "Users can view participants for accessible gigs" ON gig_participants
  FOR SELECT USING (user_has_access_to_gig(gig_id, auth.uid()));

DROP POLICY IF EXISTS "Admins and Managers can manage gig participants" ON gig_participants;
CREATE POLICY "Admins and Managers can manage gig participants" ON gig_participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM gig_participants gp2
      WHERE gp2.gig_id = gig_participants.gig_id
      AND user_is_admin_or_manager_of_org(gp2.organization_id, auth.uid())
    )
  );

-- 9. Gig staff slots policies
DROP POLICY IF EXISTS "Users can view staff slots for accessible gigs" ON gig_staff_slots;
CREATE POLICY "Users can view staff slots for accessible gigs" ON gig_staff_slots
  FOR SELECT USING (user_has_access_to_gig(gig_id, auth.uid()));

DROP POLICY IF EXISTS "Admins and Managers can manage gig staff slots" ON gig_staff_slots;
CREATE POLICY "Admins and Managers can manage gig staff slots" ON gig_staff_slots
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM gig_participants gp
      WHERE gp.gig_id = gig_staff_slots.gig_id
      AND user_is_admin_or_manager_of_org(gp.organization_id, auth.uid())
    )
  );

-- 10. Gig staff assignments policies
DROP POLICY IF EXISTS "Users can view assignments for accessible gigs" ON gig_staff_assignments;
CREATE POLICY "Users can view assignments for accessible gigs" ON gig_staff_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM gig_staff_slots gss
      WHERE gss.id = gig_staff_assignments.slot_id
      AND user_has_access_to_gig(gss.gig_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins and Managers can manage assignments for accessible gigs" ON gig_staff_assignments;
DROP POLICY IF EXISTS "Admins and Managers can manage all assignments for accessible gigs" ON gig_staff_assignments;
CREATE POLICY "Admins and Managers can manage all assignments for accessible gigs" ON gig_staff_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM gig_staff_slots gss
      JOIN gig_participants gp ON gp.gig_id = gss.gig_id
      WHERE gss.id = gig_staff_assignments.slot_id
      AND user_is_admin_or_manager_of_org(gp.organization_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "Staff can update their own assignments" ON gig_staff_assignments;
CREATE POLICY "Staff can update their own assignments" ON gig_staff_assignments
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 11. Gig bids policies
DROP POLICY IF EXISTS "Users can view bids for accessible gigs" ON gig_bids;
DROP POLICY IF EXISTS "Admins and Managers can view bids for accessible gigs" ON gig_bids;
CREATE POLICY "Admins and Managers can view bids for accessible gigs" ON gig_bids
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM gig_participants gp
      WHERE gp.gig_id = gig_bids.gig_id
      AND user_is_admin_or_manager_of_org(gp.organization_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins and Managers can manage gig bids" ON gig_bids;
CREATE POLICY "Admins and Managers can manage gig bids" ON gig_bids
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM gig_participants gp
      WHERE gp.gig_id = gig_bids.gig_id
      AND user_is_admin_or_manager_of_org(gp.organization_id, auth.uid())
    )
  );

-- 12. Gig kit assignments policies
DROP POLICY IF EXISTS "Users can view kit assignments for accessible gigs" ON gig_kit_assignments;
CREATE POLICY "Users can view kit assignments for accessible gigs" ON gig_kit_assignments
  FOR SELECT USING (user_has_access_to_gig(gig_id, auth.uid()));

DROP POLICY IF EXISTS "Admins and Managers can manage kit assignments" ON gig_kit_assignments;
CREATE POLICY "Admins and Managers can manage kit assignments" ON gig_kit_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM gig_participants gp
      WHERE gp.gig_id = gig_kit_assignments.gig_id
      AND user_is_admin_or_manager_of_org(gp.organization_id, auth.uid())
    )
  );

-- 13. Assets, Kits, Kit Assets optimization
DROP POLICY IF EXISTS "Users can view their organization's assets" ON assets;
CREATE POLICY "Users can view their organization's assets" ON assets
  FOR SELECT USING (user_is_member_of_org(assets.organization_id, auth.uid()));

DROP POLICY IF EXISTS "Admins and Managers can manage assets" ON assets;
CREATE POLICY "Admins and Managers can manage assets" ON assets
  FOR ALL USING (user_is_admin_or_manager_of_org(assets.organization_id, auth.uid()));

DROP POLICY IF EXISTS "Users can view their organization's kits" ON kits;
CREATE POLICY "Users can view their organization's kits" ON kits
  FOR SELECT USING (user_is_member_of_org(kits.organization_id, auth.uid()));

DROP POLICY IF EXISTS "Admins and Managers can manage kits" ON kits;
CREATE POLICY "Admins and Managers can manage kits" ON kits
  FOR ALL USING (user_is_admin_or_manager_of_org(kits.organization_id, auth.uid()));

DROP POLICY IF EXISTS "Users can view kit assets for their organization's kits" ON kit_assets;
CREATE POLICY "Users can view kit assets for their organization's kits" ON kit_assets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM kits k
      WHERE k.id = kit_assets.kit_id
      AND user_is_member_of_org(k.organization_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins and Managers can manage kit assets" ON kit_assets;
CREATE POLICY "Admins and Managers can manage kit assets" ON kit_assets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM kits k
      WHERE k.id = kit_assets.kit_id
      AND user_is_admin_or_manager_of_org(k.organization_id, auth.uid())
    )
  );

-- 14. Invitations policies (Sync from schema.sql)
DROP POLICY IF EXISTS "Users can view invitations for their organizations" ON invitations;
CREATE POLICY "Users can view invitations for their organizations" ON invitations
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins and Managers can create invitations" ON invitations;
CREATE POLICY "Admins and Managers can create invitations" ON invitations
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('Admin', 'Manager')
    )
  );

DROP POLICY IF EXISTS "Admins and Managers can update invitations, users can accept their own" ON invitations;
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

DROP POLICY IF EXISTS "Admins and Managers can delete invitations" ON invitations;
CREATE POLICY "Admins and Managers can delete invitations" ON invitations
  FOR DELETE USING (
    user_is_admin_or_manager_of_org(organization_id, auth.uid())
  );
