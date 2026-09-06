-- Issues #5 (quick-add staff/contacts without an invite) and #13 (offer an
-- existing member of a Participating Organization instead of always
-- creating a new person).
--
-- Two changes:
-- 1. add_organization_contact: email and phone become optional, and the old
--    "silently reuse an existing public.users row if the given email
--    happens to match one" behavior is removed. Duplicate detection is now
--    the caller's job (see find_organization_person_matches below) --
--    search first, let the user choose to link an existing person (via the
--    existing addExistingUserToOrganization) or create a new one.
-- 2. find_organization_person_matches: a new, permission-checked search so
--    the UI can offer "did you mean this existing person?" before creating
--    a duplicate, and so the Participants-section contact picker can browse
--    a Participating Organization's existing members instead of always
--    creating someone new.

CREATE OR REPLACE FUNCTION public.add_organization_contact(
  p_organization_id uuid,
  p_email text DEFAULT NULL,
  p_first_name text DEFAULT NULL,
  p_last_name text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_title text DEFAULT NULL,
  p_is_primary boolean DEFAULT false,
  p_actor_id uuid DEFAULT NULL,
  p_role public.user_role DEFAULT 'Viewer'::public.user_role
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

  -- Email and phone are both optional now -- a quick-add person may have
  -- neither on file yet. Name is still required.
  IF p_first_name IS NULL OR btrim(p_first_name) = '' OR p_last_name IS NULL OR btrim(p_last_name) = '' THEN
    RAISE EXCEPTION 'First and last name are required';
  END IF;

  IF NOT public.user_can_manage_org_contacts(p_organization_id, v_actor_id) THEN
    RAISE EXCEPTION 'Permission denied: Only Admins and Managers of this organization, or of a gig it participates in, can add contacts';
  END IF;

  -- Always create a brand-new person -- no more silently reusing an existing
  -- public.users row by email match. The caller is expected to have already
  -- searched via find_organization_person_matches and offered the user a
  -- choice, so a freshly generated id can never already be an org member,
  -- which is why the old "already associated with this organization" check
  -- (dead once reuse-by-email was removed) is gone too.
  v_user_id := gen_random_uuid();
  BEGIN
    INSERT INTO public.users (id, email, first_name, last_name, phone, user_status)
    VALUES (v_user_id, NULLIF(btrim(p_email), ''), p_first_name, p_last_name, NULLIF(btrim(p_phone), ''), 'contact');
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'A person with this email already exists -- search for them and add them as an existing member instead of creating a new one.';
  END;

  IF p_is_primary THEN
    UPDATE public.organization_members SET is_primary_contact = false
    WHERE organization_id = p_organization_id AND is_primary_contact = true;
  END IF;

  INSERT INTO public.organization_members (organization_id, user_id, role, contact_title, is_primary_contact)
  VALUES (p_organization_id, v_user_id, p_role, p_title, p_is_primary)
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

GRANT EXECUTE ON FUNCTION public.add_organization_contact(uuid, text, text, text, text, text, boolean, uuid, public.user_role) TO authenticated;

-- A targeted SEARCH, not a roster browse: with no search terms given it
-- returns nothing, and matches are capped and ordered by name. Reuses
-- user_can_manage_org_contacts so this has the exact same reach as the rest
-- of the contact-management RPCs (an org's own Admin/Manager, an
-- Admin/Manager of an org sharing a gig with it, or a global admin) --
-- deliberately not a broader "search everyone" like search_users_secure.
CREATE OR REPLACE FUNCTION public.find_organization_person_matches(
  p_organization_id uuid,
  p_search text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor_id uuid;
  v_search text := NULLIF(btrim(COALESCE(p_search, '')), '');
  v_email text := NULLIF(btrim(COALESCE(p_email, '')), '');
  v_phone text := NULLIF(btrim(COALESCE(p_phone, '')), '');
  v_escaped_search text;
  v_result jsonb;
BEGIN
  v_actor_id := COALESCE(p_actor_id, auth.uid());
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.user_can_manage_org_contacts(p_organization_id, v_actor_id) THEN
    RAISE EXCEPTION 'Permission denied: Only Admins and Managers of this organization, or of a gig it participates in, can search its members';
  END IF;

  -- No search terms at all -- never return the whole roster.
  IF v_search IS NULL AND v_email IS NULL AND v_phone IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  -- Escape literal % and _ so a name search can't unexpectedly broaden the
  -- match (email/phone below are exact matches, not ILIKE, so they don't
  -- need this).
  v_escaped_search := replace(replace(v_search, '%', '\%'), '_', '\_');

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'member_id', matched.member_id,
    'user_id', matched.user_id,
    'first_name', matched.first_name,
    'last_name', matched.last_name,
    'email', matched.email,
    'phone', matched.phone,
    'role', matched.role,
    'contact_title', matched.contact_title,
    'user_status', matched.user_status
  )), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT om.id AS member_id, u.id AS user_id, u.first_name, u.last_name, u.email, u.phone,
           om.role, om.contact_title, u.user_status
    FROM public.organization_members om
    JOIN public.users u ON u.id = om.user_id
    WHERE om.organization_id = p_organization_id
      AND (
        (v_email IS NOT NULL AND u.email = v_email)
        OR (v_phone IS NOT NULL AND u.phone = v_phone)
        OR (v_escaped_search IS NOT NULL AND (u.first_name || ' ' || u.last_name) ILIKE '%' || v_escaped_search || '%' ESCAPE '\')
      )
    ORDER BY u.first_name
    LIMIT 10
  ) matched;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.find_organization_person_matches IS
  'Search one organization''s existing members/contacts by name, email, or phone. Used to (1) surface a likely duplicate before quick-adding a new contact/staff person, and (2) let a user pick an existing member of a Participating Organization instead of creating a new one there.';

