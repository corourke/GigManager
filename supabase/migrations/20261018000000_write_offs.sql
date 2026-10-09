-- #185: writing off missing pieces, and undoing it (Cameron, 10-09).
--
-- 1. write_off_pieces: a whole unit or lot becomes Missing, retired today; part of a lot is
--    split off into its own Missing record of the same item and values. A written-off piece
--    is a disposal with no proceeds in the year of retired_on.
-- 2. undo_write_off: the record comes back (a split-off piece merges back into its lot),
--    unless the write-off's tax year is locked.
-- 3. Tracking rows reference their own organization's equipment (data integrity).
-- 4. inventory_tracking.quantity is state, not a delta.
--
-- Only Admins and Managers of the equipment's organization can write off or undo. Both are
-- SECURITY DEFINER with explicit checks, like the purchase RPCs, so the split, the tracking
-- row and the activity entry happen together or not at all.

-- 1. Write off ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.write_off_pieces(
  p_asset_id uuid,
  p_quantity numeric,
  p_gig_id uuid DEFAULT NULL,
  p_kit_id uuid DEFAULT NULL,
  p_still_out numeric DEFAULT 0,
  p_note text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_asset public.assets;
  v_held numeric;
  v_missing_id uuid;
  v_split boolean;
BEGIN
  SELECT * INTO v_asset FROM public.assets WHERE id = p_asset_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Equipment not found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT public.user_is_admin_or_manager_of_org(v_asset.organization_id, auth.uid()) THEN
    RAISE EXCEPTION 'Permission denied: Only Admins and Managers of this organization can write off equipment'
      USING ERRCODE = '42501';
  END IF;
  IF v_asset.status IN ('Missing', 'Disposed', 'Returned') OR v_asset.retired_on IS NOT NULL THEN
    RAISE EXCEPTION 'This equipment is already retired' USING ERRCODE = '22023';
  END IF;

  v_held := COALESCE(v_asset.quantity, 1);
  IF p_quantity IS NULL OR p_quantity <= 0 OR p_quantity > v_held THEN
    RAISE EXCEPTION 'Write off between 1 and % pieces', v_held USING ERRCODE = '22023';
  END IF;
  IF COALESCE(p_still_out, 0) < 0 THEN
    RAISE EXCEPTION 'Pieces still out can''t be negative' USING ERRCODE = '22023';
  END IF;
  IF public.tax_year_is_locked(v_asset.organization_id, current_date) THEN
    RAISE EXCEPTION 'The % tax year is locked (filed), so equipment can''t be written off in it.',
      extract(year FROM current_date) USING ERRCODE = '42501';
  END IF;
  IF p_gig_id IS NOT NULL AND NOT public.org_participates_in_gig(v_asset.organization_id, p_gig_id) THEN
    RAISE EXCEPTION 'The equipment''s organization isn''t on that gig' USING ERRCODE = '42501';
  END IF;
  IF p_kit_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.kits WHERE id = p_kit_id AND organization_id = v_asset.organization_id) THEN
    RAISE EXCEPTION 'The kit must belong to the equipment''s organization' USING ERRCODE = '42501';
  END IF;

  v_split := p_quantity < v_held;
  IF v_split THEN
    -- Part of a lot: the missing pieces become their own record, with the lot's values.
    INSERT INTO public.assets (
      organization_id, equipment_item_id, purchase_line_id, purchase_id, acquisition_date, category,
      manufacturer_model, type, description, vendor, insurance_class, insurance_policy_added,
      item_cost, item_price, replacement_value, liquidation_amt, recovery_period,
      quantity, status, retired_on, created_by, updated_by)
    VALUES (
      v_asset.organization_id, v_asset.equipment_item_id, v_asset.purchase_line_id, v_asset.purchase_id,
      v_asset.acquisition_date, v_asset.category, v_asset.manufacturer_model, v_asset.type, v_asset.description,
      v_asset.vendor, v_asset.insurance_class, v_asset.insurance_policy_added,
      v_asset.item_cost, v_asset.item_price, v_asset.replacement_value, v_asset.liquidation_amt, v_asset.recovery_period,
      p_quantity, 'Missing', current_date, auth.uid(), auth.uid())
    RETURNING id INTO v_missing_id;
    UPDATE public.assets SET quantity = v_held - p_quantity, updated_by = auth.uid() WHERE id = v_asset.id;

    -- The gig's bucket for this lot: the rest came back, or some are still out.
    IF p_gig_id IS NOT NULL THEN
      INSERT INTO public.inventory_tracking
        (organization_id, gig_id, kit_id, asset_id, status, quantity, scanned_at, scanned_by, notes)
      VALUES (v_asset.organization_id, p_gig_id, p_kit_id, v_asset.id,
        CASE WHEN COALESCE(p_still_out, 0) > 0 THEN 'Not Returned' ELSE 'In Warehouse' END,
        GREATEST(COALESCE(p_still_out, 0), 1)::int, now(), auth.uid(),
        format('%s written off as missing', p_quantity));
    END IF;
  ELSE
    -- A whole unit or lot.
    UPDATE public.assets SET status = 'Missing', retired_on = current_date, updated_by = auth.uid()
     WHERE id = v_asset.id;
    v_missing_id := v_asset.id;
  END IF;

  PERFORM public.log_activity(v_asset.organization_id, 'asset.written_off', 'asset', v_missing_id, p_gig_id,
    jsonb_build_object('quantity', p_quantity, 'split_from', CASE WHEN v_split THEN v_asset.id END,
                       'kit_id', p_kit_id, 'note', p_note));
  RETURN v_missing_id;
