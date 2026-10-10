-- #185 PR 2: kits added at pack-out, and equipment status changes take Staff or above.
-- Staff, Managers and Admins can add a kit to a gig at pack-out (a flagged assignment) and remove
-- one they added. Every other change to assignments stays with Admins and Managers.
-- Checks read as: rls_test.expect(label, <rows seen or affected, -1 = rejected>, expected).

CREATE FUNCTION rls_test.id(p text) RETURNS text LANGUAGE sql STABLE AS $$ SELECT quote_literal(rls_test.u(p)) $$;
CREATE FUNCTION rls_test.run(p_user text, p_sql text) RETURNS int LANGUAGE sql AS
  $$ SELECT rls_test.try(rls_test.u(p_user), p_sql) $$;
CREATE FUNCTION rls_test.as_user(p_user text) RETURNS void LANGUAGE sql AS
  $$ SELECT set_config('request.jwt.claim.sub', rls_test.u(p_user)::text, true) $$;

INSERT INTO rls_test.ids VALUES
  ('kit_a2', '00000000-0000-0000-0000-0000000000c2'),
  ('kit_a3', '00000000-0000-0000-0000-0000000000c3'),
  ('kit_a4', '00000000-0000-0000-0000-0000000000c4'),
  ('kit_a5', '00000000-0000-0000-0000-0000000000c5'),
  ('kit_c',  '00000000-0000-0000-0000-0000000000cc'),
  ('unit_s', '00000000-0000-0000-0000-00000000d001'),
  ('unit_m', '00000000-0000-0000-0000-00000000d002');
INSERT INTO kits (id, organization_id, name, created_by, updated_by) VALUES
  (rls_test.u('kit_a2'), rls_test.u('org_a'), 'A spare kit', rls_test.u('a_admin'), rls_test.u('a_admin')),
  (rls_test.u('kit_a3'), rls_test.u('org_a'), 'A drum kit', rls_test.u('a_admin'), rls_test.u('a_admin')),
  (rls_test.u('kit_a4'), rls_test.u('org_a'), 'A light kit', rls_test.u('a_admin'), rls_test.u('a_admin')),
  (rls_test.u('kit_a5'), rls_test.u('org_a'), 'A cable kit', rls_test.u('a_admin'), rls_test.u('a_admin')),
  (rls_test.u('kit_c'),  rls_test.u('org_c'), 'C kit', rls_test.u('c_admin'), rls_test.u('c_admin'));
INSERT INTO assets (id, organization_id, acquisition_date, category, manufacturer_model, quantity, tag_number, status, created_by, updated_by)
VALUES (rls_test.u('unit_s'), rls_test.u('org_a'), DATE '2026-01-15', 'Audio', 'QSC K12.2', 1, 'S-1', 'Active', rls_test.u('a_admin'), rls_test.u('a_admin')),
       (rls_test.u('unit_m'), rls_test.u('org_a'), DATE '2026-01-15', 'Audio', 'QSC K12.2', 1, 'S-2', 'Maintenance', rls_test.u('a_admin'), rls_test.u('a_admin'));

CREATE FUNCTION rls_test.add_kit(p_org text, p_kit text, p_by text, p_flag boolean) RETURNS text LANGUAGE sql AS $$
  SELECT format('INSERT INTO gig_kit_assignments (organization_id, gig_id, kit_id, assigned_by, added_at_pack_out) VALUES (%s, %s, %s, %s, %s)',
    rls_test.id(p_org), rls_test.id('gig'), rls_test.id(p_kit), rls_test.id(p_by), quote_literal(p_flag)) $$;
CREATE FUNCTION rls_test.set_status(p_asset text, p_status text) RETURNS text LANGUAGE sql AS $$
  SELECT format('SELECT public.update_asset_status(%L, %L)', rls_test.u(p_asset), p_status) $$;

-- 1. Adding a kit at pack-out -------------------------------------------------------------------
SELECT rls_test.expect('Staff can add a kit at pack-out',
  rls_test.run('a_staff', rls_test.add_kit('org_a', 'kit_a2', 'a_staff', true)), 1);
SELECT rls_test.expect('A manager can add one too',
  rls_test.run('a_manager', rls_test.add_kit('org_a', 'kit_a2', 'a_manager', true)), 1);
SELECT rls_test.expect('Staff can''t add a kit that isn''t marked as a pack-out addition',
  rls_test.run('a_staff', rls_test.add_kit('org_a', 'kit_a2', 'a_staff', false)), -1);
SELECT rls_test.expect('Staff can''t add another organization''s kit',
  rls_test.run('a_staff', rls_test.add_kit('org_a', 'kit_b', 'a_staff', true)), -1);
SELECT rls_test.expect('Staff can''t add a kit under someone else''s name',
  rls_test.run('a_staff', rls_test.add_kit('org_a', 'kit_a2', 'a_manager', true)), -1);
