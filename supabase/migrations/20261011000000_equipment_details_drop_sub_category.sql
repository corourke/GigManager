-- Equipment details on the purchase screen (10-06), and sub-category removed.
--
--   * create_purchase_transaction_v1: each new equipment record can name the
--     kits it goes into (`kit_ids`, kits of the same organization); it stops
--     writing sub_category. (Type was already stored; the app sent it under
--     the wrong key.)
--   * track_purchase_line_as_equipment: stops copying sub_category.
--   * assets.sub_category is folded into assets.type (Cameron's type review,
--     applied 10-06), and an expense line's sub-category served no purpose, so
--     both columns are dropped. Prod values were backed up first.
--   * purchases_enforce_tax_year_lock: stops comparing sub_category.
--   * reclassify_expense_as_asset (#129's one-way move) is retired; Track as
--     equipment replaced it in #133.

-- 1. ---------------------------------------------------------------------------
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
  v_kit_id uuid;
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
  IF EXISTS (
    SELECT 1 FROM unnest(COALESCE(p_assets, ARRAY[]::jsonb[])) a,
                  jsonb_array_elements_text(COALESCE(a->'kit_ids', '[]'::jsonb)) k(id)
     WHERE NOT EXISTS (SELECT 1 FROM public.kits WHERE id = k.id::uuid
                          AND organization_id = (p_header->>'organization_id')::uuid)
  ) THEN
    RAISE EXCEPTION 'A kit must belong to the purchase''s organization' USING ERRCODE = '42501';
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

    -- The kits it goes into (a whole asset record: all of its quantity).
    FOR v_kit_id IN SELECT (jsonb_array_elements_text(COALESCE(v_asset->'kit_ids', '[]'::jsonb)))::uuid LOOP
      INSERT INTO public.kit_components (kit_id, asset_id, quantity)
      VALUES (v_kit_id, v_asset_id, GREATEST(1, COALESCE((v_asset->>'quantity')::numeric, 1))::int)
      ON CONFLICT DO NOTHING;
    END LOOP;

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

-- 2. ---------------------------------------------------------------------------
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
    item_price, item_cost, quantity, category,
    manufacturer_model, description, status, insurance_policy_added,
    created_by, updated_by
  ) VALUES (
    v_line.organization_id, v_line.parent_id,
    COALESCE(v_line.purchase_date, v_header.purchase_date, CURRENT_DATE),
    COALESCE(v_line.vendor, v_header.vendor),
    v_line.item_price, v_line.item_cost, COALESCE(v_line.quantity, 1),
    COALESCE(NULLIF(v_line.category, ''), NULLIF(v_header.category, ''), 'Uncategorized'),
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

-- 3. The filed-year lock compared sub_category too -----------------------------
CREATE OR REPLACE FUNCTION public.purchases_enforce_tax_year_lock()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_old_date date;
  v_new_date date;
BEGIN
  -- A line with no date of its own falls in its invoice's year.
  IF TG_OP <> 'INSERT' THEN
    v_old_date := COALESCE(OLD.purchase_date,
      (SELECT purchase_date FROM public.purchases WHERE id = OLD.parent_id));
  END IF;
  IF TG_OP <> 'DELETE' THEN
    v_new_date := COALESCE(NEW.purchase_date,
      (SELECT purchase_date FROM public.purchases WHERE id = NEW.parent_id));
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF public.tax_year_is_locked(NEW.organization_id, v_new_date) THEN
      RAISE EXCEPTION 'The % tax year is locked (filed), so no purchases can be added to it.',
        extract(year FROM v_new_date) USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF public.tax_year_is_locked(OLD.organization_id, v_old_date) THEN
      RAISE EXCEPTION 'The % tax year is locked (filed), so its purchases can''t be deleted.',
        extract(year FROM v_old_date) USING ERRCODE = '42501';
    END IF;
    RETURN OLD;
  END IF;

  IF (public.tax_year_is_locked(OLD.organization_id, v_old_date)
      OR public.tax_year_is_locked(NEW.organization_id, v_new_date))
     AND (NEW.tax_treatment, NEW.recovery_period, NEW.row_type, NEW.parent_id, NEW.organization_id,
          NEW.purchase_date, NEW.total_inv_amount, NEW.quantity, NEW.item_price, NEW.item_cost,
          NEW.line_amount, NEW.line_cost, NEW.category)
         IS DISTINCT FROM
         (OLD.tax_treatment, OLD.recovery_period, OLD.row_type, OLD.parent_id, OLD.organization_id,
          OLD.purchase_date, OLD.total_inv_amount, OLD.quantity, OLD.item_price, OLD.item_cost,
          OLD.line_amount, OLD.line_cost, OLD.category) THEN
    RAISE EXCEPTION 'The % tax year is locked (filed): this purchase''s cost, date, category and tax treatment can''t change. Equipment links and descriptions still can.',
      extract(year FROM COALESCE(v_old_date, v_new_date)) USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

-- 4. ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.reclassify_expense_as_asset(uuid);

ALTER TABLE public.assets DROP COLUMN sub_category;
ALTER TABLE public.purchases DROP COLUMN sub_category;
