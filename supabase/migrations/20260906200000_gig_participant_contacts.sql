-- Per-gig participant contacts (issue follow-up to #13): replaces the
-- Participants section's reliance on organization_members.user_status /
-- is_primary_contact for "who shows as a contact here," which conflated
-- three unrelated things and produced two real bugs:
--   1. Unstarring a real (active-status) member's only qualifying flag
--      made them silently vanish from the list -- the row was never a
--      "contact", it only showed because it was primary.
--   2. Re-adding that same person then failed with "already associated
--      with this organization", because they were still an
--      organization_members row the whole time -- there was no way to
--      just re-designate them without literally re-adding an org
--      membership that already existed.
--
-- gig_participant_contacts decouples "is a contact for this gig's
-- participation" entirely from organization_members: a gig contact does
-- not need to be an org member at all, and visibility is scoped to gig
-- access (not org membership rules), so a real registered user from
-- another org can be marked a contact here without any of the above
-- breaking. "Primary contact" is now a per-gig fact, defaulting from
-- organization_members.is_primary_contact only at the moment a person is
-- first added to a given gig's participant contacts.

CREATE TABLE public.gig_participant_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id uuid NOT NULL REFERENCES public.gigs(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  is_primary_contact boolean NOT NULL DEFAULT false,
  title text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (gig_id, organization_id, user_id)
);

COMMENT ON TABLE public.gig_participant_contacts IS
  'Who to contact at a participating organization, for one specific gig. Independent of organization_members -- a person listed here need not be a member of that organization at all.';
COMMENT ON COLUMN public.gig_participant_contacts.title IS
  'Free-text role/title for this contact on THIS gig, e.g. "Day-of contact" -- distinct from any org-level contact_title.';

-- At most one primary contact per (gig, organization), mirroring
-- organization_members_one_primary_contact_per_org.
CREATE UNIQUE INDEX gig_participant_contacts_one_primary_per_gig_org
  ON public.gig_participant_contacts (gig_id, organization_id) WHERE is_primary_contact = true;

CREATE INDEX idx_gig_participant_contacts_gig_org
  ON public.gig_participant_contacts (gig_id, organization_id);

ALTER TABLE public.gig_participant_contacts ENABLE ROW LEVEL SECURITY;

-- Visibility follows gig access, full stop -- not the target org's own
-- membership rules. This is the actual fix for "RLS is too restrictive":
-- if you can see the gig, you can see who its participants' contacts are.
CREATE POLICY "Users can view gig participant contacts for gigs they can access"
  ON public.gig_participant_contacts FOR SELECT
  USING (public.user_has_access_to_gig(gig_id, auth.uid()));

-- No direct INSERT/UPDATE/DELETE policies -- all writes go through the
-- SECURITY DEFINER functions below, matching this file's existing
-- contact-management convention.

-- Bare person creation, decoupled from any organization membership --
-- used when the person genuinely doesn't exist yet anywhere in the system.
-- Search first (system-wide, via search_users_secure) before calling this,
-- same convention as add_organization_contact.
CREATE OR REPLACE FUNCTION public.create_contact_person(
  p_first_name text,
  p_last_name text,
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor_id uuid;
  v_user_id uuid;
BEGIN
  v_actor_id := COALESCE(p_actor_id, auth.uid());
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_first_name IS NULL OR btrim(p_first_name) = '' OR p_last_name IS NULL OR btrim(p_last_name) = '' THEN
    RAISE EXCEPTION 'First and last name are required';
  END IF;

  v_user_id := gen_random_uuid();
  BEGIN
    INSERT INTO public.users (id, email, first_name, last_name, phone, user_status)
    VALUES (v_user_id, NULLIF(btrim(p_email), ''), p_first_name, p_last_name, NULLIF(btrim(p_phone), ''), 'contact');
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'A person with this email already exists -- search for them and add them as an existing person instead of creating a new one.';
  END;

  RETURN v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_contact_person(text, text, text, text, uuid) TO authenticated;

-- Add (or reactivate) a person as a contact for one gig's participation by
-- a given organization. Upserts on the (gig_id, organization_id, user_id)
-- uniqueness -- re-adding someone already linked is a harmless no-op rather
-- than the "already associated" error the old organization_members-based
-- flow produced. p_is_primary is only applied on first insert (defaulting
-- from organization_members.is_primary_contact when unset); it is never
-- silently changed on an existing row -- use
-- set_gig_participant_contact_primary for that.
CREATE OR REPLACE FUNCTION public.add_gig_participant_contact(
  p_gig_id uuid,
  p_organization_id uuid,
  p_user_id uuid,
  p_is_primary boolean DEFAULT NULL,
  p_title text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor_id uuid;
  v_default_primary boolean;
  v_is_primary boolean;
  v_row jsonb;
BEGIN
  v_actor_id := COALESCE(p_actor_id, auth.uid());
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.user_can_manage_org_contacts(p_organization_id, v_actor_id) THEN
    RAISE EXCEPTION 'Permission denied: Only Admins and Managers of this organization, or of a gig it participates in, can manage its contacts';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Person not found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.gig_participant_contacts
    WHERE gig_id = p_gig_id AND organization_id = p_organization_id AND user_id = p_user_id
  ) THEN
    -- Already linked -- a no-op reactivation, not an error.
    SELECT jsonb_build_object(
      'id', id, 'gig_id', gig_id, 'organization_id', organization_id, 'user_id', user_id,
      'is_primary_contact', is_primary_contact, 'title', title, 'created_at', created_at
    ) INTO v_row
    FROM public.gig_participant_contacts
    WHERE gig_id = p_gig_id AND organization_id = p_organization_id AND user_id = p_user_id;
    RETURN v_row;
  END IF;

  SELECT is_primary_contact INTO v_default_primary
  FROM public.organization_members
  WHERE organization_id = p_organization_id AND user_id = p_user_id;

  v_is_primary := COALESCE(p_is_primary, v_default_primary, false);

  IF v_is_primary THEN
    UPDATE public.gig_participant_contacts SET is_primary_contact = false
    WHERE gig_id = p_gig_id AND organization_id = p_organization_id AND is_primary_contact = true;
  END IF;

  INSERT INTO public.gig_participant_contacts (gig_id, organization_id, user_id, is_primary_contact, title)
  VALUES (p_gig_id, p_organization_id, p_user_id, v_is_primary, p_title)
  RETURNING jsonb_build_object(
    'id', id, 'gig_id', gig_id, 'organization_id', organization_id, 'user_id', user_id,
    'is_primary_contact', is_primary_contact, 'title', title, 'created_at', created_at
  ) INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_gig_participant_contact(uuid, uuid, uuid, boolean, text, uuid) TO authenticated;

-- Dedicated primary-contact toggle for the star button -- independent of
-- add_gig_participant_contact's insert-time default, this can flip the flag
-- at any time without touching anything else about the row.
CREATE OR REPLACE FUNCTION public.set_gig_participant_contact_primary(
  p_gig_id uuid,
  p_organization_id uuid,
  p_user_id uuid,
  p_is_primary boolean,
  p_actor_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor_id uuid;
BEGIN
  v_actor_id := COALESCE(p_actor_id, auth.uid());
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.user_can_manage_org_contacts(p_organization_id, v_actor_id) THEN
    RAISE EXCEPTION 'Permission denied: Only Admins and Managers of this organization, or of a gig it participates in, can manage its contacts';
  END IF;

  IF p_is_primary THEN
    UPDATE public.gig_participant_contacts SET is_primary_contact = false
    WHERE gig_id = p_gig_id AND organization_id = p_organization_id AND is_primary_contact = true
      AND user_id != p_user_id;
  END IF;

  UPDATE public.gig_participant_contacts SET is_primary_contact = p_is_primary
  WHERE gig_id = p_gig_id AND organization_id = p_organization_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This person is not a contact on this gig';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_gig_participant_contact_primary(uuid, uuid, uuid, boolean, uuid) TO authenticated;

-- Removes only the gig-contact link -- never touches organization_members,
-- unlike the old remove_organization_contact path this replaces for the
-- Participants section (which did a hard DELETE on the membership row,
-- silently revoking a real member's org access as a side effect).
CREATE OR REPLACE FUNCTION public.remove_gig_participant_contact(
  p_gig_id uuid,
  p_organization_id uuid,
  p_user_id uuid,
  p_actor_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor_id uuid;
BEGIN
  v_actor_id := COALESCE(p_actor_id, auth.uid());
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.user_can_manage_org_contacts(p_organization_id, v_actor_id) THEN
    RAISE EXCEPTION 'Permission denied: Only Admins and Managers of this organization, or of a gig it participates in, can manage its contacts';
  END IF;

  DELETE FROM public.gig_participant_contacts
  WHERE gig_id = p_gig_id AND organization_id = p_organization_id AND user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.remove_gig_participant_contact(uuid, uuid, uuid, uuid) TO authenticated;
