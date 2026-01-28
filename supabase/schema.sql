-- ============================================
-- GigManager Database Schema
-- ============================================
-- This is the complete database schema for GigManager.
-- Run this file in your Supabase SQL Editor to set up a fresh database.
--
-- Note: Some tables have RLS disabled to prevent circular dependencies.
-- Access control for those tables is handled at the application layer.
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

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

-- ============================================
-- HELPER FUNCTIONS
-- ============================================
-- These SECURITY DEFINER functions bypass RLS to prevent infinite recursion
-- when policies need to check organization membership

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

CREATE OR REPLACE FUNCTION get_user_email(user_uuid UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = user_uuid;
$$;

-- ============================================
-- TRIGGER FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

-- ============================================
-- TABLES
-- ============================================

-- Users table (extends Supabase auth.users)
-- Note: RLS is PARTIALLY ENABLED - profile access controlled by policies, 
-- but cross-organization search is still permitted at application layer.
CREATE TABLE users (
  id UUID PRIMARY KEY,
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
  user_status TEXT DEFAULT 'active' CHECK (user_status IN ('active', 'inactive', 'pending')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON COLUMN users.user_status IS 'User account status: active (authenticated), pending (invited but not yet authenticated), inactive (disabled)';

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
-- Note: RLS is DISABLED - access control handled in application layer
-- This prevents circular dependencies in RLS policies
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  role user_role NOT NULL,
  default_staff_role_id UUID REFERENCES staff_roles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(organization_id, user_id)
);

COMMENT ON COLUMN organization_members.default_staff_role_id IS 'The default staff role for this member when they are assigned to gigs';

-- Staff roles table
CREATE TABLE staff_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Gigs table
-- Note: RLS is DISABLED - access control handled in application layer
-- Gigs are accessed through gig_participants which also has RLS disabled
CREATE TABLE gigs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  status gig_status NOT NULL,
  tags TEXT[] DEFAULT '{}',
  start TIMESTAMPTZ NOT NULL,
  "end" TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL,
  amount_paid DECIMAL(10, 2),
  notes TEXT,
  parent_gig_id UUID REFERENCES gigs(id) ON DELETE CASCADE,
  hierarchy_depth INTEGER DEFAULT 0 NOT NULL,
  created_by UUID NOT NULL,
  updated_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Gig status history table
CREATE TABLE gig_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  from_status gig_status,
  to_status gig_status NOT NULL,
  changed_by UUID NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Gig participants table
-- Note: RLS is DISABLED - access control handled in application layer
-- This prevents circular dependencies when checking gig access
CREATE TABLE gig_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role organization_type NOT NULL,
  notes TEXT,
  UNIQUE(gig_id, organization_id, role)
);

-- Gig staff slots table
-- Note: RLS is DISABLED - access control handled in application layer
CREATE TABLE gig_staff_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  staff_role_id UUID NOT NULL REFERENCES staff_roles(id) ON DELETE RESTRICT,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  required_count INTEGER DEFAULT 1 NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Gig staff assignments table
-- Note: RLS is DISABLED - access control handled in application layer
CREATE TABLE gig_staff_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slot_id UUID NOT NULL REFERENCES gig_staff_slots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  status TEXT NOT NULL,
  rate DECIMAL(10, 2),
  fee DECIMAL(10, 2),
  notes TEXT,
  assigned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  confirmed_at TIMESTAMPTZ
);

-- Gig bids table
-- Note: RLS is DISABLED - access control handled in application layer
CREATE TABLE gig_bids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  date_given DATE NOT NULL,
  result TEXT,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Invitations table
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Admin', 'Manager', 'Staff', 'Viewer')),
  invited_by UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_pending_invitation UNIQUE (organization_id, email, status)
);

COMMENT ON TABLE invitations IS 'Tracks pending and completed invitations to join organizations';

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
  insurance_class TEXT,
  quantity INTEGER DEFAULT 1,
  created_by UUID NOT NULL,
  updated_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Kits table (reusable equipment collections)
CREATE TABLE kits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  tag_number TEXT,
  rental_value DECIMAL(10, 2),
  created_by UUID NOT NULL,
  updated_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

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

-- Gig kit assignments table
-- Note: RLS is DISABLED - access control handled in application layer
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

