-- #61: gig data owned by one org must stay private to that org, even though
-- another org participates in the same gig. Org A and Org B share the gig;
-- Org C doesn't participate. See _fixture.sql for the users.
-- Checks read as: rls_test.expect(label, <rows seen or affected, -1 = rejected>, expected).

-- ── Fixture rows owned by each org ─────────────────────────────────────────
INSERT INTO rls_test.ids VALUES
  ('slot_a', '00000000-0000-0000-0000-0000000005a1'),
  ('slot_b', '00000000-0000-0000-0000-0000000005b1'),
  ('asg_a_staff', '00000000-0000-0000-0000-0000000006a1'),   -- A's slot, A's staff
  ('asg_b_staff', '00000000-0000-0000-0000-0000000006a2'),   -- A's slot, B's staff (cross-org booking)
  ('asg_b_own',   '00000000-0000-0000-0000-0000000006b1'),   -- B's slot, B's staff
  ('kit_a2', '00000000-0000-0000-0000-0000000000c2'),
  ('kga_a', '00000000-0000-0000-0000-0000000007a1'),
  ('kga_b', '00000000-0000-0000-0000-0000000007b1'),
  ('inv_a', '00000000-0000-0000-0000-0000000008a1'),
  ('inv_b', '00000000-0000-0000-0000-0000000008b1'),
  ('fin_a', '00000000-0000-0000-0000-0000000009a1'),
  ('gig_b_only', '00000000-0000-0000-0000-0000000000f2');   -- a second gig only Org B is on

INSERT INTO gigs (id, title, status, start, "end", timezone, created_by, updated_by)
VALUES (rls_test.u('gig_b_only'), 'B-only gig', (enum_range(NULL::gig_status))[1], now(), now() + interval '4 hours',
        'UTC', rls_test.u('b_admin'), rls_test.u('b_admin'));
INSERT INTO gig_participants (gig_id, organization_id, role) VALUES (rls_test.u('gig_b_only'), rls_test.u('org_b'), 'Sound');

INSERT INTO kits (id, organization_id, name, created_by, updated_by)
VALUES (rls_test.u('kit_a2'), rls_test.u('org_a'), 'A kit 2', rls_test.u('a_admin'), rls_test.u('a_admin'));
INSERT INTO gig_staff_slots (id, gig_id, staff_role_id, organization_id) VALUES
  (rls_test.u('slot_a'), rls_test.u('gig'), rls_test.u('role'), rls_test.u('org_a')),
  (rls_test.u('slot_b'), rls_test.u('gig'), rls_test.u('role'), rls_test.u('org_b'));
INSERT INTO gig_staff_assignments (id, slot_id, user_id, status, rate, fee) VALUES
  (rls_test.u('asg_a_staff'), rls_test.u('slot_a'), rls_test.u('a_staff'), 'Requested', 50, 400),
  (rls_test.u('asg_b_staff'), rls_test.u('slot_a'), rls_test.u('b_staff'), 'Requested', 60, 480),
  (rls_test.u('asg_b_own'),   rls_test.u('slot_b'), rls_test.u('b_staff'), 'Requested', 70, 560);
INSERT INTO gig_kit_assignments (id, organization_id, gig_id, kit_id, assigned_by) VALUES
  (rls_test.u('kga_a'), rls_test.u('org_a'), rls_test.u('gig'), rls_test.u('kit_a'), rls_test.u('a_admin')),
  (rls_test.u('kga_b'), rls_test.u('org_b'), rls_test.u('gig'), rls_test.u('kit_b'), rls_test.u('b_admin'));
INSERT INTO inventory_tracking (id, organization_id, gig_id, kit_id, status) VALUES
  (rls_test.u('inv_a'), rls_test.u('org_a'), rls_test.u('gig'), rls_test.u('kit_a'), 'Checked Out'),
  (rls_test.u('inv_b'), rls_test.u('org_b'), rls_test.u('gig'), rls_test.u('kit_b'), 'Checked Out');
