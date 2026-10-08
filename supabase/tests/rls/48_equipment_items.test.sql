-- #180: equipment items (what it is) and assets as units and lots (what we own).
-- Checks read as: rls_test.expect(label, <rows seen or affected, -1 = rejected>, expected).

INSERT INTO rls_test.ids VALUES
  ('kit_parent', '00000000-0000-0000-0000-0000000010a1'),
  ('ph', '00000000-0000-0000-0000-0000000010b1'),
  ('pl', '00000000-0000-0000-0000-0000000010b2');

CREATE FUNCTION rls_test.id(p text) RETURNS text LANGUAGE sql STABLE AS $$ SELECT quote_literal(rls_test.u(p)) $$;
CREATE FUNCTION rls_test.run(p_user text, p_sql text) RETURNS int LANGUAGE sql AS
  $$ SELECT rls_test.try(rls_test.u(p_user), p_sql) $$;
-- Runs as the test superuser, always rolled back: rows affected, or -1 if refused.
CREATE FUNCTION rls_test.su(p_sql text) RETURNS int LANGUAGE plpgsql AS $$
DECLARE n int;
BEGIN
  BEGIN
    EXECUTE p_sql;
    GET DIAGNOSTICS n = ROW_COUNT;
    RAISE EXCEPTION USING ERRCODE = 'P0099', MESSAGE = n::text;
  EXCEPTION
    WHEN SQLSTATE 'P0099' THEN RETURN SQLERRM::int;
    WHEN OTHERS THEN RETURN -1;
  END;
END $$;
CREATE FUNCTION rls_test.add_asset(p_org text, p_model text, p_cat text, p_qty int DEFAULT 1, p_serial text DEFAULT NULL)
RETURNS uuid LANGUAGE sql AS $$
  INSERT INTO assets (organization_id, acquisition_date, category, manufacturer_model, quantity, serial_number, type,
                      description, insurance_class, created_by, updated_by)
  VALUES (rls_test.u(p_org), '2026-01-01', p_cat, p_model, p_qty, p_serial, 'Microphone, Vocal', 'first notes', 'Class A',
          rls_test.u('a_admin'), rls_test.u('a_admin'))
  RETURNING id $$;
CREATE FUNCTION rls_test.item_of(p_asset uuid) RETURNS uuid LANGUAGE sql AS
  $$ SELECT equipment_item_id FROM assets WHERE id = p_asset $$;

-- 1. Schema ----------------------------------------------------------------------
SELECT rls_test.expect('equipment_items exists, with RLS on',
  (SELECT count(*)::int FROM pg_class WHERE relname = 'equipment_items' AND relrowsecurity), 1);
SELECT rls_test.expect('Every equipment record must have an item',
  (SELECT count(*)::int FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'equipment_item_id' AND is_nullable = 'NO'), 1);
SELECT rls_test.expect('Equipment records point at their purchase line',
  (SELECT count(*)::int FROM information_schema.columns WHERE table_name = 'assets' AND column_name = 'purchase_line_id'), 1);

-- 2. Find or create the item -------------------------------------------------------
CREATE TEMP TABLE t_assets AS SELECT
  rls_test.add_asset('org_a', 'Shure SM58', 'Audio') AS sm58,
  rls_test.add_asset('org_a', E'  shure   SM58\n', 'audio ') AS sm58_messy,
  rls_test.add_asset('org_a', 'Shure SM58', 'Lighting') AS sm58_lighting,
  rls_test.add_asset('org_b', 'Shure SM58', 'Audio') AS sm58_b;
SELECT rls_test.expect('A new record gets an item',
  (SELECT count(*)::int FROM t_assets WHERE rls_test.item_of(sm58) IS NOT NULL), 1);
SELECT rls_test.expect('Same model and category (case and whitespace aside) is the same item',
  (SELECT count(*)::int FROM t_assets WHERE rls_test.item_of(sm58) = rls_test.item_of(sm58_messy)), 1);
