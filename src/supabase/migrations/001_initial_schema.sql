-- Gig Manager Database Schema
-- Run this SQL in your Supabase SQL Editor to create all tables and Row-Level Security policies

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enums
CREATE TYPE organization_type AS ENUM (
  'Production',
  'Sound',
  'Lighting',
  'Staging',
  'Rentals',
  'Venue',
  'Act',
  'Agency'
);

CREATE TYPE user_role AS ENUM (
  'Admin',
  'Manager',
  'Staff',
  'Viewer'
);

CREATE TYPE gig_status AS ENUM (
  'DateHold',
  'Proposed',
  'Booked',
  'Completed',
  'Cancelled',
  'Settled'
);

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  role_hint TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type organization_type NOT NULL,
  url TEXT,
  phone_number TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  description TEXT,
  allowed_domains TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Organization members (junction table)
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_org_members_org_id ON organization_members(organization_id);
CREATE INDEX idx_org_members_user_id ON organization_members(user_id);

-- Staff roles table
CREATE TABLE staff_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_staff_roles_name ON staff_roles(name);

-- Gigs table
CREATE TABLE gigs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status gig_status NOT NULL,
  tags TEXT[] DEFAULT '{}',
  start TIMESTAMPTZ NOT NULL,
  "end" TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL,
  amount_paid DECIMAL(10, 2),
  notes TEXT,
  created_by UUID NOT NULL,
  updated_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_gigs_org_id ON gigs(organization_id);
CREATE INDEX idx_gigs_start ON gigs(start);

-- Gig status history table
CREATE TABLE gig_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  from_status gig_status,
  to_status gig_status NOT NULL,
  changed_by UUID NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_gig_status_history_gig_id ON gig_status_history(gig_id);
CREATE INDEX idx_gig_status_history_changed_at ON gig_status_history(changed_at);

-- Gig participants table
CREATE TABLE gig_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role organization_type NOT NULL,
  notes TEXT,
  UNIQUE(gig_id, organization_id, role)
);

CREATE INDEX idx_gig_participants_gig_id ON gig_participants(gig_id);
CREATE INDEX idx_gig_participants_org_id ON gig_participants(organization_id);

-- Gig staff slots table
CREATE TABLE gig_staff_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  staff_role_id UUID NOT NULL REFERENCES staff_roles(id) ON DELETE RESTRICT,
  required_count INTEGER DEFAULT 1 NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_gig_staff_slots_gig_id ON gig_staff_slots(gig_id);
CREATE INDEX idx_gig_staff_slots_role_id ON gig_staff_slots(staff_role_id);

-- Gig staff assignments table
CREATE TABLE gig_staff_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slot_id UUID NOT NULL REFERENCES gig_staff_slots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  rate DECIMAL(10, 2),
  fee DECIMAL(10, 2),
  notes TEXT,
  assigned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  confirmed_at TIMESTAMPTZ
);

CREATE INDEX idx_gig_staff_assignments_slot_id ON gig_staff_assignments(slot_id);
CREATE INDEX idx_gig_staff_assignments_user_id ON gig_staff_assignments(user_id);

-- Gig bids table
CREATE TABLE gig_bids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  date_given DATE NOT NULL,
  result TEXT,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_gig_bids_gig_id ON gig_bids(gig_id);

-- Organization annotations table
CREATE TABLE org_annotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  target_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_org_annotations_org_id ON org_annotations(organization_id);
CREATE INDEX idx_org_annotations_target_id ON org_annotations(target_org_id);

-- Assets table
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  acquisition_date DATE NOT NULL,
  vendor TEXT,
  cost DECIMAL(10, 2),
  category TEXT NOT NULL,
  sub_category TEXT,
  insurance_policy_added BOOLEAN DEFAULT FALSE NOT NULL,
  manufacturer_model TEXT NOT NULL,
  type TEXT,
  serial_number TEXT,
  description TEXT,
  replacement_value DECIMAL(10, 2),
  created_by UUID NOT NULL,
  updated_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_assets_org_id ON assets(organization_id);
CREATE INDEX idx_assets_category ON assets(category);

-- =============================================
-- ENABLE/DISABLE ROW LEVEL SECURITY
-- =============================================
-- NOTE: Some tables have RLS DISABLED to prevent circular dependency recursion
-- Those tables have access control handled at the application layer in /utils/api.tsx
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE staff_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE gigs ENABLE ROW LEVEL SECURITY;
ALTER TABLE gig_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE gig_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE gig_staff_slots DISABLE ROW LEVEL SECURITY;
ALTER TABLE gig_staff_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE gig_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTIONS FOR RLS POLICIES
-- ============================================
-- These SECURITY DEFINER functions bypass RLS to prevent infinite recursion
-- when policies need to check organization membership

