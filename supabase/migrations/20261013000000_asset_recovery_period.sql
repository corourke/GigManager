-- #125 (10-07, Cameron): the recovery period belongs to the equipment record.
--
-- 1. assets.recovery_period (5, 7 or 15 years). Only depreciated equipment has
--    one: equipment whose purchase line has tax_treatment 'depreciate'. It moves
--    here from purchases.recovery_period, which nothing ever set.
-- 2. equipment_categories.default_recovery_period: the period a category implies
--    (Cameron, 10-07: Computer, Networking, Software and Misc 5; Vehicles and the
--    production gear 7). A category an Admin sets to none is asked each time.
-- 3. The period is filled in from the category whenever depreciated equipment has
--    none: when a line is depreciated, when equipment is created for one, and when
--    the equipment's category changes. Expensing the line clears it.
-- 4. A filed (locked) tax year's recovery period can be filled in, not changed.
-- 5. Existing depreciated equipment gets its category's default, except in filed
--    years: those stay blank, to be filled in from the filed returns (filling in
--    is allowed in a filed year). service_life ("MACRS, 5" on most of it, which
--    the returns didn't use) is not carried over; it and dep_method are dropped.
--    create_purchase_transaction_v1 takes `recovery_period` on the asset (or, from
--    an older app, on the line).

-- 1. Columns ---------------------------------------------------------------------
ALTER TABLE public.assets
  ADD COLUMN recovery_period smallint
  CONSTRAINT assets_recovery_period_values CHECK (recovery_period IN (5, 7, 15));
COMMENT ON COLUMN public.assets.recovery_period IS
  'Tax recovery period in years (5, 7 or 15). Only on depreciated equipment (its purchase line has tax_treatment depreciate); NULL = not yet chosen.';

ALTER TABLE public.equipment_categories
  ADD COLUMN default_recovery_period smallint
  CONSTRAINT equipment_categories_default_recovery_period_values CHECK (default_recovery_period IN (5, 7, 15));
COMMENT ON COLUMN public.equipment_categories.default_recovery_period IS
  'Recovery period that depreciated equipment in this category gets by default; NULL = ask.';

-- Starter set and every organization's copy, by name.
UPDATE public.equipment_categories c SET default_recovery_period = d.period
  FROM (VALUES
    ('computer', 5), ('computers', 5), ('networking', 5), ('software', 5), ('misc', 5),
    ('vehicles and trailers', 7), ('vehicles', 7),
    ('audio', 7), ('lighting', 7), ('video', 7), ('rigging and truss', 7), ('staging', 7),
    ('power', 7), ('communications', 7), ('backline', 7), ('effects', 7),
    ('cases and bags', 7), ('cases/bags', 7), ('cases', 7), ('rack', 7), ('tools', 7)
  ) AS d(name, period)
 WHERE lower(btrim(c.name)) = d.name;

-- ensure_org_categories copies the default along with the rest.
CREATE OR REPLACE FUNCTION public.ensure_org_categories(p_org uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.user_is_member_of_org(p_org, auth.uid()) THEN
    RAISE EXCEPTION 'Permission denied' USING ERRCODE = '42501';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('ensure_org_categories:' || p_org::text));

  IF NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE organization_id = p_org) THEN
    INSERT INTO public.expense_categories (organization_id, name, schedule_c_line, sort_order, active)
    SELECT p_org, name, schedule_c_line, sort_order, active
      FROM public.expense_categories WHERE organization_id IS NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.equipment_categories WHERE organization_id = p_org) THEN
    INSERT INTO public.equipment_categories (organization_id, name, sort_order, active, default_recovery_period)
    SELECT p_org, name, sort_order, active, default_recovery_period
      FROM public.equipment_categories WHERE organization_id IS NULL;
  END IF;
END $$;

-- 2. Helpers ---------------------------------------------------------------------

