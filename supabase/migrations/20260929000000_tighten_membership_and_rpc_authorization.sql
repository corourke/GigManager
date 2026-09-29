-- Tighten who may act through the membership, contact, invitation, sign-up
-- and purchase functions, and guard organization memberships and user
-- profiles at the table, so every path (a function or a direct write)
-- follows one set of rules:
--
--   * The acting user is the signed-in user. An "acting as" id passed to a
--     function is honoured only for calls from the server (service role).
--   * An organization's Admins manage all of its members; its Managers all
--     except Admins. Anyone else who may manage its contacts (an Admin or
--     Manager of an org sharing a gig with it, or any org's Admin while it
--     is unclaimed) may only add, edit or remove its no-login contacts, as
--     Viewers, and never themselves. Joining an org yourself as a Viewer,
--     directly, is unchanged.
--   * Only the server changes a user's email, status or platform-moderator
--     flag. A profile you create is your own, with your sign-in email.
--   * Claiming an invitation works only for the signed-in user's own,
--     confirmed email.
--   * Recording or reclassifying a purchase takes an Admin or Manager of the
--     organization it belongs to, with every row in that organization.
--
-- Section 2 redefines functions unchanged apart from the acting user (and,
-- for invitations, an Admin-only check for inviting an Admin).

-- 1. Helpers -------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.acting_user(p_claimed uuid) RETURNS uuid
LANGUAGE sql STABLE
SET search_path TO 'public'
AS $$
  SELECT CASE WHEN auth.role() = 'service_role' THEN COALESCE(p_claimed, auth.uid()) ELSE auth.uid() END
$$;

CREATE OR REPLACE FUNCTION public.member_role_in_org(p_organization_id uuid, p_user_id uuid) RETURNS public.user_role
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role FROM public.organization_members
  WHERE organization_id = p_organization_id AND user_id = p_user_id
  LIMIT 1
$$;

-- Is p_actor an Admin or Manager of some organization p_person belongs to?
CREATE OR REPLACE FUNCTION public.user_manages_person(p_actor uuid, p_person uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members mine
    JOIN public.organization_members theirs ON theirs.organization_id = mine.organization_id
    WHERE mine.user_id = p_actor AND mine.role IN ('Admin', 'Manager') AND theirs.user_id = p_person
  )
$$;

CREATE OR REPLACE FUNCTION public.signed_in_email() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid()
$$;

-- Who may manage an organization's contacts: its own Admins and Managers,
-- those of an org sharing a gig with it, and (only while it has no Admin of
-- its own) any org's Admin. Before this, any org's Admin qualified for every
-- organization. The member and profile SELECT policies from 20260907000000
-- use this function, so they narrow with it.
CREATE OR REPLACE FUNCTION public.user_can_manage_org_contacts(p_organization_id uuid, p_user_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = p_organization_id AND om.user_id = p_user_id AND om.role IN ('Admin', 'Manager')
  ) OR EXISTS (
    SELECT 1 FROM public.gig_participants gp_target
    JOIN public.gig_participants gp_actor ON gp_actor.gig_id = gp_target.gig_id
    JOIN public.organization_members om ON om.organization_id = gp_actor.organization_id
    WHERE gp_target.organization_id = p_organization_id
      AND om.user_id = p_user_id
      AND om.role IN ('Admin', 'Manager')
  ) OR (
    EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = p_organization_id AND NOT o.claimed)
    AND public.user_is_admin(p_user_id)
  );
$$;

-- 2. Functions that took the acting user from the caller -------------------------


