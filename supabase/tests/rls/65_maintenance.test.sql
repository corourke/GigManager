-- #186: equipment maintenance (Cameron, 10-18).
-- send_to_maintenance / update_maintenance / return_to_service, for Staff and above of the
-- equipment's organization. Part of a lot splits off into its own record with the lot's values
-- and merges back on Return to service. Flagged while still out at a gig, a record is pending
-- ("to maintenance") and goes into Maintenance when a return row brings it home at that gig, or
-- when that gig is deleted. Maintenance and Missing are set and cleared only by the functions.
-- Checks read as: rls_test.expect(label, <rows seen or affected, -1 = rejected>, expected).

CREATE FUNCTION rls_test.id(p text) RETURNS text LANGUAGE sql STABLE AS $$ SELECT quote_literal(rls_test.u(p)) $$;
CREATE FUNCTION rls_test.run(p_user text, p_sql text) RETURNS int LANGUAGE sql AS
  $$ SELECT rls_test.try(rls_test.u(p_user), p_sql) $$;
CREATE FUNCTION rls_test.as_user(p_user text) RETURNS void LANGUAGE sql AS
  $$ SELECT set_config('request.jwt.claim.sub', rls_test.u(p_user)::text, true) $$;
-- Runs a statement as the user and keeps its effect (unlike try, which rolls back).
CREATE FUNCTION rls_test.keep(p_user text, p_sql text) RETURNS int LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    PERFORM set_config('request.jwt.claim.sub', rls_test.u(p_user)::text, true);
    SET LOCAL ROLE authenticated;
    EXECUTE p_sql;
    RESET ROLE;
    PERFORM set_config('request.jwt.claim.sub', '', true);
    RETURN 1;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    PERFORM set_config('request.jwt.claim.sub', '', true);
    RETURN -1;
  END;
END $$;

-- The database's message for a statement run as the user, or 'ok' (rolled back either way).
CREATE FUNCTION rls_test.err(p_user text, p_sql text) RETURNS text LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    PERFORM set_config('request.jwt.claim.sub', rls_test.u(p_user)::text, true);
    SET LOCAL ROLE authenticated;
    EXECUTE p_sql;
    RAISE EXCEPTION USING ERRCODE = 'P0099', MESSAGE = 'ok';
  EXCEPTION
    WHEN SQLSTATE 'P0099' THEN RESET ROLE; RETURN 'ok';
    WHEN OTHERS THEN RESET ROLE; RETURN SQLERRM;
  END;
END $$;
CREATE FUNCTION rls_test.says(p_label text, p_message text, p_like text) RETURNS void LANGUAGE sql AS
  $$ SELECT rls_test.expect(p_label || ' [' || p_message || ']', (p_message LIKE p_like)::int, 1) $$;

INSERT INTO rls_test.ids VALUES
  ('unit_m',  '00000000-0000-0000-0000-00000000d001'),
  ('unit_i',  '00000000-0000-0000-0000-00000000d002'),
  ('unit_x',  '00000000-0000-0000-0000-00000000d003'),
  ('unit_p',  '00000000-0000-0000-0000-00000000d004'),
  ('unit_g',  '00000000-0000-0000-0000-00000000d005'),
  ('lot_m',   '00000000-0000-0000-0000-00000000d010'),
  ('lot_p',   '00000000-0000-0000-0000-00000000d011'),
  ('lot_d',   '00000000-0000-0000-0000-00000000d012'),
  ('unit_b',  '00000000-0000-0000-0000-00000000d0b1'),
  ('item_c',  '00000000-0000-0000-0000-00000000d0c1'),
  ('head_m',  '00000000-0000-0000-0000-00000000d0e1'),
  ('line_m',  '00000000-0000-0000-0000-00000000d0e2'),
  ('gig2',    '00000000-0000-0000-0000-00000000d0f2'),
  ('kit_a2',  '00000000-0000-0000-0000-00000000d0a2'),
  ('lot_k',   '00000000-0000-0000-0000-00000000d013'),
  ('lot_h',   '00000000-0000-0000-0000-00000000d014'),
  ('unit_r',  '00000000-0000-0000-0000-00000000d006'),
  ('unit_w',  '00000000-0000-0000-0000-00000000d007');

INSERT INTO equipment_items (id, organization_id, category, manufacturer_model, created_by, updated_by)
VALUES (rls_test.u('item_c'), rls_test.u('org_a'), 'Audio', 'XLR Cable, 25 ft', rls_test.u('a_admin'), rls_test.u('a_admin'));

INSERT INTO assets (id, organization_id, equipment_item_id, acquisition_date, category, manufacturer_model, quantity, tag_number,
                    item_cost, replacement_value, status, created_by, updated_by)
SELECT rls_test.u(name), rls_test.u(org), CASE WHEN model LIKE 'XLR%' THEN rls_test.u('item_c') END, DATE '2026-01-15', 'Audio', model, qty, tag,
       cost, cost + 5, st, rls_test.u('a_admin'), rls_test.u('a_admin')
FROM (VALUES ('unit_m', 'org_a', 'QSC K12.2', 1, 'DSL-0104', 900, 'Active'),
             ('unit_i', 'org_a', 'QSC K12.2', 1, 'DSL-0105', 900, 'Inactive'),
             ('unit_x', 'org_a', 'QSC K12.2', 1, 'DSL-0106', 900, 'Disposed'),
             ('unit_p', 'org_a', 'QSC K12.2', 1, 'DSL-0107', 900, 'Active'),
             ('unit_g', 'org_a', 'QSC K12.2', 1, 'DSL-0108', 900, 'Active'),
             ('lot_m',  'org_a', 'XLR Cable, 25 ft', 20, NULL, 12, 'Active'),
             ('lot_p',  'org_a', 'XLR Cable, 25 ft', 10, NULL, 12, 'Active'),
             ('lot_d',  'org_a', 'XLR Cable, 25 ft', 8,  NULL, 12, 'Active'),
             ('unit_b', 'org_b', 'PD-20', 1, 'B-0001', 500, 'Active'),
             ('lot_k',  'org_a', 'Speaker Stand', 10, NULL, 30, 'Active'),
             ('lot_h',  'org_a', 'Speaker Stand', 10, NULL, 30, 'Active'),
             ('unit_r', 'org_a', 'QSC K12.2', 1, 'DSL-0109', 900, 'Active'),
             ('unit_w', 'org_a', 'QSC K12.2', 1, 'DSL-0110', 900, 'Active')) v(name, org, model, qty, tag, cost, st);
INSERT INTO kits (id, organization_id, name, created_by, updated_by)
  VALUES (rls_test.u('kit_a2'), rls_test.u('org_a'), 'A kit 2', rls_test.u('a_admin'), rls_test.u('a_admin'));

