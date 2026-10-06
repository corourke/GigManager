-- Category lists per organization, with starter sets only platform moderators see (10-06).
--   schedule_c_lines: the IRS lines, read-only reference for every signed-in user
--   expense_categories / equipment_categories: rows with an organization belong to it;
--   rows without one are the starter sets, copied into an organization on first use
-- Checks read as: rls_test.expect(label, <rows seen or affected, -1 = rejected>, expected).

-- c_admin doubles as the platform moderator.
UPDATE users SET platform_moderator = true WHERE id = rls_test.u('c_admin');

SELECT rls_test.expect('Anyone signed in reads the Schedule C lines',
  rls_test.visible(rls_test.u('a_staff'), 'schedule_c_lines', 'code = ''27b'''), 1);
SELECT rls_test.expect('Nobody changes them',
  rls_test.try(rls_test.u('c_admin'), $$UPDATE schedule_c_lines SET label = 'x'$$), 0);

-- Starter sets
SELECT rls_test.expect('An org Admin can''t see the expense starter set',
  rls_test.visible(rls_test.u('a_admin'), 'expense_categories', 'organization_id IS NULL'), 0);
SELECT rls_test.expect('An org Admin can''t see the equipment starter set',
  rls_test.visible(rls_test.u('a_admin'), 'equipment_categories', 'organization_id IS NULL'), 0);
SELECT rls_test.expect('A moderator sees the expense starter set',
  (rls_test.visible(rls_test.u('c_admin'), 'expense_categories', 'organization_id IS NULL') > 20)::int, 1);
SELECT rls_test.expect('A moderator sees the equipment starter set',
  (rls_test.visible(rls_test.u('c_admin'), 'equipment_categories', 'organization_id IS NULL') > 10)::int, 1);
SELECT rls_test.expect('An org Admin can''t add to a starter set',
  rls_test.try(rls_test.u('a_admin'), $$INSERT INTO equipment_categories (name, sort_order) VALUES ('Mine', 1)$$), -1);
SELECT rls_test.expect('A moderator can add to a starter set',
  rls_test.try(rls_test.u('c_admin'), $$INSERT INTO equipment_categories (name, sort_order) VALUES ('Drones', 990)$$), 1);
SELECT rls_test.expect('A moderator can change a starter category',
  rls_test.try(rls_test.u('c_admin'), $$UPDATE expense_categories SET active = false WHERE organization_id IS NULL AND name = 'Interest'$$), 1);

-- First use copies the starter sets into the organization
SELECT rls_test.expect('Another org''s Admin can''t set up org A''s lists',
  rls_test.try(rls_test.u('b_admin'), format('SELECT public.ensure_org_categories(%L)', rls_test.u('org_a'))), -1);
SELECT rls_test.expect('Org A has no lists yet',
  (SELECT count(*)::int FROM expense_categories WHERE organization_id = rls_test.u('org_a')), 0);
SELECT set_config('request.jwt.claim.sub', rls_test.u('a_manager')::text, true);
SELECT public.ensure_org_categories(rls_test.u('org_a'));
SELECT public.ensure_org_categories(rls_test.u('org_a'));  -- a second call changes nothing
SELECT rls_test.expect('A Manager''s first visit copies the expense starter set, once',
  (SELECT count(*)::int FROM expense_categories WHERE organization_id = rls_test.u('org_a')),
  (SELECT count(*)::int FROM expense_categories WHERE organization_id IS NULL));
SELECT rls_test.expect('...and the equipment starter set',
  (SELECT count(*)::int FROM equipment_categories WHERE organization_id = rls_test.u('org_a')),
  (SELECT count(*)::int FROM equipment_categories WHERE organization_id IS NULL));

-- An organization's own lists
SELECT rls_test.expect('A Manager reads the org''s expense categories',
  (rls_test.visible(rls_test.u('a_manager'), 'expense_categories', format('organization_id = %L', rls_test.u('org_a'))) > 20)::int, 1);
SELECT rls_test.expect('Staff don''t see expense categories',
  rls_test.visible(rls_test.u('a_staff'), 'expense_categories', format('organization_id = %L', rls_test.u('org_a'))), 0);
SELECT rls_test.expect('Staff see equipment categories',
  (rls_test.visible(rls_test.u('a_staff'), 'equipment_categories', format('organization_id = %L', rls_test.u('org_a'))) > 10)::int, 1);
SELECT rls_test.expect('Another org sees none of them',
  rls_test.visible(rls_test.u('b_admin'), 'equipment_categories', format('organization_id = %L', rls_test.u('org_a'))), 0);
SELECT rls_test.expect('A Manager can''t change them',
  rls_test.try(rls_test.u('a_manager'), format($$INSERT INTO equipment_categories (organization_id, name, sort_order) VALUES (%L, 'Drones', 1)$$, rls_test.u('org_a'))), -1);
SELECT rls_test.expect('An Admin adds one',
  rls_test.try(rls_test.u('a_admin'), format($$INSERT INTO equipment_categories (organization_id, name, sort_order) VALUES (%L, 'Drones', 1)$$, rls_test.u('org_a'))), 1);
SELECT rls_test.expect('An Admin turns one off',
  rls_test.try(rls_test.u('a_admin'), format($$UPDATE expense_categories SET active = false WHERE organization_id = %L AND name = 'Interest'$$, rls_test.u('org_a'))), 1);
SELECT rls_test.expect('Names are unique within an org',
  rls_test.try(rls_test.u('a_admin'), format($$INSERT INTO expense_categories (organization_id, name, sort_order) VALUES (%L, 'interest', 1)$$, rls_test.u('org_a'))), -1);
SELECT rls_test.expect('A category''s Schedule C line must be a real line',
  rls_test.try(rls_test.u('a_admin'), format($$INSERT INTO expense_categories (organization_id, name, sort_order, schedule_c_line) VALUES (%L, 'Odd', 1, '99')$$, rls_test.u('org_a'))), -1);

-- Carried over from 42 (the shared list it tested became per organization here)
SELECT rls_test.expect('Not signed in: no expense categories',
  rls_test.try_anon('SELECT * FROM expense_categories'), 0);
SELECT rls_test.expect('Not signed in: no equipment categories',
  rls_test.try_anon('SELECT * FROM equipment_categories'), 0);
SELECT rls_test.expect('Every starter expense category is filed on a Schedule C line',
  (SELECT count(*)::int FROM expense_categories WHERE organization_id IS NULL AND schedule_c_line IS NULL), 0);