SELECT rls_test.expect('Another category is another item',
  (SELECT count(*)::int FROM t_assets WHERE rls_test.item_of(sm58) <> rls_test.item_of(sm58_lighting)), 1);
SELECT rls_test.expect('Another organization is another item',
  (SELECT count(*)::int FROM t_assets WHERE rls_test.item_of(sm58) <> rls_test.item_of(sm58_b)), 1);
SELECT rls_test.expect('The item takes the first record''s name (whitespace tidied), type, description and insurance class',
  (SELECT count(*)::int FROM equipment_items i, t_assets t WHERE i.id = rls_test.item_of(t.sm58)
     AND i.manufacturer_model = 'Shure SM58' AND i.category = 'Audio' AND i.type = 'Microphone, Vocal'
     AND i.description = 'first notes' AND i.insurance_class = 'Class A'), 1);

UPDATE assets SET category = 'Lighting' WHERE id = (SELECT sm58_messy FROM t_assets);
SELECT rls_test.expect('Changing a record''s category moves it to that item',
  (SELECT count(*)::int FROM t_assets WHERE rls_test.item_of(sm58_messy) = rls_test.item_of(sm58_lighting)), 1);
UPDATE assets SET manufacturer_model = 'Shure Beta 58A' WHERE id = (SELECT sm58_messy FROM t_assets);
SELECT rls_test.expect('Renaming a record to a new model makes a new item',
  (SELECT count(*)::int FROM equipment_items WHERE manufacturer_model = 'Shure Beta 58A' AND category = 'Lighting'), 1);
UPDATE assets SET equipment_item_id = (SELECT rls_test.item_of(sm58) FROM t_assets) WHERE id = (SELECT sm58_lighting FROM t_assets);
SELECT rls_test.expect('An item set directly is kept',
  (SELECT count(*)::int FROM t_assets WHERE rls_test.item_of(sm58_lighting) = rls_test.item_of(sm58)), 1);
SELECT rls_test.expect('A record can''t point at another organization''s item',
  rls_test.su(format('UPDATE assets SET equipment_item_id = %L WHERE id = %L',
    (SELECT rls_test.item_of(sm58_b) FROM t_assets), (SELECT sm58 FROM t_assets))), -1);

-- 3. A serial number or tag means quantity 1 ------------------------------------------
SELECT rls_test.expect('A lot (no serial, no tag) can have a quantity',
  rls_test.su($q$SELECT rls_test.add_asset('org_a', 'XLR 25 ft', 'Audio', 10)$q$), 1);
SELECT rls_test.expect('A record with a serial number can''t have quantity 2',
  rls_test.su($q$SELECT rls_test.add_asset('org_a', 'QSC K12.2', 'Audio', 2, 'SN1')$q$), -1);
SELECT rls_test.expect('A record with a tag can''t have quantity 2',
  rls_test.su($q$INSERT INTO assets (organization_id, acquisition_date, category, manufacturer_model, quantity, tag_number, created_by, updated_by)
    VALUES ('00000000-0000-0000-0000-00000000000a', '2026-01-01', 'Audio', 'Box', 2, 'T-1', '00000000-0000-0000-0001-000000000000', '00000000-0000-0000-0001-000000000000')$q$), -1);
SELECT rls_test.expect('A blank serial doesn''t count',
  rls_test.su($q$SELECT rls_test.add_asset('org_a', 'Cable', 'Audio', 4, '  ')$q$), 1);
SELECT rls_test.expect('Raising a serial-numbered unit''s quantity is refused',
  rls_test.su(format('UPDATE assets SET quantity = 2, serial_number = %L WHERE id = %L', 'SN9', (SELECT sm58 FROM t_assets))), -1);