-- lot_m came on a purchase line (depreciated, 7 years).
INSERT INTO purchases (id, organization_id, parent_id, row_type, purchase_date, vendor, total_inv_amount, quantity, item_cost, line_cost, asset_id, description, tax_treatment) VALUES
  (rls_test.u('head_m'), rls_test.u('org_a'), NULL, 'header', '2026-01-15', 'V', 240, NULL, NULL, NULL, NULL, 'inv', NULL),
  (rls_test.u('line_m'), rls_test.u('org_a'), rls_test.u('head_m'), 'asset', '2026-01-15', 'V', NULL, 20, 12, 240, rls_test.u('lot_m'), 'cables', 'depreciate');
UPDATE assets SET recovery_period = 7 WHERE id = rls_test.u('lot_m');

-- A second gig, owned by A, for the pending-gig cases.
INSERT INTO gigs (id, title, status, start, "end", timezone, created_by, updated_by, owner_organization_id)
VALUES (rls_test.u('gig2'), 'Second gig', (enum_range(NULL::gig_status))[1], now(), now() + interval '4 hours', 'UTC',
        rls_test.u('a_admin'), rls_test.u('a_admin'), rls_test.u('org_a'));
INSERT INTO gig_participants (gig_id, organization_id, role) VALUES (rls_test.u('gig2'), rls_test.u('org_a'), 'Production');

-- Out at the shared gig: unit_p and 6 of lot_p. Out at gig2: unit_g.
INSERT INTO inventory_tracking (organization_id, gig_id, kit_id, asset_id, status, quantity, scanned_at) VALUES
  (rls_test.u('org_a'), rls_test.u('gig'),  rls_test.u('kit_a'), rls_test.u('unit_p'), 'On Site', 1, now() - interval '1 hour'),
  (rls_test.u('org_a'), rls_test.u('gig'),  rls_test.u('kit_a'), rls_test.u('lot_p'),  'On Site', 6, now() - interval '1 hour'),
  (rls_test.u('org_a'), rls_test.u('gig2'), rls_test.u('kit_a'), rls_test.u('unit_g'), 'On Site', 1, now() - interval '1 hour'),
  -- lot_k: out at the gig under two kits (3 and 2). lot_h: 6 out. unit_r, unit_w: out.
  (rls_test.u('org_a'), rls_test.u('gig'), rls_test.u('kit_a'),  rls_test.u('lot_k'), 'On Site', 3, now() - interval '1 hour'),
  (rls_test.u('org_a'), rls_test.u('gig'), rls_test.u('kit_a2'), rls_test.u('lot_k'), 'On Site', 2, now() - interval '1 hour'),
  (rls_test.u('org_a'), rls_test.u('gig'), rls_test.u('kit_a'),  rls_test.u('lot_h'), 'On Site', 6, now() - interval '1 hour'),
  (rls_test.u('org_a'), rls_test.u('gig'), rls_test.u('kit_a'),  rls_test.u('unit_r'), 'On Site', 1, now() - interval '1 hour'),
  (rls_test.u('org_a'), rls_test.u('gig'), rls_test.u('kit_a'),  rls_test.u('unit_w'), 'On Site', 1, now() - interval '1 hour');

CREATE FUNCTION rls_test.send(p_asset text, p_qty numeric, p_gig text DEFAULT NULL) RETURNS text LANGUAGE sql AS $$
  SELECT format('SELECT public.send_to_maintenance(%L, %s, %L, %L, %L, %L)',
    rls_test.u(p_asset), p_qty, 'Woofer rattles above 100 Hz', 'Repair Bench', DATE '2026-11-03',
    CASE WHEN p_gig IS NULL THEN NULL ELSE rls_test.u(p_gig) END) $$;
CREATE FUNCTION rls_test.back(p_id uuid) RETURNS text LANGUAGE sql AS $$
  SELECT format('SELECT public.return_to_service(%L)', p_id) $$;
CREATE FUNCTION rls_test.status_of(p_asset text) RETURNS text LANGUAGE sql AS $$
  SELECT status FROM assets WHERE id = rls_test.u(p_asset) $$;
CREATE FUNCTION rls_test.value_of_cables() RETURNS numeric LANGUAGE sql AS $$
  SELECT sum(item_cost * quantity) FROM assets WHERE equipment_item_id = rls_test.u('item_c') $$;
CREATE FUNCTION rls_test.split_of(p_asset text) RETURNS SETOF assets LANGUAGE sql AS $$
  SELECT * FROM assets WHERE maintenance_from = rls_test.u(p_asset) $$;
CREATE FUNCTION rls_test.events(p_event text) RETURNS int LANGUAGE sql AS $$
  SELECT count(*)::int FROM activity_log WHERE event_type = p_event $$;

-- 0. Grants ----------------------------------------------------------------------------------
SELECT rls_test.expect('anon can''t call send_to_maintenance',
  has_function_privilege('anon', 'public.send_to_maintenance(uuid, numeric, text, text, date, uuid)', 'EXECUTE')::int, 0);
SELECT rls_test.expect('anon can''t call update_maintenance',
  has_function_privilege('anon', 'public.update_maintenance(uuid, text, text, date)', 'EXECUTE')::int, 0);
SELECT rls_test.expect('anon can''t call return_to_service',
  has_function_privilege('anon', 'public.return_to_service(uuid)', 'EXECUTE')::int, 0);
SELECT rls_test.expect('signed-in users can call send_to_maintenance',
  has_function_privilege('authenticated', 'public.send_to_maintenance(uuid, numeric, text, text, date, uuid)', 'EXECUTE')::int, 1);

-- 1. Who -------------------------------------------------------------------------------------
SELECT rls_test.expect('A viewer can''t send to maintenance', rls_test.run('a_viewer', rls_test.send('unit_m', 1)), -1);
SELECT rls_test.says('…because it takes Staff or above', rls_test.err('a_viewer', rls_test.send('unit_m', 1)), '%takes Staff or above%');
SELECT rls_test.says('B''s Admin is refused for the same reason', rls_test.err('b_admin', rls_test.send('unit_m', 1)), '%takes Staff or above%');
SELECT rls_test.expect('B''s Admin can''t, on A''s equipment (shared gig)', rls_test.run('b_admin', rls_test.send('unit_m', 1)), -1);
SELECT rls_test.expect('anon can''t', rls_test.try_anon(rls_test.send('unit_m', 1)), -1);
SELECT rls_test.expect('A''s Staff can', rls_test.run('a_staff', rls_test.send('unit_m', 1)), 1);
SELECT rls_test.expect('A''s Manager can', rls_test.run('a_manager', rls_test.send('unit_m', 1)), 1);
SELECT rls_test.expect('A''s Admin can', rls_test.run('a_admin', rls_test.send('unit_m', 1)), 1);
SELECT rls_test.expect('Nothing kept from the tries', (SELECT count(*)::int FROM assets WHERE status = 'Maintenance'), 0);