SELECT rls_test.expect('Staff can''t add a kit to a gig their organization isn''t on',
  rls_test.run('c_staff', rls_test.add_kit('org_c', 'kit_c', 'c_staff', true)), -1);
SELECT rls_test.expect('Staff can''t add for another organization',
  rls_test.run('a_staff', rls_test.add_kit('org_b', 'kit_b', 'a_staff', true)), -1);
SELECT rls_test.expect('A viewer can''t add a kit',
  rls_test.run('a_viewer', rls_test.add_kit('org_a', 'kit_a2', 'a_viewer', true)), -1);

-- 2. Removing one: only your own pack-out addition --------------------------------------------
SELECT set_config('request.jwt.claim.sub', '', true);
INSERT INTO gig_kit_assignments (organization_id, gig_id, kit_id, assigned_by, added_at_pack_out) VALUES
  (rls_test.u('org_a'), rls_test.u('gig'), rls_test.u('kit_a2'), rls_test.u('a_staff'), true),
  (rls_test.u('org_a'), rls_test.u('gig'), rls_test.u('kit_a3'), rls_test.u('a_manager'), true),
  (rls_test.u('org_a'), rls_test.u('gig'), rls_test.u('kit_a4'), rls_test.u('a_staff'), false);
CREATE FUNCTION rls_test.remove_kit(p_kit text) RETURNS text LANGUAGE sql AS $$
  SELECT format('DELETE FROM gig_kit_assignments WHERE gig_id = %s AND kit_id = %s', rls_test.id('gig'), rls_test.id(p_kit)) $$;

SELECT rls_test.expect('Staff can remove a kit they added at pack-out', rls_test.run('a_staff', rls_test.remove_kit('kit_a2')), 1);
SELECT rls_test.expect('Staff can''t remove someone else''s pack-out addition', rls_test.run('a_staff', rls_test.remove_kit('kit_a3')), 0);
SELECT rls_test.expect('Staff can''t remove a planned assignment, even one they made', rls_test.run('a_staff', rls_test.remove_kit('kit_a4')), 0);
SELECT rls_test.expect('Staff can''t change a pack-out addition', rls_test.run('a_staff',
  format('UPDATE gig_kit_assignments SET notes = %L WHERE kit_id = %s', 'x', rls_test.id('kit_a2'))), 0);
SELECT rls_test.expect('A manager can still manage every assignment', rls_test.run('a_manager', rls_test.remove_kit('kit_a4')), 1);

-- Someone who is no longer Staff can't remove what they added.
UPDATE organization_members SET role = 'Viewer' WHERE organization_id = rls_test.u('org_a') AND user_id = rls_test.u('a_staff');
SELECT rls_test.expect('A former Staff member can''t remove their pack-out addition', rls_test.run('a_staff', rls_test.remove_kit('kit_a2')), 0);
UPDATE organization_members SET role = 'Staff' WHERE organization_id = rls_test.u('org_a') AND user_id = rls_test.u('a_staff');

-- 3. Equipment status changes take Staff or above ------------------------------------------
SELECT rls_test.expect('A viewer can''t change a status', rls_test.run('a_viewer', rls_test.set_status('unit_s', 'Maintenance')), -1);
SELECT rls_test.expect('A viewer can''t bring equipment back from maintenance', rls_test.run('a_viewer', rls_test.set_status('unit_m', 'Active')), -1);
SELECT rls_test.expect('Staff can mark equipment for maintenance', rls_test.run('a_staff', rls_test.set_status('unit_s', 'Maintenance')), 1);
SELECT rls_test.expect('Staff can mark it inactive', rls_test.run('a_staff', rls_test.set_status('unit_s', 'Inactive')), 1);
SELECT rls_test.expect('Staff can bring it back from maintenance', rls_test.run('a_staff', rls_test.set_status('unit_m', 'Active')), 1);
SELECT rls_test.expect('Staff still can''t mark it Disposed', rls_test.run('a_staff', rls_test.set_status('unit_s', 'Disposed')), -1);
SELECT rls_test.expect('A manager still can', rls_test.run('a_manager', rls_test.set_status('unit_s', 'Disposed')), 1);
SELECT rls_test.expect('Missing is still set only by a write-off', rls_test.run('a_admin', rls_test.set_status('unit_s', 'Missing')), -1);
SELECT rls_test.expect('Another organization''s Staff can''t change it', rls_test.run('b_staff', rls_test.set_status('unit_s', 'Maintenance')), -1);
SELECT rls_test.expect('The status helper is for signed-in users only',
  (SELECT count(*)::int FROM information_schema.routine_privileges
    WHERE routine_name IN ('update_asset_status', 'user_is_staff_or_above_of_org') AND grantee IN ('PUBLIC', 'anon') AND privilege_type = 'EXECUTE'), 0);