INSERT INTO gig_financials (id, gig_id, organization_id, amount, date, created_by, type)
VALUES (rls_test.u('fin_a'), rls_test.u('gig'), rls_test.u('org_a'), 100, current_date, rls_test.u('a_admin'),
        (enum_range(NULL::fin_type))[1]);
INSERT INTO activity_log (organization_id, actor_id, event_type, entity_type, entity_id, gig_id) VALUES
  (rls_test.u('org_a'), rls_test.u('a_admin'), 'gig.status_changed', 'gig', rls_test.u('gig'), rls_test.u('gig')),
  (NULL,                rls_test.u('a_admin'), 'participant.added', 'participant', rls_test.u('org_b'), rls_test.u('gig')),
  (rls_test.u('org_b'), rls_test.u('b_admin'), 'schedule.added', 'schedule_entry', rls_test.u('gig'), rls_test.u('gig')),
  (rls_test.u('org_a'), rls_test.u('a_admin'), 'staffing.updated', 'staffing', rls_test.u('slot_a'), rls_test.u('gig')),
  (rls_test.u('org_a'), rls_test.u('a_admin'), 'financial.added', 'financial', rls_test.u('fin_a'), rls_test.u('gig')),
  (rls_test.u('org_b'), rls_test.u('b_admin'), 'kit.assigned', 'kit_assignment', rls_test.u('kga_b'), rls_test.u('gig')),
  (NULL,                rls_test.u('a_admin'), 'staffing.updated', 'staffing', rls_test.u('slot_a'), rls_test.u('gig'));

-- Shorthands
CREATE FUNCTION rls_test.id(p text) RETURNS text LANGUAGE sql STABLE AS $$ SELECT quote_literal(rls_test.u(p)) $$;
CREATE FUNCTION rls_test.sees(p_user text, p_table text, p_row text) RETURNS int LANGUAGE sql AS
  $$ SELECT rls_test.visible(rls_test.u(p_user), p_table, 'id = ' || rls_test.id(p_row)) $$;
CREATE FUNCTION rls_test.run(p_user text, p_sql text) RETURNS int LANGUAGE sql AS
  $$ SELECT rls_test.try(rls_test.u(p_user), p_sql) $$;

-- ── gig_staff_slots ─────────────────────────────────────────────────────────
SELECT rls_test.expect('slots: A admin sees A slot',                 rls_test.sees('a_admin', 'gig_staff_slots', 'slot_a'), 1);
SELECT rls_test.expect('slots: A viewer sees A slot',                rls_test.sees('a_viewer', 'gig_staff_slots', 'slot_a'), 1);
SELECT rls_test.expect('slots: B admin does NOT see A slot',         rls_test.sees('b_admin', 'gig_staff_slots', 'slot_a'), 0);
SELECT rls_test.expect('slots: A admin does NOT see B slot',         rls_test.sees('a_admin', 'gig_staff_slots', 'slot_b'), 0);
SELECT rls_test.expect('slots: B staff assigned to A slot sees it',  rls_test.sees('b_staff', 'gig_staff_slots', 'slot_a'), 1);
SELECT rls_test.expect('slots: B viewer does NOT see A slot',        rls_test.sees('b_viewer', 'gig_staff_slots', 'slot_a'), 0);
SELECT rls_test.expect('slots: C admin sees nothing',                rls_test.visible(rls_test.u('c_admin'), 'gig_staff_slots'), 0);
SELECT rls_test.expect('slots: A manager updates A slot',            rls_test.run('a_manager', 'UPDATE gig_staff_slots SET notes = ''x'' WHERE id = ' || rls_test.id('slot_a')), 1);
SELECT rls_test.expect('slots: A staff cannot update A slot',        rls_test.run('a_staff',   'UPDATE gig_staff_slots SET notes = ''x'' WHERE id = ' || rls_test.id('slot_a')), 0);
SELECT rls_test.expect('slots: B manager cannot update A slot',      rls_test.run('b_manager', 'UPDATE gig_staff_slots SET notes = ''x'' WHERE id = ' || rls_test.id('slot_a')), 0);
SELECT rls_test.expect('slots: B admin cannot delete A slot',        rls_test.run('b_admin',   'DELETE FROM gig_staff_slots WHERE id = ' || rls_test.id('slot_a')), 0);
SELECT rls_test.expect('slots: B admin cannot insert a slot for A',  rls_test.run('b_admin',
  format('INSERT INTO gig_staff_slots (gig_id, staff_role_id, organization_id) VALUES (%s, %s, %s)', rls_test.id('gig'), rls_test.id('role'), rls_test.id('org_a'))), -1);
