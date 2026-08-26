-- Phase 1 of docs/specs/organizations-contacts-clients/spec.md:
-- Contacts (rolodex people with no login), org-level primary contact, and a
-- "this org is the client" flag on gig participants.

-- 1. Allow 'contact' as a user_status. Plain CHECK constraint, not an enum —
-- cheap, no ALTER TYPE ordering issues to worry about in this same migration.
ALTER TABLE public.users DROP CONSTRAINT users_user_status_check;
ALTER TABLE public.users ADD CONSTRAINT users_user_status_check
  CHECK (user_status = ANY (ARRAY['active','inactive','pending','contact']::text[]));
COMMENT ON COLUMN public.users.user_status IS
  'active (authenticated), pending (invited, not yet signed up), inactive (disabled), contact (rolodex-only, will never log in)';

-- 2. Org-level primary-contact flag + per-org title, on the existing membership table.
ALTER TABLE public.organization_members ADD COLUMN is_primary_contact boolean NOT NULL DEFAULT false;
ALTER TABLE public.organization_members ADD COLUMN contact_title text;
COMMENT ON COLUMN public.organization_members.contact_title IS
  'Free-text title for this person at this org, e.g. "Venue Manager" — distinct from role, which is a GigWrangler permission level';
COMMENT ON COLUMN public.organization_members.is_primary_contact IS
  'This member is the default point of contact for the organization. At most one per org — enforced by organization_members_one_primary_contact_per_org and by add_organization_contact / set_organization_primary_contact.';

-- Backstop: at most one primary contact per org, even if something bypasses
-- the service-layer clear-then-set logic.
CREATE UNIQUE INDEX organization_members_one_primary_contact_per_org
  ON public.organization_members (organization_id) WHERE is_primary_contact = true;

-- 3. Client flag on gig participants. Deliberately no uniqueness constraint —
-- a gig can have more than one org flagged as a paying client (split billing,
-- co-promotion). See spec §2 decision #2.
ALTER TABLE public.gig_participants ADD COLUMN is_client boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.gig_participants.is_client IS
  'This participating organization is (one of) the client(s) paying for the gig. Orthogonal to role — an org can be both e.g. Venue and the client.';

-- 4. Create a new organization contact: either links an existing person (by
-- email) to the org, or — mirroring invite_user_to_organization's handling of
-- 'pending' users — creates a brand-new public.users row with no auth.users
-- account at all, this time with user_status = 'contact'.
CREATE OR REPLACE FUNCTION public.add_organization_contact(
  p_organization_id uuid,
  p_email text,
  p_first_name text,
  p_last_name text,
  p_phone text DEFAULT NULL,
  p_title text DEFAULT NULL,
  p_is_primary boolean DEFAULT false,
  p_actor_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor_id uuid;
  v_user_id uuid;
  v_member jsonb;
BEGIN
  v_actor_id := COALESCE(p_actor_id, auth.uid());
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_email IS NULL OR btrim(p_email) = '' THEN
    RAISE EXCEPTION 'Email is required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = p_organization_id
      AND user_id = v_actor_id
      AND role IN ('Admin', 'Manager')
  ) THEN
    RAISE EXCEPTION 'Permission denied: Only Admins and Managers can add contacts';
  END IF;

  -- Reuse an existing person by email if there is one (any status) rather
  -- than duplicate them — a contact may already be a real team member
  -- elsewhere, or a contact at another org.
  SELECT id INTO v_user_id FROM public.users WHERE email = p_email;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    INSERT INTO public.users (id, email, first_name, last_name, phone, user_status)
    VALUES (v_user_id, p_email, COALESCE(p_first_name, ''), COALESCE(p_last_name, ''), p_phone, 'contact');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = p_organization_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'This person is already associated with this organization';
  END IF;

  IF p_is_primary THEN
    UPDATE public.organization_members SET is_primary_contact = false
    WHERE organization_id = p_organization_id AND is_primary_contact = true;
  END IF;

  INSERT INTO public.organization_members (organization_id, user_id, role, contact_title, is_primary_contact)
  VALUES (p_organization_id, v_user_id, 'Viewer', p_title, p_is_primary)
  RETURNING jsonb_build_object(
    'id', id,
    'organization_id', organization_id,
    'user_id', user_id,
    'role', role,
    'contact_title', contact_title,
    'is_primary_contact', is_primary_contact,
    'created_at', created_at
  ) INTO v_member;

  RETURN jsonb_build_object('user_id', v_user_id, 'member', v_member);
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_organization_contact(uuid, text, text, text, text, text, boolean, uuid) TO authenticated;