CREATE OR REPLACE FUNCTION public.invite_user_to_organization(p_organization_id uuid, p_email text, p_role text, p_first_name text DEFAULT NULL::text, p_last_name text DEFAULT NULL::text, p_inviter_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_inviter_id UUID;
  v_user_id UUID;
  v_invitation_id UUID;
  v_new_user JSONB;
  v_invitation JSONB;
  v_is_resend BOOLEAN := FALSE;
BEGIN
  -- 1. Determine inviter ID (passed explicitly from Edge Function or from auth.uid())
  v_inviter_id := public.acting_user(p_inviter_id);
  
  IF v_inviter_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated: No inviter ID found';
  END IF;

  -- 2. Check if inviter has permission (Admin or Manager of the organization)
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = p_organization_id
    AND user_id = v_inviter_id
    AND role IN ('Admin', 'Manager')
  ) THEN
    RAISE EXCEPTION 'Permission denied: Only Admins and Managers can invite users';
  END IF;

  -- Only an Admin may invite an Admin.
  IF p_role = 'Admin' AND public.member_role_in_org(p_organization_id, v_inviter_id) IS DISTINCT FROM 'Admin' THEN
    RAISE EXCEPTION 'Permission denied: Only Admins can invite an Admin';
  END IF;

  -- 3. Check for existing active user
  SELECT id INTO v_user_id FROM public.users WHERE email = p_email AND user_status = 'active';
  IF v_user_id IS NOT NULL THEN
    -- Check if they are already a member of this organization
    IF EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = p_organization_id
      AND user_id = v_user_id
    ) THEN
      RAISE EXCEPTION 'This user is already an active member of this organization.';
    END IF;
    
    RAISE EXCEPTION 'A user with this email already exists and is active in the system. Please use "Add Existing User" instead.';
  END IF;

  -- 4. Check for existing pending invitation
  SELECT id INTO v_invitation_id FROM public.invitations
    WHERE organization_id = p_organization_id
    AND email = p_email
    AND status = 'pending';
  
  IF v_invitation_id IS NOT NULL THEN
    -- Update existing invitation to refresh token and expiry
    UPDATE public.invitations
    SET token = gen_random_uuid()::text,
        expires_at = now() + interval '7 days',
        invited_by = v_inviter_id,
        role = p_role,
        updated_at = now()
    WHERE id = v_invitation_id
    RETURNING jsonb_build_object(
      'id', id,
      'organization_id', organization_id,
      'email', email,
      'role', role,
      'invited_by', invited_by,
      'status', status,
      'expires_at', expires_at
    ) INTO v_invitation;

    -- Get user data (they must exist if they have an invitation)
    SELECT jsonb_build_object(
      'id', id,
      'email', email,
      'first_name', first_name,
      'last_name', last_name,
      'user_status', user_status
    ) INTO v_new_user FROM public.users WHERE email = p_email;

    RETURN jsonb_build_object(
      'user', v_new_user,
      'invitation', v_invitation,
      'resend', true
    );
  END IF;

  -- 5. Create or get pending user (if no active user found in Step 3 and no pending invitation in Step 4)
  SELECT id INTO v_user_id FROM public.users WHERE email = p_email AND user_status = 'pending';
  
  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    INSERT INTO public.users (
      id, 
      email, 
      first_name, 
      last_name, 
      user_status
    ) VALUES (
      v_user_id,
      p_email,
      COALESCE(p_first_name, ''),
      COALESCE(p_last_name, ''),
      'pending'
    )
    RETURNING jsonb_build_object(
      'id', id,
      'email', email,
      'first_name', first_name,
      'last_name', last_name,
      'user_status', user_status
    ) INTO v_new_user;
  ELSE
    SELECT jsonb_build_object(
      'id', id,
      'email', email,
      'first_name', first_name,
      'last_name', last_name,
      'user_status', user_status
    ) INTO v_new_user FROM public.users WHERE id = v_user_id;
  END IF;

  -- 6. Add to organization_members if not already a member
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = p_organization_id
    AND user_id = v_user_id
  ) THEN
    INSERT INTO public.organization_members (
      organization_id,
      user_id,
      role
    ) VALUES (
      p_organization_id,
      v_user_id,
      p_role::public.user_role
    );
  END IF;

  -- 7. Create invitation
  INSERT INTO public.invitations (
    organization_id,
    email,
    role,
    invited_by,
    token,
    expires_at,
    status
  ) VALUES (
    p_organization_id,
    p_email,
    p_role,
    v_inviter_id,
    gen_random_uuid()::text,
    now() + interval '7 days',
    'pending'
  )
  RETURNING jsonb_build_object(
    'id', id,
    'organization_id', organization_id,
    'email', email,
    'role', role,
    'invited_by', invited_by,
    'status', status,
    'expires_at', expires_at
  ) INTO v_invitation;

  -- 8. Return combined result
  RETURN jsonb_build_object(
    'user', v_new_user,
    'invitation', v_invitation,
    'resend', false
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.add_organization_contact(p_organization_id uuid, p_email text, p_first_name text, p_last_name text, p_phone text DEFAULT NULL::text, p_title text DEFAULT NULL::text, p_is_primary boolean DEFAULT false, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor_id uuid;
  v_user_id uuid;
  v_member jsonb;
BEGIN
  v_actor_id := public.acting_user(p_actor_id);
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_email IS NULL OR btrim(p_email) = '' THEN
    RAISE EXCEPTION 'Email is required';
  END IF;

  IF NOT public.user_can_manage_org_contacts(p_organization_id, v_actor_id) THEN
    RAISE EXCEPTION 'Permission denied: Only Admins and Managers of this organization, or of a gig it participates in, can add contacts';
  END IF;

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
$function$;

CREATE OR REPLACE FUNCTION public.set_organization_primary_contact(p_member_id uuid, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor_id uuid;
  v_org_id uuid;
BEGIN
  v_actor_id := public.acting_user(p_actor_id);
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT organization_id INTO v_org_id FROM public.organization_members WHERE id = p_member_id;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  IF NOT public.user_can_manage_org_contacts(v_org_id, v_actor_id) THEN
    RAISE EXCEPTION 'Permission denied: Only Admins and Managers of this organization, or of a gig it participates in, can change the primary contact';
  END IF;

  UPDATE public.organization_members SET is_primary_contact = false
  WHERE organization_id = v_org_id AND is_primary_contact = true AND id != p_member_id;

  UPDATE public.organization_members SET is_primary_contact = true WHERE id = p_member_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_organization_contact(p_member_id uuid, p_first_name text, p_last_name text, p_phone text, p_title text, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor_id uuid;
  v_org_id uuid;
  v_user_id uuid;
BEGIN
  v_actor_id := public.acting_user(p_actor_id);
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT organization_id, user_id INTO v_org_id, v_user_id
  FROM public.organization_members WHERE id = p_member_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  IF NOT public.user_can_manage_org_contacts(v_org_id, v_actor_id) THEN
    RAISE EXCEPTION 'Permission denied: Only Admins and Managers of this organization, or of a gig it participates in, can edit contacts';
  END IF;

  UPDATE public.organization_members SET contact_title = p_title WHERE id = p_member_id;
  UPDATE public.users SET first_name = p_first_name, last_name = p_last_name, phone = p_phone WHERE id = v_user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.remove_organization_contact(p_member_id uuid, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor_id uuid;
  v_org_id uuid;
BEGIN
  v_actor_id := public.acting_user(p_actor_id);
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT organization_id INTO v_org_id FROM public.organization_members WHERE id = p_member_id;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  IF NOT public.user_can_manage_org_contacts(v_org_id, v_actor_id) THEN
    RAISE EXCEPTION 'Permission denied: Only Admins and Managers of this organization, or of a gig it participates in, can remove contacts';
  END IF;

  DELETE FROM public.organization_members WHERE id = p_member_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.unset_organization_primary_contact(p_member_id uuid, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor_id uuid;
  v_org_id uuid;
BEGIN
  v_actor_id := public.acting_user(p_actor_id);
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT organization_id INTO v_org_id FROM public.organization_members WHERE id = p_member_id;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  IF NOT public.user_can_manage_org_contacts(v_org_id, v_actor_id) THEN
    RAISE EXCEPTION 'Permission denied: Only Admins and Managers of this organization, or of a gig it participates in, can change the primary contact';
  END IF;

  UPDATE public.organization_members SET is_primary_contact = false WHERE id = p_member_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.add_organization_contact(p_organization_id uuid, p_email text DEFAULT NULL::text, p_first_name text DEFAULT NULL::text, p_last_name text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_title text DEFAULT NULL::text, p_is_primary boolean DEFAULT false, p_actor_id uuid DEFAULT NULL::uuid, p_role user_role DEFAULT 'Viewer'::user_role)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor_id uuid;
  v_user_id uuid;
  v_member jsonb;
BEGIN
  v_actor_id := public.acting_user(p_actor_id);
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
$function$;

CREATE OR REPLACE FUNCTION public.link_existing_person_to_organization(p_organization_id uuid, p_user_id uuid, p_role user_role DEFAULT 'Viewer'::user_role, p_title text DEFAULT NULL::text, p_is_primary boolean DEFAULT false, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor_id uuid;
  v_member jsonb;
BEGIN
  v_actor_id := public.acting_user(p_actor_id);
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
$function$;

CREATE OR REPLACE FUNCTION public.create_contact_person(p_first_name text, p_last_name text, p_email text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor_id uuid;
  v_user_id uuid;
BEGIN
  v_actor_id := public.acting_user(p_actor_id);
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
$function$;

CREATE OR REPLACE FUNCTION public.add_gig_participant_contact(p_gig_id uuid, p_organization_id uuid, p_user_id uuid, p_is_primary boolean DEFAULT NULL::boolean, p_title text DEFAULT NULL::text, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor_id uuid;
  v_default_primary boolean;
  v_is_primary boolean;
  v_row jsonb;
BEGIN
  v_actor_id := public.acting_user(p_actor_id);
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
$function$;

CREATE OR REPLACE FUNCTION public.set_gig_participant_contact_primary(p_gig_id uuid, p_organization_id uuid, p_user_id uuid, p_is_primary boolean, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor_id uuid;
BEGIN
  v_actor_id := public.acting_user(p_actor_id);
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
$function$;

CREATE OR REPLACE FUNCTION public.remove_gig_participant_contact(p_gig_id uuid, p_organization_id uuid, p_user_id uuid, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor_id uuid;
BEGIN
  v_actor_id := public.acting_user(p_actor_id);
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.user_can_manage_org_contacts(p_organization_id, v_actor_id) THEN
    RAISE EXCEPTION 'Permission denied: Only Admins and Managers of this organization, or of a gig it participates in, can manage its contacts';
  END IF;

  DELETE FROM public.gig_participant_contacts
  WHERE gig_id = p_gig_id AND organization_id = p_organization_id AND user_id = p_user_id;
END;
$function$;

-- 3. Claiming an invitation at sign-up --------------------------------------

CREATE OR REPLACE FUNCTION public.convert_pending_user_to_active(p_email text, p_auth_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pending_user_id UUID;
  v_existing_active_id UUID;
  v_updated_user JSONB;
  v_invitation RECORD;
BEGIN
  -- Only for the signed-in user, and only their own confirmed email.
  IF auth.uid() IS NULL OR p_auth_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid() AND lower(email) = lower(p_email) AND email_confirmed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
  END IF;

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
$function$;

-- 4. Purchases ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_purchase_transaction_v1(p_header jsonb, p_items jsonb[], p_assets jsonb[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_header_id uuid;
  v_item jsonb;
  v_asset jsonb;
  v_asset_id uuid;
  v_purchase_row_id uuid;
  v_result jsonb;
  v_asset_purchase_ids uuid[];
  v_row_type text;
  v_idx int;
BEGIN
  IF NOT public.user_is_admin_or_manager_of_org((p_header->>'organization_id')::uuid, auth.uid()) THEN
    RAISE EXCEPTION 'Permission denied: Only Admins and Managers of this organization can record purchases' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(COALESCE(p_items, ARRAY[]::jsonb[]) || COALESCE(p_assets, ARRAY[]::jsonb[])) r
    WHERE (r->>'organization_id')::uuid IS DISTINCT FROM (p_header->>'organization_id')::uuid
  ) THEN
    RAISE EXCEPTION 'Every purchase row must belong to the purchase''s organization' USING ERRCODE = '42501';
  END IF;

  -- 1. Insert Header
  INSERT INTO public.purchases (
    organization_id,
    gig_id,
    row_type,
    purchase_date,
    vendor,
    total_inv_amount,
    payment_method,
    description,
    category,
    sub_category,
    created_by,
    updated_by
  ) VALUES (
    (p_header->>'organization_id')::uuid,
    (p_header->>'gig_id')::uuid,
    'header',
    (p_header->>'purchase_date')::date,
    p_header->>'vendor',
    (p_header->>'total_inv_amount')::numeric,
    p_header->>'payment_method',
    p_header->>'description',
    p_header->>'category',
    p_header->>'sub_category',
    auth.uid(),
    auth.uid()
  ) RETURNING id INTO v_header_id;

  -- 2. Insert ALL items into purchases (both expenses and assets)
  v_asset_purchase_ids := '{}';
  FOREACH v_item IN ARRAY p_items LOOP
    v_row_type := COALESCE(v_item->>'row_type', 'item');

    INSERT INTO public.purchases (
      organization_id,
      parent_id,
      row_type,
      purchase_date,
      vendor,
      line_amount,
      line_cost,
      quantity,
      item_price,
      item_cost,
      description,
      category,
      sub_category,
      created_by,
      updated_by
    ) VALUES (
      (v_item->>'organization_id')::uuid,
      v_header_id,
      v_row_type,
      (v_item->>'purchase_date')::date,
      v_item->>'vendor',
      (v_item->>'line_amount')::numeric,
      (v_item->>'line_cost')::numeric,
      (v_item->>'quantity')::numeric,
      (v_item->>'item_price')::numeric,
      (v_item->>'item_cost')::numeric,
      v_item->>'description',
      v_item->>'category',
      v_item->>'sub_category',
      auth.uid(),
      auth.uid()
    ) RETURNING id INTO v_purchase_row_id;

    IF v_row_type = 'asset' THEN
      v_asset_purchase_ids := v_asset_purchase_ids || v_purchase_row_id;
    END IF;
  END LOOP;

  -- 3. Insert assets into assets table and link back to their purchase rows
  v_idx := 1;
  FOREACH v_asset IN ARRAY p_assets LOOP
    INSERT INTO public.assets (
      organization_id,
      purchase_id,
      acquisition_date,
      vendor,
      item_price,
      item_cost,
      category,
      sub_category,
      manufacturer_model,
      type,
      serial_number,
      description,
      replacement_value,
      quantity,
      tag_number,
      status,
      retired_on,
      service_life,
      dep_method,
      liquidation_amt,
      insurance_policy_added,
      insurance_class,
      created_by,
      updated_by
    ) VALUES (
      (v_asset->>'organization_id')::uuid,
      v_header_id,
      (v_asset->>'acquisition_date')::date,
      v_asset->>'vendor',
      (v_asset->>'item_price')::numeric,
      (v_asset->>'item_cost')::numeric,
      v_asset->>'category',
      v_asset->>'sub_category',
      v_asset->>'manufacturer_model',
      v_asset->>'type',
      v_asset->>'serial_number',
      v_asset->>'description',
      (v_asset->>'replacement_value')::numeric,
      (v_asset->>'quantity')::numeric,
      v_asset->>'tag_number',
      v_asset->>'status',
      (v_asset->>'retired_on')::date,
      (v_asset->>'service_life')::numeric,
      v_asset->>'dep_method',
      (v_asset->>'liquidation_amt')::numeric,
      (v_asset->>'insurance_policy_added')::boolean,
      v_asset->>'insurance_class',
      auth.uid(),
      auth.uid()
    ) RETURNING id INTO v_asset_id;

    IF v_idx <= array_length(v_asset_purchase_ids, 1) THEN
      UPDATE public.purchases
        SET asset_id = v_asset_id
        WHERE id = v_asset_purchase_ids[v_idx];
    END IF;
    v_idx := v_idx + 1;
  END LOOP;

  SELECT jsonb_build_object('id', v_header_id) INTO v_result;
  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reclassify_expense_as_asset(p_purchase_item_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_item public.purchases%ROWTYPE;
  v_header public.purchases%ROWTYPE;
  v_asset_id uuid;
BEGIN
  SELECT * INTO v_item
    FROM public.purchases
    WHERE id = p_purchase_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase item not found: %', p_purchase_item_id;
  END IF;

  IF v_item.row_type != 'item' THEN
    RAISE EXCEPTION 'Purchase item % has row_type %, expected ''item''', p_purchase_item_id, v_item.row_type;
  END IF;

  SELECT * INTO v_header
    FROM public.purchases
    WHERE id = v_item.parent_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase header not found for item: %', p_purchase_item_id;
  END IF;

  IF NOT public.user_is_admin_or_manager_of_org(v_header.organization_id, auth.uid()) THEN
    RAISE EXCEPTION 'Permission denied: Only Admins and Managers of this organization can reclassify purchases' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.assets (
    organization_id,
    purchase_id,
    manufacturer_model,
    acquisition_date,
    vendor,
    category,
    sub_category,
    quantity,
    item_price,
    item_cost,
    status,
    created_by,
    updated_by
  ) VALUES (
    v_item.organization_id,
    v_header.id,
    v_item.description,
    v_item.purchase_date,
    v_item.vendor,
    v_item.category,
    v_item.sub_category,
    v_item.quantity,
    v_item.item_price,
    v_item.item_cost,
    'Active',
    auth.uid(),
    auth.uid()
  ) RETURNING id INTO v_asset_id;

  UPDATE public.purchases
    SET row_type = 'asset',
        asset_id = v_asset_id,
        updated_by = auth.uid()
    WHERE id = p_purchase_item_id;

  IF v_header.gig_id IS NOT NULL THEN
    DELETE FROM public.gig_financials
      WHERE purchase_id = v_header.id;
  END IF;

  RETURN jsonb_build_object('asset_id', v_asset_id);
END;
$function$;

ALTER FUNCTION public.create_purchase_transaction_v1(jsonb, jsonb[], jsonb[]) SET search_path TO 'public';
ALTER FUNCTION public.reclassify_expense_as_asset(uuid) SET search_path TO 'public';

-- 5. Membership guard ------------------------------------------------------------
-- SECURITY INVOKER on purpose: current_user tells a direct write
-- ('authenticated') from one made inside our SECURITY DEFINER functions.
CREATE OR REPLACE FUNCTION public.guard_organization_membership() RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_org uuid;
  v_target uuid;
  v_actor_role public.user_role;
  v_ok boolean := false;
BEGIN
  -- The server (service role) and maintenance carry no signed-in user.
  IF v_actor IS NULL OR auth.role() = 'service_role' THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
      RAISE EXCEPTION 'Permission denied: a membership cannot move to another organization' USING ERRCODE = '42501';
    END IF;
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      -- Only the key change cascaded from claiming your own invitation.
      IF NEW.user_id = v_actor AND NEW.role = OLD.role THEN RETURN NEW; END IF;
      RAISE EXCEPTION 'Permission denied: a membership cannot move to another person' USING ERRCODE = '42501';
    END IF;
  END IF;

  v_org := CASE WHEN TG_OP = 'DELETE' THEN OLD.organization_id ELSE NEW.organization_id END;
  v_target := CASE WHEN TG_OP = 'DELETE' THEN OLD.user_id ELSE NEW.user_id END;
  v_actor_role := public.member_role_in_org(v_org, v_actor);

  IF v_actor_role = 'Admin' THEN
    v_ok := true;
  ELSIF v_actor_role = 'Manager' THEN
    v_ok := (TG_OP = 'INSERT' OR OLD.role <> 'Admin') AND (TG_OP = 'DELETE' OR NEW.role <> 'Admin');
  END IF;

  -- Joining an org yourself as a Viewer (directly, not through a function), and leaving one.
  IF NOT v_ok AND TG_OP = 'INSERT' AND v_target = v_actor AND NEW.role = 'Viewer' AND current_user = 'authenticated' THEN
    v_ok := true;
  END IF;
  IF NOT v_ok AND TG_OP = 'DELETE' AND v_target = v_actor THEN
    v_ok := true;
  END IF;

  IF NOT v_ok AND public.user_can_manage_org_contacts(v_org, v_actor) THEN
    IF TG_OP = 'UPDATE' THEN
      -- Primary-contact and title changes; never a role change.
      v_ok := NEW.role = OLD.role;
    ELSE
      -- Someone else's no-login contacts, as Viewers, never themselves.
      v_ok := v_target <> v_actor
        AND public.user_is_contact_status(v_target)
        AND (TG_OP = 'DELETE' OR NEW.role = 'Viewer');
    END IF;
  END IF;

  IF NOT v_ok THEN
    RAISE EXCEPTION 'Permission denied: you can''t make this change to the organization''s members' USING ERRCODE = '42501';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS guard_organization_membership ON public.organization_members;
CREATE TRIGGER guard_organization_membership
  BEFORE INSERT OR UPDATE OR DELETE ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.guard_organization_membership();

-- 6. User profile guard ----------------------------------------------------------
-- SECURITY INVOKER for the same reason as above.
CREATE OR REPLACE FUNCTION public.guard_user_profile() RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.role() = 'service_role' THEN RETURN NEW; END IF;

  IF current_user IN ('authenticated', 'anon') THEN
    -- A direct write: only your own profile's ordinary fields.
    IF TG_OP = 'INSERT' THEN
      IF NEW.platform_moderator OR NEW.user_status IS DISTINCT FROM 'active'
         OR lower(NEW.email) IS DISTINCT FROM lower(public.signed_in_email()) THEN
        RAISE EXCEPTION 'Permission denied: a new profile must be your own, with your sign-in email' USING ERRCODE = '42501';
      END IF;
    ELSIF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.email IS DISTINCT FROM OLD.email
       OR NEW.user_status IS DISTINCT FROM OLD.user_status
       OR NEW.platform_moderator IS DISTINCT FROM OLD.platform_moderator THEN
      RAISE EXCEPTION 'Permission denied: email, status and platform roles are changed by the server' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  -- Through one of our functions: editing someone else's profile takes either
  -- a no-login contact (the function has checked the caller may manage it) or
  -- an Admin or Manager of an organization that person belongs to.
  IF TG_OP = 'UPDATE' AND OLD.id <> auth.uid() AND NEW.id <> auth.uid()
     AND OLD.user_status <> 'contact' AND NOT public.user_manages_person(auth.uid(), OLD.id) THEN
    RAISE EXCEPTION 'Permission denied: you can''t edit this person' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_user_profile ON public.users;
CREATE TRIGGER guard_user_profile
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.guard_user_profile();


-- 7. None of these work without signing in -----------------------------------


REVOKE EXECUTE ON FUNCTION public.invite_user_to_organization(uuid,text,text,text,text,uuid) FROM PUBLIC, anon;

REVOKE EXECUTE ON FUNCTION public.add_organization_contact(uuid,text,text,text,text,text,boolean,uuid) FROM PUBLIC, anon;

REVOKE EXECUTE ON FUNCTION public.set_organization_primary_contact(uuid,uuid) FROM PUBLIC, anon;

REVOKE EXECUTE ON FUNCTION public.update_organization_contact(uuid,text,text,text,text,uuid) FROM PUBLIC, anon;

REVOKE EXECUTE ON FUNCTION public.remove_organization_contact(uuid,uuid) FROM PUBLIC, anon;

REVOKE EXECUTE ON FUNCTION public.unset_organization_primary_contact(uuid,uuid) FROM PUBLIC, anon;

REVOKE EXECUTE ON FUNCTION public.add_organization_contact(uuid,text,text,text,text,text,boolean,uuid,public.user_role) FROM PUBLIC, anon;

REVOKE EXECUTE ON FUNCTION public.link_existing_person_to_organization(uuid,uuid,public.user_role,text,boolean,uuid) FROM PUBLIC, anon;

REVOKE EXECUTE ON FUNCTION public.create_contact_person(text,text,text,text,uuid) FROM PUBLIC, anon;

REVOKE EXECUTE ON FUNCTION public.add_gig_participant_contact(uuid,uuid,uuid,boolean,text,uuid) FROM PUBLIC, anon;

REVOKE EXECUTE ON FUNCTION public.set_gig_participant_contact_primary(uuid,uuid,uuid,boolean,uuid) FROM PUBLIC, anon;

REVOKE EXECUTE ON FUNCTION public.remove_gig_participant_contact(uuid,uuid,uuid,uuid) FROM PUBLIC, anon;

REVOKE EXECUTE ON FUNCTION public.convert_pending_user_to_active(text,uuid) FROM PUBLIC, anon;

REVOKE EXECUTE ON FUNCTION public.create_purchase_transaction_v1(jsonb,jsonb[],jsonb[]) FROM PUBLIC, anon;

REVOKE EXECUTE ON FUNCTION public.reclassify_expense_as_asset(uuid) FROM PUBLIC, anon;

REVOKE EXECUTE ON FUNCTION public.acting_user(uuid) FROM PUBLIC, anon;

REVOKE EXECUTE ON FUNCTION public.member_role_in_org(uuid,uuid) FROM PUBLIC, anon;

REVOKE EXECUTE ON FUNCTION public.user_manages_person(uuid,uuid) FROM PUBLIC, anon;

REVOKE EXECUTE ON FUNCTION public.signed_in_email() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.acting_user(uuid), public.member_role_in_org(uuid, uuid), public.user_manages_person(uuid, uuid), public.signed_in_email() TO authenticated, service_role;
