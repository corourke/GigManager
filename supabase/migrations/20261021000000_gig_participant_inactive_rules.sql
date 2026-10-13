-- #175 PR 3: what Inactive means, and Gig History for removals, Inactive and Reactivated.
--
-- Cameron (10-13): "Inactive means that the organization is being removed from participating
-- in the gig -- some of its records (such as financial) can be maintained in case there are
-- sunk costs and agreements to unravel or notes to preserve, but otherwise staff and equipment
-- should be released and the organization should have no interest or ability to change other
-- aspects of the gig."
--
-- 1. Release first, then Inactive: marking an organization Inactive is refused while it has
--    staff slots (and so staff) or kit assignments on the gig.
-- 2. While Inactive it adds no staff or equipment on the gig, nor moves a row onto it.
-- 3. While Inactive it keeps its own financials (gig_financials doesn't look at participation)
--    and its own participant notes; its role, client flag and every contact on the gig, its
--    own included, are read-only. It can still reactivate itself or leave.
-- 4. While Inactive it isn't given another role on the gig (it's being removed).
-- 5. Gig History: one participant.removed entry per organization a statement removes roles of,
--    written with the removal (the app's own entry was lost when an organization left: its
--    member had lost access by then); one participant.inactivated / participant.reactivated
--    entry when an organization's state on the gig changes. Names come from the tables. Writes
--    with no signed-in user log nothing.

