-- Migration: Implement RLS and Policies for Phase 1
-- Created at: 2026-01-29

-- 1. Enable RLS on previously disabled tables
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE gigs ENABLE ROW LEVEL SECURITY;
ALTER TABLE gig_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE gig_staff_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE gig_staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE gig_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE gig_kit_assignments ENABLE ROW LEVEL SECURITY;

-- 2. Update existing Users policies to avoid recursion
DROP POLICY IF EXISTS "Users can view other user profiles" ON users;
CREATE POLICY "Users can view other user profiles" ON users
  FOR SELECT USING (
    auth.uid() = id OR 
    EXISTS (SELECT 1 FROM user_organization_ids(auth.uid()))
  );

-- 3. Organization members policies
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

-- 4. Gigs policies
DROP POLICY IF EXISTS "Users can view gigs they are participating in" ON gigs;
CREATE POLICY "Users can view gigs they are participating in" ON gigs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM gig_participants gp
      WHERE gp.gig_id = gigs.id
      AND user_is_member_of_org(gp.organization_id, auth.uid())
    )
  );

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

-- 5. Gig status history policies (Refactor)
DROP POLICY IF EXISTS "Users can view status history for accessible gigs" ON gig_status_history;
CREATE POLICY "Users can view status history for accessible gigs" ON gig_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM gig_participants gp
      WHERE gp.gig_id = gig_status_history.gig_id
      AND user_is_member_of_org(gp.organization_id, auth.uid())
    )
  );

-- 6. Gig participants policies
DROP POLICY IF EXISTS "Users can view participants for accessible gigs" ON gig_participants;
CREATE POLICY "Users can view participants for accessible gigs" ON gig_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM gig_participants gp2
      WHERE gp2.gig_id = gig_participants.gig_id
      AND user_is_member_of_org(gp2.organization_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins and Managers can manage gig participants" ON gig_participants;
CREATE POLICY "Admins and Managers can manage gig participants" ON gig_participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM gig_participants gp2
      WHERE gp2.gig_id = gig_participants.gig_id
      AND user_is_admin_or_manager_of_org(gp2.organization_id, auth.uid())
    )
  );

-- 7. Gig staff slots policies
DROP POLICY IF EXISTS "Users can view staff slots for accessible gigs" ON gig_staff_slots;
CREATE POLICY "Users can view staff slots for accessible gigs" ON gig_staff_slots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM gig_participants gp
      WHERE gp.gig_id = gig_staff_slots.gig_id
      AND user_is_member_of_org(gp.organization_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins and Managers can manage gig staff slots" ON gig_staff_slots;
CREATE POLICY "Admins and Managers can manage gig staff slots" ON gig_staff_slots
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM gig_participants gp
      WHERE gp.gig_id = gig_staff_slots.gig_id
      AND user_is_admin_or_manager_of_org(gp.organization_id, auth.uid())
    )
  );

-- 8. Gig staff assignments policies
DROP POLICY IF EXISTS "Users can view assignments for accessible gigs" ON gig_staff_assignments;
CREATE POLICY "Users can view assignments for accessible gigs" ON gig_staff_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM gig_staff_slots gss
      JOIN gig_participants gp ON gp.gig_id = gss.gig_id
      WHERE gss.id = gig_staff_assignments.slot_id
      AND user_is_member_of_org(gp.organization_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins and Managers can manage assignments for accessible gigs" ON gig_staff_assignments;
CREATE POLICY "Admins and Managers can manage assignments for accessible gigs" ON gig_staff_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM gig_staff_slots gss
      JOIN gig_participants gp ON gp.gig_id = gss.gig_id
      WHERE gss.id = gig_staff_assignments.slot_id
      AND user_is_admin_or_manager_of_org(gp.organization_id, auth.uid())
    )
  );

-- 9. Gig bids policies
DROP POLICY IF EXISTS "Users can view bids for accessible gigs" ON gig_bids;
CREATE POLICY "Users can view bids for accessible gigs" ON gig_bids
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM gig_participants gp
      WHERE gp.gig_id = gig_bids.gig_id
      AND user_is_member_of_org(gp.organization_id, auth.uid())
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

-- 10. Gig kit assignments policies
DROP POLICY IF EXISTS "Users can view kit assignments for accessible gigs" ON gig_kit_assignments;
CREATE POLICY "Users can view kit assignments for accessible gigs" ON gig_kit_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM gig_participants gp
      WHERE gp.gig_id = gig_kit_assignments.gig_id
      AND user_is_member_of_org(gp.organization_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins and Managers can manage kit assignments" ON gig_kit_assignments;
CREATE POLICY "Admins and Managers can manage kit assignments" ON gig_kit_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM gig_participants gp
      WHERE gp.gig_id = gig_kit_assignments.gig_id
      AND user_is_admin_or_manager_of_org(gp.organization_id, auth.uid())
    )
  );

-- 11. Refactor Assets, Kits, Kit Assets to use helpers (Optimization)
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
