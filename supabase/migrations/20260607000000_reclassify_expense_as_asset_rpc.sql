CREATE OR REPLACE FUNCTION public.reclassify_expense_as_asset(
  p_purchase_item_id uuid
) RETURNS jsonb AS $$
DECLARE
  v_item public.purchases%ROWTYPE;
  v_header public.purchases%ROWTYPE;
  v_asset_id uuid;
BEGIN
  SELECT * INTO v_item
    FROM public.purchases
    WHERE id = p_purchase_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase item not found: %', p_purchase_item_id;
  END IF;

  IF v_item.row_type != 'item' THEN
    RAISE EXCEPTION 'Purchase item % has row_type %, expected ''item''', p_purchase_item_id, v_item.row_type;
  END IF;

  SELECT * INTO v_header
    FROM public.purchases
    WHERE id = v_item.parent_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase header not found for item: %', p_purchase_item_id;
  END IF;

  INSERT INTO public.assets (
    organization_id,
    purchase_id,
    manufacturer_model,
    acquisition_date,
    vendor,
    category,
    sub_category,
    quantity,
    item_price,
    item_cost,
    status,
    created_by,
    updated_by
  ) VALUES (
    v_item.organization_id,
    v_header.id,
    v_item.description,
    v_item.purchase_date,
    v_item.vendor,
    v_item.category,
    v_item.sub_category,
    v_item.quantity,
    v_item.item_price,
    v_item.item_cost,
    'Active',
    auth.uid(),
    auth.uid()
  ) RETURNING id INTO v_asset_id;

  UPDATE public.purchases
    SET row_type = 'asset',
        asset_id = v_asset_id,
        updated_by = auth.uid()
    WHERE id = p_purchase_item_id;

  IF v_header.gig_id IS NOT NULL THEN
    DELETE FROM public.gig_financials
      WHERE purchase_id = v_header.id;
  END IF;

  RETURN jsonb_build_object('asset_id', v_asset_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