-- A record that broke the rule before it existed can still be edited otherwise.
ALTER TABLE assets DISABLE TRIGGER USER;
UPDATE assets SET serial_number = 'OLD', quantity = 3 WHERE id = (SELECT sm58_b FROM t_assets);
ALTER TABLE assets ENABLE TRIGGER USER;
SELECT rls_test.expect('An older record that breaks the rule can still change its status',
  rls_test.su(format('UPDATE assets SET status = %L WHERE id = %L', 'Maintenance', (SELECT sm58_b FROM t_assets))), 1);

-- 4. Who sees and writes items -------------------------------------------------------
SELECT rls_test.expect('A viewer sees their organization''s items',
  (rls_test.visible(rls_test.u('a_viewer'), 'equipment_items', format('organization_id = %L', rls_test.u('org_a'))) > 0)::int, 1);
SELECT rls_test.expect('Another organization''s users see none of them',
  rls_test.visible(rls_test.u('b_admin'), 'equipment_items', format('organization_id = %L', rls_test.u('org_a'))), 0);
SELECT rls_test.expect('Nor does an unrelated organization',
  rls_test.visible(rls_test.u('c_admin'), 'equipment_items', 'true'), 0);
SELECT rls_test.expect('A manager can add an item',
  rls_test.run('a_manager', format('INSERT INTO equipment_items (organization_id, category, manufacturer_model) VALUES (%s, %L, %L)', rls_test.id('org_a'), 'Audio', 'QSC K12.2')), 1);
SELECT rls_test.expect('Staff can''t',
  rls_test.run('a_staff', format('INSERT INTO equipment_items (organization_id, category, manufacturer_model) VALUES (%s, %L, %L)', rls_test.id('org_a'), 'Audio', 'QSC K10')), -1);
SELECT rls_test.expect('Nor can another organization''s Admin',
  rls_test.run('b_admin', format('INSERT INTO equipment_items (organization_id, category, manufacturer_model) VALUES (%s, %L, %L)', rls_test.id('org_a'), 'Audio', 'QSC K8')), -1);
SELECT rls_test.expect('Two items can''t share a model and category',
  rls_test.su(format('INSERT INTO equipment_items (organization_id, category, manufacturer_model) VALUES (%s, %L, %L)', rls_test.id('org_a'), 'AUDIO', 'shure sm58')), -1);

-- 5. Kit lines: a unit, N of any of an item, or a kit ----------------------------------
INSERT INTO kits (id, organization_id, name, created_by, updated_by)
  VALUES (rls_test.u('kit_parent'), rls_test.u('org_a'), 'Parent', rls_test.u('a_admin'), rls_test.u('a_admin'));
SELECT rls_test.expect('A kit line can be N × any of an item',
  rls_test.run('a_manager', format('INSERT INTO kit_components (kit_id, equipment_item_id, quantity) VALUES (%s, %L, 2)',
    rls_test.id('kit_a'), (SELECT rls_test.item_of(sm58) FROM t_assets))), 1);
SELECT rls_test.expect('A kit line can''t have two targets',
  rls_test.su(format('INSERT INTO kit_components (kit_id, asset_id, equipment_item_id, quantity) VALUES (%s, %L, %L, 1)',
    rls_test.id('kit_a'), (SELECT sm58 FROM t_assets), (SELECT rls_test.item_of(sm58) FROM t_assets))), -1);
SELECT rls_test.expect('Or none',
  rls_test.su(format('INSERT INTO kit_components (kit_id, quantity) VALUES (%s, 1)', rls_test.id('kit_a'))), -1);
SELECT rls_test.expect('A kit can''t use another organization''s item',
  rls_test.su(format('INSERT INTO kit_components (kit_id, equipment_item_id, quantity) VALUES (%s, %L, 1)',
    rls_test.id('kit_a'), (SELECT rls_test.item_of(sm58_b) FROM t_assets))), -1);