-- KV store table (for edge functions)
CREATE TABLE kv_store_de012ad4 (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

-- ============================================
-- INDEXES
-- ============================================

-- Users indexes
CREATE INDEX idx_users_status ON users(user_status);
CREATE INDEX idx_users_email ON users(email) WHERE user_status = 'pending';

-- Organizations indexes
CREATE INDEX idx_org_members_org_id ON organization_members(organization_id);
CREATE INDEX idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX idx_org_members_default_staff_role ON organization_members(default_staff_role_id);

-- Gigs indexes
CREATE INDEX idx_gigs_start ON gigs(start);
CREATE INDEX idx_gigs_parent_gig_id ON gigs(parent_gig_id);
CREATE INDEX idx_gig_participants_gig_id ON gig_participants(gig_id);
CREATE INDEX idx_gig_participants_org_id ON gig_participants(organization_id);
CREATE INDEX idx_gig_status_history_gig_id ON gig_status_history(gig_id);
CREATE INDEX idx_gig_status_history_changed_at ON gig_status_history(changed_at);

-- Staff indexes
CREATE INDEX idx_gig_staff_slots_gig_id ON gig_staff_slots(gig_id);
CREATE INDEX idx_gig_staff_slots_role_id ON gig_staff_slots(staff_role_id);
CREATE INDEX idx_gig_staff_slots_org_id ON gig_staff_slots(organization_id);
CREATE INDEX idx_gig_staff_assignments_slot_id ON gig_staff_assignments(slot_id);
CREATE INDEX idx_gig_staff_assignments_user_id ON gig_staff_assignments(user_id);
CREATE INDEX idx_staff_roles_name ON staff_roles(name);

-- Bids indexes
CREATE INDEX idx_gig_bids_gig_id ON gig_bids(gig_id);
CREATE INDEX idx_gig_bids_org_id ON gig_bids(organization_id);

-- Invitations indexes
CREATE INDEX idx_invitations_organization ON invitations(organization_id);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_status ON invitations(status);

-- Assets indexes
CREATE INDEX idx_assets_org_id ON assets(organization_id);
CREATE INDEX idx_assets_category ON assets(category);

-- Kits indexes
CREATE INDEX idx_kits_org_id ON kits(organization_id);
CREATE INDEX idx_kits_category ON kits(category);
CREATE INDEX idx_kit_assets_kit_id ON kit_assets(kit_id);
CREATE INDEX idx_kit_assets_asset_id ON kit_assets(asset_id);
CREATE INDEX idx_gig_kit_assignments_org_id ON gig_kit_assignments(organization_id);
CREATE INDEX idx_gig_kit_assignments_gig_id ON gig_kit_assignments(gig_id);
CREATE INDEX idx_gig_kit_assignments_kit_id ON gig_kit_assignments(kit_id);

-- KV store indexes
CREATE INDEX kv_store_de012ad4_key_idx ON kv_store_de012ad4(key text_pattern_ops);

-- ============================================
-- TRIGGERS
-- ============================================

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

CREATE TRIGGER update_kits_updated_at BEFORE UPDATE ON kits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER log_gig_status_changes AFTER UPDATE ON gigs
  FOR EACH ROW EXECUTE FUNCTION log_gig_status_change();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
-- Note: Some tables have RLS DISABLED to prevent circular dependencies.
-- Access control for those tables is handled at the application layer in /utils/api.tsx

-- Tables with RLS ENABLED
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE gig_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE kit_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE kv_store_de012ad4 ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Tables with RLS DISABLED (access control in application layer)
ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE gigs DISABLE ROW LEVEL SECURITY;
ALTER TABLE gig_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE gig_staff_slots DISABLE ROW LEVEL SECURITY;
ALTER TABLE gig_staff_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE gig_bids DISABLE ROW LEVEL SECURITY;
ALTER TABLE gig_kit_assignments DISABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Users policies
CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can view other user profiles" ON users
  FOR SELECT USING (
    auth.uid() = id OR 
    EXISTS (SELECT 1 FROM organization_members WHERE user_id = auth.uid())
  );

-- Organizations policies
CREATE POLICY "Users can view organizations they belong to" ON organizations
  FOR SELECT USING (user_is_member_of_org(organizations.id, auth.uid()));

CREATE POLICY "Users can view all organizations for participant selection" ON organizations
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create organizations" ON organizations
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update their organizations" ON organizations
  FOR UPDATE USING (user_is_admin_of_org(organizations.id, auth.uid()));

-- Staff roles policies
CREATE POLICY "Anyone can view staff roles" ON staff_roles
  FOR SELECT USING (true);

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

CREATE POLICY "Allow inserting status history" ON gig_status_history
  FOR INSERT TO authenticated WITH CHECK (true);

-- Invitations policies
CREATE POLICY "Users can view invitations for their organizations" ON invitations
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and Managers can create invitations" ON invitations
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('Admin', 'Manager')
    )
  );

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

CREATE POLICY "Admins and Managers can delete invitations" ON invitations
  FOR DELETE USING (
    user_is_admin_or_manager_of_org(organization_id, auth.uid())
  );

-- Assets policies
CREATE POLICY "Users can view their organization's assets" ON assets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = assets.organization_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and Managers can manage assets" ON assets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = assets.organization_id
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

-- ============================================
-- SEED DATA
-- ============================================

-- Insert default staff roles
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

-- ============================================
-- GRANTS (Required for Supabase)
-- ============================================

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public 
  GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public 
  GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public 
  GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
