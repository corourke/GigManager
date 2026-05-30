-- Fix UNIQUE constraint in user_google_calendar_settings
-- We want to enforce one calendar integration per user

-- 1. Identify and remove duplicate settings, keeping the most recently updated one
DELETE FROM user_google_calendar_settings a
USING user_google_calendar_settings b
WHERE a.user_id = b.user_id
  AND a.updated_at < b.updated_at;

-- 2. Drop the old composite unique constraint
ALTER TABLE user_google_calendar_settings 
DROP CONSTRAINT IF EXISTS user_google_calendar_settings_user_id_calendar_id_key;

-- 3. Add the new unique constraint on user_id
ALTER TABLE user_google_calendar_settings
ADD CONSTRAINT user_google_calendar_settings_user_id_key UNIQUE (user_id);

-- 4. Ensure sync_status enum has all required values
ALTER TYPE sync_status ADD VALUE IF NOT EXISTS 'updated';
ALTER TYPE sync_status ADD VALUE IF NOT EXISTS 'removed';
