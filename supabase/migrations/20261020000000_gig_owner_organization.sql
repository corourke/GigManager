-- #175: every gig has an owner organization (plan approved by Cameron 10-08; answers 10-12).
--
--   * gigs.owner_organization_id: the organization the gig was created in. Existing gigs are
--     backfilled; the migration fails if any gig can't be resolved. A child gig always has its
--     parent's owner. An organization that owns gigs can't be deleted (ON DELETE RESTRICT).
--   * gig_participants.inactive: a participation can be marked Inactive. Its role is kept, and
--     the organization keeps managing its own staffing, financials and kits on the gig, but it is
--     read-only on the gig's shared details (title, times, timezone, notes, tags) until it's
--     reactivated. The owner is never Inactive.
--   * Delete: only an Admin of the owner, and only when no other claimed organization is on the
--     gig (Inactive ones count) and the gig has no child gigs. Otherwise the owner cancels it.
--   * Status, owner and parent gig: the owner's Admins and Managers only. A new owner must be an
--     active participant.
--   * Removing an organization from a gig: by the owner's Admins and Managers, or the
--     organization's own; an unclaimed record (a venue or act nobody has claimed) by any active
--     participant's Admin or Manager. When it's the organization's last role on the gig, it must
--     have no financials, kit assignments or staff slots there, and its scans and contacts for the
--     gig are deleted and its purchases unlinked. The owner's participation can't be removed.
--   * Marking Inactive or reactivating: the owner's Admins and Managers, or the organization's own.
--   * An Inactive organization is also read-only on the gig's schedule and on other
--     organizations' contacts for the gig (Cameron, 10-12).
--   * create_gig_complex stores the owner and requires it among the participants.
--
-- Tested by supabase/tests/rls/62_gig_owner.test.sql and supabase/tests/conversion/20261020000000.*.

-- ── Columns ─────────────────────────────────────────────────────────────────
ALTER TABLE public.gigs
  ADD COLUMN owner_organization_id uuid REFERENCES public.organizations(id) ON DELETE RESTRICT;
ALTER TABLE public.gig_participants
  ADD COLUMN inactive boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.gigs.owner_organization_id IS
  'The organization the gig was created in (#175). Only its Admins delete the gig; only its Admins and Managers change status, owner and parent gig. A child gig has its parent''s owner.';
COMMENT ON COLUMN public.gig_participants.inactive IS
  'Inactive participation (#175): role kept; the organization still manages its own staffing, financials and kits, but is read-only on the gig''s shared details. Never true for the owner.';

-- ── Backfill ────────────────────────────────────────────────────────────────
-- Leave updated_at alone: this isn't an edit anyone made.
ALTER TABLE public.gigs DISABLE TRIGGER update_gigs_updated_at;

-- In order: the organization on the gig's "gig.created" activity entry, when it's a participant;
-- else the one participant the creator is an Admin or Manager of; else the one participant the
-- creator belongs to; else the only participant.
UPDATE public.gigs g SET owner_organization_id = COALESCE(
  (SELECT al.organization_id FROM public.activity_log al
     WHERE al.gig_id = g.id AND al.event_type = 'gig.created'
       AND EXISTS (SELECT 1 FROM public.gig_participants p WHERE p.gig_id = g.id AND p.organization_id = al.organization_id)
     ORDER BY al.occurred_at LIMIT 1),
  (SELECT min(p.organization_id::text)::uuid FROM public.gig_participants p
     JOIN public.organization_members om ON om.organization_id = p.organization_id AND om.user_id = g.created_by
     WHERE p.gig_id = g.id AND om.role IN ('Admin', 'Manager')
     HAVING count(DISTINCT p.organization_id) = 1),
  (SELECT min(p.organization_id::text)::uuid FROM public.gig_participants p
     JOIN public.organization_members om ON om.organization_id = p.organization_id AND om.user_id = g.created_by
     WHERE p.gig_id = g.id
     HAVING count(DISTINCT p.organization_id) = 1),
  (SELECT min(p.organization_id::text)::uuid FROM public.gig_participants p
     WHERE p.gig_id = g.id
     HAVING count(DISTINCT p.organization_id) = 1));

-- A child gig takes its top-level gig's owner.
WITH RECURSIVE tree AS (
  SELECT id, owner_organization_id AS root_owner FROM public.gigs WHERE parent_gig_id IS NULL
  UNION ALL
  SELECT c.id, t.root_owner FROM public.gigs c JOIN tree t ON c.parent_gig_id = t.id
)
UPDATE public.gigs g SET owner_organization_id = t.root_owner
FROM tree t WHERE t.id = g.id AND g.parent_gig_id IS NOT NULL;

