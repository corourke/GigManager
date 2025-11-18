-- Add default_staff_role_id to organization_members table
ALTER TABLE organization_members
ADD COLUMN IF NOT EXISTS default_staff_role_id UUID REFERENCES staff_roles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_org_members_default_staff_role ON organization_members(default_staff_role_id);

-- Add comment
COMMENT ON COLUMN organization_members.default_staff_role_id IS 'The default staff role for this member when they are assigned to gigs';