SELECT rls_test.expect('slots: A admin inserts a slot for A',        rls_test.run('a_admin',
  format('INSERT INTO gig_staff_slots (gig_id, staff_role_id, organization_id) VALUES (%s, %s, %s)', rls_test.id('gig'), rls_test.id('role'), rls_test.id('org_a'))), 1);
SELECT rls_test.expect('slots: C admin cannot add a slot to a gig C is not on', rls_test.run('c_admin',
  format('INSERT INTO gig_staff_slots (gig_id, staff_role_id, organization_id) VALUES (%s, %s, %s)', rls_test.id('gig'), rls_test.id('role'), rls_test.id('org_c'))), -1);
SELECT rls_test.expect('slots: A admin cannot add an A slot to a gig A is not on', rls_test.run('a_admin',
  format('INSERT INTO gig_staff_slots (gig_id, staff_role_id, organization_id) VALUES (%s, %s, %s)', rls_test.id('gig_b_only'), rls_test.id('role'), rls_test.id('org_a'))), -1);
SELECT rls_test.expect('slots: A admin cannot hand A slot to B',     rls_test.run('a_admin',
  'UPDATE gig_staff_slots SET organization_id = ' || rls_test.id('org_b') || ' WHERE id = ' || rls_test.id('slot_a')), -1);
SELECT rls_test.expect('slots: organization_id is required',         rls_test.run('a_admin',
  format('INSERT INTO gig_staff_slots (gig_id, staff_role_id) VALUES (%s, %s)', rls_test.id('gig'), rls_test.id('role'))), -1);

-- ── gig_staff_assignments ───────────────────────────────────────────────────
SELECT rls_test.expect('assignments: A admin sees both on A slot',   rls_test.visible(rls_test.u('a_admin'), 'gig_staff_assignments', 'slot_id = ' || rls_test.id('slot_a')), 2);
SELECT rls_test.expect('assignments: B admin sees none on A slot (rate/fee)', rls_test.visible(rls_test.u('b_admin'), 'gig_staff_assignments', 'slot_id = ' || rls_test.id('slot_a')), 0);
SELECT rls_test.expect('assignments: B staff sees only own on A slot', rls_test.visible(rls_test.u('b_staff'), 'gig_staff_assignments', 'slot_id = ' || rls_test.id('slot_a')), 1);
SELECT rls_test.expect('assignments: A admin does NOT see B slot rows', rls_test.sees('a_admin', 'gig_staff_assignments', 'asg_b_own'), 0);
SELECT rls_test.expect('assignments: C admin sees nothing',          rls_test.visible(rls_test.u('c_admin'), 'gig_staff_assignments'), 0);
SELECT rls_test.expect('assignments: A manager completes A row',     rls_test.run('a_manager', 'UPDATE gig_staff_assignments SET completed_at = now(), units_completed = 1 WHERE id = ' || rls_test.id('asg_b_staff')), 1);
SELECT rls_test.expect('assignments: B manager cannot update A row', rls_test.run('b_manager', 'UPDATE gig_staff_assignments SET fee = 1 WHERE id = ' || rls_test.id('asg_b_staff')), 0);
SELECT rls_test.expect('assignments: B admin cannot book into A slot', rls_test.run('b_admin',
  format('INSERT INTO gig_staff_assignments (slot_id, user_id, status) VALUES (%s, %s, ''Requested'')', rls_test.id('slot_a'), rls_test.id('b_viewer'))), -1);
SELECT rls_test.expect('assignments: A admin books B staff into A slot', rls_test.run('a_admin',
  format('INSERT INTO gig_staff_assignments (slot_id, user_id, status) VALUES (%s, %s, ''Requested'')', rls_test.id('slot_a'), rls_test.id('b_viewer'))), 1);
