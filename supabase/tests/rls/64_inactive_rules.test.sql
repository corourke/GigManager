-- #175 (Cameron 10-13): Inactive means the organization is being removed from the gig. Its
-- financial records and notes are kept, so sunk costs and agreements can be settled; its staff
-- and equipment are released first, and it can't change anything else.
--   - Mark Inactive is refused while it has staff slots or kit assignments on the gig.
--   - While Inactive it can't add staff or equipment (nor move a row onto the gig), can't change
--     its role or client flag or any contacts, but keeps its own financials and its own notes.
--   - Gig History logs one participant.inactivated / participant.reactivated entry per
--     organization; role or notes edits log nothing.
-- Checks read as: rls_test.expect(label, actual, expected).

-- Runs a statement as the user and keeps its effect. Returns 'ok:<rows>' or the SQLSTATE.
CREATE FUNCTION rls_test.keep(p_user text, p_sql text) RETURNS text LANGUAGE plpgsql AS $$
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
    RETURN 'ok:' || n;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    PERFORM set_config('request.jwt.claim.sub', '', true);
    RETURN SQLSTATE;
  END;
END $$;
CREATE FUNCTION rls_test.check(p_label text, p_actual text, p_expected text) RETURNS void LANGUAGE sql AS
  $$ SELECT rls_test.expect(p_label || ' [want ' || p_expected || ', got ' || p_actual || ']', (p_actual = p_expected)::int, 1) $$;
CREATE FUNCTION rls_test.q(p text) RETURNS text LANGUAGE sql AS $$ SELECT quote_literal(rls_test.u(p)) $$;
CREATE FUNCTION rls_test.set_b(p_set text) RETURNS text LANGUAGE sql AS
  $$ SELECT format('UPDATE gig_participants SET %s WHERE gig_id = %s AND organization_id = %s', p_set, rls_test.q('gig'), rls_test.q('org_b')) $$;
CREATE FUNCTION rls_test.history(p_event text) RETURNS int LANGUAGE sql AS $$
  SELECT count(*)::int FROM activity_log
  WHERE event_type = p_event AND gig_id = rls_test.u('gig') AND context->>'organization_name' = 'Org B'
$$;
CREATE FUNCTION rls_test.last_entry(p_event text) RETURNS activity_log LANGUAGE sql AS $$
  SELECT * FROM activity_log WHERE event_type = p_event AND gig_id = rls_test.u('gig') ORDER BY occurred_at DESC LIMIT 1
$$;
CREATE FUNCTION rls_test.add_slot(p_gig text) RETURNS text LANGUAGE sql AS
  $$ SELECT format('INSERT INTO gig_staff_slots (gig_id, staff_role_id, organization_id) VALUES (%s, %s, %s)', rls_test.q(p_gig), rls_test.q('role'), rls_test.q('org_b')) $$;
CREATE FUNCTION rls_test.add_kit(p_added_at_pack_out boolean) RETURNS text LANGUAGE sql AS
  $$ SELECT format('INSERT INTO gig_kit_assignments (organization_id, gig_id, kit_id, assigned_by, added_at_pack_out) VALUES (%s, %s, %s, %s, %L)',
                   rls_test.q('org_b'), rls_test.q('gig'), rls_test.q('kit_b'),
                   rls_test.q(CASE WHEN p_added_at_pack_out THEN 'b_staff' ELSE 'b_admin' END), p_added_at_pack_out) $$;

-- ── Fixture ────────────────────────────────────────────────────────────────
-- gig (fixture): owner A, with B (Sound). B gets a second role. gig_b2: B's own gig, with a slot.
INSERT INTO rls_test.ids VALUES
  ('gig_b2', '00000000-0000-0000-0000-0000000000fa'),
  ('slot_b2', '00000000-0000-0000-0000-000000000eb2');
INSERT INTO gig_participants (gig_id, organization_id, role) VALUES (rls_test.u('gig'), rls_test.u('org_b'), 'Lighting');
INSERT INTO gigs (id, title, status, start, "end", timezone, created_by, updated_by, owner_organization_id)
VALUES (rls_test.u('gig_b2'), 'B''s gig', 'Booked', now(), now() + interval '4 hours', 'UTC',
        rls_test.u('b_admin'), rls_test.u('b_admin'), rls_test.u('org_b'));
INSERT INTO gig_participants (gig_id, organization_id, role) VALUES (rls_test.u('gig_b2'), rls_test.u('org_b'), 'Sound');
INSERT INTO gig_staff_slots (id, gig_id, staff_role_id, organization_id) VALUES (rls_test.u('slot_b2'), rls_test.u('gig_b2'), rls_test.u('role'), rls_test.u('org_b'));

-- ── 1. Release first, then Inactive ────────────────────────────────────────
INSERT INTO gig_staff_slots (gig_id, staff_role_id, organization_id) VALUES (rls_test.u('gig'), rls_test.u('role'), rls_test.u('org_b'));
SELECT rls_test.check('Mark Inactive is refused while B has a staff slot on the gig', rls_test.keep('b_admin', rls_test.set_b('inactive = true')), '23514');
DELETE FROM gig_staff_slots WHERE gig_id = rls_test.u('gig') AND organization_id = rls_test.u('org_b');
INSERT INTO gig_kit_assignments (organization_id, gig_id, kit_id, assigned_by) VALUES (rls_test.u('org_b'), rls_test.u('gig'), rls_test.u('kit_b'), rls_test.u('b_admin'));
SELECT rls_test.check('…and while it has a kit on the gig (the owner asking)', rls_test.keep('a_manager', rls_test.set_b('inactive = true')), '23514');
DELETE FROM gig_kit_assignments WHERE gig_id = rls_test.u('gig') AND organization_id = rls_test.u('org_b');
SELECT rls_test.expect('…and nothing was logged', rls_test.history('participant.inactivated'), 0);

