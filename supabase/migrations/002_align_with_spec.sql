-- Migration to align schema with database specification
-- This migration makes breaking changes to the gigs table structure

-- ============================================
-- STEP 1: DROP DEPENDENT OBJECTS
-- ============================================

-- Drop all gig-related RLS policies (they depend on gigs.organization_id which we're removing)
DROP POLICY IF EXISTS "Users can view gigs from their organizations" ON gigs;
DROP POLICY IF EXISTS "Admins and Managers can create gigs" ON gigs;
DROP POLICY IF EXISTS "Admins and Managers can update gigs" ON gigs;
DROP POLICY IF EXISTS "Admins can delete gigs" ON gigs;
DROP POLICY IF EXISTS "Users can view status history for accessible gigs" ON gig_status_history;
DROP POLICY IF EXISTS "Users can view participants for accessible gigs" ON gig_participants;
DROP POLICY IF EXISTS "Admins and Managers can manage participants" ON gig_participants;
DROP POLICY IF EXISTS "Users can view staff slots for accessible gigs" ON gig_staff_slots;
DROP POLICY IF EXISTS "Admins and Managers can manage staff slots" ON gig_staff_slots;
DROP POLICY IF EXISTS "Users can view staff assignments for accessible gigs" ON gig_staff_assignments;
DROP POLICY IF EXISTS "Admins and Managers can manage staff assignments" ON gig_staff_assignments;
DROP POLICY IF EXISTS "Users can view bids for accessible gigs" ON gig_bids;
DROP POLICY IF EXISTS "Admins and Managers can manage bids" ON gig_bids;

-- Drop org_annotations table and its policies (not in spec)
DROP POLICY IF EXISTS "Users can view their organization's annotations" ON org_annotations;
DROP POLICY IF EXISTS "Admins and Managers can manage annotations" ON org_annotations;
DROP TABLE IF EXISTS org_annotations;

-- ============================================
-- STEP 2: CLEAR GIGS TABLE
-- ============================================

-- Delete all gigs and related data (cascades to child tables)
DELETE FROM gigs;

-- ============================================
-- STEP 3: MODIFY EXISTING TABLES
-- ============================================

-- Add updated_at field to staff_roles (was missing but trigger existed)
ALTER TABLE staff_roles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;

-- Modify gigs table structure
ALTER TABLE gigs DROP CONSTRAINT IF EXISTS gigs_organization_id_fkey;
ALTER TABLE gigs DROP COLUMN IF EXISTS organization_id;
ALTER TABLE gigs ADD COLUMN parent_gig_id UUID REFERENCES gigs(id) ON DELETE CASCADE;
ALTER TABLE gigs ADD COLUMN hierarchy_depth INTEGER DEFAULT 0 NOT NULL;

-- Add organization_id to gig_staff_slots
ALTER TABLE gig_staff_slots ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Add organization_id to gig_bids
ALTER TABLE gig_bids ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Create indexes for new foreign keys
CREATE INDEX IF NOT EXISTS idx_gigs_parent_gig_id ON gigs(parent_gig_id);
CREATE INDEX IF NOT EXISTS idx_gig_staff_slots_org_id ON gig_staff_slots(organization_id);
CREATE INDEX IF NOT EXISTS idx_gig_bids_org_id ON gig_bids(organization_id);

-- ============================================
-- STEP 4: CREATE NEW TABLES FOR EQUIPMENT MANAGEMENT
-- ============================================

-- Kits table (reusable equipment collections)
CREATE TABLE kits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  created_by UUID NOT NULL,
  updated_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_kits_org_id ON kits(organization_id);
CREATE INDEX idx_kits_category ON kits(category);

-- Kit assets junction table
CREATE TABLE kit_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kit_id UUID NOT NULL REFERENCES kits(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1 NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(kit_id, asset_id)
);

CREATE INDEX idx_kit_assets_kit_id ON kit_assets(kit_id);
CREATE INDEX idx_kit_assets_asset_id ON kit_assets(asset_id);

-- Gig kit assignments table
CREATE TABLE gig_kit_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  kit_id UUID NOT NULL REFERENCES kits(id) ON DELETE CASCADE,
  notes TEXT,
  assigned_by UUID NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(gig_id, kit_id)
);

CREATE INDEX idx_gig_kit_assignments_org_id ON gig_kit_assignments(organization_id);
CREATE INDEX idx_gig_kit_assignments_gig_id ON gig_kit_assignments(gig_id);
CREATE INDEX idx_gig_kit_assignments_kit_id ON gig_kit_assignments(kit_id);

-- Enable RLS on new tables
ALTER TABLE kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE kit_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE gig_kit_assignments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 5: CREATE NEW RLS POLICIES
-- ============================================

-- Gigs policies (updated to work with gig_participants)
CREATE POLICY "Users can view gigs they participate in" ON gigs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM gig_participants gp
      JOIN organization_members om ON om.organization_id = gp.organization_id
      WHERE gp.gig_id = gigs.id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and Managers can create gigs" ON gigs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = auth.uid()
      AND role IN ('Admin', 'Manager')
    )
  );

