-- #171 (10-08): a staff assignment's rate carries a time unit: hour, day or
-- half_day. Existing rows read as hourly, which is what the app always showed.
-- A fee stays a flat amount. Staff still can't change their own pay terms.
-- Checks read as: rls_test.expect(label, <rows seen or affected, -1 = rejected>, expected).

INSERT INTO rls_test.ids VALUES
  ('ru_slot', '00000000-0000-0000-0000-0000000015a1'),
  ('ru_asg',  '00000000-0000-0000-0000-0000000016a1');

INSERT INTO gig_staff_slots (id, gig_id, staff_role_id, organization_id) VALUES
  (rls_test.u('ru_slot'), rls_test.u('gig'), rls_test.u('role'), rls_test.u('org_a'));
-- Inserted without a unit, as every row written before this change was.
INSERT INTO gig_staff_assignments (id, slot_id, user_id, status, rate) VALUES
  (rls_test.u('ru_asg'), rls_test.u('ru_slot'), rls_test.u('a_staff'), 'Requested', 50);

CREATE FUNCTION rls_test.id(p text) RETURNS text LANGUAGE sql STABLE AS $$ SELECT quote_literal(rls_test.u(p)) $$;
CREATE FUNCTION rls_test.run(p_user text, p_sql text) RETURNS int LANGUAGE sql AS
  $$ SELECT rls_test.try(rls_test.u(p_user), p_sql) $$;
CREATE FUNCTION rls_test.set_unit(p_user text, p_unit text) RETURNS int LANGUAGE sql AS
  $$ SELECT rls_test.run(p_user, format('UPDATE gig_staff_assignments SET rate_unit = %L WHERE id = %s', p_unit, rls_test.id('ru_asg'))) $$;

-- 1. Column -----------------------------------------------------------------------
SELECT rls_test.expect('Assignments have a rate_unit',
  (SELECT count(*)::int FROM information_schema.columns
    WHERE table_name = 'gig_staff_assignments' AND column_name = 'rate_unit' AND is_nullable = 'NO'), 1);
SELECT rls_test.expect('An assignment written without a unit is hourly',
  (SELECT count(*)::int FROM gig_staff_assignments WHERE id = rls_test.u('ru_asg') AND rate_unit = 'hour'), 1);

-- 2. Values (as the slot org's Manager, who manages assignments) -------------------
SELECT rls_test.expect('Manager sets day',      rls_test.set_unit('a_manager', 'day'), 1);
SELECT rls_test.expect('Manager sets half_day', rls_test.set_unit('a_manager', 'half_day'), 1);
SELECT rls_test.expect('Manager sets hour',     rls_test.set_unit('a_manager', 'hour'), 1);
SELECT rls_test.expect('week is rejected',      rls_test.set_unit('a_manager', 'week'), -1);
SELECT rls_test.expect('Hr is rejected',        rls_test.set_unit('a_manager', 'Hr'), -1);
SELECT rls_test.expect('null is rejected',      rls_test.run('a_manager',
  'UPDATE gig_staff_assignments SET rate_unit = NULL WHERE id = ' || rls_test.id('ru_asg')), -1);
SELECT rls_test.expect('Manager books with a day rate', rls_test.run('a_manager',
  format('INSERT INTO gig_staff_assignments (slot_id, user_id, status, rate, rate_unit) VALUES (%s, %s, ''Requested'', 400, ''day'')',
         rls_test.id('ru_slot'), rls_test.id('a_viewer'))), 1);

-- 3. Existing access is unchanged --------------------------------------------------
SELECT rls_test.expect('Other org Manager cannot change the unit', rls_test.set_unit('b_manager', 'day'), 0);
SELECT rls_test.expect('Staff cannot change their own unit',       rls_test.set_unit('a_staff', 'day'), -1);
SELECT rls_test.expect('Staff still confirm their own booking',    rls_test.run('a_staff',
  'UPDATE gig_staff_assignments SET status = ''Confirmed'', confirmed_at = now() WHERE id = ' || rls_test.id('ru_asg')), 1);
SELECT rls_test.expect('Other org Admin still cannot book into the slot', rls_test.run('b_admin',
  format('INSERT INTO gig_staff_assignments (slot_id, user_id, status, rate_unit) VALUES (%s, %s, ''Requested'', ''day'')',
         rls_test.id('ru_slot'), rls_test.id('b_viewer'))), -1);