-- Staff self-service: status/confirmed_at only.
SELECT rls_test.expect('self: B staff confirms own A-slot booking',  rls_test.run('b_staff', 'UPDATE gig_staff_assignments SET status = ''Confirmed'', confirmed_at = now() WHERE id = ' || rls_test.id('asg_b_staff')), 1);
SELECT rls_test.expect('self: A staff confirms own booking',         rls_test.run('a_staff', 'UPDATE gig_staff_assignments SET status = ''Declined'' WHERE id = ' || rls_test.id('asg_a_staff')), 1);
SELECT rls_test.expect('self: staff cannot set own completed_at',    rls_test.run('b_staff', 'UPDATE gig_staff_assignments SET completed_at = now() WHERE id = ' || rls_test.id('asg_b_staff')), -1);
SELECT rls_test.expect('self: staff cannot set own units_completed', rls_test.run('a_staff', 'UPDATE gig_staff_assignments SET units_completed = 8 WHERE id = ' || rls_test.id('asg_a_staff')), -1);
SELECT rls_test.expect('self: staff cannot link own ledger row',     rls_test.run('a_staff', 'UPDATE gig_staff_assignments SET gig_financial_id = ' || rls_test.id('fin_a') || ' WHERE id = ' || rls_test.id('asg_a_staff')), -1);
SELECT rls_test.expect('self: staff cannot change own rate',         rls_test.run('b_staff', 'UPDATE gig_staff_assignments SET rate = 999 WHERE id = ' || rls_test.id('asg_b_staff')), -1);
SELECT rls_test.expect('self: staff cannot change own fee',          rls_test.run('a_staff', 'UPDATE gig_staff_assignments SET fee = 999 WHERE id = ' || rls_test.id('asg_a_staff')), -1);
SELECT rls_test.expect('self: staff cannot move own booking',        rls_test.run('b_staff', 'UPDATE gig_staff_assignments SET slot_id = ' || rls_test.id('slot_b') || ' WHERE id = ' || rls_test.id('asg_b_staff')), -1);
SELECT rls_test.expect('self: staff cannot touch someone else''s',   rls_test.run('b_staff', 'UPDATE gig_staff_assignments SET status = ''Confirmed'' WHERE id = ' || rls_test.id('asg_a_staff')), 0);

-- ── gig_kit_assignments ─────────────────────────────────────────────────────
SELECT rls_test.expect('kits: A viewer sees A assignment',           rls_test.sees('a_viewer', 'gig_kit_assignments', 'kga_a'), 1);
SELECT rls_test.expect('kits: A admin does NOT see B assignment',    rls_test.sees('a_admin', 'gig_kit_assignments', 'kga_b'), 0);
SELECT rls_test.expect('kits: B admin does NOT see A assignment',    rls_test.sees('b_admin', 'gig_kit_assignments', 'kga_a'), 0);
SELECT rls_test.expect('kits: A manager updates A assignment',       rls_test.run('a_manager', 'UPDATE gig_kit_assignments SET notes = ''x'' WHERE id = ' || rls_test.id('kga_a')), 1);
SELECT rls_test.expect('kits: A staff cannot update A assignment',   rls_test.run('a_staff',   'UPDATE gig_kit_assignments SET notes = ''x'' WHERE id = ' || rls_test.id('kga_a')), 0);
SELECT rls_test.expect('kits: B manager cannot delete A assignment', rls_test.run('b_manager', 'DELETE FROM gig_kit_assignments WHERE id = ' || rls_test.id('kga_a')), 0);
SELECT rls_test.expect('kits: B admin cannot insert for A',          rls_test.run('b_admin',
  format('INSERT INTO gig_kit_assignments (organization_id, gig_id, kit_id, assigned_by) VALUES (%s, %s, %s, %s)', rls_test.id('org_a'), rls_test.id('gig'), rls_test.id('kit_a2'), rls_test.id('b_admin'))), -1);
