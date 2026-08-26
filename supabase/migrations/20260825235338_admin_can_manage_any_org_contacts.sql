-- Phase 1 follow-up 2: the "shares a gig" check in user_can_manage_org_contacts
-- turned out narrower than the app's existing convention for cross-org
-- edits. "Edit Organization" (GigParticipantsSection's More actions menu)
-- has always let any org's Admin edit ANY other organization's details —
-- gated only by user_is_admin(uid), which despite the name just means
-- "Admin of at least one org," not global-admin — with a passive warning
-- banner, no hard block. Extending contact management to require sharing a
-- specific gig was stricter than that pre-existing convention and produced
-- a real "Permission denied" for a legitimate Admin. Align the two: an
-- Admin of any org can also manage any org's contacts.
CREATE OR REPLACE FUNCTION public.user_can_manage_org_contacts(p_organization_id uuid, p_user_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.user_is_admin(p_user_id)
  OR EXISTS (
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

-- Clicking an already-primary contact's star should un-star it (no
-- replacement primary) — the original design only ever let you set a NEW
-- primary, never clear it back to "no primary contact."
CREATE OR REPLACE FUNCTION public.unset_organization_primary_contact(
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

  UPDATE public.organization_members SET is_primary_contact = false WHERE id = p_member_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.unset_organization_primary_contact(uuid, uuid) TO authenticated;
