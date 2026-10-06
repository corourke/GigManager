-- #133 step 2: writers that set a line's tax treatment and its equipment record
-- separately.
--   1. create_purchase_transaction_v1 stores each line's tax_treatment and
--      recovery_period when given (row_type still decides which lines get an
--      asset; a line without a treatment still gets one from row_type).
--   2. track_purchase_line_as_equipment(line) creates an equipment record for an
--      existing line and links it, without changing the line's tax treatment or
--      row_type, so it also works for lines in a locked (filed) year.

-- 1. -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_purchase_transaction_v1(p_header jsonb, p_items jsonb[], p_assets jsonb[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_header_id uuid;
  v_item jsonb;
  v_asset jsonb;
  v_asset_id uuid;
  v_purchase_row_id uuid;
  v_result jsonb;
  v_asset_purchase_ids uuid[];
  v_row_type text;
  v_idx int;
BEGIN
  IF NOT public.user_is_admin_or_manager_of_org((p_header->>'organization_id')::uuid, auth.uid()) THEN
    RAISE EXCEPTION 'Permission denied: Only Admins and Managers of this organization can record purchases' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(COALESCE(p_items, ARRAY[]::jsonb[]) || COALESCE(p_assets, ARRAY[]::jsonb[])) r
    WHERE (r->>'organization_id')::uuid IS DISTINCT FROM (p_header->>'organization_id')::uuid
  ) THEN
    RAISE EXCEPTION 'Every purchase row must belong to the purchase''s organization' USING ERRCODE = '42501';
  END IF;

  -- 1. Insert Header
  INSERT INTO public.purchases (
    organization_id,
    gig_id,
    row_type,
    purchase_date,
    vendor,
    total_inv_amount,
    payment_method,
    description,
    category,
    sub_category,
    created_by,
    updated_by
  ) VALUES (
    (p_header->>'organization_id')::uuid,
    (p_header->>'gig_id')::uuid,
    'header',
    (p_header->>'purchase_date')::date,
    p_header->>'vendor',
    (p_header->>'total_inv_amount')::numeric,
    p_header->>'payment_method',
    p_header->>'description',
    p_header->>'category',
    p_header->>'sub_category',
    auth.uid(),
    auth.uid()
  ) RETURNING id INTO v_header_id;

  -- 2. Insert ALL items into purchases (both expenses and assets)
  v_asset_purchase_ids := '{}';
  FOREACH v_item IN ARRAY p_items LOOP
    v_row_type := COALESCE(v_item->>'row_type', 'item');

    INSERT INTO public.purchases (
      organization_id,
      parent_id,
      row_type,
      purchase_date,
      vendor,
      line_amount,
      line_cost,
      quantity,
      item_price,
      item_cost,
      description,
      category,
      sub_category,
      tax_treatment,
      recovery_period,
      created_by,
      updated_by
    ) VALUES (
      (v_item->>'organization_id')::uuid,
      v_header_id,
      v_row_type,
      (v_item->>'purchase_date')::date,
      v_item->>'vendor',
      (v_item->>'line_amount')::numeric,
      (v_item->>'line_cost')::numeric,
      (v_item->>'quantity')::numeric,
      (v_item->>'item_price')::numeric,
      (v_item->>'item_cost')::numeric,
      v_item->>'description',
      v_item->>'category',
      v_item->>'sub_category',
      NULLIF(v_item->>'tax_treatment', ''),  -- NULL: the default trigger takes it from row_type
      (v_item->>'recovery_period')::smallint,
      auth.uid(),
      auth.uid()
    ) RETURNING id INTO v_purchase_row_id;

    IF v_row_type = 'asset' THEN
      v_asset_purchase_ids := v_asset_purchase_ids || v_purchase_row_id;
    END IF;
  END LOOP;

  -- 3. Insert assets into assets table and link back to their purchase rows
  v_idx := 1;
  FOREACH v_asset IN ARRAY p_assets LOOP
    INSERT INTO public.assets (
      organization_id,
      purchase_id,
      acquisition_date,
      vendor,
      item_price,
      item_cost,
      category,
      sub_category,
      manufacturer_model,
      type,
      serial_number,
      description,
      replacement_value,
      quantity,
      tag_number,
      status,
      retired_on,
      service_life,
      dep_method,
      liquidation_amt,
      insurance_policy_added,
      insurance_class,
      created_by,
      updated_by
    ) VALUES (
      (v_asset->>'organization_id')::uuid,
      v_header_id,
      (v_asset->>'acquisition_date')::date,
      v_asset->>'vendor',
      (v_asset->>'item_price')::numeric,
      (v_asset->>'item_cost')::numeric,
      v_asset->>'category',
      v_asset->>'sub_category',
      v_asset->>'manufacturer_model',
      v_asset->>'type',
      v_asset->>'serial_number',
      v_asset->>'description',
      (v_asset->>'replacement_value')::numeric,
      (v_asset->>'quantity')::numeric,
      v_asset->>'tag_number',
      v_asset->>'status',
      (v_asset->>'retired_on')::date,
      (v_asset->>'service_life')::numeric,
      v_asset->>'dep_method',
      (v_asset->>'liquidation_amt')::numeric,
      (v_asset->>'insurance_policy_added')::boolean,
      v_asset->>'insurance_class',
      auth.uid(),
      auth.uid()
    ) RETURNING id INTO v_asset_id;

    IF v_idx <= array_length(v_asset_purchase_ids, 1) THEN
      UPDATE public.purchases
        SET asset_id = v_asset_id
        WHERE id = v_asset_purchase_ids[v_idx];
    END IF;
    v_idx := v_idx + 1;
  END LOOP;

  SELECT jsonb_build_object('id', v_header_id) INTO v_result;
  RETURN v_result;
END;
$function$;

ALTER FUNCTION public.create_purchase_transaction_v1(jsonb, jsonb[], jsonb[]) SET search_path TO 'public';
REVOKE EXECUTE ON FUNCTION public.create_purchase_transaction_v1(jsonb,jsonb[],jsonb[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_purchase_transaction_v1(jsonb,jsonb[],jsonb[]) TO authenticated;

-- 2. -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.track_purchase_line_as_equipment(p_line_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_line public.purchases%ROWTYPE;
  v_header public.purchases%ROWTYPE;
  v_asset_id uuid;
BEGIN
  SELECT * INTO v_line FROM public.purchases WHERE id = p_line_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase line not found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT public.user_is_admin_or_manager_of_org(v_line.organization_id, auth.uid()) THEN
    RAISE EXCEPTION 'Permission denied: Only Admins and Managers of this organization can change purchases' USING ERRCODE = '42501';
  END IF;
  IF v_line.row_type = 'header' THEN
    RAISE EXCEPTION 'Only a purchase line can be tracked as equipment' USING ERRCODE = '22023';
  END IF;
  IF v_line.asset_id IS NOT NULL THEN
    RAISE EXCEPTION 'This line is already tracked as equipment' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_header FROM public.purchases WHERE id = v_line.parent_id;

  INSERT INTO public.assets (
    organization_id, purchase_id, acquisition_date, vendor,
    item_price, item_cost, quantity, category, sub_category,
    manufacturer_model, description, status, insurance_policy_added,
    created_by, updated_by
  ) VALUES (
    v_line.organization_id, v_line.parent_id,
    COALESCE(v_line.purchase_date, v_header.purchase_date, CURRENT_DATE),
    COALESCE(v_line.vendor, v_header.vendor),
    v_line.item_price, v_line.item_cost, COALESCE(v_line.quantity, 1),
    COALESCE(NULLIF(v_line.category, ''), NULLIF(v_header.category, ''), 'Uncategorized'),
    COALESCE(v_line.sub_category, v_header.sub_category),
    COALESCE(NULLIF(v_line.description, ''), 'Purchased item'), v_line.description,
    'Active', false,
    auth.uid(), auth.uid()
  ) RETURNING id INTO v_asset_id;

  UPDATE public.purchases SET asset_id = v_asset_id, updated_by = auth.uid() WHERE id = p_line_id;
  RETURN v_asset_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.track_purchase_line_as_equipment(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.track_purchase_line_as_equipment(uuid) TO authenticated;