-- 2. A unit at home --------------------------------------------------------------------------
SELECT rls_test.expect('Staff sends unit_m', rls_test.keep('a_staff', rls_test.send('unit_m', 1)), 1);
SELECT rls_test.expect('…it''s in Maintenance with its details',
  (SELECT count(*)::int FROM assets WHERE id = rls_test.u('unit_m') AND status = 'Maintenance'
     AND maintenance_notes = 'Woofer rattles above 100 Hz' AND maintenance_location = 'Repair Bench'
     AND maintenance_expected_back = DATE '2026-11-03' AND maintenance_by = rls_test.u('a_staff')
     AND maintenance_since IS NOT NULL AND status_before_maintenance = 'Active' AND NOT maintenance_pending), 1);
SELECT rls_test.expect('…logged as sent', rls_test.events('asset.sent_to_maintenance'), 1);
SELECT rls_test.expect('…sending it again is refused', rls_test.run('a_staff', rls_test.send('unit_m', 1)), -1);
SELECT rls_test.expect('A unit sends one piece only',
  rls_test.run('a_staff', rls_test.send('unit_i', 2)), -1);

SELECT rls_test.expect('A viewer can''t edit the details',
  rls_test.run('a_viewer', format('SELECT public.update_maintenance(%L, %L, %L, %L)', rls_test.u('unit_m'), 'x', 'y', NULL)), -1);
SELECT rls_test.expect('Staff edits the details',
  rls_test.keep('a_staff', format('SELECT public.update_maintenance(%L, %L, %L, %L)', rls_test.u('unit_m'),
    'Driver ordered', 'Brightline Lighting', DATE '2026-11-10')), 1);
SELECT rls_test.expect('…notes, location and expected back changed; the rest kept',
  (SELECT count(*)::int FROM assets WHERE id = rls_test.u('unit_m') AND maintenance_notes = 'Driver ordered'
     AND maintenance_location = 'Brightline Lighting' AND maintenance_expected_back = DATE '2026-11-10'
     AND status = 'Maintenance' AND maintenance_by = rls_test.u('a_staff')), 1);
SELECT rls_test.expect('…logged as updated', rls_test.events('asset.maintenance_updated'), 1);
SELECT rls_test.expect('Editing a record that isn''t in maintenance is refused',
  rls_test.run('a_staff', format('SELECT public.update_maintenance(%L, %L, %L, %L)', rls_test.u('unit_p'), 'x', NULL, NULL)), -1);

SELECT rls_test.expect('A viewer can''t return it to service', rls_test.run('a_viewer', rls_test.back(rls_test.u('unit_m'))), -1);
SELECT rls_test.expect('Staff returns it to service', rls_test.keep('a_staff', rls_test.back(rls_test.u('unit_m'))), 1);
SELECT rls_test.expect('…Active again, details cleared',
  (SELECT count(*)::int FROM assets WHERE id = rls_test.u('unit_m') AND status = 'Active' AND maintenance_notes IS NULL
     AND maintenance_location IS NULL AND maintenance_expected_back IS NULL AND maintenance_since IS NULL
     AND maintenance_by IS NULL AND status_before_maintenance IS NULL), 1);
SELECT rls_test.expect('…logged as returned', rls_test.events('asset.returned_to_service'), 1);

-- An Inactive unit comes back Inactive.
SELECT rls_test.keep('a_staff', rls_test.send('unit_i', 1));
SELECT rls_test.keep('a_staff', rls_test.back(rls_test.u('unit_i')));
SELECT rls_test.expect('An Inactive unit comes back Inactive', (rls_test.status_of('unit_i') = 'Inactive')::int, 1);

-- Retired records are refused.
SELECT rls_test.expect('A Disposed unit can''t be sent', rls_test.run('a_admin', rls_test.send('unit_x', 1)), -1);
SELECT rls_test.says('…only equipment in service', rls_test.err('a_admin', rls_test.send('unit_x', 1)), '%Only equipment in service%');
UPDATE assets SET retired_on = DATE '2026-02-01' WHERE id = rls_test.u('unit_i');
SELECT rls_test.expect('A retired unit can''t be sent', rls_test.run('a_admin', rls_test.send('unit_i', 1)), -1);
UPDATE assets SET retired_on = NULL WHERE id = rls_test.u('unit_i');

-- 3. Part of a lot at home: split, values kept, merge back -----------------------------------
SELECT rls_test.expect('Value of the cables before', (rls_test.value_of_cables() = 12 * (20 + 10 + 8))::int, 1);
SELECT rls_test.expect('A whole number of pieces, at most the lot', rls_test.run('a_staff', rls_test.send('lot_m', 21)), -1);
SELECT rls_test.expect('…not a fraction', rls_test.run('a_staff', rls_test.send('lot_m', 1.5)), -1);
SELECT rls_test.expect('Staff sends 1 of the 20', rls_test.keep('a_staff', rls_test.send('lot_m', 1)), 1);
SELECT rls_test.expect('…the lot drops to 19 and stays Active',
  (SELECT count(*)::int FROM assets WHERE id = rls_test.u('lot_m') AND quantity = 19 AND status = 'Active' AND maintenance_notes IS NULL), 1);
SELECT rls_test.expect('…the piece is its own record of 1, in Maintenance, from the lot',
  (SELECT count(*)::int FROM rls_test.split_of('lot_m') s WHERE s.quantity = 1 AND s.status = 'Maintenance'
     AND s.maintenance_location = 'Repair Bench' AND s.status_before_maintenance = 'Active'), 1);
SELECT rls_test.expect('…on the lot''s purchase line, with its cost, item and recovery period',
  (SELECT count(*)::int FROM rls_test.split_of('lot_m') s WHERE s.purchase_line_id = rls_test.u('line_m')
     AND s.item_cost = 12 AND s.equipment_item_id = rls_test.u('item_c') AND s.recovery_period = 7
     AND s.organization_id = rls_test.u('org_a')), 1);
SELECT rls_test.expect('…total value unchanged by the split', (rls_test.value_of_cables() = 12 * 38)::int, 1);
SELECT rls_test.expect('…logged against the lot (which stays), naming the piece split off',
  (SELECT count(*)::int FROM activity_log l, rls_test.split_of('lot_m') p WHERE l.event_type = 'asset.sent_to_maintenance'
     AND l.entity_id = rls_test.u('lot_m') AND l.context->>'split_off' = p.id::text AND (l.context->>'quantity')::int = 1), 1);

SELECT rls_test.expect('Return to service merges it back',
  rls_test.keep('a_staff', rls_test.back((SELECT id FROM rls_test.split_of('lot_m')))), 1);
SELECT rls_test.expect('…the lot is 20 again', (SELECT quantity::int FROM assets WHERE id = rls_test.u('lot_m')), 20);
SELECT rls_test.expect('…the piece is gone', (SELECT count(*)::int FROM rls_test.split_of('lot_m')), 0);
SELECT rls_test.expect('…total value unchanged by the merge', (rls_test.value_of_cables() = 12 * 38)::int, 1);
SELECT rls_test.expect('…logged against the lot (the piece is gone), naming the piece merged',
  (SELECT count(*)::int FROM activity_log WHERE event_type = 'asset.returned_to_service'
     AND entity_id = rls_test.u('lot_m') AND context->>'merged_from' IS NOT NULL), 1);

