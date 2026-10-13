-- #175: removing an organization from a gig is logged in the database, in the same step as the
-- removal (coordinator review, 10-13). One `participant.removed` entry per organization a
-- statement removes roles of, naming them, with `left` when it has no role left and the user acts
-- for it (not as the owner); attributed to the owner when the user is one of its Admins or
-- Managers, else to the organization itself, else to the user's other participant organization.
-- A refused removal rolls its entry back; cascades and unsigned writes log nothing.
-- Checks read as: rls_test.expect(label, actual, expected).

-- Runs a statement as the user and keeps its effect; returns rows affected, or -1 if refused.
CREATE FUNCTION rls_test.keep(p_user text, p_sql text) RETURNS int LANGUAGE plpgsql AS $$
DECLARE n int;
BEGIN
  BEGIN
    PERFORM set_config('request.jwt.claim.sub', rls_test.u(p_user)::text, true);
    SET LOCAL ROLE authenticated;
    EXECUTE p_sql;
    GET DIAGNOSTICS n = ROW_COUNT;
    SET CONSTRAINTS ALL IMMEDIATE;
    SET CONSTRAINTS ALL DEFERRED;
    RESET ROLE;
    PERFORM set_config('request.jwt.claim.sub', '', true);
    RETURN n;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    PERFORM set_config('request.jwt.claim.sub', '', true);
    RETURN -1;
  END;
END $$;
CREATE FUNCTION rls_test.del_part(p_gig text, p_org text, p_role text DEFAULT NULL) RETURNS text LANGUAGE sql AS $$
  SELECT format('DELETE FROM gig_participants WHERE gig_id = %L AND organization_id = %L%s',
                rls_test.u(p_gig), rls_test.u(p_org), CASE WHEN p_role IS NULL THEN '' ELSE format(' AND role = %L', p_role) END)
$$;
-- Removal entries for a gig (read as the superuser), optionally for one removed organization.
CREATE FUNCTION rls_test.removals(p_gig text, p_org_name text DEFAULT NULL) RETURNS int LANGUAGE sql AS $$
  SELECT count(*)::int FROM activity_log
  WHERE event_type = 'participant.removed' AND gig_id = rls_test.u(p_gig)
    AND (p_org_name IS NULL OR context->>'organization_name' = p_org_name)
$$;
CREATE FUNCTION rls_test.entry(p_gig text, p_org_name text) RETURNS activity_log LANGUAGE sql AS $$
  SELECT * FROM activity_log
  WHERE event_type = 'participant.removed' AND gig_id = rls_test.u(p_gig) AND context->>'organization_name' = p_org_name
  ORDER BY occurred_at DESC LIMIT 1
$$;

-- ── Fixture ────────────────────────────────────────────────────────────────
-- gig (fixture): owner A, with B (Sound). Added: V, an unclaimed venue record; C with two roles.
-- gig_z: owner A, with V only, for the cascade check.
INSERT INTO rls_test.ids VALUES
  ('org_v', '00000000-0000-0000-0000-0000000000d1'),
  ('gig_z', '00000000-0000-0000-0000-0000000000f9');
INSERT INTO organizations (id, name, roles, claimed) VALUES (rls_test.u('org_v'), 'Venue V', '{Venue}', false);
INSERT INTO gig_participants (gig_id, organization_id, role) VALUES
  (rls_test.u('gig'), rls_test.u('org_v'), 'Venue'),
  (rls_test.u('gig'), rls_test.u('org_c'), 'Lighting'),
  (rls_test.u('gig'), rls_test.u('org_c'), 'Staging');
INSERT INTO gigs (id, title, status, start, "end", timezone, created_by, updated_by, owner_organization_id)
VALUES (rls_test.u('gig_z'), 'Gig Z', 'Booked', now(), now() + interval '4 hours', 'UTC',
        rls_test.u('a_admin'), rls_test.u('a_admin'), rls_test.u('org_a'));
INSERT INTO gig_participants (gig_id, organization_id, role) VALUES
  (rls_test.u('gig_z'), rls_test.u('org_a'), 'Production'),
  (rls_test.u('gig_z'), rls_test.u('org_v'), 'Venue');

-- ── Refused removals log nothing ───────────────────────────────────────────
SELECT rls_test.expect('owner can''t remove itself', rls_test.keep('a_admin', rls_test.del_part('gig', 'org_a')), -1);
SELECT rls_test.expect('…and nothing is logged', rls_test.removals('gig', 'Org A'), 0);

INSERT INTO gig_staff_slots (gig_id, staff_role_id, organization_id, required_count)
VALUES (rls_test.u('gig'), rls_test.u('role'), rls_test.u('org_b'), 1);
SELECT rls_test.expect('B can''t leave while it has a staff slot', rls_test.keep('b_admin', rls_test.del_part('gig', 'org_b')), -1);
SELECT rls_test.expect('…and nothing is logged', rls_test.removals('gig', 'Org B'), 0);
DELETE FROM gig_staff_slots WHERE gig_id = rls_test.u('gig') AND organization_id = rls_test.u('org_b');

