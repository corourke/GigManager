-- Purchases → Scan invoices (10-01): invoices waiting to be scanned or reviewed
-- belong to one org. Only that org's Admins and Managers see or change them, as
-- with purchases, and a queued invoice can only point at its own org's file.
-- Checks read as: rls_test.expect(label, <rows seen or affected, -1 = rejected>, expected).

INSERT INTO rls_test.ids VALUES
  ('att_a', '00000000-0000-0000-0000-00000000aa01'),
  ('att_a2', '00000000-0000-0000-0000-00000000aa02'),
  ('att_b', '00000000-0000-0000-0000-00000000ab01'),
  ('q_a', '00000000-0000-0000-0000-00000000ba01'),
  ('q_b', '00000000-0000-0000-0000-00000000bb01');

INSERT INTO attachments (id, organization_id, file_path, file_name, created_by) VALUES
  (rls_test.u('att_a'),  rls_test.u('org_a'), 'org_a/inv1.pdf', 'inv1.pdf', rls_test.u('a_admin')),
  (rls_test.u('att_a2'), rls_test.u('org_a'), 'org_a/inv2.pdf', 'inv2.pdf', rls_test.u('a_admin')),
  (rls_test.u('att_b'),  rls_test.u('org_b'), 'org_b/inv.pdf',  'inv.pdf',  rls_test.u('b_admin'));
INSERT INTO purchase_scan_queue (id, organization_id, attachment_id, file_name) VALUES
  (rls_test.u('q_a'), rls_test.u('org_a'), rls_test.u('att_a'), 'inv1.pdf'),
  (rls_test.u('q_b'), rls_test.u('org_b'), rls_test.u('att_b'), 'inv.pdf');

CREATE FUNCTION rls_test.id(p text) RETURNS text LANGUAGE sql STABLE AS $$ SELECT quote_literal(rls_test.u(p)) $$;
CREATE FUNCTION rls_test.sees(p_user text, p_row text) RETURNS int LANGUAGE sql AS
  $$ SELECT rls_test.visible(rls_test.u(p_user), 'purchase_scan_queue', 'id = ' || rls_test.id(p_row)) $$;
CREATE FUNCTION rls_test.run(p_user text, p_sql text) RETURNS int LANGUAGE sql AS
  $$ SELECT rls_test.try(rls_test.u(p_user), p_sql) $$;

-- Reading
SELECT rls_test.expect('A admin sees A queue item',          rls_test.sees('a_admin', 'q_a'), 1);
SELECT rls_test.expect('A manager sees A queue item',        rls_test.sees('a_manager', 'q_a'), 1);
SELECT rls_test.expect('A staff does NOT see A queue item',  rls_test.sees('a_staff', 'q_a'), 0);
SELECT rls_test.expect('A viewer does NOT see A queue item', rls_test.sees('a_viewer', 'q_a'), 0);
SELECT rls_test.expect('B admin does NOT see A queue item',  rls_test.sees('b_admin', 'q_a'), 0);
SELECT rls_test.expect('C admin does NOT see A queue item',  rls_test.sees('c_admin', 'q_a'), 0);

-- Adding
SELECT rls_test.expect('A manager can queue an A invoice',
  rls_test.run('a_manager', format('INSERT INTO purchase_scan_queue (organization_id, attachment_id, file_name) VALUES (%s, %s, %L)',
    rls_test.id('org_a'), rls_test.id('att_a2'), 'inv2.pdf')), 1);
SELECT rls_test.expect('A staff cannot queue an invoice',
  rls_test.run('a_staff', format('INSERT INTO purchase_scan_queue (organization_id, attachment_id, file_name) VALUES (%s, %s, %L)',
    rls_test.id('org_a'), rls_test.id('att_a2'), 'inv2.pdf')), -1);
SELECT rls_test.expect('B admin cannot queue into org A',
  rls_test.run('b_admin', format('INSERT INTO purchase_scan_queue (organization_id, attachment_id, file_name) VALUES (%s, %s, %L)',
    rls_test.id('org_a'), rls_test.id('att_b'), 'inv.pdf')), -1);
SELECT rls_test.expect('A admin cannot queue org B''s file under org A',
  rls_test.run('a_admin', format('INSERT INTO purchase_scan_queue (organization_id, attachment_id, file_name) VALUES (%s, %s, %L)',
    rls_test.id('org_a'), rls_test.id('att_b'), 'inv.pdf')), -1);

-- Changing and removing
SELECT rls_test.expect('A admin can mark an A item failed',
  rls_test.run('a_admin', format('UPDATE purchase_scan_queue SET status = %L WHERE id = %s', 'failed', rls_test.id('q_a'))), 1);
SELECT rls_test.expect('A admin cannot point an A item at B''s file',
  rls_test.run('a_admin', format('UPDATE purchase_scan_queue SET attachment_id = %s WHERE id = %s', rls_test.id('att_b'), rls_test.id('q_a'))), -1);
SELECT rls_test.expect('A admin cannot move an A item to org B',
  rls_test.run('a_admin', format('UPDATE purchase_scan_queue SET organization_id = %s WHERE id = %s', rls_test.id('org_b'), rls_test.id('q_a'))), -1);
SELECT rls_test.expect('Status must be one of the four',
  rls_test.run('a_admin', format('UPDATE purchase_scan_queue SET status = %L WHERE id = %s', 'done', rls_test.id('q_a'))), -1);
SELECT rls_test.expect('B admin cannot change an A item',
  rls_test.run('b_admin', format('UPDATE purchase_scan_queue SET status = %L WHERE id = %s', 'ready', rls_test.id('q_a'))), 0);
SELECT rls_test.expect('A viewer cannot remove an A item',
  rls_test.run('a_viewer', format('DELETE FROM purchase_scan_queue WHERE id = %s', rls_test.id('q_a'))), 0);
SELECT rls_test.expect('A manager can remove an A item',
  rls_test.run('a_manager', format('DELETE FROM purchase_scan_queue WHERE id = %s', rls_test.id('q_a'))), 1);

-- Not reachable signed out
SELECT rls_test.expect('Signed-out users see nothing',
  rls_test.try_anon('SELECT 1 FROM purchase_scan_queue'), -1);

