-- #185: writing off missing pieces, and undoing it (Cameron, 10-09).
-- Only Admins and Managers can write off or undo. A whole unit or lot becomes Missing with
-- retired_on = today; part of a lot is split off into its own Missing record. Undo is refused
-- once the write-off's tax year is locked. Tracking rows reference their own organization's
-- equipment (data integrity).
-- Checks read as: rls_test.expect(label, <rows seen or affected, -1 = rejected>, expected).

CREATE FUNCTION rls_test.id(p text) RETURNS text LANGUAGE sql STABLE AS $$ SELECT quote_literal(rls_test.u(p)) $$;
CREATE FUNCTION rls_test.run(p_user text, p_sql text) RETURNS int LANGUAGE sql AS
  $$ SELECT rls_test.try(rls_test.u(p_user), p_sql) $$;
CREATE FUNCTION rls_test.as_user(p_user text) RETURNS void LANGUAGE sql AS
  $$ SELECT set_config('request.jwt.claim.sub', rls_test.u(p_user)::text, true) $$;

INSERT INTO rls_test.ids VALUES
  ('unit_a',  '00000000-0000-0000-0000-00000000a001'),
  ('unit_a2', '00000000-0000-0000-0000-00000000a002'),
  ('unit_a3', '00000000-0000-0000-0000-00000000a003'),
  ('lot_a',   '00000000-0000-0000-0000-00000000a010'),
  ('lot_a2',  '00000000-0000-0000-0000-00000000a011'),
  ('unit_b',  '00000000-0000-0000-0000-00000000b001');

INSERT INTO assets (id, organization_id, acquisition_date, category, manufacturer_model, quantity, serial_number, tag_number,
                    item_cost, replacement_value, status, created_by, updated_by)
SELECT rls_test.u(name), rls_test.u(org), DATE '2026-01-15', 'Audio', model, qty, NULL, tag, 900, 1049, 'Active',
       rls_test.u(CASE WHEN org = 'org_a' THEN 'a_admin' ELSE 'b_admin' END),
       rls_test.u(CASE WHEN org = 'org_a' THEN 'a_admin' ELSE 'b_admin' END)
FROM (VALUES ('unit_a', 'org_a', 'QSC K12.2', 1, 'DSL-0101'), ('unit_a2', 'org_a', 'QSC K12.2', 1, 'DSL-0102'),
             ('unit_a3', 'org_a', 'QSC K12.2', 1, 'DSL-0103'),
             ('lot_a', 'org_a', 'XLR Cable, 50 ft', 10, NULL), ('lot_a2', 'org_a', 'Speaker Stand', 6, NULL),
             ('unit_b', 'org_b', 'PD-20', 1, 'B-0001')) v(name, org, model, qty, tag);

-- Both lots are out at the shared gig under A's kit: 4 cables, 4 stands.
INSERT INTO inventory_tracking (organization_id, gig_id, kit_id, asset_id, status, quantity, scanned_at) VALUES
  (rls_test.u('org_a'), rls_test.u('gig'), rls_test.u('kit_a'), rls_test.u('lot_a'),  'On Site', 4, now() - interval '1 hour'),
  (rls_test.u('org_a'), rls_test.u('gig'), rls_test.u('kit_a'), rls_test.u('lot_a2'), 'On Site', 4, now() - interval '1 hour');

CREATE FUNCTION rls_test.write_off(p_asset text, p_qty numeric, p_still_out numeric DEFAULT 0) RETURNS text LANGUAGE sql AS $$
  SELECT format('SELECT public.write_off_pieces(%L, %s, %L, %L, %s, %L)',
    rls_test.u(p_asset), p_qty, rls_test.u('gig'), rls_test.u('kit_a'), p_still_out, 'not back from the gig') $$;
CREATE FUNCTION rls_test.undo(p_id uuid) RETURNS text LANGUAGE sql AS $$
  SELECT format('SELECT public.undo_write_off(%L)', p_id) $$;
CREATE FUNCTION rls_test.newest_row(p_asset text) RETURNS inventory_tracking LANGUAGE sql AS $$
  SELECT * FROM inventory_tracking WHERE asset_id = rls_test.u(p_asset) AND kit_id = rls_test.u('kit_a')
  ORDER BY scanned_at DESC, created_at DESC, id DESC LIMIT 1 $$;

