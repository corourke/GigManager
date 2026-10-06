-- #133 step 3: a gig link lives on a purchase line, never on the purchase (header),
-- and never on a depreciated line.
-- Checks read as: rls_test.expect(label, <rows seen or affected, -1 = rejected>, expected).

INSERT INTO rls_test.ids VALUES
  ('gh', '00000000-0000-0000-0000-00000000f101'),
  ('gl', '00000000-0000-0000-0000-00000000f102'),
  ('ga', '00000000-0000-0000-0000-00000000f103'),
  ('gd', '00000000-0000-0000-0000-00000000f104');

INSERT INTO assets (id, organization_id, acquisition_date, category, manufacturer_model, created_by, updated_by) VALUES
  (rls_test.u('ga'), rls_test.u('org_a'), '2026-03-01', 'Audio', 'Mixer', rls_test.u('a_admin'), rls_test.u('a_admin'));
INSERT INTO purchases (id, organization_id, parent_id, row_type, purchase_date, vendor, total_inv_amount, quantity, item_cost, line_cost, asset_id, tax_treatment, description) VALUES
  (rls_test.u('gh'), rls_test.u('org_a'), NULL,             'header', '2026-03-01', 'U-Haul', 80, NULL, NULL, NULL, NULL, NULL, 'Van'),
  (rls_test.u('gl'), rls_test.u('org_a'), rls_test.u('gh'), 'item',   '2026-03-01', 'U-Haul', NULL, 1, 80, 80, NULL, 'expense', 'Van rental'),
  (rls_test.u('gd'), rls_test.u('org_a'), rls_test.u('gh'), 'asset',  '2026-03-01', 'U-Haul', NULL, 1, 900, 900, rls_test.u('ga'), 'depreciate', 'Mixer');

SELECT rls_test.expect('An admin can link an expensed line to a gig',
  rls_test.try(rls_test.u('a_admin'), format('UPDATE purchases SET gig_id = %L WHERE id = %L', rls_test.u('gig'), rls_test.u('gl'))), 1);
SELECT rls_test.expect('A purchase (header) can''t be linked to a gig',
  rls_test.try(rls_test.u('a_admin'), format('UPDATE purchases SET gig_id = %L WHERE id = %L', rls_test.u('gig'), rls_test.u('gh'))), -1);
SELECT rls_test.expect('A new purchase can''t start with a gig either',
  rls_test.try(rls_test.u('a_admin'), format($$INSERT INTO purchases (organization_id, row_type, purchase_date, vendor, total_inv_amount, gig_id) VALUES (%L, 'header', '2026-03-02', 'X', 1, %L)$$, rls_test.u('org_a'), rls_test.u('gig'))), -1);
SELECT rls_test.expect('A depreciated line can''t be linked to a gig',
  rls_test.try(rls_test.u('a_admin'), format('UPDATE purchases SET gig_id = %L WHERE id = %L', rls_test.u('gig'), rls_test.u('gd'))), -1);
SELECT rls_test.expect('No purchase in the fixture carries a header gig link',
  (SELECT count(*)::int FROM purchases WHERE row_type = 'header' AND gig_id IS NOT NULL), 0);
