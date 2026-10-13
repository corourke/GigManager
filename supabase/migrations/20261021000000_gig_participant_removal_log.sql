-- #175: removing an organization from a gig is logged in the database, in the same step as the
-- removal (design approved 10-13). The app logged removals itself after the delete; when an
-- organization left a gig, its member had lost access by then and the entry was never written.
--
-- gig_participants_after_remove() (20261020000000) now writes one `participant.removed` entry
-- per removed row, before the last-row checks, so a refused removal rolls its entry back.
-- - Cascades (the gig or the organization is gone) and writes with no signed-in user log nothing.
-- - `left` is true when the user belongs to the organization removed (it's leaving); the entry
--   is then attributed to that organization. Otherwise to the user's Admin or Manager
--   organization among the gig's participants, the owner first; else none ('participant' is a
--   shared entity, so a null organization is still visible to the gig's participants).
-- - Names come from the tables, not from the caller.

CREATE OR REPLACE FUNCTION public.gig_participants_after_remove()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid;
  v_title text;
  v_actor uuid := auth.uid();
  v_left boolean;
  v_actor_org uuid;
BEGIN
  SELECT owner_organization_id, title INTO v_owner, v_title FROM gigs WHERE id = OLD.gig_id;
  -- Cascades: the gig or the organization is being deleted.
  IF v_owner IS NULL OR NOT EXISTS (SELECT 1 FROM organizations WHERE id = OLD.organization_id) THEN
    RETURN NULL;
  END IF;

  IF v_actor IS NOT NULL THEN
    v_left := public.user_is_member_of_org(OLD.organization_id, v_actor);
    IF v_left THEN
      v_actor_org := OLD.organization_id;
    ELSE
      SELECT om.organization_id INTO v_actor_org
      FROM organization_members om
      WHERE om.user_id = v_actor AND om.role IN ('Admin', 'Manager')
        AND EXISTS (SELECT 1 FROM gig_participants gp WHERE gp.gig_id = OLD.gig_id AND gp.organization_id = om.organization_id)
      ORDER BY (om.organization_id = v_owner) DESC, om.organization_id
      LIMIT 1;
    END IF;

    INSERT INTO activity_log (organization_id, actor_id, event_type, entity_type, entity_id, gig_id, context)
    SELECT v_actor_org, v_actor, 'participant.removed', 'participant', OLD.id, OLD.gig_id,
           jsonb_build_object(
             'context_version', 1,
             'actor_display_name', COALESCE(NULLIF(trim(concat_ws(' ', u.first_name, u.last_name)), ''), u.email, ''),
             'actor_org_name', COALESCE((SELECT name FROM organizations WHERE id = v_actor_org), ''),
             'gig_title', COALESCE(v_title, ''),
             'organization_name', (SELECT name FROM organizations WHERE id = OLD.organization_id),
             'role', OLD.role,
             'left', v_left)
    FROM (SELECT 1) one LEFT JOIN users u ON u.id = v_actor;
  END IF;

  -- The organization's last role on the gig: the checks and cleanup, as in 20261020000000.
  IF EXISTS (SELECT 1 FROM gig_participants WHERE gig_id = OLD.gig_id AND organization_id = OLD.organization_id) THEN
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
