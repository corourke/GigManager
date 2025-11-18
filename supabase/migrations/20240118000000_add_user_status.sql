-- Add user_status column to users table for pending user placeholders
-- This allows creating user records before authentication is complete

-- First, drop the foreign key constraint to auth.users
-- This is necessary because pending users don't have auth.users records yet
ALTER TABLE users 
  DROP CONSTRAINT users_id_fkey;

-- Add the user_status column
ALTER TABLE users 
ADD COLUMN user_status TEXT DEFAULT 'active' 
CHECK (user_status IN ('active', 'inactive', 'pending'));

-- Add index for efficient queries on pending users
CREATE INDEX idx_users_status ON users(user_status);

-- Add index for email lookups (used during invitation acceptance)
CREATE INDEX idx_users_email ON users(email) WHERE user_status = 'pending';

COMMENT ON COLUMN users.user_status IS 'User account status: active (authenticated), pending (invited but not yet authenticated), inactive (disabled)';

-- Add ON UPDATE CASCADE to foreign key constraints that reference users(id)
-- This allows updating the user ID when converting pending users to active users

-- Drop and recreate organization_members.user_id foreign key
ALTER TABLE organization_members 
  DROP CONSTRAINT organization_members_user_id_fkey,
  ADD CONSTRAINT organization_members_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE;

-- Drop and recreate gig_staff_assignments.user_id foreign key
ALTER TABLE gig_staff_assignments 
  DROP CONSTRAINT gig_staff_assignments_user_id_fkey,
  ADD CONSTRAINT gig_staff_assignments_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE;

-- Drop and recreate invitations.invited_by foreign key
ALTER TABLE invitations 
  DROP CONSTRAINT invitations_invited_by_fkey,
  ADD CONSTRAINT invitations_invited_by_fkey 
    FOREIGN KEY (invited_by) REFERENCES users(id) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE;

-- Drop and recreate invitations.accepted_by foreign key
ALTER TABLE invitations 
  DROP CONSTRAINT invitations_accepted_by_fkey,
  ADD CONSTRAINT invitations_accepted_by_fkey 
    FOREIGN KEY (accepted_by) REFERENCES users(id) 
    ON DELETE SET NULL 
    ON UPDATE CASCADE;