INSERT INTO kit_components (kit_id, equipment_item_id, quantity) SELECT rls_test.u('kit_a'), rls_test.item_of(sm58), 2 FROM t_assets;
INSERT INTO kit_components (kit_id, asset_id, quantity) SELECT rls_test.u('kit_a'), sm58_lighting, 1 FROM t_assets;
INSERT INTO kit_components (kit_id, child_kit_id, quantity) VALUES (rls_test.u('kit_parent'), rls_test.u('kit_a'), 3);
SELECT rls_test.expect('A kit lists an item once',
  rls_test.su(format('INSERT INTO kit_components (kit_id, equipment_item_id, quantity) VALUES (%s, %L, 1)',
    rls_test.id('kit_a'), (SELECT rls_test.item_of(sm58) FROM t_assets))), -1);
SELECT rls_test.expect('"Any" lines are flattened per item',
  (SELECT count(*)::int FROM kit_flattened_item_cache c, t_assets t
    WHERE c.kit_id = rls_test.u('kit_a') AND c.equipment_item_id = rls_test.item_of(t.sm58) AND c.total_quantity = 2), 1);
SELECT rls_test.expect('…through nested kits, multiplied',
  (SELECT count(*)::int FROM kit_flattened_item_cache c, t_assets t
    WHERE c.kit_id = rls_test.u('kit_parent') AND c.equipment_item_id = rls_test.item_of(t.sm58) AND c.total_quantity = 6), 1);
SELECT rls_test.expect('Specific-unit lines stay in the unit cache',
  (SELECT count(*)::int FROM kit_flattened_cache c, t_assets t
    WHERE c.kit_id = rls_test.u('kit_parent') AND c.asset_id = t.sm58_lighting AND c.total_quantity = 3), 1);
SELECT rls_test.expect('Another organization can''t see the item cache',
  rls_test.visible(rls_test.u('b_admin'), 'kit_flattened_item_cache', 'true'), 0);
SELECT rls_test.expect('Its own members can',
  (rls_test.visible(rls_test.u('a_viewer'), 'kit_flattened_item_cache', 'true') > 0)::int, 1);

-- 6. Purchase link -------------------------------------------------------------------
INSERT INTO purchases (id, organization_id, row_type, purchase_date, vendor, total_inv_amount)
  VALUES (rls_test.u('ph'), rls_test.u('org_a'), 'header', '2026-02-01', 'V', 100);
INSERT INTO purchases (id, organization_id, parent_id, row_type, purchase_date, quantity, item_cost, line_cost, description, tax_treatment)
  VALUES (rls_test.u('pl'), rls_test.u('org_a'), rls_test.u('ph'), 'line', '2026-02-01', 1, 100, 100, 'mic', 'expense');
UPDATE purchases SET asset_id = (SELECT sm58 FROM t_assets) WHERE id = rls_test.u('pl');
SELECT rls_test.expect('Linking a line to equipment sets the equipment''s purchase line',
  (SELECT count(*)::int FROM assets a, t_assets t WHERE a.id = t.sm58 AND a.purchase_line_id = rls_test.u('pl')), 1);
UPDATE purchases SET asset_id = NULL WHERE id = rls_test.u('pl');
SELECT rls_test.expect('Unlinking clears it',
  (SELECT count(*)::int FROM assets a, t_assets t WHERE a.id = t.sm58 AND a.purchase_line_id IS NULL), 1);

-- 7. Scans carry a quantity -------------------------------------------------------------
INSERT INTO inventory_tracking (organization_id, gig_id, asset_id, status, scanned_by)
  SELECT rls_test.u('org_a'), rls_test.u('gig'), sm58, 'Checked Out', rls_test.u('a_admin') FROM t_assets;
SELECT rls_test.expect('A scan counts 1 unless told otherwise',
  (SELECT count(*)::int FROM inventory_tracking WHERE quantity = 1), 1);
SELECT rls_test.expect('A scan can''t count 0',
  rls_test.su('UPDATE inventory_tracking SET quantity = 0'), -1);
