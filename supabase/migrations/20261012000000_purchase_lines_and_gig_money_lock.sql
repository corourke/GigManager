-- #133 leftovers (10-07, Cameron's go):
--
-- 1. Purchase lines are one type. row_type is 'header' or 'line'; whether a line is
--    tracked as equipment is `asset_id`, and how it is taxed is `tax_treatment`.
--    The old 'item' / 'asset' values become 'line'. An app still on the old build
--    may write 'item' / 'asset' for a while: the default-treatment trigger stores
--    those as 'line', taking the treatment from the old type when none is given.
--    create_purchase_transaction_v1 takes `track: true` on a line that gets an
--    equipment record (row_type 'asset' still works).
--
-- 2. Filed (locked) tax years also lock gig money that is tax data: income, and
--    expenses that aren't linked to a purchase line (quick expenses, mileage,
--    staff pay). A gig expense linked to a purchase line is gig accounting only
--    (the line is the tax record) and stays editable, but it can't be unlinked in
--    a locked year. The year is the row's `date`. Notes, descriptions, reference
--    numbers, the counterparty and the due date can still change.

-- 1a. Default-treatment trigger: normalize old line types -------------------------
CREATE OR REPLACE FUNCTION public.purchases_default_tax_treatment()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.row_type = 'header' THEN
    RETURN NEW;  -- the check constraint refuses a header with a treatment
  END IF;
  IF NEW.row_type IN ('item', 'asset') THEN  -- written by an app from before 10-07
    IF NEW.tax_treatment IS NULL THEN
      NEW.tax_treatment := CASE NEW.row_type WHEN 'asset' THEN 'depreciate' ELSE 'expense' END;
    END IF;
    NEW.row_type := 'line';
  END IF;
  IF TG_OP = 'INSERT' AND NEW.tax_treatment IS NULL THEN
    NEW.tax_treatment := 'expense';
  END IF;
  RETURN NEW;
END $function$;

-- 1b. The data: item / asset -> line ------------------------------------------------
-- A type rename only: no cost, date or treatment changes, so the purchase triggers
-- (tax-year lock, updated_at, depreciate checks) are switched off for it.
ALTER TABLE public.purchases DROP CONSTRAINT purchases_row_type_check;
ALTER TABLE public.purchases DISABLE TRIGGER USER;
UPDATE public.purchases SET row_type = 'line' WHERE row_type IN ('item', 'asset');
ALTER TABLE public.purchases ENABLE TRIGGER USER;
ALTER TABLE public.purchases ADD CONSTRAINT purchases_row_type_check
  CHECK (row_type IN ('header', 'line'));
COMMENT ON COLUMN public.purchases.row_type IS
  'header (the invoice) or line. Tracked as equipment = asset_id; tax = tax_treatment.';

-- 1c. The purchase RPC writes 'line' and takes `track` -------------------------------
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
  v_tracked boolean;
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

  -- 2. Insert every line
  v_asset_purchase_ids := '{}';
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
      recovery_period,
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
      (v_item->>'recovery_period')::smallint,
      auth.uid(),
      auth.uid()
    ) RETURNING id INTO v_purchase_row_id;

    IF v_tracked THEN
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


-- 2. Filed years lock gig money that is tax data --------------------------------------
CREATE OR REPLACE FUNCTION public.gig_financials_enforce_tax_year_lock()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_old boolean := false;
  v_new boolean := false;
BEGIN
  -- Tax data: income, and expenses not linked to a purchase line.
  IF TG_OP <> 'INSERT' THEN
    v_old := (OLD.direction = 'in' OR OLD.purchase_id IS NULL)
             AND public.tax_year_is_locked(OLD.organization_id, OLD.date);
  END IF;
  IF TG_OP <> 'DELETE' THEN
    v_new := (NEW.direction = 'in' OR NEW.purchase_id IS NULL)
             AND public.tax_year_is_locked(NEW.organization_id, NEW.date);
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF v_new THEN
      RAISE EXCEPTION 'The % tax year is locked (filed), so no gig income or expenses can be added to it.',
        extract(year FROM NEW.date) USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF v_old THEN
      RAISE EXCEPTION 'The % tax year is locked (filed), so its gig income and expenses can''t be deleted.',
        extract(year FROM OLD.date) USING ERRCODE = '42501';
    END IF;
    RETURN OLD;
  END IF;

  IF (v_old OR v_new)
     AND (NEW.organization_id, NEW.direction, NEW.stage, NEW.amount, NEW.amount_settled, NEW.currency,
          NEW.date, NEW.paid_at, NEW.category, NEW.mileage, NEW.purchase_id)
         IS DISTINCT FROM
         (OLD.organization_id, OLD.direction, OLD.stage, OLD.amount, OLD.amount_settled, OLD.currency,
          OLD.date, OLD.paid_at, OLD.category, OLD.mileage, OLD.purchase_id) THEN
    RAISE EXCEPTION 'The % tax year is locked (filed): this gig income or expense''s amount, date, category and status can''t change. Notes and descriptions still can.',
      extract(year FROM CASE WHEN v_old THEN OLD.date ELSE NEW.date END) USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $function$;

CREATE TRIGGER gig_financials_tax_year_lock
  BEFORE INSERT OR UPDATE OR DELETE ON public.gig_financials
  FOR EACH ROW EXECUTE FUNCTION public.gig_financials_enforce_tax_year_lock();