-- The whole lot goes in as itself.
SELECT rls_test.keep('a_staff', rls_test.send('lot_d', 8));
SELECT rls_test.expect('Sending the whole lot puts the lot itself in Maintenance',
  (SELECT count(*)::int FROM assets WHERE id = rls_test.u('lot_d') AND status = 'Maintenance' AND quantity = 8), 1);
SELECT rls_test.keep('a_staff', rls_test.back(rls_test.u('lot_d')));

-- No merge when the lot has since been disposed: the piece comes back as its own lot.
SELECT rls_test.keep('a_staff', rls_test.send('lot_d', 2));
SELECT rls_test.as_user('a_admin');
SELECT public.update_asset_status(rls_test.u('lot_d'), 'Disposed');
SELECT rls_test.expect('Lot disposed: the piece returns as its own lot of 2',
  rls_test.keep('a_staff', rls_test.back((SELECT id FROM rls_test.split_of('lot_d')))), 1);
SELECT rls_test.expect('…Active, no longer pointing at the lot',
  (SELECT count(*)::int FROM assets WHERE equipment_item_id = rls_test.u('item_c') AND quantity = 2 AND status = 'Active'
     AND maintenance_from IS NULL AND id <> rls_test.u('lot_d')), 1);

-- 4. Pending: flagged while still out --------------------------------------------------------
SELECT rls_test.expect('Staff flags unit_p, still out at the gig', rls_test.keep('a_staff', rls_test.send('unit_p', 1, 'gig')), 1);
SELECT rls_test.expect('…pending, still Active (available), with the details',
  (SELECT count(*)::int FROM assets WHERE id = rls_test.u('unit_p') AND status = 'Active' AND maintenance_pending
     AND maintenance_pending_gig_id = rls_test.u('gig') AND maintenance_location = 'Repair Bench'), 1);
SELECT rls_test.expect('…logged as flagged', rls_test.events('asset.maintenance_flagged'), 1);
SELECT rls_test.expect('…flagging it again is refused', rls_test.run('a_staff', rls_test.send('unit_p', 1, 'gig')), -1);
SELECT rls_test.expect('…its details can be edited while pending',
  rls_test.run('a_staff', format('SELECT public.update_maintenance(%L, %L, %L, %L)', rls_test.u('unit_p'), 'n', 'Bench 2', NULL)), 1);
SELECT rls_test.expect('A gig the equipment''s organization isn''t on is refused',
  rls_test.run('b_admin', format('SELECT public.send_to_maintenance(%L, 1, NULL, NULL, NULL, %L)', rls_test.u('unit_b'), rls_test.u('gig2'))), -1);

SELECT rls_test.expect('A return at another gig doesn''t apply it',
  rls_test.keep('a_viewer', format('INSERT INTO inventory_tracking (organization_id, gig_id, kit_id, asset_id, status, quantity, location, scanned_at) VALUES (%s, %s, %s, %s, ''In Warehouse'', 1, ''Warehouse'', now())',
    rls_test.id('org_a'), rls_test.id('gig2'), rls_test.id('kit_a'), rls_test.id('unit_p'))), 1);
SELECT rls_test.expect('…still pending', (SELECT maintenance_pending::int FROM assets WHERE id = rls_test.u('unit_p')), 1);
SELECT rls_test.expect('A non-return row at the gig doesn''t apply it',
  rls_test.keep('a_staff', format('INSERT INTO inventory_tracking (organization_id, gig_id, kit_id, asset_id, status, quantity, scanned_at) VALUES (%s, %s, %s, %s, ''In Transit'', 1, now() - interval ''1 minute'')',
    rls_test.id('org_a'), rls_test.id('gig'), rls_test.id('kit_a'), rls_test.id('unit_p'))), 1);
SELECT rls_test.expect('…still pending', (SELECT maintenance_pending::int FROM assets WHERE id = rls_test.u('unit_p')), 1);
SELECT rls_test.expect('The Unload return row at the gig (by a Viewer) brings it home',
  rls_test.keep('a_viewer', format('INSERT INTO inventory_tracking (organization_id, gig_id, kit_id, asset_id, status, quantity, location, scanned_at) VALUES (%s, %s, %s, %s, ''In Warehouse'', 1, ''Warehouse'', now())',
    rls_test.id('org_a'), rls_test.id('gig'), rls_test.id('kit_a'), rls_test.id('unit_p'))), 1);
SELECT rls_test.expect('…now in Maintenance with the flagged details',
  (SELECT count(*)::int FROM assets WHERE id = rls_test.u('unit_p') AND status = 'Maintenance' AND NOT maintenance_pending
     AND maintenance_pending_gig_id IS NULL AND maintenance_location = 'Repair Bench' AND maintenance_by = rls_test.u('a_staff')), 1);
SELECT rls_test.expect('…logged as sent', rls_test.events('asset.sent_to_maintenance'), 6);

-- Part of a lot, pending: a partial return keeps it pending; closing the bucket splits it.
SELECT rls_test.expect('Staff flags 1 of lot_p''s 6 out at the gig', rls_test.keep('a_staff', rls_test.send('lot_p', 1, 'gig')), 1);
SELECT rls_test.expect('…pending for 1', (SELECT maintenance_pending_quantity::int FROM assets WHERE id = rls_test.u('lot_p')), 1);
SELECT rls_test.keep('a_staff', format('INSERT INTO inventory_tracking (organization_id, gig_id, kit_id, asset_id, status, quantity, scanned_at) VALUES (%s, %s, %s, %s, ''On Site'', 2, now())',
  rls_test.id('org_a'), rls_test.id('gig'), rls_test.id('kit_a'), rls_test.id('lot_p')));
SELECT rls_test.expect('A partial return (4 of 6 home) keeps it pending',
  (SELECT count(*)::int FROM assets WHERE id = rls_test.u('lot_p') AND maintenance_pending AND quantity = 10), 1);
SELECT rls_test.keep('a_staff', format('INSERT INTO inventory_tracking (organization_id, gig_id, kit_id, asset_id, status, quantity, location, scanned_at) VALUES (%s, %s, %s, %s, ''In Warehouse'', 2, ''Warehouse'', now() + interval ''1 second'')',
  rls_test.id('org_a'), rls_test.id('gig'), rls_test.id('kit_a'), rls_test.id('lot_p')));
SELECT rls_test.expect('The return closing the bucket splits 1 off into Maintenance',
  (SELECT count(*)::int FROM rls_test.split_of('lot_p') s WHERE s.quantity = 1 AND s.status = 'Maintenance'), 1);