-- 1. Who can write off ---------------------------------------------------------------------
SELECT rls_test.expect('A staff can''t write off',  rls_test.run('a_staff',  rls_test.write_off('unit_a', 1)), -1);
SELECT rls_test.expect('A viewer can''t write off', rls_test.run('a_viewer', rls_test.write_off('unit_a', 1)), -1);
SELECT rls_test.expect('B admin can''t write off A''s equipment', rls_test.run('b_admin', rls_test.write_off('unit_a', 1)), -1);
SELECT rls_test.expect('A manager can write off', rls_test.run('a_manager', rls_test.write_off('unit_a', 1)), 1);
SELECT rls_test.expect('Nothing changed for the refused callers',
  (SELECT count(*)::int FROM assets WHERE status = 'Missing'), 0);

-- 2. A unit: Missing, retired today ----------------------------------------------------------
SELECT rls_test.as_user('a_manager');
SELECT public.write_off_pieces(rls_test.u('unit_a'), 1, rls_test.u('gig'), NULL, 0, 'lost at load-out');
SELECT rls_test.expect('The unit is Missing, retired today',
  (SELECT count(*)::int FROM assets WHERE id = rls_test.u('unit_a') AND status = 'Missing' AND retired_on = current_date), 1);
SELECT rls_test.expect('The write-off is in the activity log',
  (SELECT count(*)::int FROM activity_log WHERE event_type = 'asset.written_off' AND entity_id = rls_test.u('unit_a')
     AND gig_id = rls_test.u('gig') AND (context->>'quantity')::numeric = 1), 1);
SELECT rls_test.expect('A Missing record can''t be written off again',
  rls_test.run('a_manager', rls_test.write_off('unit_a', 1)), -1);
SELECT rls_test.expect('A unit is one piece', rls_test.run('a_manager', rls_test.write_off('unit_a2', 2)), -1);

-- 3. Part of a lot: split off, the bucket closed ----------------------------------------------
SELECT public.write_off_pieces(rls_test.u('lot_a'), 1, rls_test.u('gig'), rls_test.u('kit_a'), 0, 'one cable missing');
SELECT rls_test.expect('The lot keeps 9',
  (SELECT count(*)::int FROM assets WHERE id = rls_test.u('lot_a') AND quantity = 9 AND status = 'Active' AND retired_on IS NULL), 1);
SELECT rls_test.expect('One piece is split off as a Missing record of the same item, with the same values',
  (SELECT count(*)::int FROM assets m JOIN assets o ON o.id = rls_test.u('lot_a')
    WHERE m.id <> o.id AND m.equipment_item_id = o.equipment_item_id AND m.quantity = 1 AND m.status = 'Missing'
      AND m.retired_on = current_date AND m.item_cost = o.item_cost AND m.replacement_value = o.replacement_value
      AND m.acquisition_date = o.acquisition_date AND m.organization_id = o.organization_id), 1);
SELECT rls_test.expect('The lot''s pieces still add up to 10',
  (SELECT sum(quantity)::int FROM assets WHERE manufacturer_model = 'XLR Cable, 50 ft'), 10);
SELECT rls_test.expect('The gig''s kit bucket is closed with a return row',
  (SELECT count(*)::int FROM rls_test.newest_row('lot_a') WHERE status = 'In Warehouse'), 1);

-- With pieces still left at the gig, the bucket keeps them out instead.
SELECT public.write_off_pieces(rls_test.u('lot_a2'), 1, rls_test.u('gig'), rls_test.u('kit_a'), 2, 'one stand missing');
SELECT rls_test.expect('Pieces left at the gig stay out as Not Returned',
  (SELECT count(*)::int FROM rls_test.newest_row('lot_a2') WHERE status = 'Not Returned' AND quantity = 2), 1);

SELECT rls_test.expect('More than the lot holds is refused', rls_test.run('a_manager', rls_test.write_off('lot_a', 20)), -1);
SELECT rls_test.expect('Zero pieces is refused', rls_test.run('a_manager', rls_test.write_off('lot_a', 0)), -1);

-- 4. Who can undo ----------------------------------------------------------------------------
SELECT rls_test.expect('A staff can''t undo',  rls_test.run('a_staff',  rls_test.undo(rls_test.u('unit_a'))), -1);
SELECT rls_test.expect('A viewer can''t undo', rls_test.run('a_viewer', rls_test.undo(rls_test.u('unit_a'))), -1);
SELECT rls_test.expect('B admin can''t undo A''s write-off', rls_test.run('b_admin', rls_test.undo(rls_test.u('unit_a'))), -1);
SELECT rls_test.expect('Undo needs a Missing record', rls_test.run('a_manager', rls_test.undo(rls_test.u('unit_a2'))), -1);