SELECT rls_test.expect('kits: A admin inserts for A',                rls_test.run('a_admin',
  format('INSERT INTO gig_kit_assignments (organization_id, gig_id, kit_id, assigned_by) VALUES (%s, %s, %s, %s)', rls_test.id('org_a'), rls_test.id('gig'), rls_test.id('kit_a2'), rls_test.id('a_admin'))), 1);

SELECT rls_test.expect('kits: A admin cannot assign to a gig A is not on', rls_test.run('a_admin',
  format('INSERT INTO gig_kit_assignments (organization_id, gig_id, kit_id, assigned_by) VALUES (%s, %s, %s, %s)', rls_test.id('org_a'), rls_test.id('gig_b_only'), rls_test.id('kit_a2'), rls_test.id('a_admin'))), -1);

-- ── inventory_tracking ──────────────────────────────────────────────────────
SELECT rls_test.expect('inventory: A staff sees A scan',             rls_test.sees('a_staff', 'inventory_tracking', 'inv_a'), 1);
SELECT rls_test.expect('inventory: A staff does NOT see B scan',     rls_test.sees('a_staff', 'inventory_tracking', 'inv_b'), 0);
SELECT rls_test.expect('inventory: B staff does NOT see A scan',     rls_test.sees('b_staff', 'inventory_tracking', 'inv_a'), 0);
SELECT rls_test.expect('inventory: C admin sees nothing',            rls_test.visible(rls_test.u('c_admin'), 'inventory_tracking'), 0);
SELECT rls_test.expect('inventory: A staff records an A scan',       rls_test.run('a_staff',
  format('INSERT INTO inventory_tracking (organization_id, gig_id, kit_id, status) VALUES (%s, %s, %s, ''Checked In'')', rls_test.id('org_a'), rls_test.id('gig'), rls_test.id('kit_a'))), 1);
SELECT rls_test.expect('inventory: B staff cannot record an A scan', rls_test.run('b_staff',
  format('INSERT INTO inventory_tracking (organization_id, gig_id, kit_id, status) VALUES (%s, %s, %s, ''Checked In'')', rls_test.id('org_a'), rls_test.id('gig'), rls_test.id('kit_a'))), -1);
SELECT rls_test.expect('inventory: B admin cannot edit an A scan',   rls_test.run('b_admin', 'UPDATE inventory_tracking SET notes = ''x'' WHERE id = ' || rls_test.id('inv_a')), 0);
SELECT rls_test.expect('inventory: C admin cannot scan on a gig C is not on', rls_test.run('c_admin',
  format('INSERT INTO inventory_tracking (organization_id, gig_id, status) VALUES (%s, %s, ''Checked In'')', rls_test.id('org_c'), rls_test.id('gig'))), -1);

-- ── activity_log ────────────────────────────────────────────────────────────
-- Shared gig events (gig, participant, schedule_entry) are visible to every participant;
-- staffing / kit_assignment events only to the owning org; financial events only to its Admin/Manager.
SELECT rls_test.expect('history: B viewer sees shared gig event',    rls_test.visible(rls_test.u('b_viewer'), 'activity_log', 'entity_type = ''gig'''), 1);
SELECT rls_test.expect('history: B viewer sees participant event',   rls_test.visible(rls_test.u('b_viewer'), 'activity_log', 'entity_type = ''participant'''), 1);
SELECT rls_test.expect('history: A viewer sees B schedule event',    rls_test.visible(rls_test.u('a_viewer'), 'activity_log', 'entity_type = ''schedule_entry'''), 1);
SELECT rls_test.expect('history: B admin does NOT see A staffing',   rls_test.visible(rls_test.u('b_admin'), 'activity_log', 'entity_type = ''staffing'''), 0);
SELECT rls_test.expect('history: A staff sees A staffing (not org-less)', rls_test.visible(rls_test.u('a_staff'), 'activity_log', 'entity_type = ''staffing'''), 1);
SELECT rls_test.expect('history: B admin does NOT see A financial',  rls_test.visible(rls_test.u('b_admin'), 'activity_log', 'entity_type = ''financial'''), 0);
SELECT rls_test.expect('history: A staff does NOT see A financial',  rls_test.visible(rls_test.u('a_staff'), 'activity_log', 'entity_type = ''financial'''), 0);
SELECT rls_test.expect('history: A manager sees A financial',        rls_test.visible(rls_test.u('a_manager'), 'activity_log', 'entity_type = ''financial'''), 1);
SELECT rls_test.expect('history: A admin does NOT see B kit event',  rls_test.visible(rls_test.u('a_admin'), 'activity_log', 'entity_type = ''kit_assignment'''), 0);
SELECT rls_test.expect('history: B viewer sees B kit event',         rls_test.visible(rls_test.u('b_viewer'), 'activity_log', 'entity_type = ''kit_assignment'''), 1);
SELECT rls_test.expect('history: C admin sees nothing',              rls_test.visible(rls_test.u('c_admin'), 'activity_log'), 0);
SELECT rls_test.expect('log_activity: B cannot write an entry as A', rls_test.run('b_admin',
  format('SELECT log_activity(%s, ''staffing.updated'', ''staffing'', %s, %s, ''{}''::jsonb)', rls_test.id('org_a'), rls_test.id('slot_a'), rls_test.id('gig'))), -1);