GRANT EXECUTE ON FUNCTION public.find_organization_person_matches(uuid, text, text, text, uuid) TO authenticated;

-- Link an EXISTING person (found via find_organization_person_matches) to an
-- organization, as the counterpart to add_organization_contact's "create
-- new". Needed because the existing addExistingUserToOrganization path (an
-- Edge Function, POST /organizations/:id/members) checks the ACTOR's
-- membership only in the target org itself -- it 403s for the exact
-- cross-org case this feature exists for (a gig manager adding a contact to
-- a Participating Organization they don't personally belong to). This RPC
-- uses the same broadened user_can_manage_org_contacts check as the rest of
-- this file's contact-management functions instead.
CREATE OR REPLACE FUNCTION public.link_existing_person_to_organization(
  p_organization_id uuid,
  p_user_id uuid,
  p_role public.user_role DEFAULT 'Viewer'::public.user_role,
  p_title text DEFAULT NULL,
  p_is_primary boolean DEFAULT false,
  p_actor_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor_id uuid;
  v_member jsonb;
BEGIN
  v_actor_id := COALESCE(p_actor_id, auth.uid());
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.user_can_manage_org_contacts(p_organization_id, v_actor_id) THEN
    RAISE EXCEPTION 'Permission denied: Only Admins and Managers of this organization, or of a gig it participates in, can add members';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Person not found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = p_organization_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'This person is already associated with this organization';
  END IF;

  IF p_is_primary THEN
    UPDATE public.organization_members SET is_primary_contact = false
    WHERE organization_id = p_organization_id AND is_primary_contact = true;
  END IF;

  INSERT INTO public.organization_members (organization_id, user_id, role, contact_title, is_primary_contact)
  VALUES (p_organization_id, p_user_id, p_role, p_title, p_is_primary)
  RETURNING jsonb_build_object(
    'id', id,
    'organization_id', organization_id,
    'user_id', user_id,
    'role', role,
    'contact_title', contact_title,
    'is_primary_contact', is_primary_contact,
    'created_at', created_at
  ) INTO v_member;

  RETURN jsonb_build_object('user_id', p_user_id, 'member', v_member);
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_existing_person_to_organization(uuid, uuid, public.user_role, text, boolean, uuid) TO authenticated;
