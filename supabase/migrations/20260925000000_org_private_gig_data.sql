-- #61: make org-owned gig data private to the owning organization.
--
-- GigWrangler stays on one shared, hosted database (decision 2026-09-25, see
-- docs/technical/tenant-isolation-architecture.md), so RLS is the tenant
-- boundary. Several orgs can take part in one gig. The gig itself, its
-- participants and its schedule are shared, but each org's staffing, kit
-- assignments, scan records and their history entries belong to that org
-- alone. Until now these tables were scoped by gig only, so every
-- participating org could read, and its Admins/Managers could change, every
-- other participating org's rows, including what they pay their crew.
--
-- Pattern (same as assets/kits and the gig_financials fix in 20260912000000):
--   read  → member of the row's organization_id
--   write → Admin/Manager of the row's organization_id, and that org must be
--           a participant in the gig (so rows can't be planted on other gigs)
-- Exceptions, each deliberate:
--   * a person booked into another org's staff slot can read that slot and
--     their own assignment, and can confirm/decline it (status, confirmed_at
--     only; enforced by a trigger because RLS can't compare old and new rows)
--   * inventory_tracking stays writable by any member of the owning org,
--     since crew scan kit in and out on mobile
--   * activity_log: gig/participant/schedule events stay visible to every
--     participant; staffing and kit events only to the owning org; financial
--     events only to its Admins/Managers
--
-- Tested by supabase/tests/rls/61_org_private_gig_data.test.sql.

-- ─── Helpers ────────────────────────────────────────────────────────────────
-- SECURITY DEFINER so slot and assignment policies can look at each other
-- without recursing through each other's RLS.

CREATE OR REPLACE FUNCTION public.org_participates_in_gig(p_org_id uuid, p_gig_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM gig_participants WHERE organization_id = p_org_id AND gig_id = p_gig_id)
$$;

CREATE OR REPLACE FUNCTION public.gig_staff_slot_org_id(p_slot_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT organization_id FROM gig_staff_slots WHERE id = p_slot_id
$$;

CREATE OR REPLACE FUNCTION public.user_is_assigned_to_staff_slot(p_slot_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM gig_staff_assignments WHERE slot_id = p_slot_id AND user_id = p_user_id)
$$;

-- ─── gig_staff_slots ────────────────────────────────────────────────────────
-- Every slot needs one owning org. The app always sets it; older or
-- duplicated rows might not. Give any such row to the gig creator's
-- participating org, else the gig's only participant; if neither settles it,
-- stop rather than guess (prod had no NULLs when checked on 2026-09-02).
UPDATE gig_staff_slots s
SET organization_id = COALESCE(
  (SELECT min(om.organization_id::text)::uuid
     FROM gigs g
     JOIN organization_members om ON om.user_id = g.created_by
     JOIN gig_participants gp ON gp.gig_id = g.id AND gp.organization_id = om.organization_id
    WHERE g.id = s.gig_id),
  (SELECT min(gp.organization_id::text)::uuid FROM gig_participants gp
    WHERE gp.gig_id = s.gig_id HAVING count(*) = 1)
)
WHERE s.organization_id IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM gig_staff_slots WHERE organization_id IS NULL) THEN
    RAISE EXCEPTION 'gig_staff_slots has rows with no organization_id that could not be assigned an owner; fix them by hand, then re-run';
  END IF;
END $$;

ALTER TABLE gig_staff_slots ALTER COLUMN organization_id SET NOT NULL;

DROP POLICY IF EXISTS "Users can view staff slots for accessible gigs" ON gig_staff_slots;
DROP POLICY IF EXISTS "Admins and Managers can manage gig staff slots" ON gig_staff_slots;

CREATE POLICY "Org members and assignees can view staff slots" ON gig_staff_slots
  FOR SELECT USING (
    user_is_member_of_org(organization_id, auth.uid())
    OR user_is_assigned_to_staff_slot(id, auth.uid())
  );

CREATE POLICY "Org Admins and Managers can manage their staff slots" ON gig_staff_slots
  FOR ALL
  USING (user_is_admin_or_manager_of_org(organization_id, auth.uid()))
  WITH CHECK (
    user_is_admin_or_manager_of_org(organization_id, auth.uid())
    AND org_participates_in_gig(organization_id, gig_id)
  );

-- ─── gig_staff_assignments ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view assignments for accessible gigs" ON gig_staff_assignments;
DROP POLICY IF EXISTS "Admins and Managers can manage all assignments for accessible g" -- name as stored (63-char limit) ON gig_staff_assignments;
DROP POLICY IF EXISTS "Staff can update their own assignments" ON gig_staff_assignments;

CREATE POLICY "Slot org members and the assignee can view assignments" ON gig_staff_assignments
  FOR SELECT USING (
    user_id = auth.uid()
    OR user_is_member_of_org(gig_staff_slot_org_id(slot_id), auth.uid())
  );

CREATE POLICY "Slot org Admins and Managers can manage assignments" ON gig_staff_assignments
  FOR ALL
  USING (user_is_admin_or_manager_of_org(gig_staff_slot_org_id(slot_id), auth.uid()))
  WITH CHECK (user_is_admin_or_manager_of_org(gig_staff_slot_org_id(slot_id), auth.uid()));

CREATE POLICY "Assignees can respond to their own assignment" ON gig_staff_assignments
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- The policy above lets an assignee update their row; this trigger limits
-- what they can change to accepting/declining. The earlier WITH CHECK meant
-- to do this (20260319213000) compared each column with itself, so it never
-- restricted anything. Service-role and SECURITY DEFINER callers with no
-- auth.uid() are not restricted.
CREATE OR REPLACE FUNCTION public.restrict_assignee_self_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL
     OR user_is_admin_or_manager_of_org(gig_staff_slot_org_id(OLD.slot_id), auth.uid()) THEN
    RETURN NEW;
  END IF;
  IF (NEW.id, NEW.slot_id, NEW.user_id, NEW.rate, NEW.fee, NEW.notes, NEW.assigned_at,
      NEW.completed_at, NEW.units_completed, NEW.gig_financial_id)
     IS DISTINCT FROM
     (OLD.id, OLD.slot_id, OLD.user_id, OLD.rate, OLD.fee, OLD.notes, OLD.assigned_at,
      OLD.completed_at, OLD.units_completed, OLD.gig_financial_id) THEN
    RAISE EXCEPTION 'Staff can only confirm or decline their own assignment'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS restrict_assignee_self_update ON gig_staff_assignments;
CREATE TRIGGER restrict_assignee_self_update
  BEFORE UPDATE ON gig_staff_assignments
  FOR EACH ROW EXECUTE FUNCTION restrict_assignee_self_update();

-- ─── gig_kit_assignments ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view kit assignments for accessible gigs" ON gig_kit_assignments;
DROP POLICY IF EXISTS "Admins and Managers can manage kit assignments" ON gig_kit_assignments;

CREATE POLICY "Org members can view their kit assignments" ON gig_kit_assignments
  FOR SELECT USING (user_is_member_of_org(organization_id, auth.uid()));

CREATE POLICY "Org Admins and Managers can manage their kit assignments" ON gig_kit_assignments
  FOR ALL
  USING (user_is_admin_or_manager_of_org(organization_id, auth.uid()))
  WITH CHECK (
    user_is_admin_or_manager_of_org(organization_id, auth.uid())
    AND org_participates_in_gig(organization_id, gig_id)
  );

-- ─── inventory_tracking ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users with gig access can manage inventory tracking" ON inventory_tracking;

CREATE POLICY "Org members can manage their inventory tracking" ON inventory_tracking
  FOR ALL
  USING (user_is_member_of_org(organization_id, auth.uid()))
  WITH CHECK (
    user_is_member_of_org(organization_id, auth.uid())
    AND org_participates_in_gig(organization_id, gig_id)
  );

-- ─── activity_log ───────────────────────────────────────────────────────────
-- Entity types describing the shared gig itself; everything else logged
-- against a gig belongs to the org in organization_id.
CREATE OR REPLACE FUNCTION public.activity_entity_is_shared(p_entity_type text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT p_entity_type IN ('gig', 'participant', 'schedule_entry')
$$;

DROP POLICY IF EXISTS "activity_log_select_gig_scoped" ON activity_log;
CREATE POLICY "activity_log_select_gig_scoped" ON activity_log
  FOR SELECT USING (
    gig_id IS NOT NULL
    AND user_has_access_to_gig(gig_id, auth.uid())
    AND (
      activity_entity_is_shared(entity_type)
      OR (entity_type = 'financial' AND user_is_admin_or_manager_of_org(organization_id, auth.uid()))
      OR (entity_type <> 'financial' AND user_is_member_of_org(organization_id, auth.uid()))
    )
  );
-- activity_log_select_org_scoped (gig_id IS NULL → member of organization_id) is unchanged.

CREATE OR REPLACE FUNCTION public.log_activity(
  p_organization_id uuid, p_event_type text, p_entity_type text,
  p_entity_id uuid, p_gig_id uuid, p_context jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_gig_id IS NOT NULL AND NOT user_has_access_to_gig(p_gig_id, v_actor_id) THEN
    RAISE EXCEPTION 'Access denied to gig';
  END IF;

  -- An entry can only be attributed to an org the actor belongs to.
  IF p_organization_id IS NOT NULL AND NOT user_is_member_of_org(p_organization_id, v_actor_id) THEN
    RAISE EXCEPTION 'Access denied to organization';
  END IF;

  -- Org-private events on a gig must say which org they belong to, or no one could read them.
  IF p_gig_id IS NOT NULL AND p_organization_id IS NULL AND NOT activity_entity_is_shared(p_entity_type) THEN
    RAISE EXCEPTION 'organization_id is required for % activity', p_entity_type;
  END IF;

  INSERT INTO activity_log (organization_id, actor_id, event_type, entity_type, entity_id, gig_id, context)
  VALUES (p_organization_id, v_actor_id, p_event_type, p_entity_type, p_entity_id, p_gig_id, p_context)
  RETURNING id INTO v_id;

  RETURN v_id;
END $$;

-- ─── create_gig_complex ─────────────────────────────────────────────────────
-- SECURITY DEFINER, so RLS doesn't stop it creating a staff slot for any
-- org. Slots default to the primary org, and the caller must be an
-- Admin/Manager of whichever org owns each slot. Otherwise unchanged from
-- 20260613000000.
CREATE OR REPLACE FUNCTION public.create_gig_complex(
  p_gig_data jsonb, p_participants jsonb DEFAULT '[]'::jsonb, p_staff_slots jsonb DEFAULT '[]'::jsonb
) RETURNS TABLE(id uuid)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_gig_id UUID;
  v_user_id UUID;
  v_participant JSONB;
  v_slot JSONB;
  v_role_id UUID;
  v_primary_org_id UUID;
  v_slot_org_id UUID;
BEGIN
  SELECT auth.uid() INTO v_user_id;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  v_primary_org_id := (p_gig_data->>'primary_organization_id')::UUID;
  IF v_primary_org_id IS NULL THEN
    RAISE EXCEPTION 'primary_organization_id is required to create a gig';
  END IF;
  IF NOT public.user_is_admin_or_manager_of_org(v_primary_org_id, v_user_id) THEN
    RAISE EXCEPTION 'Insufficient permissions: only Admins and Managers can create gigs';
  END IF;

  INSERT INTO gigs (title, start, "end", timezone, status, notes, tags, parent_gig_id, hierarchy_depth, created_by, updated_by)
  VALUES (
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

  FOR v_participant IN SELECT * FROM jsonb_array_elements(p_participants) LOOP
    INSERT INTO gig_participants (gig_id, organization_id, role, notes)
    VALUES (v_gig_id, (v_participant->>'organization_id')::UUID,
            (v_participant->>'role')::organization_role, v_participant->>'notes');
  END LOOP;

  FOR v_slot IN SELECT * FROM jsonb_array_elements(p_staff_slots) LOOP
    v_slot_org_id := COALESCE((v_slot->>'organization_id')::UUID, v_primary_org_id);
    IF NOT public.user_is_admin_or_manager_of_org(v_slot_org_id, v_user_id) THEN
      RAISE EXCEPTION 'Insufficient permissions: staff slots can only be created for your own organization';
    END IF;

    INSERT INTO staff_roles (name)
    VALUES (v_slot->>'role')
    ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
    RETURNING staff_roles.id INTO v_role_id;

    INSERT INTO gig_staff_slots (gig_id, organization_id, staff_role_id, required_count, notes)
    VALUES (v_gig_id, v_slot_org_id, v_role_id,
            COALESCE((v_slot->>'required_count')::INTEGER, 1), v_slot->>'notes');
  END LOOP;

  RETURN QUERY SELECT v_gig_id;
END;
$$;
