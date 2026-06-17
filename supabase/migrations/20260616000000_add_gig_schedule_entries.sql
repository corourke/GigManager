-- Sprint 2: Multi-Act Scheduling — gig_schedule_entries table

CREATE TYPE schedule_activity_type AS ENUM (
  'Load-In',
  'Soundcheck',
  'Rehearsal',
  'Set',
  'Intermission',
  'Load-Out',
  'Other'
);

CREATE TABLE gig_schedule_entries (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id             UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  activity_type      schedule_activity_type NOT NULL,
  label              TEXT,
  start_time         TIMESTAMPTZ NOT NULL,
  end_time           TIMESTAMPTZ NOT NULL,
  act_participant_id UUID REFERENCES gig_participants(id) ON DELETE SET NULL,
  sort_order         INTEGER NOT NULL DEFAULT 0,
  notes              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT schedule_entry_time_order CHECK (end_time > start_time)
);

CREATE INDEX idx_schedule_entries_gig ON gig_schedule_entries(gig_id);
CREATE INDEX idx_schedule_entries_act ON gig_schedule_entries(act_participant_id);

ALTER TABLE gig_schedule_entries ENABLE ROW LEVEL SECURITY;

-- Read: any member of a participant org
CREATE POLICY "schedule_entries_select"
  ON gig_schedule_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM gig_participants gp
      JOIN organization_members om ON om.organization_id = gp.organization_id
      WHERE gp.gig_id = gig_schedule_entries.gig_id
        AND om.user_id = auth.uid()
    )
  );

-- Insert/Update/Delete: Admin or Manager of a participant org
CREATE POLICY "schedule_entries_modify"
  ON gig_schedule_entries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM gig_participants gp
      JOIN organization_members om ON om.organization_id = gp.organization_id
      WHERE gp.gig_id = gig_schedule_entries.gig_id
        AND om.user_id = auth.uid()
        AND om.role IN ('Admin', 'Manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM gig_participants gp
      JOIN organization_members om ON om.organization_id = gp.organization_id
      WHERE gp.gig_id = gig_schedule_entries.gig_id
        AND om.user_id = auth.uid()
        AND om.role IN ('Admin', 'Manager')
    )
  );
