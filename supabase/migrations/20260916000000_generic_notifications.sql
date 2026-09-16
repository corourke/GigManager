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

-- invitation.accepted (issue #52 follow-up): nothing today tells an inviter
-- their invitation was accepted. convert_pending_user_to_active is the only
-- place that flips an invitation to 'accepted' -- it's called directly from
-- the client via supabase.rpc (no edge-function route to hook), and is
-- already SECURITY DEFINER, so the notification insert belongs here rather
-- than duplicated at every call site. A pending user can hold more than one
-- invitation at once (invited to several orgs before signing up), so this
-- loops over every invitation the UPDATE actually flips, one notification
-- per invitation to that invitation's own inviter.
CREATE OR REPLACE FUNCTION "public"."convert_pending_user_to_active"("p_email" "text", "p_auth_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_pending_user_id UUID;
  v_existing_active_id UUID;
  v_updated_user JSONB;
  v_invitation RECORD;
BEGIN
  -- 1. Check if the user already exists as active with the correct ID
  SELECT id INTO v_existing_active_id
  FROM public.users
  WHERE id = p_auth_user_id
  AND user_status = 'active';

  IF v_existing_active_id IS NOT NULL THEN
    -- Already active, just return the user data
    SELECT jsonb_build_object(
      'id', id,
      'email', email,
      'first_name', first_name,
      'last_name', last_name,
      'user_status', user_status
    ) INTO v_updated_user
    FROM public.users
    WHERE id = v_existing_active_id;

    RETURN v_updated_user;
  END IF;

  -- 2. Find the pending user (case-insensitive email match)
  SELECT id INTO v_pending_user_id
  FROM public.users
  WHERE LOWER(email) = LOWER(p_email)
  AND user_status = 'pending'
  ORDER BY created_at DESC -- In case of multiple (shouldn't happen with unique constraint but just in case)
  LIMIT 1;

  IF v_pending_user_id IS NULL THEN
    -- No pending user found. Check if there is an active user with this email but different ID
    SELECT id INTO v_existing_active_id
    FROM public.users
    WHERE LOWER(email) = LOWER(p_email)
    AND user_status = 'active'
    LIMIT 1;

    IF v_existing_active_id IS NOT NULL THEN
      -- If we found an active user with a different ID, update their ID to match Auth
      -- This handles cases where a user might have been created via a different path
      UPDATE public.users
      SET id = p_auth_user_id,
          updated_at = now()
      WHERE id = v_existing_active_id
      RETURNING jsonb_build_object(
        'id', id,
        'email', email,
        'first_name', first_name,
        'last_name', last_name,
        'user_status', user_status
      ) INTO v_updated_user;

      RETURN v_updated_user;
    END IF;

    -- Truly no user found, return NULL so caller can handle creation if needed
    RETURN NULL;
  END IF;

  -- 3. Update the pending user record to match Auth ID and set status to active
  -- PK update will propagate via ON UPDATE CASCADE to other tables
  UPDATE public.users
  SET id = p_auth_user_id,
      user_status = 'active',
      updated_at = now()
  WHERE id = v_pending_user_id
  RETURNING jsonb_build_object(
    'id', id,
    'email', email,
    'first_name', first_name,
    'last_name', last_name,
    'user_status', user_status
  ) INTO v_updated_user;

  -- 4. Update invitations to mark them as accepted, notifying each inviter
  FOR v_invitation IN
    UPDATE public.invitations
    SET status = 'accepted',
        accepted_at = now(),
        accepted_by = p_auth_user_id
    WHERE LOWER(email) = LOWER(p_email)
    AND status = 'pending'
    RETURNING id, organization_id, invited_by
  LOOP
    INSERT INTO public.notifications (recipient_id, type, payload)
    VALUES (
      v_invitation.invited_by,
      'invitation.accepted',
      jsonb_build_object(
        'invitation_id', v_invitation.id,
        'organization_id', v_invitation.organization_id,
        'organization_name', (SELECT name FROM public.organizations WHERE id = v_invitation.organization_id),
        'accepted_user_name', COALESCE(
          NULLIF(TRIM(BOTH FROM CONCAT(v_updated_user->>'first_name', ' ', v_updated_user->>'last_name')), ''),
          v_updated_user->>'email'
        )
      )
    );
  END LOOP;

  RETURN v_updated_user;
END;
$$;