-- 5. Undo: a unit comes back; a split-off piece merges back into its lot ------------------------
SELECT rls_test.as_user('a_manager');
SELECT public.undo_write_off(rls_test.u('unit_a'));
SELECT rls_test.expect('The unit is Active again, not retired',
  (SELECT count(*)::int FROM assets WHERE id = rls_test.u('unit_a') AND status = 'Active' AND retired_on IS NULL), 1);
SELECT public.undo_write_off((SELECT id FROM assets WHERE manufacturer_model = 'XLR Cable, 50 ft' AND status = 'Missing'));
SELECT rls_test.expect('The piece is back in its lot: 10 again',
  (SELECT count(*)::int FROM assets WHERE id = rls_test.u('lot_a') AND quantity = 10), 1);
SELECT rls_test.expect('The split-off record is gone',
  (SELECT count(*)::int FROM assets WHERE manufacturer_model = 'XLR Cable, 50 ft'), 1);
SELECT rls_test.expect('Both undos are in the activity log',
  (SELECT count(*)::int FROM activity_log WHERE event_type = 'asset.write_off_undone'), 2);

-- 6. A locked tax year: no undo ----------------------------------------------------------------
SELECT public.write_off_pieces(rls_test.u('unit_a3'), 1, NULL, NULL, 0, 'stolen');
INSERT INTO tax_years (organization_id, year, locked) VALUES (rls_test.u('org_a'), extract(year FROM current_date)::int, true);
SELECT rls_test.expect('Undo is refused once the write-off''s tax year is locked',
  rls_test.run('a_admin', rls_test.undo(rls_test.u('unit_a3'))), -1);
SELECT rls_test.expect('The unit stays Missing',
  (SELECT count(*)::int FROM assets WHERE id = rls_test.u('unit_a3') AND status = 'Missing'), 1);
SELECT rls_test.expect('A write-off dated in a locked year is refused too',
  rls_test.run('a_admin', rls_test.write_off('unit_a2', 1)), -1);
DELETE FROM tax_years WHERE organization_id = rls_test.u('org_a');

-- 7. Tracking rows reference their own organization's equipment (data integrity) ---------------
-- a_admin is also Staff in org B.
SELECT set_config('request.jwt.claim.sub', '', true);  -- as the test runner, not a user
INSERT INTO organization_members (organization_id, user_id, role) VALUES (rls_test.u('org_b'), rls_test.u('a_admin'), 'Staff');
SELECT rls_test.expect('An org-A row can''t point at an org-B unit', rls_test.run('a_admin',
  format('INSERT INTO inventory_tracking (organization_id, gig_id, asset_id, status) VALUES (%s, %s, %s, ''On Site'')',
    rls_test.id('org_a'), rls_test.id('gig'), rls_test.id('unit_b'))), -1);
SELECT rls_test.expect('An org-A row can''t point at an org-B kit', rls_test.run('a_admin',
  format('INSERT INTO inventory_tracking (organization_id, gig_id, kit_id, status) VALUES (%s, %s, %s, ''On Site'')',
    rls_test.id('org_a'), rls_test.id('gig'), rls_test.id('kit_b'))), -1);
SELECT rls_test.expect('An org-B row can''t point at an org-A unit', rls_test.run('a_admin',
  format('INSERT INTO inventory_tracking (organization_id, gig_id, asset_id, status) VALUES (%s, %s, %s, ''On Site'')',
    rls_test.id('org_b'), rls_test.id('gig'), rls_test.id('unit_a'))), -1);
SELECT rls_test.expect('An org-A row can point at A''s own unit and kit', rls_test.run('a_admin',
  format('INSERT INTO inventory_tracking (organization_id, gig_id, kit_id, asset_id, status) VALUES (%s, %s, %s, %s, ''On Site'')',
    rls_test.id('org_a'), rls_test.id('gig'), rls_test.id('kit_a'), rls_test.id('unit_a'))), 1);
SELECT rls_test.expect('An existing org-A row can''t be repointed at an org-B unit', rls_test.run('a_admin',
  format('UPDATE inventory_tracking SET asset_id = %s WHERE asset_id = %s', rls_test.id('unit_b'), rls_test.id('lot_a'))), -1);