-- ── Whose name goes on an entry ────────────────────────────────────────────
-- The owner when the user is one of its Admins or Managers (acting as the owner); otherwise the
-- subject organization when the user belongs to it; otherwise the user's Admin or Manager
-- organization among the gig's participants; otherwise none.
CREATE OR REPLACE FUNCTION public.gig_activity_actor_org(p_gig_id uuid, p_subject_org uuid, p_actor uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN public.user_is_admin_or_manager_of_org((SELECT owner_organization_id FROM gigs WHERE id = p_gig_id), p_actor)
      THEN (SELECT owner_organization_id FROM gigs WHERE id = p_gig_id)
    WHEN public.user_is_member_of_org(p_subject_org, p_actor) THEN p_subject_org
    ELSE (
      SELECT om.organization_id
      FROM organization_members om
      JOIN gigs g ON g.id = p_gig_id
      WHERE om.user_id = p_actor AND om.role IN ('Admin', 'Manager')
        AND EXISTS (SELECT 1 FROM gig_participants gp WHERE gp.gig_id = p_gig_id AND gp.organization_id = om.organization_id)
      ORDER BY (om.organization_id = g.owner_organization_id) DESC, om.organization_id
      LIMIT 1)
  END
$$;
-- Called only by log_participant_event.
REVOKE EXECUTE ON FUNCTION public.gig_activity_actor_org(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;

-- Writes one participant entry to activity_log, with the names read from the tables.
CREATE OR REPLACE FUNCTION public.log_participant_event(
  p_event text, p_gig_id uuid, p_subject_org uuid, p_entity_id uuid, p_extra jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_actor_org uuid;
BEGIN
  IF v_actor IS NULL THEN RETURN; END IF;
  v_actor_org := public.gig_activity_actor_org(p_gig_id, p_subject_org, v_actor);
  INSERT INTO activity_log (organization_id, actor_id, event_type, entity_type, entity_id, gig_id, context)
  SELECT v_actor_org, v_actor, p_event, 'participant', p_entity_id, p_gig_id,
         jsonb_build_object(
           'context_version', 1,
           'actor_display_name', COALESCE(NULLIF(trim(concat_ws(' ', u.first_name, u.last_name)), ''), u.email, ''),
           'actor_org_name', COALESCE((SELECT name FROM organizations WHERE id = v_actor_org), ''),
           'gig_title', COALESCE((SELECT title FROM gigs WHERE id = p_gig_id), ''),
           'organization_name', (SELECT name FROM organizations WHERE id = p_subject_org)
         ) || p_extra
  FROM (SELECT 1) one LEFT JOIN users u ON u.id = v_actor;
END $$;
REVOKE EXECUTE ON FUNCTION public.log_participant_event(text, uuid, uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated;

-- ── Removal: the last-role checks say what to do instead ───────────────────
-- As in 20261020000000, with the refusal saying what to do: release staff and equipment, then
-- mark Inactive; or mark Inactive; or, already Inactive, it stays so. Logging is per statement
-- (below), so leaving with several roles is one entry.
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
  IF EXISTS (SELECT 1 FROM gig_kit_assignments WHERE gig_id = OLD.gig_id AND organization_id = OLD.organization_id)
     OR EXISTS (SELECT 1 FROM gig_staff_slots WHERE gig_id = OLD.gig_id AND organization_id = OLD.organization_id) THEN
    RAISE EXCEPTION 'This organization has staff or equipment on the gig, so it can''t be removed. Release its staff and equipment, then mark it Inactive.'
      USING ERRCODE = '23503';
  END IF;
  IF EXISTS (SELECT 1 FROM gig_financials WHERE gig_id = OLD.gig_id AND organization_id = OLD.organization_id) THEN
    IF OLD.inactive THEN
      RAISE EXCEPTION 'This organization has financial records on the gig, so it can''t be removed; it stays Inactive to keep them.'
        USING ERRCODE = '23503';
    END IF;
    RAISE EXCEPTION 'This organization has financial records on the gig, so it can''t be removed. Mark it Inactive instead.'
      USING ERRCODE = '23503';
  END IF;
  DELETE FROM inventory_tracking WHERE gig_id = OLD.gig_id AND organization_id = OLD.organization_id;
  DELETE FROM gig_participant_contacts WHERE gig_id = OLD.gig_id AND organization_id = OLD.organization_id;
  UPDATE purchases SET gig_id = NULL WHERE gig_id = OLD.gig_id AND organization_id = OLD.organization_id;
  RETURN NULL;
END $$;

-- ── Gig History: removals ──────────────────────────────────────────────────
-- Once per statement, one entry per (gig, organization) it removed roles of, naming them. A
-- leave when the organization has no role left and the user acts for it (its Admin or Manager,
-- not acting as the owner). A refused removal rolls its entry back with it. Cascades (the gig or
-- the organization is gone) log nothing.
CREATE OR REPLACE FUNCTION public.gig_participants_log_removed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NULL; END IF;
  FOR c IN
    SELECT o.gig_id, o.organization_id, min(o.id::text)::uuid AS entity_id,
           string_agg(o.role::text, ', ' ORDER BY o.role::text) AS roles
    FROM old_rows o
    WHERE EXISTS (SELECT 1 FROM gigs g WHERE g.id = o.gig_id AND g.owner_organization_id IS NOT NULL)
      AND EXISTS (SELECT 1 FROM organizations WHERE id = o.organization_id)
    GROUP BY o.gig_id, o.organization_id
  LOOP
    PERFORM public.log_participant_event('participant.removed', c.gig_id, c.organization_id, c.entity_id,
      jsonb_build_object('role', c.roles, 'left',
        NOT EXISTS (SELECT 1 FROM gig_participants WHERE gig_id = c.gig_id AND organization_id = c.organization_id)
        AND public.user_is_admin_or_manager_of_org(c.organization_id, auth.uid())
        AND public.gig_activity_actor_org(c.gig_id, c.organization_id, auth.uid()) = c.organization_id));
  END LOOP;
  RETURN NULL;
END $$;

CREATE TRIGGER gig_participants_log_removed
  AFTER DELETE ON public.gig_participants
  REFERENCING OLD TABLE AS old_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.gig_participants_log_removed();

-- ── Inactive: no new role ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.gig_participants_inactive_no_new_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM gig_participants
             WHERE gig_id = NEW.gig_id AND organization_id = NEW.organization_id AND inactive) THEN
    RAISE EXCEPTION 'This organization is Inactive on the gig; reactivate it before giving it another role.'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER gig_participants_inactive_no_new_role
  BEFORE INSERT ON public.gig_participants
  FOR EACH ROW EXECUTE FUNCTION public.gig_participants_inactive_no_new_role();

-- ── Participation updates ──────────────────────────────────────────────────
-- As in 20261020000000, plus: Inactive only once staff and equipment are released; while
-- Inactive, the organization's own Admins and Managers change its notes and nothing else.
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
  IF NEW.inactive AND NOT OLD.inactive
     AND (EXISTS (SELECT 1 FROM gig_staff_slots WHERE gig_id = NEW.gig_id AND organization_id = NEW.organization_id)
          OR EXISTS (SELECT 1 FROM gig_kit_assignments WHERE gig_id = NEW.gig_id AND organization_id = NEW.organization_id)) THEN
    RAISE EXCEPTION 'Release this organization''s staff and equipment on the gig before marking it Inactive.'
      USING ERRCODE = '23514';
  END IF;
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF (NEW.role, NEW.notes, NEW.is_client) IS DISTINCT FROM (OLD.role, OLD.notes, OLD.is_client)
     AND NOT public.user_can_manage_gig_active(NEW.gig_id, auth.uid())
     AND NOT ((NEW.role, NEW.is_client) IS NOT DISTINCT FROM (OLD.role, OLD.is_client)
              AND public.user_is_admin_or_manager_of_org(NEW.organization_id, auth.uid())) THEN
    RAISE EXCEPTION 'Only an active participant''s Admins and Managers can change a participation; an Inactive organization keeps only its notes.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

-- ── Inactive: no staff or equipment ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.gig_inactive_no_staff_or_kits()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND EXISTS (
       SELECT 1 FROM gig_participants
       WHERE gig_id = NEW.gig_id AND organization_id = NEW.organization_id AND inactive) THEN
    RAISE EXCEPTION 'An Inactive organization can''t add staff or equipment to the gig.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER gig_staff_slots_inactive_rule
  BEFORE INSERT OR UPDATE ON public.gig_staff_slots
  FOR EACH ROW EXECUTE FUNCTION public.gig_inactive_no_staff_or_kits();
CREATE TRIGGER gig_kit_assignments_inactive_rule
  BEFORE INSERT OR UPDATE ON public.gig_kit_assignments
  FOR EACH ROW EXECUTE FUNCTION public.gig_inactive_no_staff_or_kits();

-- ── Inactive: contacts read-only, its own included ─────────────────────────
-- The writer must be an Admin or Manager of an active participant. Rows written by the removal
-- cleanup or by cascades (nested) aren't checked here.
CREATE OR REPLACE FUNCTION public.gig_participant_contacts_inactive_rule()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF TG_OP = 'DELETE' THEN r := OLD; ELSE r := NEW; END IF;
  IF auth.uid() IS NULL OR pg_trigger_depth() > 1 THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;
  IF NOT public.user_can_manage_gig_active(r.gig_id, auth.uid()) THEN
    RAISE EXCEPTION 'An Inactive organization can''t change contacts on the gig.' USING ERRCODE = '42501';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;

-- ── Gig History: Inactive and Reactivated ──────────────────────────────────
-- Once per statement, for each (gig, organization) whose flag changed on some row: one entry
-- when the organization's state changed, Inactive meaning any of its roles is. Its state before
-- is read from the rows the statement didn't touch plus the old rows, so changing one of two
-- roles while the other stays Inactive logs nothing. Role or notes edits change no flag.
CREATE OR REPLACE FUNCTION public.gig_participants_log_inactive()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c record;
  v_before boolean;
  v_after boolean;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NULL; END IF;
  FOR c IN
    SELECT n.gig_id, n.organization_id, min(n.id::text)::uuid AS entity_id
    FROM new_rows n JOIN old_rows o ON o.id = n.id
    WHERE n.inactive IS DISTINCT FROM o.inactive
    GROUP BY n.gig_id, n.organization_id
  LOOP
    v_after := EXISTS (SELECT 1 FROM gig_participants
                       WHERE gig_id = c.gig_id AND organization_id = c.organization_id AND inactive);
    v_before := EXISTS (SELECT 1 FROM old_rows
                        WHERE gig_id = c.gig_id AND organization_id = c.organization_id AND inactive)
             OR EXISTS (SELECT 1 FROM gig_participants p
                        WHERE p.gig_id = c.gig_id AND p.organization_id = c.organization_id AND p.inactive
                          AND NOT EXISTS (SELECT 1 FROM new_rows n WHERE n.id = p.id));
    IF v_before IS DISTINCT FROM v_after THEN
      PERFORM public.log_participant_event(
        CASE WHEN v_after THEN 'participant.inactivated' ELSE 'participant.reactivated' END,
        c.gig_id, c.organization_id, c.entity_id);
    END IF;
  END LOOP;
  RETURN NULL;
END $$;

CREATE TRIGGER gig_participants_log_inactive
  AFTER UPDATE ON public.gig_participants
  REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public.gig_participants_log_inactive();
