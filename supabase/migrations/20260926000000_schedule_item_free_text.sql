-- #12: a schedule item's type is free text. The web and mobile UI suggest
-- defaults (Load-In, Act Arrival, Soundcheck, Doors, Set, Load-Out, Return)
-- and accept any other name; the database no longer restricts it to a fixed
-- enum. Existing values carry over unchanged.
-- Tested by supabase/tests/rls/12_schedule_free_text.test.sql.

ALTER TABLE gig_schedule_entries
  ALTER COLUMN activity_type TYPE text USING activity_type::text;

ALTER TABLE gig_schedule_entries
  ADD CONSTRAINT gig_schedule_entries_activity_type_not_blank
  CHECK (length(btrim(activity_type)) > 0);

DROP TYPE IF EXISTS schedule_activity_type;
