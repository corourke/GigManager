-- Phase 1 follow-up: the contact-management RPCs from
-- 20260825180000_organizations_contacts_and_client_flag.sql only let a
-- caller manage contacts for an org they are themselves Admin/Manager of.
-- That blocks the primary real-world case — a production company jotting
-- down the venue's day-of contact — since they're almost never a member of
-- the venue's own organization. Broaden the check to also allow an
-- Admin/Manager of any org that shares a gig with the target org, mirroring
-- the read-side RLS policy already added for the same reason.

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
  );
$$;

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
$$;

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

  IF NOT public.user_can_manage_org_contacts(v_org_id, v_actor_id) THEN
    RAISE EXCEPTION 'Permission denied: Only Admins and Managers of this organization, or of a gig it participates in, can change the primary contact';
  END IF;

  UPDATE public.organization_members SET is_primary_contact = false
  WHERE organization_id = v_org_id AND is_primary_contact = true AND id != p_member_id;

  UPDATE public.organization_members SET is_primary_contact = true WHERE id = p_member_id;
END;
$$;

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

  IF NOT public.user_can_manage_org_contacts(v_org_id, v_actor_id) THEN
    RAISE EXCEPTION 'Permission denied: Only Admins and Managers of this organization, or of a gig it participates in, can edit contacts';
  END IF;

  UPDATE public.organization_members SET contact_title = p_title WHERE id = p_member_id;
  UPDATE public.users SET first_name = p_first_name, last_name = p_last_name, phone = p_phone WHERE id = v_user_id;
END;
$$;

-- Removing a contact previously went through removeMember -> the Edge
-- Function's DELETE /organizations/:id/members/:memberId route, which is
-- guarded by requireOrgRole({ roles: ['Admin','Manager'] }) against the
-- TARGET org specifically (supabase/functions/server/routes/organizations.ts)
-- — the exact same "not a member of the target org" gap this migration
-- exists to fix, just in a different runtime. Give it its own RPC using the
-- same broadened check instead of routing through that Edge Function.
CREATE OR REPLACE FUNCTION public.remove_organization_contact(
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

  IF NOT public.user_can_manage_org_contacts(v_org_id, v_actor_id) THEN
    RAISE EXCEPTION 'Permission denied: Only Admins and Managers of this organization, or of a gig it participates in, can remove contacts';
  END IF;

  DELETE FROM public.organization_members WHERE id = p_member_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_can_manage_org_contacts(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_organization_contact(uuid, text, text, text, text, text, boolean, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_organization_primary_contact(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_organization_contact(uuid, text, text, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_organization_contact(uuid, uuid) TO authenticated;
