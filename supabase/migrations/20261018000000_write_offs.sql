-- #185: writing off missing pieces, and undoing it (Cameron, 10-09).
--
-- 1. write_off_pieces: a whole unit or lot becomes Missing, retired today; part of a lot is
--    split off into its own Missing record of the same item and values. A written-off piece
--    is a disposal with no proceeds in the year of retired_on.
-- 2. undo_write_off: the record comes back (a split-off piece merges back into its lot),
--    unless the write-off's tax year is locked.
-- 3. Tracking rows reference their own organization's equipment (data integrity).
-- 4. inventory_tracking.quantity is state, not a delta.
-- 5. Status changes into or out of retired statuses follow the write-off rules.
--
-- Write-off provenance is stored on the record: a split-off piece keeps the lot it came from
-- (written_off_from), and every written-off record keeps the status it had, for Undo.
--
-- Only Admins and Managers of the equipment's organization can write off or undo. Both are
-- SECURITY DEFINER with explicit checks, like the purchase RPCs, so the split, the tracking
-- row and the activity entry happen together or not at all.

-- 0. Write-off provenance, stored on the record ------------------------------------------
ALTER TABLE public.assets
  ADD COLUMN written_off_from uuid REFERENCES public.assets(id) ON DELETE SET NULL,
  ADD COLUMN status_before_write_off text;
COMMENT ON COLUMN public.assets.written_off_from IS
  'For pieces split off a lot by write_off_pieces: the lot they came from, which Undo merges them back into.';
COMMENT ON COLUMN public.assets.status_before_write_off IS
  'The status a written-off record had, which Undo restores.';