END $$;

REVOKE EXECUTE ON FUNCTION public.write_off_pieces(uuid, numeric, uuid, uuid, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.write_off_pieces(uuid, numeric, uuid, uuid, numeric, text) TO authenticated;

-- 2. Undo ---------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.undo_write_off(p_asset_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_asset public.assets;
  v_from uuid;
  v_lot public.assets;
  v_result uuid;
BEGIN
  SELECT * INTO v_asset FROM public.assets WHERE id = p_asset_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Equipment not found' USING ERRCODE = 'P0002';
  END IF;
  IF NOT public.user_is_admin_or_manager_of_org(v_asset.organization_id, auth.uid()) THEN
    RAISE EXCEPTION 'Permission denied: Only Admins and Managers of this organization can undo a write-off'
      USING ERRCODE = '42501';
  END IF;
  IF v_asset.status <> 'Missing' THEN
    RAISE EXCEPTION 'Only missing equipment can be brought back' USING ERRCODE = '22023';
  END IF;
  IF public.tax_year_is_locked(v_asset.organization_id, v_asset.retired_on) THEN
    RAISE EXCEPTION 'The % tax year is locked (filed), so this write-off stays. Record the equipment as found instead.',
      extract(year FROM v_asset.retired_on) USING ERRCODE = '42501';
  END IF;

  -- Split off from a lot? Its write-off says so.
  SELECT (context->>'split_from')::uuid INTO v_from
    FROM public.activity_log
   WHERE event_type = 'asset.written_off' AND entity_type = 'asset' AND entity_id = v_asset.id
   ORDER BY occurred_at DESC LIMIT 1;
  IF v_from IS NOT NULL THEN
    SELECT * INTO v_lot FROM public.assets WHERE id = v_from FOR UPDATE;
  END IF;

  IF v_from IS NOT NULL AND v_lot.id IS NOT NULL AND v_lot.retired_on IS NULL
     AND v_lot.status NOT IN ('Missing', 'Disposed', 'Returned')
     AND v_lot.equipment_item_id = v_asset.equipment_item_id THEN
    -- Back into its lot.
    UPDATE public.assets SET quantity = COALESCE(quantity, 1) + COALESCE(v_asset.quantity, 1), updated_by = auth.uid()
     WHERE id = v_lot.id;
    DELETE FROM public.assets WHERE id = v_asset.id;
    v_result := v_lot.id;
  ELSE
    UPDATE public.assets SET status = 'Active', retired_on = NULL, updated_by = auth.uid() WHERE id = v_asset.id;
    v_result := v_asset.id;
  END IF;

  PERFORM public.log_activity(v_asset.organization_id, 'asset.write_off_undone', 'asset', v_result, NULL,
    jsonb_build_object('quantity', COALESCE(v_asset.quantity, 1), 'merged_from', CASE WHEN v_result <> v_asset.id THEN v_asset.id END));
  RETURN v_result;
END $$;

REVOKE EXECUTE ON FUNCTION public.undo_write_off(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.undo_write_off(uuid) TO authenticated;

-- 3. Tracking rows reference their own organization's equipment (data integrity) ------------
DROP POLICY IF EXISTS "Org members can manage their inventory tracking" ON public.inventory_tracking;
CREATE POLICY "Org members can manage their inventory tracking" ON public.inventory_tracking
  FOR ALL
  USING (public.user_is_member_of_org(organization_id, auth.uid()))
  WITH CHECK (
    public.user_is_member_of_org(organization_id, auth.uid())
    AND public.org_participates_in_gig(organization_id, gig_id)
    AND (asset_id IS NULL OR EXISTS (
      SELECT 1 FROM public.assets a WHERE a.id = inventory_tracking.asset_id AND a.organization_id = inventory_tracking.organization_id))
    AND (kit_id IS NULL OR EXISTS (
      SELECT 1 FROM public.kits k WHERE k.id = inventory_tracking.kit_id AND k.organization_id = inventory_tracking.organization_id))
  );

-- 4. What quantity means ------------------------------------------------------------------
COMMENT ON COLUMN public.inventory_tracking.quantity IS
  'How many of this unit or lot are at this gig under this kit, as of this row (state, not a delta). 1 for a unit.';
