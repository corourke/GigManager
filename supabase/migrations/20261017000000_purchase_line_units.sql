-- #183: one purchase line of N makes N units (or one lot), each linked to its line
-- through assets.purchase_line_id.
--
-- Until now a line made one equipment record of its whole quantity, linked through
-- purchases.asset_id. With #180's rule (a serial number or tag means quantity 1), a
-- line of 2 with a serial number can't be saved at all. From here:
--   * assets.purchase_line_id is the link: a line has one or more units, or one lot.
--   * purchases.asset_id stays, pointing at the line's first unit or its lot, as the
--     marker that the line is tracked as equipment (#183: a flag, later).
--   * Depreciation and the recovery period follow purchase_line_id, so every unit on
--     a depreciated line is depreciated, not just the one purchases.asset_id names.
--
-- create_purchase_transaction_v1 stays for app builds from before this, and goes
-- in a later migration.

-- 1. When a line is depreciated ---------------------------------------------------------

-- The date of a depreciated line (or its invoice's); NULL if it isn't depreciated.
CREATE OR REPLACE FUNCTION public.purchase_line_depreciated_date(p_line uuid)
RETURNS date LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(l.purchase_date, h.purchase_date, DATE '1900-01-01')
    FROM public.purchases l
    LEFT JOIN public.purchases h ON h.id = l.parent_id
   WHERE l.id = p_line AND l.tax_treatment = 'depreciate';
$$;
REVOKE ALL ON FUNCTION public.purchase_line_depreciated_date(uuid) FROM PUBLIC, anon, authenticated;

-- The date of the depreciated purchase line behind a piece of equipment (NULL if it
-- isn't depreciated): its own line, or a line that still names it in asset_id.
CREATE OR REPLACE FUNCTION public.asset_depreciated_line_date(p_asset uuid)
RETURNS date LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(l.purchase_date, h.purchase_date, DATE '1900-01-01')
    FROM public.purchases l
    LEFT JOIN public.purchases h ON h.id = l.parent_id
   WHERE l.tax_treatment = 'depreciate'
     AND (l.id = (SELECT purchase_line_id FROM public.assets WHERE id = p_asset) OR l.asset_id = p_asset)
   ORDER BY l.purchase_date NULLS LAST
   LIMIT 1;
$$;

-- 2. Equipment: the recovery period follows the record's own purchase line ---------------
CREATE OR REPLACE FUNCTION public.assets_recovery_period_rules()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_line_date date;
  v_line_changed boolean := TG_OP = 'UPDATE' AND NEW.purchase_line_id IS DISTINCT FROM OLD.purchase_line_id;
BEGIN
  -- The row's own line (known even on insert); otherwise a line naming it in asset_id.
  v_line_date := CASE
    WHEN NEW.purchase_line_id IS NOT NULL THEN public.purchase_line_depreciated_date(NEW.purchase_line_id)
    WHEN TG_OP = 'INSERT' THEN NULL
    ELSE (SELECT COALESCE(l.purchase_date, h.purchase_date, DATE '1900-01-01')
            FROM public.purchases l LEFT JOIN public.purchases h ON h.id = l.parent_id
           WHERE l.asset_id = NEW.id AND l.tax_treatment = 'depreciate'
           ORDER BY l.purchase_date NULLS LAST LIMIT 1)
  END;

  IF v_line_date IS NULL THEN
    IF NEW.recovery_period IS NOT NULL THEN
      IF v_line_changed THEN
        NEW.recovery_period := NULL;  -- moved off its depreciated line
      ELSE
        RAISE EXCEPTION 'Only depreciated equipment has a recovery period. Set its purchase line to Depreciate first.'
          USING ERRCODE = '23514';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.recovery_period IS NULL
     AND (TG_OP = 'INSERT' OR v_line_changed OR NEW.category IS DISTINCT FROM OLD.category) THEN
    NEW.recovery_period := public.equipment_category_recovery_period(NEW.organization_id, NEW.category);
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.recovery_period IS NOT NULL
     AND NEW.recovery_period IS DISTINCT FROM OLD.recovery_period
     AND public.tax_year_is_locked(NEW.organization_id, v_line_date) THEN
    RAISE EXCEPTION 'The % tax year is locked (filed), so this equipment''s recovery period can''t change.',
      extract(year FROM v_line_date) USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER assets_recovery_period_rules ON public.assets;
CREATE TRIGGER assets_recovery_period_rules
  BEFORE INSERT OR UPDATE OF recovery_period, category, purchase_line_id ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.assets_recovery_period_rules();

-- 3. Purchase lines: depreciating or expensing a line reaches every unit on it -------------
CREATE OR REPLACE FUNCTION public.purchases_sync_asset_recovery_period()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Equipment this line no longer depreciates loses its period, unless another
  -- depreciated line still covers it.
  IF TG_OP = 'UPDATE'
     AND (OLD.asset_id IS DISTINCT FROM NEW.asset_id OR NEW.tax_treatment IS DISTINCT FROM 'depreciate') THEN
    UPDATE public.assets a SET recovery_period = NULL
     WHERE (a.id = OLD.asset_id OR a.purchase_line_id = OLD.id)
       AND a.recovery_period IS NOT NULL
       AND public.asset_depreciated_line_date(a.id) IS NULL;
  END IF;

  IF NEW.tax_treatment = 'depreciate' THEN
    UPDATE public.assets a
       SET recovery_period = public.equipment_category_recovery_period(a.organization_id, a.category)
     WHERE (a.id = NEW.asset_id OR a.purchase_line_id = NEW.id)
       AND a.recovery_period IS NULL
       AND public.equipment_category_recovery_period(a.organization_id, a.category) IS NOT NULL;
  END IF;
  RETURN NULL;
END $$;

COMMENT ON COLUMN public.assets.purchase_line_id IS
  'The purchase line this unit or lot came from (#162, #183). A line has one or more units, or one lot.';
COMMENT ON COLUMN public.purchases.asset_id IS
  'Marks the line as tracked as equipment: its first unit, or its lot (#183). Its units are the assets whose purchase_line_id is this line.';

-- 4. Shared by both writers: insert one unit or lot for a saved line ----------------------
-- Not callable from the API; the two functions below check who is asking first.
CREATE OR REPLACE FUNCTION public.insert_purchase_line_unit(p_line public.purchases, p_header public.purchases, p_unit jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id uuid;
BEGIN
  IF (p_unit->>'organization_id')::uuid IS DISTINCT FROM p_line.organization_id THEN
    RAISE EXCEPTION 'Equipment must belong to the purchase''s organization' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.assets (
    organization_id, purchase_id, purchase_line_id, equipment_item_id,
    acquisition_date, vendor, item_price, item_cost,
    category, manufacturer_model, type, description, insurance_class,
    serial_number, tag_number, quantity, replacement_value,
    status, insurance_policy_added, recovery_period,
    created_by, updated_by
  ) VALUES (
    p_line.organization_id, p_line.parent_id, p_line.id, NULLIF(p_unit->>'equipment_item_id', '')::uuid,
    COALESCE((p_unit->>'acquisition_date')::date, p_line.purchase_date, p_header.purchase_date, CURRENT_DATE),
    COALESCE(p_unit->>'vendor', p_line.vendor, p_header.vendor),
    COALESCE((p_unit->>'item_price')::numeric, p_line.item_price),
    COALESCE((p_unit->>'item_cost')::numeric, p_line.item_cost),
    COALESCE(NULLIF(p_unit->>'category', ''), NULLIF(p_line.category, ''), NULLIF(p_header.category, ''), 'Uncategorized'),
    COALESCE(NULLIF(p_unit->>'manufacturer_model', ''), NULLIF(p_line.description, ''), 'Purchased item'),
    NULLIF(p_unit->>'type', ''), p_unit->>'description', NULLIF(p_unit->>'insurance_class', ''),
    NULLIF(btrim(p_unit->>'serial_number'), ''), NULLIF(btrim(p_unit->>'tag_number'), ''),
    COALESCE((p_unit->>'quantity')::numeric, 1),
    (p_unit->>'replacement_value')::numeric,
    COALESCE(NULLIF(p_unit->>'status', ''), 'Active'),
    COALESCE((p_unit->>'insurance_policy_added')::boolean, false),
    -- A period only on a depreciated line; none sent: the category's default.
    CASE WHEN p_line.tax_treatment = 'depreciate' THEN (p_unit->>'recovery_period')::smallint END,
    auth.uid(), auth.uid()
  ) RETURNING id INTO v_id;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.insert_purchase_line_unit(public.purchases, public.purchases, jsonb) FROM PUBLIC, anon, authenticated;

-- 5. Record a purchase: its lines, and the units or lots of the tracked ones ---------------
-- p_units: one entry per unit or lot, each naming its line by `line_index` (0-based,
-- into p_items). Kits are not set here: kit lines are edited in the kit editor (#184).
CREATE OR REPLACE FUNCTION public.create_purchase_transaction_v2(p_header jsonb, p_items jsonb[], p_units jsonb[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org uuid := (p_header->>'organization_id')::uuid;
  v_header public.purchases%ROWTYPE;
  v_line public.purchases%ROWTYPE;
  v_item jsonb;
  v_unit jsonb;
  v_idx int;
  v_line_ids uuid[] := '{}';
  v_unit_ids uuid[] := '{}';
  v_unit_id uuid;
BEGIN
  IF NOT public.user_is_admin_or_manager_of_org(v_org, auth.uid()) THEN
    RAISE EXCEPTION 'Permission denied: Only Admins and Managers of this organization can record purchases' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(COALESCE(p_items, ARRAY[]::jsonb[]) || COALESCE(p_units, ARRAY[]::jsonb[])) r
              WHERE (r->>'organization_id')::uuid IS DISTINCT FROM v_org) THEN
    RAISE EXCEPTION 'Every purchase row must belong to the purchase''s organization' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(COALESCE(p_units, ARRAY[]::jsonb[])) u
              WHERE (u->>'line_index') IS NULL OR (u->>'line_index')::int NOT BETWEEN 0 AND COALESCE(array_length(p_items, 1), 0) - 1) THEN
    RAISE EXCEPTION 'Each unit must name a line of this purchase' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.purchases (
    organization_id, gig_id, row_type, purchase_date, vendor, total_inv_amount,
    payment_method, description, category, created_by, updated_by
  ) VALUES (
    v_org, (p_header->>'gig_id')::uuid, 'header', (p_header->>'purchase_date')::date, p_header->>'vendor',
    (p_header->>'total_inv_amount')::numeric, p_header->>'payment_method', p_header->>'description',
    p_header->>'category', auth.uid(), auth.uid()
  ) RETURNING * INTO v_header;

  FOREACH v_item IN ARRAY COALESCE(p_items, ARRAY[]::jsonb[]) LOOP
    INSERT INTO public.purchases (
      organization_id, parent_id, row_type, purchase_date, vendor, line_amount, line_cost,
      quantity, item_price, item_cost, description, category, tax_treatment, created_by, updated_by
    ) VALUES (
      v_org, v_header.id, 'line', (v_item->>'purchase_date')::date, v_item->>'vendor',
      (v_item->>'line_amount')::numeric, (v_item->>'line_cost')::numeric, (v_item->>'quantity')::numeric,
      (v_item->>'item_price')::numeric, (v_item->>'item_cost')::numeric, v_item->>'description', v_item->>'category',
      NULLIF(v_item->>'tax_treatment', ''),  -- NULL: the default trigger sets it
      auth.uid(), auth.uid()
    ) RETURNING id INTO v_unit_id;
    v_line_ids := v_line_ids || v_unit_id;
  END LOOP;

  FOREACH v_unit IN ARRAY COALESCE(p_units, ARRAY[]::jsonb[]) LOOP
    v_idx := (v_unit->>'line_index')::int + 1;
    SELECT * INTO v_line FROM public.purchases WHERE id = v_line_ids[v_idx];
    v_unit_id := public.insert_purchase_line_unit(v_line, v_header, v_unit);
    v_unit_ids := v_unit_ids || v_unit_id;
    -- The line's first unit (or its lot) marks it tracked.
    UPDATE public.purchases SET asset_id = v_unit_id WHERE id = v_line.id AND asset_id IS NULL;
  END LOOP;

  RETURN jsonb_build_object('id', v_header.id, 'line_ids', to_jsonb(v_line_ids), 'unit_ids', to_jsonb(v_unit_ids));
END $$;
REVOKE EXECUTE ON FUNCTION public.create_purchase_transaction_v2(jsonb, jsonb[], jsonb[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_purchase_transaction_v2(jsonb, jsonb[], jsonb[]) TO authenticated;

-- 6. Add units (or a lot) to a saved line: tracking it for the first time, or more of them --
-- Fields not sent come from the line and its invoice (date, vendor, price, cost).
CREATE OR REPLACE FUNCTION public.add_purchase_line_units(p_line_id uuid, p_units jsonb[])
RETURNS uuid[] LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_line public.purchases%ROWTYPE;
  v_header public.purchases%ROWTYPE;
  v_unit jsonb;
  v_ids uuid[] := '{}';
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
  SELECT * INTO v_header FROM public.purchases WHERE id = v_line.parent_id;

  FOREACH v_unit IN ARRAY COALESCE(p_units, ARRAY[]::jsonb[]) LOOP
    v_ids := v_ids || public.insert_purchase_line_unit(v_line, v_header, v_unit);
  END LOOP;

  IF v_line.asset_id IS NULL AND array_length(v_ids, 1) > 0 THEN
    UPDATE public.purchases SET asset_id = v_ids[1], updated_by = auth.uid() WHERE id = p_line_id;
  END IF;
  RETURN v_ids;
END $$;
REVOKE EXECUTE ON FUNCTION public.add_purchase_line_units(uuid, jsonb[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_purchase_line_units(uuid, jsonb[]) TO authenticated;