SELECT rls_test.expect('…the lot is 9, no longer pending',
  (SELECT count(*)::int FROM assets WHERE id = rls_test.u('lot_p') AND quantity = 9 AND NOT maintenance_pending
     AND maintenance_pending_quantity IS NULL AND maintenance_notes IS NULL), 1);
SELECT rls_test.expect('…total value unchanged', (rls_test.value_of_cables() = 12 * 38)::int, 1);

-- Flagged after the return already synced (offline order): goes in at once.
SELECT rls_test.keep('a_staff', rls_test.back(rls_test.u('unit_p')));
SELECT rls_test.expect('Flagging with the gig after it came home puts it in at once',
  rls_test.keep('a_staff', rls_test.send('unit_p', 1, 'gig')), 1);
SELECT rls_test.expect('…in Maintenance, not pending',
  (SELECT count(*)::int FROM assets WHERE id = rls_test.u('unit_p') AND status = 'Maintenance' AND NOT maintenance_pending), 1);
SELECT rls_test.keep('a_staff', rls_test.back(rls_test.u('unit_p')));

-- Cancelling a pending flag.
SELECT rls_test.keep('a_staff', rls_test.send('unit_g', 1, 'gig2'));
SELECT rls_test.expect('Return to service on a pending record cancels the flag',
  rls_test.keep('a_staff', rls_test.back(rls_test.u('unit_g'))), 1);
SELECT rls_test.expect('…Active, not pending, details cleared',
  (SELECT count(*)::int FROM assets WHERE id = rls_test.u('unit_g') AND status = 'Active' AND NOT maintenance_pending
     AND maintenance_pending_gig_id IS NULL AND maintenance_notes IS NULL), 1);
SELECT rls_test.expect('…logged as cancelled', rls_test.events('asset.maintenance_cancelled'), 1);

-- Deleting the pending gig applies the flag.
SELECT rls_test.keep('a_staff', rls_test.send('unit_g', 1, 'gig2'));
SELECT rls_test.expect('A''s Admin deletes gig2', rls_test.keep('a_admin', format('DELETE FROM gigs WHERE id = %s', rls_test.id('gig2'))), 1);
SELECT rls_test.expect('…the flagged unit goes into Maintenance',
  (SELECT count(*)::int FROM assets WHERE id = rls_test.u('unit_g') AND status = 'Maintenance' AND NOT maintenance_pending
     AND maintenance_pending_gig_id IS NULL AND maintenance_location = 'Repair Bench'), 1);

-- 5. Bulk tracking rows with nothing pending -------------------------------------------------
SELECT rls_test.expect('A packing list''s worth of return rows, nothing pending, inserts cleanly',
  rls_test.keep('a_staff', format('INSERT INTO inventory_tracking (organization_id, gig_id, kit_id, asset_id, status, quantity, location, scanned_at)
     SELECT %s, %s, %s, %s, ''In Warehouse'', 1, ''Warehouse'', now() + (g || '' seconds'')::interval FROM generate_series(1, 200) g',
     rls_test.id('org_a'), rls_test.id('gig'), rls_test.id('kit_a'), rls_test.id('unit_m'))), 1);
SELECT rls_test.expect('…no record changed status', (SELECT count(*)::int FROM assets WHERE status = 'Maintenance'), 2);

