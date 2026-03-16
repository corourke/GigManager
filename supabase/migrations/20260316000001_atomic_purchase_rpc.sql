-- Atomic function for creating a purchase header, its items, and linked assets with audit rows
CREATE OR REPLACE FUNCTION public.create_purchase_transaction_v1(
  p_header jsonb,
  p_items jsonb[],
  p_assets jsonb[]
) RETURNS jsonb AS $$
DECLARE
  v_header_id uuid;
  v_item jsonb;
  v_asset jsonb;
  v_asset_id uuid;
  v_result jsonb;
BEGIN
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

  -- 2. Insert Items (Source 2)
  FOREACH v_item IN ARRAY p_items LOOP
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
      created_by,
      updated_by
    ) VALUES (
      (v_item->>'organization_id')::uuid,
      v_header_id,
      'item',
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
      auth.uid(),
      auth.uid()
    );
  END LOOP;

  -- 3. Insert Assets and Audit Rows
  FOREACH v_asset IN ARRAY p_assets LOOP
    -- 3a. Insert Asset
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

    -- 3b. Create Audit Row in Purchases
    INSERT INTO public.purchases (
      organization_id,
      parent_id,
      asset_id,
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
      created_by,
      updated_by
    ) VALUES (
      (v_asset->>'organization_id')::uuid,
      v_header_id,
      v_asset_id,
      'item',
      (v_asset->>'acquisition_date')::date,
      v_asset->>'vendor',
      (v_asset->>'item_price')::numeric * COALESCE((v_asset->>'quantity')::numeric, 1),
      (v_asset->>'item_cost')::numeric * COALESCE((v_asset->>'quantity')::numeric, 1),
      (v_asset->>'quantity')::numeric,
      (v_asset->>'item_price')::numeric,
      (v_asset->>'item_cost')::numeric,
      -- Per requirement: populate description with manufacturer_model first, then fallback
      COALESCE(v_asset->>'manufacturer_model', v_asset->>'description'),
      v_asset->>'category',
      v_asset->>'sub_category',
      auth.uid(),
      auth.uid()
    );
  END LOOP;

  SELECT jsonb_build_object('id', v_header_id) INTO v_result;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