-- Drop existing functions if they exist (clean slate for re-running migration)
DROP FUNCTION IF EXISTS user_is_member_of_org(UUID, UUID);
DROP FUNCTION IF EXISTS user_is_admin_of_org(UUID, UUID);
DROP FUNCTION IF EXISTS user_organization_ids(UUID);
DROP FUNCTION IF EXISTS user_is_admin_or_manager_of_org(UUID, UUID);

-- Create helper function to check membership (bypasses RLS to avoid recursion)
CREATE OR REPLACE FUNCTION user_is_member_of_org(org_id UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id AND user_id = user_uuid
  );
$$;

-- Create helper function to check admin role (bypasses RLS to avoid recursion)
CREATE OR REPLACE FUNCTION user_is_admin_of_org(org_id UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id 
    AND user_id = user_uuid
    AND role = 'Admin'
  );
$$;

-- Helper function to get organization IDs a user belongs to (bypasses RLS)
CREATE OR REPLACE FUNCTION user_organization_ids(user_uuid UUID)
RETURNS TABLE(organization_id UUID)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT organization_id 
  FROM organization_members
  WHERE user_id = user_uuid;
$$;

-- Helper function to check if user is Admin or Manager (bypasses RLS)
CREATE OR REPLACE FUNCTION user_is_admin_or_manager_of_org(org_id UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id 
    AND user_id = user_uuid
    AND role IN ('Admin', 'Manager')
  );
$$;

-- Users policies
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view other user profiles" ON users
  FOR SELECT USING (
    auth.uid() = id
    OR
    EXISTS (
      SELECT 1 
      FROM organization_members om1
      JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = users.id
      AND om2.user_id = auth.uid()
    )
  );

-- Organizations policies
CREATE POLICY "Users can view organizations they belong to" ON organizations
  FOR SELECT USING (user_is_member_of_org(organizations.id, auth.uid()));

CREATE POLICY "Users can view all organizations for participant selection" ON organizations
  FOR SELECT USING (true);

CREATE POLICY "Admins can update their organizations" ON organizations
  FOR UPDATE USING (user_is_admin_of_org(organizations.id, auth.uid()));

-- Organization members policies
-- RLS is DISABLED on organization_members to prevent infinite recursion
-- Access control is handled at the application layer in API functions
-- No policies are needed for this table
DROP POLICY IF EXISTS "Users can view members of their organizations" ON organization_members;
DROP POLICY IF EXISTS "Admins can manage organization members" ON organization_members;

-- Note: RLS is DISABLED on organization_members to prevent infinite recursion
-- Access control is handled at the application layer in API functions
-- No policies are needed for this table

-- Staff roles policies (global, read by all)
CREATE POLICY "Anyone can view staff roles" ON staff_roles
  FOR SELECT USING (true);

-- Gigs policies
CREATE POLICY "Users can view gigs from their organizations" ON gigs
  FOR SELECT USING (user_is_member_of_org(gigs.organization_id, auth.uid()));

CREATE POLICY "Admins and Managers can create gigs" ON gigs
  FOR INSERT WITH CHECK (user_is_admin_or_manager_of_org(gigs.organization_id, auth.uid()));

CREATE POLICY "Admins and Managers can update gigs" ON gigs
  FOR UPDATE USING (user_is_admin_or_manager_of_org(gigs.organization_id, auth.uid()));

CREATE POLICY "Admins can delete gigs" ON gigs
  FOR DELETE USING (user_is_admin_of_org(gigs.organization_id, auth.uid()));

-- Gig status history policies
CREATE POLICY "Users can view status history for accessible gigs" ON gig_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM gigs g
      WHERE g.id = gig_status_history.gig_id
      AND user_is_member_of_org(g.organization_id, auth.uid())
    )
  );

-- Gig participants policies
-- NOTE: RLS is DISABLED on gig_participants - these policies won't be created
-- Access control is handled at the application layer in /utils/api.tsx
-- Keeping policy definitions commented for reference:
/*
CREATE POLICY "Users can view participants for accessible gigs" ON gig_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM gigs g
      WHERE g.id = gig_participants.gig_id
      AND user_is_member_of_org(g.organization_id, auth.uid())
    )
  );

CREATE POLICY "Admins and Managers can manage participants" ON gig_participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM gigs g
      WHERE g.id = gig_participants.gig_id
      AND user_is_admin_or_manager_of_org(g.organization_id, auth.uid())
    )
  );
*/