-- 6. Every writer of status ------------------------------------------------------------------
-- update_asset_status (the equipment form, the phone's queued status updates).
SELECT rls_test.as_user('a_staff');
SELECT public.update_asset_status(rls_test.u('unit_m'), 'Maintenance');
SELECT rls_test.expect('update_asset_status to Maintenance goes in as a whole record, with the rules',
  (SELECT count(*)::int FROM assets WHERE id = rls_test.u('unit_m') AND status = 'Maintenance'
     AND status_before_maintenance = 'Active' AND maintenance_since IS NOT NULL), 1);
SELECT public.update_asset_status(rls_test.u('unit_m'), 'Active');
SELECT rls_test.expect('update_asset_status out of Maintenance clears the details',
  (SELECT count(*)::int FROM assets WHERE id = rls_test.u('unit_m') AND status = 'Active' AND maintenance_since IS NULL
     AND status_before_maintenance IS NULL), 1);
SELECT rls_test.expect('A viewer''s queued status update is refused',
  rls_test.run('a_viewer', format('SELECT public.update_asset_status(%L, %L)', rls_test.u('unit_m'), 'Maintenance')), -1);
SELECT rls_test.expect('Active to Inactive still works', rls_test.run('a_staff', format('SELECT public.update_asset_status(%L, %L)', rls_test.u('unit_m'), 'Inactive')), 1);
SELECT rls_test.as_user('a_admin');
SELECT public.send_to_maintenance(rls_test.u('unit_m'), 1, 'n', 'Bench', NULL, NULL);
SELECT public.update_asset_status(rls_test.u('unit_m'), 'Disposed');
SELECT rls_test.expect('Disposing a record in Maintenance clears its details',
  (SELECT count(*)::int FROM assets WHERE id = rls_test.u('unit_m') AND status = 'Disposed' AND maintenance_notes IS NULL
     AND status_before_maintenance IS NULL), 1);

-- Direct table updates by an Admin.
SELECT rls_test.says('A direct Maintenance update says how it''s done',
  rls_test.err('a_admin', format('UPDATE assets SET status = ''Maintenance'' WHERE id = %s', rls_test.id('unit_i'))), '%through sending to maintenance%');
SELECT rls_test.expect('An Admin can''t set Maintenance directly',
  rls_test.run('a_admin', format('UPDATE assets SET status = ''Maintenance'' WHERE id = %s', rls_test.id('unit_i'))), -1);
SELECT rls_test.expect('…nor clear it directly',
  rls_test.run('a_admin', format('UPDATE assets SET status = ''Active'' WHERE id = %s', rls_test.id('unit_g'))), -1);
SELECT rls_test.expect('…nor set Missing directly',
  rls_test.run('a_admin', format('UPDATE assets SET status = ''Missing'' WHERE id = %s', rls_test.id('unit_i'))), -1);
SELECT rls_test.expect('…nor write the maintenance details directly',
  rls_test.run('a_admin', format('UPDATE assets SET maintenance_notes = ''x'' WHERE id = %s', rls_test.id('unit_p'))), -1);
SELECT rls_test.expect('…nor flag pending directly',
  rls_test.run('a_admin', format('UPDATE assets SET maintenance_pending = true, maintenance_pending_gig_id = %s WHERE id = %s', rls_test.id('gig'), rls_test.id('unit_i'))), -1);
SELECT rls_test.expect('…nor set the bypass setting and then write',
  rls_test.run('a_admin', format('SELECT set_config(''gigwrangler.asset_status_writer'', ''on'', true); UPDATE assets SET status = ''Maintenance'' WHERE id = %s', rls_test.id('unit_i'))), -1);
SELECT rls_test.expect('An Admin can still edit other fields of a record in Maintenance',
  rls_test.run('a_admin', format('UPDATE assets SET description = ''new driver'' WHERE id = %s', rls_test.id('unit_g'))), 1);
SELECT rls_test.expect('…and change Active to Inactive directly',
  rls_test.run('a_admin', format('UPDATE assets SET status = ''Inactive'' WHERE id = %s', rls_test.id('lot_m'))), 1);
SELECT rls_test.expect('Status must be a known one',
  rls_test.run('a_admin', format('UPDATE assets SET status = ''Broken'' WHERE id = %s', rls_test.id('lot_m'))), -1);

-- Inserts: Add Item, purchases, CSV import.
SELECT rls_test.expect('Add Item can insert Active',
  rls_test.run('a_admin', format('INSERT INTO assets (organization_id, acquisition_date, category, manufacturer_model, status, created_by, updated_by) VALUES (%s, ''2026-01-01'', ''Audio'', ''New'', ''Active'', %s, %s)', rls_test.id('org_a'), rls_test.id('a_admin'), rls_test.id('a_admin'))), 1);
SELECT rls_test.expect('…Inactive',
  rls_test.run('a_admin', format('INSERT INTO assets (organization_id, acquisition_date, category, manufacturer_model, status, created_by, updated_by) VALUES (%s, ''2026-01-01'', ''Audio'', ''New'', ''Inactive'', %s, %s)', rls_test.id('org_a'), rls_test.id('a_admin'), rls_test.id('a_admin'))), 1);
SELECT rls_test.expect('…and Maintenance with no details (as imports may)',
  rls_test.run('a_admin', format('INSERT INTO assets (organization_id, acquisition_date, category, manufacturer_model, status, created_by, updated_by) VALUES (%s, ''2026-01-01'', ''Audio'', ''New'', ''Maintenance'', %s, %s)', rls_test.id('org_a'), rls_test.id('a_admin'), rls_test.id('a_admin'))), 1);
SELECT rls_test.expect('…but not Missing',
  rls_test.run('a_admin', format('INSERT INTO assets (organization_id, acquisition_date, category, manufacturer_model, status, created_by, updated_by) VALUES (%s, ''2026-01-01'', ''Audio'', ''New'', ''Missing'', %s, %s)', rls_test.id('org_a'), rls_test.id('a_admin'), rls_test.id('a_admin'))), -1);
SELECT rls_test.expect('…nor maintenance details',
  rls_test.run('a_admin', format('INSERT INTO assets (organization_id, acquisition_date, category, manufacturer_model, status, maintenance_notes, created_by, updated_by) VALUES (%s, ''2026-01-01'', ''Audio'', ''New'', ''Maintenance'', ''x'', %s, %s)', rls_test.id('org_a'), rls_test.id('a_admin'), rls_test.id('a_admin'))), -1);
SELECT rls_test.expect('A purchase (create_purchase_transaction_v2) still inserts equipment in Maintenance',
  rls_test.run('a_manager', format('SELECT public.create_purchase_transaction_v2(%L::jsonb, %L::jsonb[], %L::jsonb[])',
    jsonb_build_object('organization_id', rls_test.u('org_a'), 'purchase_date', '2026-06-01', 'vendor', 'V'),
    ARRAY[jsonb_build_object('organization_id', rls_test.u('org_a'), 'purchase_date', '2026-06-01', 'quantity', 1,
      'item_price', 90, 'item_cost', 95, 'line_cost', 95, 'description', 'imported', 'tax_treatment', 'expense')],
    ARRAY[jsonb_build_object('organization_id', rls_test.u('org_a'), 'line_index', 0, 'acquisition_date', '2026-06-01',
      'category', 'Audio', 'manufacturer_model', 'Imported', 'quantity', 1, 'item_price', 90, 'item_cost', 95,
      'status', 'Maintenance', 'insurance_policy_added', false)])), 1);

-- Write-offs still set and clear Missing (and clear a flag on a whole write-off).
SELECT rls_test.as_user('a_manager');
SELECT public.send_to_maintenance(rls_test.u('unit_i'), 1, NULL, NULL, NULL, NULL);
SELECT public.write_off_pieces(rls_test.u('unit_i'), 1, NULL, NULL, 0, 'lost');
SELECT rls_test.expect('Writing off a record in Maintenance: Missing, details cleared',
  (SELECT count(*)::int FROM assets WHERE id = rls_test.u('unit_i') AND status = 'Missing' AND status_before_write_off = 'Maintenance'
     AND maintenance_since IS NULL AND status_before_maintenance IS NULL), 1);
SELECT public.undo_write_off(rls_test.u('unit_i'));
SELECT rls_test.expect('…and Undo brings it back', (rls_test.status_of('unit_i') = 'Maintenance')::int, 1);

-- 7. Review round (10-22) -------------------------------------------------------------------
-- Flagged, then disposed directly: the flag goes with it, and coming home doesn't revive it.
SELECT rls_test.keep('a_staff', rls_test.send('unit_r', 1, 'gig'));
SELECT rls_test.expect('An Admin disposes a flagged unit directly',
  rls_test.keep('a_admin', format('UPDATE assets SET status = ''Disposed'' WHERE id = %s', rls_test.id('unit_r'))), 1);
SELECT rls_test.expect('…the flag and its details are cleared',
  (SELECT count(*)::int FROM assets WHERE id = rls_test.u('unit_r') AND status = 'Disposed' AND NOT maintenance_pending
     AND maintenance_pending_gig_id IS NULL AND maintenance_notes IS NULL), 1);
SELECT rls_test.keep('a_staff', format('INSERT INTO inventory_tracking (organization_id, gig_id, kit_id, asset_id, status, quantity, location, scanned_at) VALUES (%s, %s, %s, %s, ''In Warehouse'', 1, ''Warehouse'', now())',
  rls_test.id('org_a'), rls_test.id('gig'), rls_test.id('kit_a'), rls_test.id('unit_r')));
SELECT rls_test.expect('…and its return leaves it Disposed', (rls_test.status_of('unit_r') = 'Disposed')::int, 1);

-- Flagged, then retired (retired_on) directly: same.
SELECT rls_test.keep('a_staff', rls_test.send('unit_w', 1, 'gig'));
SELECT rls_test.keep('a_admin', format('UPDATE assets SET retired_on = current_date WHERE id = %s', rls_test.id('unit_w')));
SELECT rls_test.expect('A flagged unit given a retired date loses its flag',
  (SELECT count(*)::int FROM assets WHERE id = rls_test.u('unit_w') AND NOT maintenance_pending), 1);
SELECT rls_test.keep('a_staff', format('INSERT INTO inventory_tracking (organization_id, gig_id, kit_id, asset_id, status, quantity, location, scanned_at) VALUES (%s, %s, %s, %s, ''In Warehouse'', 1, ''Warehouse'', now())',
  rls_test.id('org_a'), rls_test.id('gig'), rls_test.id('kit_a'), rls_test.id('unit_w')));
SELECT rls_test.expect('…and coming home doesn''t put it in Maintenance', (rls_test.status_of('unit_w') = 'Active')::int, 1);

-- A record in Maintenance that is retired can't be returned to service.
SELECT rls_test.keep('a_staff', rls_test.send('unit_w', 1));
SELECT rls_test.expect('A retired unit can''t be sent either', (rls_test.status_of('unit_w') = 'Active')::int, 1);
UPDATE assets SET retired_on = NULL WHERE id = rls_test.u('unit_w');
SELECT rls_test.keep('a_staff', rls_test.send('unit_w', 1));
UPDATE assets SET retired_on = current_date WHERE id = rls_test.u('unit_w');
SELECT rls_test.says('Return to service refuses a retired record',
  rls_test.err('a_staff', rls_test.back(rls_test.u('unit_w'))), '%retired%');

-- The flagged and applied entries carry the gig.
SELECT rls_test.expect('A flagged entry names its gig',
  (SELECT count(*)::int FROM activity_log WHERE event_type = 'asset.maintenance_flagged' AND entity_id = rls_test.u('unit_p')
     AND gig_id = rls_test.u('gig')), 1);
SELECT rls_test.expect('…and so does the entry when it comes home',
  (SELECT count(*)::int FROM activity_log WHERE event_type = 'asset.sent_to_maintenance' AND entity_id = rls_test.u('unit_p')
     AND gig_id = rls_test.u('gig')), 1);

-- A lot out at the gig under two kits: applied only when both buckets are closed.
SELECT rls_test.expect('Staff flags 1 of lot_k (out under two kits)', rls_test.keep('a_staff', rls_test.send('lot_k', 1, 'gig')), 1);
SELECT rls_test.keep('a_staff', format('INSERT INTO inventory_tracking (organization_id, gig_id, kit_id, asset_id, status, quantity, location, scanned_at) VALUES (%s, %s, %s, %s, ''In Warehouse'', 3, ''Warehouse'', now())',
  rls_test.id('org_a'), rls_test.id('gig'), rls_test.id('kit_a'), rls_test.id('lot_k')));
SELECT rls_test.expect('One kit back: still pending', (SELECT maintenance_pending::int FROM assets WHERE id = rls_test.u('lot_k')), 1);
SELECT rls_test.keep('a_staff', format('INSERT INTO inventory_tracking (organization_id, gig_id, kit_id, asset_id, status, quantity, location, scanned_at) VALUES (%s, %s, %s, %s, ''In Warehouse'', 2, ''Warehouse'', now())',
  rls_test.id('org_a'), rls_test.id('gig'), rls_test.id('kit_a2'), rls_test.id('lot_k')));
SELECT rls_test.expect('Both back: the piece splits off into Maintenance',
  (SELECT count(*)::int FROM rls_test.split_of('lot_k') s WHERE s.status = 'Maintenance' AND s.quantity = 1), 1);

-- Sending without a gig: no more than are home.
-- (A lot's count at home is the Locations rule's, which the screens apply; the database only
-- keeps a send within the lot.)
SELECT rls_test.expect('A lot with 6 of 10 out: sending 5 without a gig is left to the screens',
  rls_test.run('a_staff', rls_test.send('lot_h', 5)), 1);
SELECT rls_test.says('…but never more than the lot', rls_test.err('a_staff', rls_test.send('lot_h', 11)), '%between 1 and 10%');
SELECT rls_test.expect('…sending the 4 at home works', rls_test.run('a_staff', rls_test.send('lot_h', 4)), 1);

-- update_asset_status to Active on a flagged record (an older phone's untick) cancels the flag.
SELECT rls_test.keep('a_staff', rls_test.send('lot_h', 1, 'gig'));
SELECT rls_test.as_user('a_staff');
SELECT public.update_asset_status(rls_test.u('lot_h'), 'Active');
SELECT rls_test.expect('A queued "Active" on a flagged Active lot cancels the flag',
  (SELECT count(*)::int FROM assets WHERE id = rls_test.u('lot_h') AND NOT maintenance_pending AND maintenance_notes IS NULL), 1);

-- Merges don't go into a flagged lot, here or for a write-off.
SELECT rls_test.keep('a_staff', rls_test.send('lot_h', 1));
SELECT rls_test.keep('a_staff', rls_test.send('lot_h', 1, 'gig'));
SELECT rls_test.expect('Returning a piece while its lot is flagged: it comes back as its own lot',
  rls_test.keep('a_staff', rls_test.back((SELECT id FROM rls_test.split_of('lot_h')))), 1);
SELECT rls_test.expect('…the lot keeps its 9 and its flag',
  (SELECT count(*)::int FROM assets WHERE id = rls_test.u('lot_h') AND quantity = 9 AND maintenance_pending), 1);
SELECT rls_test.as_user('a_manager');
SELECT public.write_off_pieces(rls_test.u('lot_h'), 1, NULL, NULL, 0, 'lost');
SELECT rls_test.expect('Undoing a write-off from a flagged lot doesn''t merge it back',
  rls_test.keep('a_manager', format('SELECT public.undo_write_off(%L)', (SELECT id FROM assets WHERE written_off_from = rls_test.u('lot_h')))), 1);
SELECT rls_test.expect('…the piece comes back as its own record',
  (SELECT count(*)::int FROM assets WHERE id = rls_test.u('lot_h') AND quantity = 8), 1);

-- A flagged unit (out again at the gig) written off whole: the flag goes with it.
INSERT INTO inventory_tracking (organization_id, gig_id, kit_id, asset_id, status, quantity, scanned_at)
VALUES (rls_test.u('org_a'), rls_test.u('gig'), rls_test.u('kit_a'), rls_test.u('unit_p'), 'Checked Out', 1, now() + interval '1 minute');
SELECT rls_test.keep('a_staff', rls_test.send('unit_p', 1, 'gig'));
SELECT rls_test.expect('unit_p is flagged', (SELECT maintenance_pending::int FROM assets WHERE id = rls_test.u('unit_p')), 1);
SELECT rls_test.as_user('a_manager');
SELECT public.write_off_pieces(rls_test.u('unit_p'), 1, NULL, NULL, 0, 'lost');
SELECT rls_test.expect('A flagged unit written off whole: Missing, flag cleared',
  (SELECT count(*)::int FROM assets WHERE id = rls_test.u('unit_p') AND status = 'Missing' AND NOT maintenance_pending
     AND maintenance_pending_gig_id IS NULL AND maintenance_notes IS NULL), 1);

-- Adding units to a line whose lot is flagged leaves the lot as it is.
INSERT INTO inventory_tracking (organization_id, gig_id, kit_id, asset_id, status, quantity, scanned_at)
VALUES (rls_test.u('org_a'), rls_test.u('gig'), rls_test.u('kit_a'), rls_test.u('lot_m'), 'On Site', 2, now());
SELECT rls_test.keep('a_staff', rls_test.send('lot_m', 1, 'gig'));
SELECT rls_test.expect('Adding units to the flagged lot''s line works',
  rls_test.run('a_manager', format('SELECT public.add_purchase_line_units(%L, %L::jsonb[])', rls_test.u('line_m'),
    ARRAY[jsonb_build_object('organization_id', rls_test.u('org_a'), 'manufacturer_model', 'XLR Cable, 25 ft', 'category', 'Audio')])), 1);
SELECT rls_test.expect('…the lot stays flagged',
  (SELECT count(*)::int FROM assets WHERE id = rls_test.u('lot_m') AND maintenance_pending AND maintenance_pending_quantity = 1), 1);

-- reclassify_expense_as_asset isn't a status writer: it was dropped by 20261011000000.
SELECT rls_test.expect('reclassify_expense_as_asset no longer exists',
  (SELECT count(*)::int FROM pg_proc WHERE proname = 'reclassify_expense_as_asset'), 0);

-- 8. Re-review (10-22): a unit is where its newest row is, across gigs and kits ---------------
INSERT INTO rls_test.ids VALUES
  ('gig3',   '00000000-0000-0000-0000-00000000d0f3'),
  ('unit_s', '00000000-0000-0000-0000-00000000d008'),
  ('unit_t', '00000000-0000-0000-0000-00000000d009'),
  ('unit_u', '00000000-0000-0000-0000-00000000d00a');
INSERT INTO gigs (id, title, status, start, "end", timezone, created_by, updated_by, owner_organization_id)
VALUES (rls_test.u('gig3'), 'Third gig', (enum_range(NULL::gig_status))[1], now(), now() + interval '4 hours', 'UTC',
        rls_test.u('a_admin'), rls_test.u('a_admin'), rls_test.u('org_a'));
INSERT INTO gig_participants (gig_id, organization_id, role) VALUES (rls_test.u('gig3'), rls_test.u('org_a'), 'Production');
INSERT INTO assets (id, organization_id, acquisition_date, category, manufacturer_model, quantity, tag_number, item_cost, status, created_by, updated_by)
SELECT rls_test.u(n), rls_test.u('org_a'), DATE '2026-01-15', 'Audio', 'QSC K12.2', 1, t, 900, 'Active', rls_test.u('a_admin'), rls_test.u('a_admin')
FROM (VALUES ('unit_s', 'DSL-0111'), ('unit_t', 'DSL-0112'), ('unit_u', 'DSL-0113')) v(n, t);
INSERT INTO inventory_tracking (organization_id, gig_id, kit_id, asset_id, status, quantity, location, scanned_at) VALUES
  -- A: unit_s left open at the shared gig, then out and back at gig3: it's home.
  (rls_test.u('org_a'), rls_test.u('gig'),  rls_test.u('kit_a'),  rls_test.u('unit_s'), 'On Site',      1, NULL, now() - interval '3 hours'),
  (rls_test.u('org_a'), rls_test.u('gig3'), rls_test.u('kit_a'),  rls_test.u('unit_s'), 'Checked Out',  1, NULL, now() - interval '2 hours'),
  (rls_test.u('org_a'), rls_test.u('gig3'), rls_test.u('kit_a'),  rls_test.u('unit_s'), 'In Warehouse', 1, 'Warehouse', now() - interval '1 hour'),
  -- B: unit_t out at the shared gig, moved from kit_a to kit_a2 there.
  (rls_test.u('org_a'), rls_test.u('gig'),  rls_test.u('kit_a'),  rls_test.u('unit_t'), 'On Site',      1, NULL, now() - interval '2 hours'),
  (rls_test.u('org_a'), rls_test.u('gig'),  rls_test.u('kit_a2'), rls_test.u('unit_t'), 'On Site',      1, NULL, now() - interval '1 hour'),
  -- C: unit_u left open at the shared gig, now out at gig3.
  (rls_test.u('org_a'), rls_test.u('gig'),  rls_test.u('kit_a'),  rls_test.u('unit_u'), 'On Site',      1, NULL, now() - interval '2 hours'),
  (rls_test.u('org_a'), rls_test.u('gig3'), rls_test.u('kit_a'),  rls_test.u('unit_u'), 'Checked Out',  1, NULL, now() - interval '1 hour');

SELECT rls_test.expect('A: a unit home by its newest row can be sent without a gig',
  rls_test.keep('a_staff', rls_test.send('unit_s', 1)), 1);
SELECT rls_test.expect('…it''s in Maintenance', (rls_test.status_of('unit_s') = 'Maintenance')::int, 1);
SELECT rls_test.says('A unit out at a gig can''t be sent without one',
  rls_test.err('a_staff', rls_test.send('unit_u', 1)), '%isn''t home%');

SELECT rls_test.expect('B: flag unit_t at the gig (moved between kits there)', rls_test.keep('a_staff', rls_test.send('unit_t', 1, 'gig')), 1);
SELECT rls_test.expect('…pending', (SELECT maintenance_pending::int FROM assets WHERE id = rls_test.u('unit_t')), 1);
SELECT rls_test.keep('a_staff', format('INSERT INTO inventory_tracking (organization_id, gig_id, kit_id, asset_id, status, quantity, location, scanned_at) VALUES (%s, %s, %s, %s, ''In Warehouse'', 1, ''Warehouse'', now())',
  rls_test.id('org_a'), rls_test.id('gig'), rls_test.id('kit_a2'), rls_test.id('unit_t')));
SELECT rls_test.expect('…its return in the second kit brings it home into Maintenance',
  (SELECT count(*)::int FROM assets WHERE id = rls_test.u('unit_t') AND status = 'Maintenance' AND NOT maintenance_pending), 1);

SELECT rls_test.expect('C: flagging unit_u at the shared gig, while it''s out at gig3, leaves it pending',
  rls_test.keep('a_staff', rls_test.send('unit_u', 1, 'gig')), 1);
SELECT rls_test.expect('…pending', (SELECT maintenance_pending::int FROM assets WHERE id = rls_test.u('unit_u')), 1);
SELECT rls_test.keep('a_staff', format('INSERT INTO inventory_tracking (organization_id, gig_id, kit_id, asset_id, status, quantity, location, scanned_at) VALUES (%s, %s, %s, %s, ''In Warehouse'', 1, ''Warehouse'', now())',
  rls_test.id('org_a'), rls_test.id('gig3'), rls_test.id('kit_a'), rls_test.id('unit_u')));
SELECT rls_test.expect('…its return at gig3, where it really was, brings it home into Maintenance',
  (SELECT count(*)::int FROM assets WHERE id = rls_test.u('unit_u') AND status = 'Maintenance' AND NOT maintenance_pending), 1);

-- The out-of-service helper pins its search path.
SELECT rls_test.expect('assets_clear_flag_out_of_service sets search_path',
  (SELECT count(*)::int FROM pg_proc WHERE proname = 'assets_clear_flag_out_of_service' AND proconfig IS NOT NULL), 1);