ALTER TABLE public.gigs ENABLE TRIGGER update_gigs_updated_at;

-- Fail loudly rather than guess (Cameron, 10-12).
-- A child whose top-level gig's owner isn't on it fails here too.
DO $$
DECLARE v_unresolved text;
BEGIN
  SELECT string_agg(g.id::text, ', ' ORDER BY g.id) INTO v_unresolved FROM public.gigs g
  WHERE g.owner_organization_id IS NULL
     OR NOT EXISTS (SELECT 1 FROM public.gig_participants p WHERE p.gig_id = g.id AND p.organization_id = g.owner_organization_id);
  IF v_unresolved IS NOT NULL THEN
    RAISE EXCEPTION 'No owner organization on the gig could be resolved for gig(s): %', v_unresolved;
  END IF;
END $$;

ALTER TABLE public.gigs ALTER COLUMN owner_organization_id SET NOT NULL;
CREATE INDEX idx_gigs_owner_organization_id ON public.gigs (owner_organization_id);

-- ── Helpers ─────────────────────────────────────────────────────────────────
-- Like user_can_manage_gig, but through an active participation only. Inactive is per
-- organization: one of its roles on the gig marked Inactive makes it Inactive on the gig.
CREATE OR REPLACE FUNCTION public.user_can_manage_gig_active(p_gig_id uuid, p_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM gig_participants gp
    JOIN organization_members om ON om.organization_id = gp.organization_id
    WHERE gp.gig_id = p_gig_id
      AND om.user_id = p_user AND om.role IN ('Admin', 'Manager')
      AND NOT EXISTS (SELECT 1 FROM gig_participants x
                      WHERE x.gig_id = gp.gig_id AND x.organization_id = gp.organization_id AND x.inactive))
$$;

-- An Admin or Manager of the gig's owner organization.
CREATE OR REPLACE FUNCTION public.user_manages_gig_owner(p_gig_id uuid, p_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM gigs g
    JOIN organization_members om ON om.organization_id = g.owner_organization_id
    WHERE g.id = p_gig_id AND om.user_id = p_user AND om.role IN ('Admin', 'Manager'))
$$;

CREATE OR REPLACE FUNCTION public.org_is_claimed(p_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT claimed FROM organizations WHERE id = p_org_id), false)
$$;

-- Delete: an Admin of the owner; no child gigs; no other claimed organization on the gig.
CREATE OR REPLACE FUNCTION public.user_can_delete_gig(p_gig_id uuid, p_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM gigs g
    WHERE g.id = p_gig_id
      AND public.user_is_admin_of_org(g.owner_organization_id, p_user)
      AND NOT EXISTS (SELECT 1 FROM gigs c WHERE c.parent_gig_id = g.id)
      AND NOT EXISTS (
        SELECT 1 FROM gig_participants gp JOIN organizations o ON o.id = gp.organization_id
        WHERE gp.gig_id = g.id AND gp.organization_id <> g.owner_organization_id AND o.claimed))
$$;