-- Gig staff slots policies
-- NOTE: RLS is DISABLED on gig_staff_slots - these policies won't be created
-- Access control is handled at the application layer in /utils/api.tsx
-- Keeping policy definitions commented for reference:
/*
CREATE POLICY "Users can view staff slots for accessible gigs" ON gig_staff_slots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM gigs g
      WHERE g.id = gig_staff_slots.gig_id
      AND user_is_member_of_org(g.organization_id, auth.uid())
    )
  );

CREATE POLICY "Admins and Managers can manage staff slots" ON gig_staff_slots
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM gigs g
      WHERE g.id = gig_staff_slots.gig_id
      AND user_is_admin_or_manager_of_org(g.organization_id, auth.uid())
    )
  );
*/

-- Gig staff assignments policies
-- NOTE: RLS is DISABLED on gig_staff_assignments - these policies won't be created
-- Access control is handled at the application layer in /utils/api.tsx
-- Keeping policy definitions commented for reference:
/*
CREATE POLICY "Users can view staff assignments for accessible gigs" ON gig_staff_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM gig_staff_slots gs
      JOIN gigs g ON g.id = gs.gig_id
      WHERE gs.id = gig_staff_assignments.slot_id
      AND user_is_member_of_org(g.organization_id, auth.uid())
    )
  );

CREATE POLICY "Admins and Managers can manage staff assignments" ON gig_staff_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM gig_staff_slots gs
      JOIN gigs g ON g.id = gs.gig_id
      WHERE gs.id = gig_staff_assignments.slot_id
      AND user_is_admin_or_manager_of_org(g.organization_id, auth.uid())
    )
  );
*/

-- Gig bids policies
CREATE POLICY "Users can view bids for accessible gigs" ON gig_bids
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM gigs g
      WHERE g.id = gig_bids.gig_id
      AND user_is_member_of_org(g.organization_id, auth.uid())
    )
  );

CREATE POLICY "Admins and Managers can manage bids" ON gig_bids
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM gigs g
      WHERE g.id = gig_bids.gig_id
      AND user_is_admin_or_manager_of_org(g.organization_id, auth.uid())
    )
  );

-- Organization annotations policies
CREATE POLICY "Users can view their organization's annotations" ON org_annotations
  FOR SELECT USING (user_is_member_of_org(org_annotations.organization_id, auth.uid()));

CREATE POLICY "Admins and Managers can manage annotations" ON org_annotations
  FOR ALL USING (user_is_admin_or_manager_of_org(org_annotations.organization_id, auth.uid()));

-- Assets policies
CREATE POLICY "Users can view their organization's assets" ON assets
  FOR SELECT USING (user_is_member_of_org(assets.organization_id, auth.uid()));

CREATE POLICY "Admins and Managers can manage assets" ON assets
  FOR ALL USING (user_is_admin_or_manager_of_org(assets.organization_id, auth.uid()));

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_roles_updated_at BEFORE UPDATE ON staff_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gigs_updated_at BEFORE UPDATE ON gigs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gig_staff_slots_updated_at BEFORE UPDATE ON gig_staff_slots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically log status changes
CREATE OR REPLACE FUNCTION log_gig_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO gig_status_history (gig_id, from_status, to_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, NEW.updated_by);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_gig_status_changes AFTER UPDATE ON gigs
  FOR EACH ROW EXECUTE FUNCTION log_gig_status_change();

-- ============================================
-- SEED DATA (Optional - Common Staff Roles)
-- ============================================

INSERT INTO staff_roles (name, description) VALUES
  ('FOH', 'Front of House - Sound engineer managing audience-facing audio'),
  ('Monitor', 'Monitor Engineer - Manages on-stage audio for performers'),
  ('Lighting', 'Lighting Technician - Operates and designs lighting systems'),
  ('Stage', 'Stage Manager - Coordinates all stage activities and crew'),
  ('CameraOp', 'Camera Operator - Operates video cameras for live production'),
  ('Video', 'Video Engineer - Manages video switching and routing'),
  ('Rigger', 'Rigger - Installs and maintains rigging systems'),
  ('Loader', 'Loader - Assists with loading and unloading equipment'),
  ('Runner', 'Runner - General support and errands during production')
ON CONFLICT (name) DO NOTHING;