-- Add 'updated' and 'removed' values to the sync_status enum
-- 'updated' = gig was re-synced to an existing Google Calendar event
-- 'removed' = gig was removed from Google Calendar (deleted or filtered out)

ALTER TYPE sync_status ADD VALUE IF NOT EXISTS 'updated';
ALTER TYPE sync_status ADD VALUE IF NOT EXISTS 'removed';