SELECT rls_test.expect('log_activity: B writes its own entry',       rls_test.run('b_admin',
  format('SELECT log_activity(%s, ''staffing.updated'', ''staffing'', %s, %s, ''{}''::jsonb)', rls_test.id('org_b'), rls_test.id('slot_b'), rls_test.id('gig'))), 1);
SELECT rls_test.expect('log_activity: private event needs an org',   rls_test.run('a_admin',
  format('SELECT log_activity(NULL, ''financial.added'', ''financial'', %s, %s, ''{}''::jsonb)', rls_test.id('fin_a'), rls_test.id('gig'))), -1);
SELECT rls_test.expect('log_activity: shared event without org ok',  rls_test.run('a_admin',
  format('SELECT log_activity(NULL, ''participant.added'', ''participant'', %s, %s, ''{}''::jsonb)', rls_test.id('org_b'), rls_test.id('gig'))), 1);

-- ── create_gig_complex (SECURITY DEFINER, bypasses RLS) ─────────────────────
SELECT rls_test.expect('create_gig_complex: cannot create a slot for another org', rls_test.run('a_admin', format(
  $q$SELECT create_gig_complex(jsonb_build_object('title','t','start',now(),'end',now(),'primary_organization_id',%s),
       jsonb_build_array(jsonb_build_object('organization_id',%s,'role','Production'), jsonb_build_object('organization_id',%s,'role','Sound')),
       jsonb_build_array(jsonb_build_object('organization_id',%s,'role','RLS test role')))$q$,
  rls_test.id('org_a'), rls_test.id('org_a'), rls_test.id('org_b'), rls_test.id('org_b'))), -1);
SELECT rls_test.expect('create_gig_complex: own-org slot ok', rls_test.run('a_admin', format(
  $q$SELECT create_gig_complex(jsonb_build_object('title','t','start',now(),'end',now(),'primary_organization_id',%s),
       jsonb_build_array(jsonb_build_object('organization_id',%s,'role','Production')),
       jsonb_build_array(jsonb_build_object('organization_id',%s,'role','RLS test role')))$q$,
  rls_test.id('org_a'), rls_test.id('org_a'), rls_test.id('org_a'))), 1);

-- ── No gig-scoped fallback left behind ──────────────────────────────────────
-- Permissive policies OR together, so one leftover gig-scoped policy would
-- undo everything above (that is how the gig_financials leak happened).
SELECT rls_test.expect('no gig-scoped policies left on org-private tables', (
  SELECT count(*)::int FROM pg_policies
  WHERE tablename IN ('gig_staff_slots', 'gig_staff_assignments', 'gig_kit_assignments', 'inventory_tracking', 'gig_financials')
    AND (coalesce(qual, '') || coalesce(with_check, '')) ~ '(user_can_manage_gig|user_has_access_to_gig)\('), 0);