-- 5. Toggling an existing member's primary-contact flag needs the same
-- "clear any other primary first" invariant as add_organization_contact.
-- Doing it as a direct client-side UPDATE would race that invariant, so it's
-- a small function too. Everything else (title, name, phone edits) is a
-- plain UPDATE already covered by the existing "Admins can manage
-- organization members" RLS policy — no function needed for those.
CREATE OR REPLACE FUNCTION public.set_organization_primary_contact(
  p_member_id uuid,
  p_actor_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor_id uuid;
  v_org_id uuid;
BEGIN
  v_actor_id := COALESCE(p_actor_id, auth.uid());
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT organization_id INTO v_org_id FROM public.organization_members WHERE id = p_member_id;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = v_org_id AND user_id = v_actor_id AND role IN ('Admin', 'Manager')
  ) THEN
    RAISE EXCEPTION 'Permission denied: Only Admins and Managers can change the primary contact';
  END IF;

  UPDATE public.organization_members SET is_primary_contact = false
  WHERE organization_id = v_org_id AND is_primary_contact = true AND id != p_member_id;

  UPDATE public.organization_members SET is_primary_contact = true WHERE id = p_member_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_organization_primary_contact(uuid, uuid) TO authenticated;

-- 5b. Editing a contact's name/phone/title also needs SECURITY DEFINER: the
-- "self_update" policy on users only lets a row's own owner update it, and
-- there's no policy letting an org Admin update a fellow member's users row
-- directly (the existing Team edit flow only works around this by going
-- through the service-role Edge Function, which isn't part of this table's
-- RLS at all). Route the contact_title (organization_members) and
-- first_name/last_name/phone (users) updates through one function so the
-- permission check happens once and both writes succeed or fail together.
CREATE OR REPLACE FUNCTION public.update_organization_contact(
  p_member_id uuid,
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_title text,
  p_actor_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor_id uuid;
  v_org_id uuid;
  v_user_id uuid;
BEGIN
  v_actor_id := COALESCE(p_actor_id, auth.uid());
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT organization_id, user_id INTO v_org_id, v_user_id
  FROM public.organization_members WHERE id = p_member_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = v_org_id AND user_id = v_actor_id AND role IN ('Admin', 'Manager')
  ) THEN
    RAISE EXCEPTION 'Permission denied: Only Admins and Managers can edit contacts';
  END IF;

  UPDATE public.organization_members SET contact_title = p_title WHERE id = p_member_id;
  UPDATE public.users SET first_name = p_first_name, last_name = p_last_name, phone = p_phone WHERE id = v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_organization_contact(uuid, text, text, text, text, uuid) TO authenticated;

-- 6. RLS gap: "Users can view members of their organizations" only covers
-- orgs you belong to. That means an org's contacts (or its primary contact)
-- are invisible from a gig where that org is merely a participant — e.g. you
-- couldn't see a venue's contacts unless you happened to also be a member of
-- the venue's own organization. Add read access to the contact-relevant
-- subset of organization_members (login-less contacts, and whoever is
-- flagged primary) for any org participating in a gig the caller can access.
-- This does not expose the org's full team roster/permissions to outsiders —
-- only contact_title/is_primary_contact plus whichever users rows those
-- point at.
--
-- The two policies below (organization_members and users) each need to
-- check a condition that lives on the OTHER table. Writing both checks as
-- plain inline subqueries creates a direct mutual reference between the two
-- tables' RLS policies, which Postgres's RLS planner flags as "infinite
-- recursion detected in policy" even though the values themselves aren't
-- circular. The fix is the same one already used elsewhere in this schema
-- (user_has_access_to_gig, get_user_ids_in_same_orgs): push one side of the
-- cross-table check into a SECURITY DEFINER function. Because that function
-- runs as its owner (which has BYPASSRLS), its internal query against
-- `users` doesn't re-enter `users`' own RLS, which is what breaks the cycle.
CREATE OR REPLACE FUNCTION public.user_is_contact_status(p_user_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE((SELECT user_status = 'contact' FROM public.users WHERE id = p_user_id), false);
$$;

CREATE POLICY "Users can view contacts of organizations on their gigs" ON public.organization_members
  FOR SELECT USING (
    (is_primary_contact = true OR public.user_is_contact_status(user_id))
    AND EXISTS (
      SELECT 1 FROM public.gig_participants gp
      WHERE gp.organization_id = organization_members.organization_id
        AND public.user_has_access_to_gig(gp.gig_id, auth.uid())
    )
  );

-- Same gap, one table over: "org_view" on users only covers people who share
-- an org with the caller (get_user_ids_in_same_orgs). Without this, the
-- organization_members policy above would resolve, but the joined `users`
-- row (name/email/phone) for an outside org's contact would come back null.
CREATE POLICY "Users can view contact users on their gigs" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      JOIN public.gig_participants gp ON gp.organization_id = om.organization_id
      WHERE om.user_id = users.id
        AND (om.is_primary_contact = true OR users.user_status = 'contact')
        AND public.user_has_access_to_gig(gp.gig_id, auth.uid())
    )
  );