-- 1. Write off ----------------------------------------------------------------------------
-- p_on: the write-off date, the caller's own day (within a day of the server's, for time
-- zones). retired_on, and so the tax year, is that day.
CREATE OR REPLACE FUNCTION public.write_off_pieces(
  p_asset_id uuid,
  p_quantity numeric,
  p_gig_id uuid DEFAULT NULL,
  p_kit_id uuid DEFAULT NULL,
  p_still_out numeric DEFAULT 0,
  p_note text DEFAULT NULL,
  p_on date DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_asset public.assets;
  v_held numeric;
  v_missing_id uuid;
  v_split boolean;
  v_on date := COALESCE(p_on, current_date);
  v_line_id uuid;
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
  IF p_quantity IS NULL OR p_quantity <> trunc(p_quantity) OR p_quantity < 1 OR p_quantity > v_held THEN
    RAISE EXCEPTION 'Write off a whole number of pieces, between 1 and %', v_held USING ERRCODE = '22023';
  END IF;
  IF COALESCE(p_still_out, 0) <> trunc(COALESCE(p_still_out, 0))
     OR COALESCE(p_still_out, 0) < 0 OR COALESCE(p_still_out, 0) > v_held - p_quantity THEN
    RAISE EXCEPTION 'Pieces still out must be a whole number, between 0 and %', v_held - p_quantity USING ERRCODE = '22023';
  END IF;
  IF v_on NOT BETWEEN current_date - 1 AND current_date + 1 THEN
    RAISE EXCEPTION 'A write-off is dated today' USING ERRCODE = '22023';
  END IF;
  IF public.tax_year_is_locked(v_asset.organization_id, v_on) THEN
    RAISE EXCEPTION 'The % tax year is locked (filed), so equipment can''t be written off in it.',
      extract(year FROM v_on) USING ERRCODE = '42501';
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
    -- Part of a lot: the missing pieces become their own record, with the lot's values, on the
    -- lot's purchase line. A lot linked only through its line's asset_id gets that line, so it
    -- keeps its recovery period.
    v_line_id := COALESCE(v_asset.purchase_line_id,
      (SELECT l.id FROM public.purchases l
        WHERE l.asset_id = v_asset.id AND l.organization_id = v_asset.organization_id
        ORDER BY (l.tax_treatment = 'depreciate') DESC, l.purchase_date NULLS LAST LIMIT 1));
    INSERT INTO public.assets (
      organization_id, equipment_item_id, purchase_line_id, purchase_id, acquisition_date, category,
      manufacturer_model, type, description, vendor, insurance_class, insurance_policy_added,
      item_cost, item_price, replacement_value, liquidation_amt, recovery_period,
      quantity, status, retired_on, written_off_from, status_before_write_off, created_by, updated_by)
    VALUES (
      v_asset.organization_id, v_asset.equipment_item_id, v_line_id, v_asset.purchase_id,
      v_asset.acquisition_date, v_asset.category, v_asset.manufacturer_model, v_asset.type, v_asset.description,
      v_asset.vendor, v_asset.insurance_class, v_asset.insurance_policy_added,
      v_asset.item_cost, v_asset.item_price, v_asset.replacement_value, v_asset.liquidation_amt,
      CASE WHEN v_line_id IS NOT NULL THEN v_asset.recovery_period END,
      p_quantity::int, 'Missing', v_on, v_asset.id, v_asset.status, auth.uid(), auth.uid())
    RETURNING id INTO v_missing_id;
    UPDATE public.assets SET quantity = v_held - p_quantity, updated_by = auth.uid() WHERE id = v_asset.id;

    -- The gig's bucket for this lot: the rest came back, or some are still out.
    IF p_gig_id IS NOT NULL THEN
      INSERT INTO public.inventory_tracking
        (organization_id, gig_id, kit_id, asset_id, status, quantity, location, scanned_at, scanned_by, notes)
      VALUES (v_asset.organization_id, p_gig_id, p_kit_id, v_asset.id,
        CASE WHEN COALESCE(p_still_out, 0) > 0 THEN 'Not Returned' ELSE 'In Warehouse' END,
        GREATEST(COALESCE(p_still_out, 0), 1)::int,
        CASE WHEN COALESCE(p_still_out, 0) > 0 THEN NULL ELSE 'Warehouse' END,
        now(), auth.uid(), format('%s written off as missing', p_quantity));
    END IF;
  ELSE
    -- A whole unit or lot.
    UPDATE public.assets
       SET status = 'Missing', retired_on = v_on, status_before_write_off = v_asset.status, updated_by = auth.uid()
     WHERE id = v_asset.id;
    v_missing_id := v_asset.id;
  END IF;

  PERFORM public.log_activity(v_asset.organization_id, 'asset.written_off', 'asset', v_missing_id, p_gig_id,
    jsonb_build_object('quantity', p_quantity, 'split_from', CASE WHEN v_split THEN v_asset.id END,
                       'kit_id', p_kit_id, 'note', p_note));
  RETURN v_missing_id;
END $$;

REVOKE EXECUTE ON FUNCTION public.write_off_pieces(uuid, numeric, uuid, uuid, numeric, text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.write_off_pieces(uuid, numeric, uuid, uuid, numeric, text, date) TO authenticated;

-- 2. Undo ---------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.undo_write_off(p_asset_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_asset public.assets;
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

  -- Split off from a lot? The record says so (written_off_from, set only by write_off_pieces).
  -- It merges back only into a lot still on hand, of the same organization, item and purchase
  -- line, and only when it has no serial or tag of its own. Otherwise it comes back as itself.
  IF v_asset.written_off_from IS NOT NULL
     AND COALESCE(btrim(v_asset.serial_number), '') = '' AND COALESCE(btrim(v_asset.tag_number), '') = '' THEN
    SELECT * INTO v_lot FROM public.assets WHERE id = v_asset.written_off_from FOR UPDATE;
  END IF;

  IF v_lot.id IS NOT NULL AND v_lot.retired_on IS NULL
     AND v_lot.status NOT IN ('Missing', 'Disposed', 'Returned')
     AND v_lot.organization_id = v_asset.organization_id
     AND v_lot.equipment_item_id IS NOT DISTINCT FROM v_asset.equipment_item_id
     AND (v_lot.purchase_line_id IS NULL OR v_lot.purchase_line_id = v_asset.purchase_line_id) THEN
    -- Back into its lot. The piece's own tracking rows go with it: left behind, they'd lose
    -- their equipment and read as the kit itself being out.
    UPDATE public.assets SET quantity = COALESCE(quantity, 1) + COALESCE(v_asset.quantity, 1), updated_by = auth.uid()
     WHERE id = v_lot.id;
    DELETE FROM public.inventory_tracking WHERE asset_id = v_asset.id;
    DELETE FROM public.assets WHERE id = v_asset.id;
    v_result := v_lot.id;
  ELSE
    UPDATE public.assets
       SET status = COALESCE(v_asset.status_before_write_off, 'Active'), retired_on = NULL,
           status_before_write_off = NULL, written_off_from = NULL, updated_by = auth.uid()
     WHERE id = v_asset.id;
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

-- 5. Status changes into or out of retired statuses follow the write-off rules -------------
-- Maintenance, Inactive and Active stay open to every member, as before. Disposed and
-- Returned, in or out, take an Admin or Manager. Missing is set only by write_off_pieces and
-- left only by undo_write_off, which keeps to the locked-year rule.
CREATE OR REPLACE FUNCTION public.update_asset_status(p_asset_id uuid, p_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org uuid;
  v_old text;
BEGIN
  SELECT organization_id, status INTO v_org, v_old FROM public.assets WHERE id = p_asset_id FOR UPDATE;
  IF NOT FOUND OR NOT public.user_is_member_of_org(v_org, auth.uid()) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;
  IF p_status IS NOT DISTINCT FROM v_old THEN
    RETURN;
  END IF;
  IF v_old = 'Missing' THEN
    RAISE EXCEPTION 'This equipment was written off as missing. Undo the write-off to bring it back.' USING ERRCODE = '42501';
  END IF;
  IF p_status = 'Missing' THEN
    RAISE EXCEPTION 'Equipment is marked missing by writing it off.' USING ERRCODE = '42501';
  END IF;
  IF (p_status IN ('Disposed', 'Returned') OR v_old IN ('Disposed', 'Returned'))
     AND NOT public.user_is_admin_or_manager_of_org(v_org, auth.uid()) THEN
    RAISE EXCEPTION 'Only Admins and Managers can mark equipment Disposed or Returned, or bring it back.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.assets SET status = p_status WHERE id = p_asset_id;
END $$;

REVOKE EXECUTE ON FUNCTION public.update_asset_status(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_asset_status(uuid, text) TO authenticated;