-- The category's default period: the organization's own list, or the starter set
-- if the organization has no list yet.
CREATE OR REPLACE FUNCTION public.equipment_category_recovery_period(p_org uuid, p_category text)
RETURNS smallint LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.default_recovery_period
    FROM public.equipment_categories c
   WHERE lower(btrim(c.name)) = lower(btrim(p_category))
     AND (c.organization_id = p_org
          OR (c.organization_id IS NULL
              AND NOT EXISTS (SELECT 1 FROM public.equipment_categories o WHERE o.organization_id = p_org)))
   ORDER BY c.organization_id NULLS LAST
   LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.equipment_category_recovery_period(uuid, text) TO authenticated;

-- The date of the depreciated purchase line behind a piece of equipment (NULL if
-- it isn't depreciated). A line with no date of its own uses its invoice's.
CREATE OR REPLACE FUNCTION public.asset_depreciated_line_date(p_asset uuid)
RETURNS date LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(l.purchase_date, h.purchase_date, DATE '1900-01-01')
    FROM public.purchases l
    LEFT JOIN public.purchases h ON h.id = l.parent_id
   WHERE l.asset_id = p_asset AND l.tax_treatment = 'depreciate'
   ORDER BY l.purchase_date NULLS LAST
   LIMIT 1;
$$;

-- 3. Conversion ------------------------------------------------------------------
-- Data only: no cost, date or treatment changes, so the asset triggers stay out.
ALTER TABLE public.assets DISABLE TRIGGER USER;
UPDATE public.assets a
   SET recovery_period = public.equipment_category_recovery_period(a.organization_id, a.category)
 WHERE public.asset_depreciated_line_date(a.id) IS NOT NULL
   AND NOT public.tax_year_is_locked(a.organization_id, public.asset_depreciated_line_date(a.id));
ALTER TABLE public.assets ENABLE TRIGGER USER;

-- 4. Equipment: only depreciated equipment has a period; filled from the category;
--    a filed year's period can be filled in, not changed ----------------------------
CREATE OR REPLACE FUNCTION public.assets_recovery_period_rules()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_line_date date;
BEGIN
  v_line_date := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE public.asset_depreciated_line_date(NEW.id) END;

  IF v_line_date IS NULL THEN
    IF NEW.recovery_period IS NOT NULL THEN
      RAISE EXCEPTION 'Only depreciated equipment has a recovery period. Set its purchase line to Depreciate first.'
        USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.recovery_period IS NULL AND NEW.category IS DISTINCT FROM OLD.category THEN
    NEW.recovery_period := public.equipment_category_recovery_period(NEW.organization_id, NEW.category);
  END IF;

  IF OLD.recovery_period IS NOT NULL
     AND NEW.recovery_period IS DISTINCT FROM OLD.recovery_period
     AND public.tax_year_is_locked(NEW.organization_id, v_line_date) THEN
    RAISE EXCEPTION 'The % tax year is locked (filed), so this equipment''s recovery period can''t change.',
      extract(year FROM v_line_date) USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER assets_recovery_period_rules
  BEFORE INSERT OR UPDATE OF recovery_period, category ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.assets_recovery_period_rules();

-- 5. Purchase lines: depreciating fills the period, expensing (or unlinking) clears it
CREATE OR REPLACE FUNCTION public.purchases_sync_asset_recovery_period()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Equipment this line no longer depreciates loses its period, unless another
  -- depreciated line still points at it.
  IF TG_OP = 'UPDATE' AND OLD.asset_id IS NOT NULL
     AND (OLD.asset_id IS DISTINCT FROM NEW.asset_id OR NEW.tax_treatment IS DISTINCT FROM 'depreciate') THEN
    UPDATE public.assets a SET recovery_period = NULL
     WHERE a.id = OLD.asset_id AND a.recovery_period IS NOT NULL
       AND public.asset_depreciated_line_date(a.id) IS NULL;
  END IF;

  IF NEW.asset_id IS NOT NULL AND NEW.tax_treatment = 'depreciate' THEN
    UPDATE public.assets a
       SET recovery_period = public.equipment_category_recovery_period(a.organization_id, a.category)
     WHERE a.id = NEW.asset_id AND a.recovery_period IS NULL
       AND public.equipment_category_recovery_period(a.organization_id, a.category) IS NOT NULL;
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER purchases_sync_asset_recovery_period
  AFTER INSERT OR UPDATE OF tax_treatment, asset_id ON public.purchases
  FOR EACH ROW WHEN (NEW.row_type <> 'header')
  EXECUTE FUNCTION public.purchases_sync_asset_recovery_period();

-- 6. The filed-year lock on purchases no longer compares recovery_period -----------
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
     AND (NEW.tax_treatment, NEW.row_type, NEW.parent_id, NEW.organization_id,
          NEW.purchase_date, NEW.total_inv_amount, NEW.quantity, NEW.item_price, NEW.item_cost,
          NEW.line_amount, NEW.line_cost, NEW.category)
         IS DISTINCT FROM
         (OLD.tax_treatment, OLD.row_type, OLD.parent_id, OLD.organization_id,
          OLD.purchase_date, OLD.total_inv_amount, OLD.quantity, OLD.item_price, OLD.item_cost,
          OLD.line_amount, OLD.line_cost, OLD.category) THEN
    RAISE EXCEPTION 'The % tax year is locked (filed): this purchase''s cost, date, category and tax treatment can''t change. Equipment links and descriptions still can.',
      extract(year FROM COALESCE(v_old_date, v_new_date)) USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

-- 7. The purchase RPC: recovery period on the equipment; no service_life / dep_method
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
  v_asset_line_periods smallint[];
  v_tracked boolean;
  v_idx int;
  v_kit_id uuid;
  v_period smallint;
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

  -- 2. Insert every line
  v_asset_purchase_ids := '{}';
  v_asset_line_periods := '{}';
  FOREACH v_item IN ARRAY p_items LOOP
    -- `track`: give this line an equipment record (the next entry of p_assets).
    -- An app from before 10-07 says so with row_type 'asset' instead.
    v_tracked := COALESCE((v_item->>'track')::boolean, false) OR v_item->>'row_type' = 'asset';

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
      created_by,
      updated_by
    ) VALUES (
      (v_item->>'organization_id')::uuid,
      v_header_id,
      -- The default-treatment trigger turns an old 'item'/'asset' into 'line'.
      CASE WHEN v_item->>'row_type' IN ('item', 'asset') THEN v_item->>'row_type' ELSE 'line' END,
      (v_item->>'purchase_date')::date,
      v_item->>'vendor',
      (v_item->>'line_amount')::numeric,
      (v_item->>'line_cost')::numeric,
      (v_item->>'quantity')::numeric,
      (v_item->>'item_price')::numeric,
      (v_item->>'item_cost')::numeric,
      v_item->>'description',
      v_item->>'category',
      NULLIF(v_item->>'tax_treatment', ''),  -- NULL: the default trigger sets it
      auth.uid(),
      auth.uid()
    ) RETURNING id INTO v_purchase_row_id;

    IF v_tracked THEN
      v_asset_purchase_ids := v_asset_purchase_ids || v_purchase_row_id;
      -- An app from before #125 sent the period on the line.
      v_asset_line_periods := v_asset_line_periods || (v_item->>'recovery_period')::smallint;
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
      -- Linking fills the category's default period if the line is depreciated.
      UPDATE public.purchases
        SET asset_id = v_asset_id
        WHERE id = v_asset_purchase_ids[v_idx];

      v_period := COALESCE((v_asset->>'recovery_period')::smallint, v_asset_line_periods[v_idx]);
      IF v_period IS NOT NULL AND EXISTS (
           SELECT 1 FROM public.purchases WHERE id = v_asset_purchase_ids[v_idx] AND tax_treatment = 'depreciate') THEN
        UPDATE public.assets SET recovery_period = v_period WHERE id = v_asset_id;
      END IF;
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

-- 8. Drop the old columns -----------------------------------------------------------
ALTER TABLE public.purchases DROP COLUMN recovery_period;
ALTER TABLE public.assets DROP COLUMN service_life, DROP COLUMN dep_method;
