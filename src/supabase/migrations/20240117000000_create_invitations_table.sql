-- Create invitations table for tracking pending team member invitations
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Admin', 'Manager', 'Staff', 'Viewer')),
  invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT unique_pending_invitation UNIQUE (organization_id, email, status)
);

-- Index for faster lookups
CREATE INDEX idx_invitations_organization ON invitations(organization_id);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_status ON invitations(status);

-- Enable RLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view invitations for organizations they belong to
CREATE POLICY "Users can view invitations for their organizations"
  ON invitations
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Admins and Managers can create invitations for their organizations
CREATE POLICY "Admins and Managers can create invitations"
  ON invitations
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('Admin', 'Manager')
    )
  );

-- Policy: Admins and Managers can update invitations for their organizations
CREATE POLICY "Admins and Managers can update invitations"
  ON invitations
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('Admin', 'Manager')
    )
  );

-- Policy: Admins and Managers can delete invitations for their organizations
CREATE POLICY "Admins and Managers can delete invitations"
  ON invitations
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
      AND role IN ('Admin', 'Manager')
    )
  );

-- Add comment
COMMENT ON TABLE invitations IS 'Tracks pending and completed invitations to join organizations';