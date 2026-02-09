-- Add timezone column to users table
-- This allows users to set their preferred timezone for CSV imports and other operations
ALTER TABLE users 
ADD COLUMN timezone VARCHAR DEFAULT NULL;

-- Add a comment explaining the column
COMMENT ON COLUMN users.timezone IS 'User preferred timezone in IANA format (e.g., America/New_York). Used as default for CSV imports and other operations.';

-- Add an index for performance when querying by timezone
CREATE INDEX idx_users_timezone ON users(timezone);