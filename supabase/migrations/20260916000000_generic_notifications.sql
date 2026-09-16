-- Generic notifications table (issue #52, phase 1): access_requests (and any
-- future domain table like invitations) stays the durable, resolvable record
-- for state that needs to be acted on. This table is the one-shot "something
-- happened" side-channel NotificationBell reads from, so a new alert type
-- (e.g. a future health-check failure) never again needs its own bespoke
-- live query bolted onto the bell.

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  recipient_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.notifications IS 'Generic per-user notification feed (recipient/type/payload/read-state). Domain tables like access_requests remain the durable, resolvable record; this is the one-shot side-channel NotificationBell reads.';

CREATE INDEX notifications_recipient_unread_idx ON public.notifications(recipient_id) WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- All reads/writes in the app go through the server edge function (service
-- role, bypasses RLS) exactly like access_requests — these policies are the
-- same defense-in-depth backstop used elsewhere in this schema.
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (recipient_id = auth.uid());

CREATE POLICY "Users can mark their own notifications read"
  ON public.notifications FOR UPDATE
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

GRANT ALL ON public.notifications TO service_role;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;

-- access_requests.requester_seen_at and its GET /me/access-requests + PUT
-- .../seen routes existed solely to drive the bell's outcome notice, which
-- now comes from a 'access_request.outcome' row in the table above. Nothing
-- else read this column (confirmed by search), so it's dropped rather than
-- left as dead state.
ALTER TABLE public.access_requests DROP COLUMN requester_seen_at;