CREATE POLICY "Admins and Managers can update gigs they participate in" ON gigs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM gig_participants gp
      JOIN organization_members om ON om.organization_id = gp.organization_id
      WHERE gp.gig_id = gigs.id
      AND om.user_id = auth.uid()
      AND om.role IN ('Admin', 'Manager')
    )
  );

CREATE POLICY "Admins can delete gigs they participate in" ON gigs
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM gig_participants gp
      JOIN organization_members om ON om.organization_id = gp.organization_id
      WHERE gp.gig_id = gigs.id
      AND om.user_id = auth.uid()
      AND om.role = 'Admin'
    )
  );

-- Gig status history policies
CREATE POLICY "Users can view status history for accessible gigs" ON gig_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM gig_participants gp
      JOIN organization_members om ON om.organization_id = gp.organization_id
      WHERE gp.gig_id = gig_status_history.gig_id
      AND om.user_id = auth.uid()
    )
  );

-- Gig participants policies
CREATE POLICY "Users can view participants for accessible gigs" ON gig_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM gig_participants gp
      JOIN organization_members om ON om.organization_id = gp.organization_id
      WHERE gp.gig_id = gig_participants.gig_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and Managers can manage participants" ON gig_participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM gig_participants gp
      JOIN organization_members om ON om.organization_id = gp.organization_id
      WHERE gp.gig_id = gig_participants.gig_id
      AND om.user_id = auth.uid()
      AND om.role IN ('Admin', 'Manager')
    )
  );

-- Gig staff slots policies (updated to use organization_id)
CREATE POLICY "Users can view staff slots for accessible gigs" ON gig_staff_slots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM gig_participants gp
      JOIN organization_members om ON om.organization_id = gp.organization_id
      WHERE gp.gig_id = gig_staff_slots.gig_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and Managers can manage staff slots" ON gig_staff_slots
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = gig_staff_slots.organization_id
      AND user_id = auth.uid()
      AND role IN ('Admin', 'Manager')
    )
  );

-- Gig staff assignments policies
CREATE POLICY "Users can view staff assignments for accessible gigs" ON gig_staff_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM gig_staff_slots gs
      JOIN gig_participants gp ON gp.gig_id = gs.gig_id
      JOIN organization_members om ON om.organization_id = gp.organization_id
      WHERE gs.id = gig_staff_assignments.slot_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and Managers can manage staff assignments" ON gig_staff_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM gig_staff_slots gs
      JOIN organization_members om ON om.organization_id = gs.organization_id
      WHERE gs.id = gig_staff_assignments.slot_id
      AND om.user_id = auth.uid()
      AND om.role IN ('Admin', 'Manager')
    )
  );

-- Gig bids policies (updated to use organization_id)
CREATE POLICY "Users can view bids for their organizations" ON gig_bids
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = gig_bids.organization_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and Managers can manage bids" ON gig_bids
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = gig_bids.organization_id
      AND user_id = auth.uid()
      AND role IN ('Admin', 'Manager')
    )
  );

-- Kits policies
CREATE POLICY "Users can view their organization's kits" ON kits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = kits.organization_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and Managers can manage kits" ON kits
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = kits.organization_id
      AND user_id = auth.uid()
      AND role IN ('Admin', 'Manager')
    )
  );

-- Kit assets policies
CREATE POLICY "Users can view kit assets for their organization's kits" ON kit_assets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM kits k
      JOIN organization_members om ON om.organization_id = k.organization_id
      WHERE k.id = kit_assets.kit_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and Managers can manage kit assets" ON kit_assets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM kits k
      JOIN organization_members om ON om.organization_id = k.organization_id
      WHERE k.id = kit_assets.kit_id
      AND om.user_id = auth.uid()
      AND om.role IN ('Admin', 'Manager')
    )
  );

-- Gig kit assignments policies
CREATE POLICY "Users can view kit assignments for accessible gigs" ON gig_kit_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM gig_participants gp
      JOIN organization_members om ON om.organization_id = gp.organization_id
      WHERE gp.gig_id = gig_kit_assignments.gig_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and Managers can manage kit assignments" ON gig_kit_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = gig_kit_assignments.organization_id
      AND user_id = auth.uid()
      AND role IN ('Admin', 'Manager')
    )
  );

-- ============================================
-- STEP 6: CREATE TRIGGERS FOR NEW TABLES
-- ============================================

-- Create trigger for kits updated_at
CREATE TRIGGER update_kits_updated_at BEFORE UPDATE ON kits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Summary of changes:
-- 1. Removed org_annotations table (not in spec)
-- 2. Added staff_roles.updated_at field
-- 3. Removed gigs.organization_id
-- 4. Added gigs.parent_gig_id and gigs.hierarchy_depth
-- 5. Added gig_staff_slots.organization_id
-- 6. Added gig_bids.organization_id
-- 7. Created kits table
-- 8. Created kit_assets table
-- 9. Created gig_kit_assignments table
-- 10. Rewrote all gig-related RLS policies to work with gig_participants
-- 11. Added RLS policies for new tables
-- 12. Added triggers for kits