SELECT rls_test.check('Released, B marks itself Inactive (both of its roles)', rls_test.keep('b_admin', rls_test.set_b('inactive = true')), 'ok:2');
SELECT rls_test.expect('…one history entry for the organization, not one per role', rls_test.history('participant.inactivated'), 1);
SELECT rls_test.expect('…attributed to B', (SELECT (organization_id = rls_test.u('org_b'))::int FROM rls_test.last_entry('participant.inactivated')), 1);
SELECT rls_test.expect('…by that user', (SELECT (actor_id = rls_test.u('b_admin'))::int FROM rls_test.last_entry('participant.inactivated')), 1);
SELECT rls_test.expect('…named from the tables', (SELECT (context->>'actor_display_name' = 'b_admin Test' AND context->>'actor_org_name' = 'Org B'
  AND context->>'gig_title' = 'Shared gig' AND context->>'context_version' = '1' AND entity_type = 'participant')::int FROM rls_test.last_entry('participant.inactivated')), 1);
SELECT rls_test.expect('…which the owner sees',
  rls_test.visible(rls_test.u('a_staff'), 'activity_log', format('event_type = %L AND gig_id = %s', 'participant.inactivated', rls_test.q('gig'))), 1);

-- ── 2. While Inactive: no staff or equipment ───────────────────────────────
SELECT rls_test.check('B can''t add a staff slot', rls_test.keep('b_admin', rls_test.add_slot('gig')), '42501');
SELECT rls_test.check('…or a kit', rls_test.keep('b_admin', rls_test.add_kit(false)), '42501');
SELECT rls_test.check('…or a kit at pack-out', rls_test.keep('b_staff', rls_test.add_kit(true)), '42501');
SELECT rls_test.check('…or move a slot from another gig onto it',
  rls_test.keep('b_admin', format('UPDATE gig_staff_slots SET gig_id = %s WHERE id = %s', rls_test.q('gig'), rls_test.q('slot_b2'))), '42501');
SELECT rls_test.check('B still adds staff on its own gig', rls_test.keep('b_admin', rls_test.add_slot('gig_b2')), 'ok:1');

-- ── 3. While Inactive: financials and notes only ───────────────────────────
SELECT rls_test.check('B keeps its own financials on the gig',
  rls_test.keep('b_admin', format('INSERT INTO gig_financials (gig_id, organization_id, direction, stage, amount, date, created_by) VALUES (%s, %s, ''out'', ''accepted'', 100, current_date, %s)',
    rls_test.q('gig'), rls_test.q('org_b'), rls_test.q('b_admin'))), 'ok:1');
SELECT rls_test.check('…and its own notes', rls_test.keep('b_admin', rls_test.set_b($$notes = 'settle the deposit'$$)), 'ok:2');
SELECT rls_test.check('…but not its role', rls_test.keep('b_admin', format('UPDATE gig_participants SET role = ''Staging'' WHERE gig_id = %s AND organization_id = %s AND role = ''Lighting''', rls_test.q('gig'), rls_test.q('org_b'))), '42501');
SELECT rls_test.check('…nor its client flag', rls_test.keep('b_admin', rls_test.set_b('is_client = true')), '42501');
SELECT rls_test.check('…nor its notes together with its role', rls_test.keep('b_admin',
  format('UPDATE gig_participants SET notes = ''x'', role = ''Staging'' WHERE gig_id = %s AND organization_id = %s AND role = ''Lighting''', rls_test.q('gig'), rls_test.q('org_b'))), '42501');
SELECT rls_test.check('…nor its own contacts',
  rls_test.keep('b_admin', format('SELECT add_gig_participant_contact(%s, %s, %s)', rls_test.q('gig'), rls_test.q('org_b'), rls_test.q('b_staff'))), '42501');
SELECT rls_test.expect('Editing notes logged no Inactive or Reactivated entry',
  rls_test.history('participant.inactivated') + rls_test.history('participant.reactivated'), 1);
SELECT rls_test.check('The owner edits B''s notes too', rls_test.keep('a_manager', rls_test.set_b($$notes = 'owner note'$$)), 'ok:2');
SELECT rls_test.expect('…which logs nothing either',
  rls_test.history('participant.inactivated') + rls_test.history('participant.reactivated'), 1);

-- ── 4. Reactivated ─────────────────────────────────────────────────────────
SELECT rls_test.check('The owner''s Manager reactivates B', rls_test.keep('a_manager', rls_test.set_b('inactive = false')), 'ok:2');
SELECT rls_test.expect('…one Reactivated entry', rls_test.history('participant.reactivated'), 1);
SELECT rls_test.expect('…attributed to the owner', (SELECT (organization_id = rls_test.u('org_a'))::int FROM rls_test.last_entry('participant.reactivated')), 1);
SELECT rls_test.check('Reactivated, B adds staff again', rls_test.keep('b_admin', rls_test.add_slot('gig')), 'ok:1');
DELETE FROM gig_staff_slots WHERE gig_id = rls_test.u('gig') AND organization_id = rls_test.u('org_b');

-- ── 5. Unsigned writes log nothing ─────────────────────────────────────────
UPDATE gig_participants SET inactive = true WHERE gig_id = rls_test.u('gig') AND organization_id = rls_test.u('org_b');
UPDATE gig_participants SET inactive = false WHERE gig_id = rls_test.u('gig') AND organization_id = rls_test.u('org_b');
SELECT rls_test.expect('A change with no signed-in user isn''t logged',
  rls_test.history('participant.inactivated') + rls_test.history('participant.reactivated'), 2);