-- ── Dropping one of two roles, by the owner's Manager ──────────────────────
SELECT rls_test.expect('owner Manager drops one of C''s roles', rls_test.keep('a_manager', rls_test.del_part('gig', 'org_c', 'Staging')), 1);
SELECT rls_test.expect('…one entry', rls_test.removals('gig', 'Org C'), 1);
SELECT rls_test.expect('…logged against the owner', (SELECT (organization_id = rls_test.u('org_a'))::int FROM rls_test.entry('gig', 'Org C')), 1);
SELECT rls_test.expect('…by that user', (SELECT (actor_id = rls_test.u('a_manager'))::int FROM rls_test.entry('gig', 'Org C')), 1);
SELECT rls_test.expect('…not a leave', (SELECT (context->>'left' = 'false')::int FROM rls_test.entry('gig', 'Org C')), 1);
SELECT rls_test.expect('…with the role removed', (SELECT (context->>'role' = 'Staging')::int FROM rls_test.entry('gig', 'Org C')), 1);
SELECT rls_test.expect('…the actor''s name from their profile', (SELECT (context->>'actor_display_name' = 'a_manager Test')::int FROM rls_test.entry('gig', 'Org C')), 1);
SELECT rls_test.expect('…the actor''s organization name', (SELECT (context->>'actor_org_name' = 'Org A')::int FROM rls_test.entry('gig', 'Org C')), 1);
SELECT rls_test.expect('…the gig title', (SELECT (context->>'gig_title' = 'Shared gig')::int FROM rls_test.entry('gig', 'Org C')), 1);
SELECT rls_test.expect('…as a participant entry', (SELECT (entity_type = 'participant' AND context->>'context_version' = '1')::int FROM rls_test.entry('gig', 'Org C')), 1);

-- ── An unclaimed venue removed by another participant's Admin ──────────────
SELECT rls_test.expect('C''s Admin removes the unclaimed venue', rls_test.keep('c_admin', rls_test.del_part('gig', 'org_v')), 1);
SELECT rls_test.expect('…logged against C', (SELECT (organization_id = rls_test.u('org_c'))::int FROM rls_test.entry('gig', 'Venue V')), 1);

-- ── Leaving ────────────────────────────────────────────────────────────────
INSERT INTO gig_participants (gig_id, organization_id, role) VALUES (rls_test.u('gig'), rls_test.u('org_b'), 'Lighting');
SELECT rls_test.expect('B''s Admin leaves the gig (both of its roles)', rls_test.keep('b_admin', rls_test.del_part('gig', 'org_b')), 2);
SELECT rls_test.expect('…one entry, not one per role', rls_test.removals('gig', 'Org B'), 1);
SELECT rls_test.expect('…naming both roles', (SELECT (context->>'role' = 'Lighting, Sound')::int FROM rls_test.entry('gig', 'Org B')), 1);
SELECT rls_test.expect('…marked as a leave', (SELECT (context->>'left' = 'true')::int FROM rls_test.entry('gig', 'Org B')), 1);
SELECT rls_test.expect('…logged against B', (SELECT (organization_id = rls_test.u('org_b'))::int FROM rls_test.entry('gig', 'Org B')), 1);
SELECT rls_test.expect('the owner''s Staff see it',
  rls_test.visible(rls_test.u('a_staff'), 'activity_log', format('event_type = %L AND context->>%L = %L', 'participant.removed', 'organization_name', 'Org B')), 1);
SELECT rls_test.expect('C sees it too',
  rls_test.visible(rls_test.u('c_viewer'), 'activity_log', format('event_type = %L AND context->>%L = %L', 'participant.removed', 'organization_name', 'Org B')), 1);
SELECT rls_test.expect('B, no longer on the gig, doesn''t',
  rls_test.visible(rls_test.u('b_admin'), 'activity_log', format('event_type = %L AND gig_id = %L', 'participant.removed', rls_test.u('gig'))), 0);

-- ── Removed by someone who manages both the owner and the organization ─────
-- Acting as the owner: a removal, not a leave, logged against the owner.
INSERT INTO organization_members (organization_id, user_id, role) VALUES (rls_test.u('org_c'), rls_test.u('a_admin'), 'Admin');
SELECT rls_test.expect('owner Admin, also C''s Admin, removes C', rls_test.keep('a_admin', rls_test.del_part('gig', 'org_c')), 1);
SELECT rls_test.expect('…not a leave', (SELECT (context->>'left' = 'false')::int FROM activity_log
  WHERE event_type = 'participant.removed' AND actor_id = rls_test.u('a_admin') AND context->>'organization_name' = 'Org C'), 1);
SELECT rls_test.expect('…logged against the owner', (SELECT (organization_id = rls_test.u('org_a'))::int FROM activity_log
  WHERE event_type = 'participant.removed' AND actor_id = rls_test.u('a_admin') AND context->>'organization_name' = 'Org C'), 1);

-- ── Cascades and unsigned writes log nothing ───────────────────────────────
SELECT rls_test.expect('owner Admin deletes gig Z (only an unclaimed venue on it)', rls_test.keep('a_admin', format('DELETE FROM gigs WHERE id = %L', rls_test.u('gig_z'))), 1);
SELECT rls_test.expect('…no removal entries', (SELECT count(*)::int FROM activity_log WHERE event_type = 'participant.removed' AND entity_id IN
  (SELECT id FROM gig_participants WHERE gig_id = rls_test.u('gig_z'))), 0);
SELECT rls_test.expect('…and none written for gig Z at all', (SELECT count(*)::int FROM activity_log WHERE event_type = 'participant.removed' AND context->>'gig_title' = 'Gig Z'), 0);

INSERT INTO gig_participants (gig_id, organization_id, role) VALUES (rls_test.u('gig'), rls_test.u('org_c'), 'Staging');
DELETE FROM gig_participants WHERE gig_id = rls_test.u('gig') AND organization_id = rls_test.u('org_c');
SELECT rls_test.expect('a removal with no signed-in user isn''t logged (C keeps its two entries)', rls_test.removals('gig', 'Org C'), 2);
