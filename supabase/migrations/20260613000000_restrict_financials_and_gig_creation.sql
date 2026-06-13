-- Smoke-test security remediation (June 2026)
--
-- Two pre-existing authorization gaps surfaced during Phase 6 smoke testing,
-- both letting a Viewer/Staff do things the documented role model forbids:
--
--   1. Gig creation. The frontend creates gigs via create_gig_complex, a
--      SECURITY DEFINER RPC that bypassed RLS and only checked that the caller
--      was authenticated — so any member (incl. Viewer) could create a gig.
--      The fix lives INSIDE the function (RLS can't gate it). The permissive
--      gigs INSERT policy is also dropped as defense-in-depth: all legitimate
--      creation goes through the RPC (which bypasses RLS), so the authenticated
--      role has no need to insert gigs directly.
--
--   2. Financials reads. The `purchases` table (the org Financials screen) had
--      a SELECT policy open to ANY org member, contradicting the model
--      ("Staff/Viewer can view participating gigs EXCEPT Financials"). Restrict
--      reads to Admin/Manager, matching gig_financials.
--
-- NOTE: RLS/SECURITY DEFINER behavior is not unit-testable in the Vitest
-- harness; verification is the manual cross-role check enumerated to the user.

-- 1a. Gig creation authorization — require a primary org and Admin/Manager of it.
CREATE OR REPLACE FUNCTION "public"."create_gig_complex"("p_gig_data" "jsonb", "p_participants" "jsonb" DEFAULT '[]'::"jsonb", "p_staff_slots" "jsonb" DEFAULT '[]'::"jsonb") RETURNS TABLE("id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_gig_id UUID;
  v_user_id UUID;
  v_participant JSONB;
  v_slot JSONB;
  v_role_id UUID;
  v_primary_org_id UUID;
BEGIN
  -- Get current user ID
  SELECT auth.uid() INTO v_user_id;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Authorization: only Admins/Managers of a required primary organization may
  -- create gigs. (This RPC is SECURITY DEFINER and bypasses RLS, so the check
  -- must live here.)
  v_primary_org_id := (p_gig_data->>'primary_organization_id')::UUID;
  IF v_primary_org_id IS NULL THEN
    RAISE EXCEPTION 'primary_organization_id is required to create a gig';
  END IF;
  IF NOT public.user_is_admin_or_manager_of_org(v_primary_org_id, v_user_id) THEN
    RAISE EXCEPTION 'Insufficient permissions: only Admins and Managers can create gigs';
  END IF;

  -- Insert Gig with only authorized columns
  INSERT INTO gigs (
    title,
    start,
    "end",
    timezone,
    status,
    notes,
    tags,
    parent_gig_id,
    hierarchy_depth,
    created_by,
    updated_by
  ) VALUES (
    p_gig_data->>'title',
    (p_gig_data->>'start')::TIMESTAMPTZ,
    (p_gig_data->>'end')::TIMESTAMPTZ,
    COALESCE(p_gig_data->>'timezone', 'UTC'),
    COALESCE(p_gig_data->>'status', 'DateHold')::gig_status,
    p_gig_data->>'notes',
    COALESCE((SELECT array_agg(x) FROM jsonb_array_elements_text(p_gig_data->'tags') x), ARRAY[]::TEXT[]),
    (p_gig_data->>'parent_gig_id')::UUID,
    COALESCE((p_gig_data->>'hierarchy_depth')::INTEGER, 0),
    v_user_id,
    v_user_id
  ) RETURNING gigs.id INTO v_gig_id;

  -- Insert Participants with proper role casting
  FOR v_participant IN SELECT * FROM jsonb_array_elements(p_participants) LOOP
    INSERT INTO gig_participants (gig_id, organization_id, role, notes)
    VALUES (
      v_gig_id,
      (v_participant->>'organization_id')::UUID,
      (v_participant->>'role')::organization_role,
      v_participant->>'notes'
    );
  END LOOP;

  -- Insert Staff Slots and Assignments
  FOR v_slot IN SELECT * FROM jsonb_array_elements(p_staff_slots) LOOP
    -- Handle Staff Role (Insert if not exists)
    INSERT INTO staff_roles (name)
    VALUES (v_slot->>'role')
    ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
    RETURNING staff_roles.id INTO v_role_id;

    INSERT INTO gig_staff_slots (gig_id, organization_id, staff_role_id, required_count, notes)
    VALUES (
      v_gig_id,
      (v_slot->>'organization_id')::UUID,
      v_role_id,
      COALESCE((v_slot->>'required_count')::INTEGER, 1),
      v_slot->>'notes'
    );
  END LOOP;

  RETURN QUERY SELECT v_gig_id;
END;
$$;

-- 1b. Defense-in-depth: drop the permissive direct-insert policy. With no
-- INSERT policy, the authenticated role cannot insert gigs directly; legitimate
-- creation goes through create_gig_complex (SECURITY DEFINER, bypasses RLS).
DROP POLICY IF EXISTS "Authenticated users can create gigs" ON "public"."gigs";

-- 2. Restrict org-level purchase (Financials) reads to Admin/Manager. The
-- "Admins and Managers can manage purchases" FOR ALL policy already covers
-- their SELECT; dropping the member-level policy removes Viewer/Staff read.
DROP POLICY IF EXISTS "Users can view their organization's purchases" ON "public"."purchases";
