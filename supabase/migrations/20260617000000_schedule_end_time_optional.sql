-- Make end_time optional on schedule entries and drop the ordering constraint.
-- A schedule entry like "6:00 PM — Load-In" needs only a start time.

ALTER TABLE gig_schedule_entries
  DROP CONSTRAINT schedule_entry_time_order;

ALTER TABLE gig_schedule_entries
  ALTER COLUMN end_time DROP NOT NULL;