-- Signed-in users only (as in 20260929000000).
REVOKE EXECUTE ON FUNCTION public.user_can_manage_gig_active(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_manages_gig_owner(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.org_is_claimed(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_can_delete_gig(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_can_manage_gig_active(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_manages_gig_owner(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.org_is_claimed(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_can_delete_gig(uuid, uuid) TO authenticated, service_role;

-- ── gigs ────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins of participating orgs can delete gigs" ON public.gigs;
CREATE POLICY "Owner Admins can delete gigs no other claimed organization is on" ON public.gigs
  FOR DELETE USING (public.user_can_delete_gig(id, auth.uid()));

DROP POLICY IF EXISTS "Admins and Managers of participating orgs can update gigs" ON public.gigs;
CREATE POLICY "Admins and Managers of active participants can update gigs" ON public.gigs
  FOR UPDATE USING (public.user_can_manage_gig_active(id, auth.uid()))
  WITH CHECK (public.user_can_manage_gig_active(id, auth.uid()));

-- A child gig has its parent's owner: a gig goes under a parent only if its owner owns the
-- parent, and a child's owner isn't set apart from its parent's. A new owner must be an active
-- participant. Status, owner and parent are the owner's Admins' and Managers' to change (signed-in
-- users; migrations aren't checked). SECURITY DEFINER so the parent is read whether or not the
-- user can see it.
CREATE OR REPLACE FUNCTION public.gigs_owner_rules()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_parent_owner uuid;
BEGIN
  IF NEW.parent_gig_id IS NOT NULL THEN
    SELECT owner_organization_id INTO v_parent_owner FROM gigs WHERE id = NEW.parent_gig_id;
    IF TG_OP = 'UPDATE' AND NEW.parent_gig_id IS DISTINCT FROM OLD.parent_gig_id
       AND v_parent_owner IS DISTINCT FROM OLD.owner_organization_id THEN
      RAISE EXCEPTION 'A gig can only go under a parent gig its owner organization owns.' USING ERRCODE = '42501';
    END IF;
    IF NEW.owner_organization_id IS NOT NULL AND NEW.owner_organization_id IS DISTINCT FROM v_parent_owner
       AND (TG_OP = 'INSERT' OR NEW.owner_organization_id IS DISTINCT FROM OLD.owner_organization_id) THEN
      RAISE EXCEPTION 'A child gig has its parent gig''s owner organization.' USING ERRCODE = '23514';
    END IF;
    NEW.owner_organization_id := v_parent_owner;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF auth.uid() IS NOT NULL
       AND (NEW.status, NEW.owner_organization_id, NEW.parent_gig_id, NEW.hierarchy_depth)
         IS DISTINCT FROM (OLD.status, OLD.owner_organization_id, OLD.parent_gig_id, OLD.hierarchy_depth)
       AND NOT public.user_is_admin_or_manager_of_org(OLD.owner_organization_id, auth.uid()) THEN
      RAISE EXCEPTION 'Only the owner organization''s Admins and Managers can change a gig''s status, owner or parent gig.'
        USING ERRCODE = '42501';
    END IF;
    IF NEW.owner_organization_id IS DISTINCT FROM OLD.owner_organization_id
       AND (NOT EXISTS (SELECT 1 FROM gig_participants p
                        WHERE p.gig_id = NEW.id AND p.organization_id = NEW.owner_organization_id)
            OR EXISTS (SELECT 1 FROM gig_participants p
                       WHERE p.gig_id = NEW.id AND p.organization_id = NEW.owner_organization_id AND p.inactive)) THEN
      RAISE EXCEPTION 'A gig''s owner must be one of its active participants.' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER gigs_a_owner_rules
  BEFORE INSERT OR UPDATE ON public.gigs
  FOR EACH ROW EXECUTE FUNCTION public.gigs_owner_rules();

-- A new owner on a parent passes down to its children.
CREATE OR REPLACE FUNCTION public.gigs_owner_to_children()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE gigs SET owner_organization_id = NEW.owner_organization_id
  WHERE parent_gig_id = NEW.id AND owner_organization_id IS DISTINCT FROM NEW.owner_organization_id;
  RETURN NULL;
END $$;

CREATE TRIGGER gigs_owner_to_children
  AFTER UPDATE OF owner_organization_id ON public.gigs
  FOR EACH ROW WHEN (OLD.owner_organization_id IS DISTINCT FROM NEW.owner_organization_id)
  EXECUTE FUNCTION public.gigs_owner_to_children();

-- ── gig_participants ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins and Managers can manage gig participants" ON public.gig_participants;

CREATE POLICY "Admins and Managers of active participants can add participants" ON public.gig_participants
  FOR INSERT WITH CHECK (public.user_can_manage_gig_active(gig_id, auth.uid()) AND NOT inactive);

CREATE POLICY "Participants and the organization itself can update a participation" ON public.gig_participants
  FOR UPDATE USING (public.user_can_manage_gig_active(gig_id, auth.uid())
                    OR public.user_is_admin_or_manager_of_org(organization_id, auth.uid()))
  WITH CHECK (public.user_can_manage_gig_active(gig_id, auth.uid())
              OR public.user_is_admin_or_manager_of_org(organization_id, auth.uid()));

CREATE POLICY "The owner, the organization itself, or anyone for an unclaimed record can remove a participation"
  ON public.gig_participants
  FOR DELETE USING (public.user_manages_gig_owner(gig_id, auth.uid())
                    OR public.user_is_admin_or_manager_of_org(organization_id, auth.uid())
                    OR (NOT public.org_is_claimed(organization_id) AND public.user_can_manage_gig_active(gig_id, auth.uid())));

-- Which gig and organization a participation is for never changes. Inactive: the owner's Admins
-- and Managers or the organization's own, and never the owner. Role, notes and client flag: an
-- active participant's Admins and Managers (an Inactive organization only toggles its flag).
CREATE OR REPLACE FUNCTION public.gig_participants_update_rules()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid;
BEGIN
  IF (NEW.gig_id, NEW.organization_id) IS DISTINCT FROM (OLD.gig_id, OLD.organization_id) THEN
    RAISE EXCEPTION 'A participation''s gig and organization can''t change; remove it and add another.'
      USING ERRCODE = '42501';
  END IF;
  SELECT owner_organization_id INTO v_owner FROM gigs WHERE id = NEW.gig_id;
  IF auth.uid() IS NOT NULL AND NEW.inactive IS DISTINCT FROM OLD.inactive
     AND NOT public.user_is_admin_or_manager_of_org(v_owner, auth.uid())
     AND NOT public.user_is_admin_or_manager_of_org(NEW.organization_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only the owner or the organization itself can mark it Inactive or reactivate it.' USING ERRCODE = '42501';
  END IF;
  IF NEW.inactive AND NEW.organization_id = v_owner THEN
    RAISE EXCEPTION 'The owner organization can''t be marked Inactive; cancel the gig instead.' USING ERRCODE = '23514';
  END IF;
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF (NEW.role, NEW.notes, NEW.is_client) IS DISTINCT FROM (OLD.role, OLD.notes, OLD.is_client)
     AND NOT public.user_can_manage_gig_active(NEW.gig_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only an active participant''s Admins and Managers can change a participation.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER gig_participants_update_rules
  BEFORE UPDATE ON public.gig_participants
  FOR EACH ROW EXECUTE FUNCTION public.gig_participants_update_rules();

-- When an organization's last participation on a gig goes: the owner's can't; one with
-- financials, kit assignments or staff slots on the gig can't (mark it Inactive instead);
-- otherwise its scans and contacts for the gig are deleted and its purchases unlinked. Rows
-- removed because the gig or the organization itself is being deleted are left alone.
-- After the statement's rows, so dropping one of two roles isn't leaving.
CREATE OR REPLACE FUNCTION public.gig_participants_after_remove()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid;
BEGIN
  SELECT owner_organization_id INTO v_owner FROM gigs WHERE id = OLD.gig_id;
  IF v_owner IS NULL OR NOT EXISTS (SELECT 1 FROM organizations WHERE id = OLD.organization_id)
     OR EXISTS (SELECT 1 FROM gig_participants WHERE gig_id = OLD.gig_id AND organization_id = OLD.organization_id) THEN
    RETURN NULL;
  END IF;
  IF OLD.organization_id = v_owner THEN
    RAISE EXCEPTION 'The owner organization can''t be removed from its gig.' USING ERRCODE = '23514';
  END IF;
  IF EXISTS (SELECT 1 FROM gig_financials WHERE gig_id = OLD.gig_id AND organization_id = OLD.organization_id)
     OR EXISTS (SELECT 1 FROM gig_kit_assignments WHERE gig_id = OLD.gig_id AND organization_id = OLD.organization_id)
     OR EXISTS (SELECT 1 FROM gig_staff_slots WHERE gig_id = OLD.gig_id AND organization_id = OLD.organization_id) THEN
    RAISE EXCEPTION 'This organization has financials, kits or staff on the gig, so it can only be marked Inactive.'
      USING ERRCODE = '23503';
  END IF;
  DELETE FROM inventory_tracking WHERE gig_id = OLD.gig_id AND organization_id = OLD.organization_id;
  DELETE FROM gig_participant_contacts WHERE gig_id = OLD.gig_id AND organization_id = OLD.organization_id;
  UPDATE purchases SET gig_id = NULL WHERE gig_id = OLD.gig_id AND organization_id = OLD.organization_id;
  RETURN NULL;
END $$;

CREATE TRIGGER gig_participants_after_remove
  AFTER DELETE ON public.gig_participants
  FOR EACH ROW EXECUTE FUNCTION public.gig_participants_after_remove();

-- ── Inactive: the gig's schedule and other organizations' contacts ─────────
-- An Inactive organization is read-only on the gig's schedule and on other organizations'
-- contacts for the gig (Cameron, 10-12). Its own contacts it still manages.
DROP POLICY IF EXISTS "schedule_entries_modify" ON public.gig_schedule_entries;
CREATE POLICY "schedule_entries_modify" ON public.gig_schedule_entries
  FOR ALL USING (public.user_can_manage_gig_active(gig_id, auth.uid()))
  WITH CHECK (public.user_can_manage_gig_active(gig_id, auth.uid()));

-- Contacts are written by SECURITY DEFINER RPCs; this checks the signed-in user on each row
-- they write. Rows written by the removal cleanup or by cascades (nested) aren't checked here.
CREATE OR REPLACE FUNCTION public.gig_participant_contacts_inactive_rule()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF TG_OP = 'DELETE' THEN r := OLD; ELSE r := NEW; END IF;
  IF auth.uid() IS NULL OR pg_trigger_depth() > 1 THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;
  IF NOT public.user_is_admin_or_manager_of_org(r.organization_id, auth.uid())
     AND NOT public.user_can_manage_gig_active(r.gig_id, auth.uid()) THEN
    RAISE EXCEPTION 'An Inactive organization can''t change other organizations'' contacts on the gig.' USING ERRCODE = '42501';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;

CREATE TRIGGER gig_participant_contacts_inactive_rule
  BEFORE INSERT OR UPDATE OR DELETE ON public.gig_participant_contacts
  FOR EACH ROW EXECUTE FUNCTION public.gig_participant_contacts_inactive_rule();

-- The owner always has a participation on its gig, and none of its rows is Inactive. Checked
-- at commit, so a gig and its participants can be written in either order.
CREATE OR REPLACE FUNCTION public.gig_owner_is_active_participant()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_gig uuid;
  v_owner uuid;
BEGIN
  IF TG_TABLE_NAME = 'gigs' THEN
    v_gig := NEW.id;
  ELSIF TG_OP = 'DELETE' THEN
    v_gig := OLD.gig_id;
  ELSE
    v_gig := NEW.gig_id;
  END IF;
  SELECT owner_organization_id INTO v_owner FROM gigs WHERE id = v_gig;
  IF v_owner IS NULL THEN RETURN NULL; END IF;
  IF NOT EXISTS (SELECT 1 FROM gig_participants WHERE gig_id = v_gig AND organization_id = v_owner)
     OR EXISTS (SELECT 1 FROM gig_participants WHERE gig_id = v_gig AND organization_id = v_owner AND inactive) THEN
    RAISE EXCEPTION 'A gig''s owner organization must be one of its active participants.' USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END $$;

CREATE CONSTRAINT TRIGGER gigs_owner_is_active_participant
  AFTER INSERT OR UPDATE OF owner_organization_id ON public.gigs
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.gig_owner_is_active_participant();
CREATE CONSTRAINT TRIGGER gig_participants_owner_is_active_participant
  AFTER INSERT OR UPDATE OR DELETE ON public.gig_participants
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.gig_owner_is_active_participant();

-- ── create_gig_complex ──────────────────────────────────────────────────────
-- Stores the owner: the primary organization, or for a child gig its parent's owner (and then
-- the primary organization must be that owner). The owner must be among the participants.
CREATE OR REPLACE FUNCTION public.create_gig_complex(
  p_gig_data jsonb, p_participants jsonb DEFAULT '[]'::jsonb, p_staff_slots jsonb DEFAULT '[]'::jsonb
) RETURNS TABLE(id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_gig_id UUID;
  v_user_id UUID;
  v_participant JSONB;
  v_slot JSONB;
  v_role_id UUID;
  v_primary_org_id UUID;
  v_owner_id UUID;
  v_parent_id UUID;
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

  v_owner_id := v_primary_org_id;
  v_parent_id := (p_gig_data->>'parent_gig_id')::UUID;
  IF v_parent_id IS NOT NULL THEN
    SELECT g.owner_organization_id INTO v_owner_id FROM gigs g WHERE g.id = v_parent_id;
    IF v_owner_id IS NULL THEN
      RAISE EXCEPTION 'Parent gig not found';
    END IF;
    IF v_owner_id <> v_primary_org_id THEN
      RAISE EXCEPTION 'A child gig belongs to its parent''s owner organization';
    END IF;
  END IF;

  IF NOT public.user_is_admin_or_manager_of_org(v_owner_id, v_user_id) THEN
    RAISE EXCEPTION 'Insufficient permissions: only Admins and Managers can create gigs';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p_participants) p
                 WHERE (p->>'organization_id')::UUID = v_owner_id) THEN
    RAISE EXCEPTION 'The owner organization must be one of the gig''s participants';
  END IF;

  INSERT INTO gigs (title, start, "end", timezone, status, notes, tags, parent_gig_id, hierarchy_depth,
                    owner_organization_id, created_by, updated_by)
  VALUES (
    p_gig_data->>'title',
    (p_gig_data->>'start')::TIMESTAMPTZ,
    (p_gig_data->>'end')::TIMESTAMPTZ,
    COALESCE(p_gig_data->>'timezone', 'UTC'),
    COALESCE(p_gig_data->>'status', 'DateHold')::gig_status,
    p_gig_data->>'notes',
    COALESCE((SELECT array_agg(x) FROM jsonb_array_elements_text(p_gig_data->'tags') x), ARRAY[]::TEXT[]),
    v_parent_id,
    COALESCE((p_gig_data->>'hierarchy_depth')::INTEGER, 0),
    v_owner_id,
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
