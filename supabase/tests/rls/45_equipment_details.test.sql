-- Equipment details from the purchase screen (10-06): new equipment keeps its Type and
-- goes into the chosen kits; sub-category is gone from equipment and purchases.
-- Checks read as: rls_test.expect(label, <rows seen or affected, -1 = rejected>, expected).

CREATE FUNCTION rls_test.as_user(p_user text) RETURNS void LANGUAGE sql AS
  $$ SELECT set_config('request.jwt.claim.sub', rls_test.u(p_user)::text, true) $$;

CREATE FUNCTION rls_test.buy(p_kits jsonb) RETURNS int LANGUAGE sql AS $$
  SELECT rls_test.try(rls_test.u('a_manager'), format($q$
    SELECT public.create_purchase_transaction_v1(
      jsonb_build_object('organization_id', %1$L::uuid, 'purchase_date', '2026-05-01', 'vendor', 'V', 'total_inv_amount', 100),
      ARRAY[jsonb_build_object('organization_id', %1$L::uuid, 'row_type', 'asset', 'tax_treatment', 'expense', 'purchase_date', '2026-05-01',
                               'quantity', 4, 'item_cost', 25, 'line_cost', 100, 'description', 'XLR cable 25ft')],
      ARRAY[jsonb_build_object('organization_id', %1$L::uuid, 'acquisition_date', '2026-05-01', 'category', 'Audio', 'type', 'Cable, XLR',
                               'manufacturer_model', 'XLR cable 25ft', 'quantity', 4, 'item_cost', 25, 'status', 'Active',
                               'insurance_policy_added', false, 'kit_ids', %2$L::jsonb)])$q$, rls_test.u('org_a'), p_kits))
$$;

SELECT rls_test.expect('Another org''s kit is refused',
  rls_test.buy(jsonb_build_array(rls_test.u('kit_b'))), -1);
SELECT rls_test.expect('A purchase with equipment going into a kit saves',
  rls_test.buy(jsonb_build_array(rls_test.u('kit_a'))), 1);

SELECT rls_test.as_user('a_manager');
SELECT public.create_purchase_transaction_v1(
  jsonb_build_object('organization_id', rls_test.u('org_a'), 'purchase_date', '2026-05-02', 'vendor', 'V', 'total_inv_amount', 100),
  ARRAY[jsonb_build_object('organization_id', rls_test.u('org_a'), 'row_type', 'asset', 'tax_treatment', 'expense', 'purchase_date', '2026-05-02',
                           'quantity', 4, 'item_cost', 25, 'line_cost', 100, 'description', 'Kept cable')],
  ARRAY[jsonb_build_object('organization_id', rls_test.u('org_a'), 'acquisition_date', '2026-05-02', 'category', 'Audio', 'type', 'Cable, XLR',
                           'manufacturer_model', 'Kept cable', 'quantity', 4, 'item_cost', 25, 'status', 'Active',
                           'insurance_policy_added', false, 'kit_ids', jsonb_build_array(rls_test.u('kit_a')))]);
SELECT rls_test.expect('The new equipment keeps its Type',
  (SELECT count(*)::int FROM assets WHERE manufacturer_model = 'Kept cable' AND type = 'Cable, XLR'), 1);
SELECT rls_test.expect('...and is in the kit, all 4 of them',
  (SELECT count(*)::int FROM kit_components c JOIN assets a ON a.id = c.asset_id
    WHERE a.manufacturer_model = 'Kept cable' AND c.kit_id = rls_test.u('kit_a') AND c.quantity = 4), 1);

SELECT rls_test.expect('Equipment has no sub-category column',
  (SELECT count(*)::int FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'assets' AND column_name = 'sub_category'), 0);
SELECT rls_test.expect('Purchases have no sub-category column',
  (SELECT count(*)::int FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'purchases' AND column_name = 'sub_category'), 0);
SELECT rls_test.expect('The old one-way reclassify function is gone',
  (SELECT count(*)::int FROM pg_proc WHERE proname = 'reclassify_expense_as_asset'), 0);
