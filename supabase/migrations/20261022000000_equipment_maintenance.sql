-- #186: equipment maintenance (Cameron, 10-14 / 10-18).
--
-- 1. The current maintenance stint is stored on the record: condition notes, location,
--    expected-back date, when and by whom it was flagged, the status it had, and for a piece
--    split off a lot, the lot it came from (maintenance_from). History lives in activity_log.
-- 2. send_to_maintenance / update_maintenance / return_to_service, for Staff and above of the
--    equipment's organization. Part of a lot splits off into its own record with the lot's
--    values (purchase line, per-piece cost, item), and merges back on Return to service.
-- 3. Flagged while still out at a gig, a record is pending ("to maintenance"): it stays as it
--    is (available, placed at the gig) until a return row brings it home at that gig, or that
--    gig is deleted. Then it goes into Maintenance with the flagged details.
-- 4. Equipment status is one of the known statuses. Maintenance and Missing, and the
--    maintenance details, are set and cleared only by the functions here and the write-off
--    functions, which are redefined to say so.
-- 5. update_asset_status routes Maintenance through the same rules, so phones still queueing
--    status updates keep working.

-- 0. Columns and checks --------------------------------------------------------------------
ALTER TABLE public.assets
  ADD COLUMN maintenance_notes text,
  ADD COLUMN maintenance_location text,
  ADD COLUMN maintenance_expected_back date,
  ADD COLUMN maintenance_since timestamptz,
  ADD COLUMN maintenance_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN maintenance_from uuid REFERENCES public.assets(id) ON DELETE SET NULL,
  ADD COLUMN status_before_maintenance text,
  ADD COLUMN maintenance_pending boolean NOT NULL DEFAULT false,
  ADD COLUMN maintenance_pending_gig_id uuid REFERENCES public.gigs(id) ON DELETE SET NULL,
  ADD COLUMN maintenance_pending_quantity numeric;

COMMENT ON COLUMN public.assets.maintenance_notes IS 'Condition notes for the current maintenance stint (#186).';
COMMENT ON COLUMN public.assets.maintenance_location IS 'Where it is while in maintenance, e.g. Repair Bench (#186).';
COMMENT ON COLUMN public.assets.maintenance_expected_back IS 'When it is expected back in service (#186).';
COMMENT ON COLUMN public.assets.maintenance_since IS 'When it was flagged for maintenance (#186).';
COMMENT ON COLUMN public.assets.maintenance_by IS 'Who flagged it for maintenance (#186).';
COMMENT ON COLUMN public.assets.maintenance_from IS 'For pieces split off a lot by send_to_maintenance: the lot they came from, which Return to service merges them back into.';
COMMENT ON COLUMN public.assets.status_before_maintenance IS 'Active or Inactive: the status Return to service restores.';
COMMENT ON COLUMN public.assets.maintenance_pending IS 'Flagged "to maintenance" while still out at a gig; it goes into Maintenance when it comes home from that gig (#186).';
COMMENT ON COLUMN public.assets.maintenance_pending_gig_id IS 'The gig a pending record has to come home from.';
COMMENT ON COLUMN public.assets.maintenance_pending_quantity IS 'For part of a lot: how many pieces are flagged. Null means the whole record.';

ALTER TABLE public.assets
  ADD CONSTRAINT assets_status_known
    CHECK (status IN ('Active', 'Inactive', 'Maintenance', 'Disposed', 'Returned', 'Missing')),
  ADD CONSTRAINT assets_maintenance_pending_or_in
    CHECK (NOT (maintenance_pending AND status = 'Maintenance')),
  ADD CONSTRAINT assets_maintenance_fields_only_when_flagged
    CHECK (status = 'Maintenance' OR maintenance_pending OR (
      maintenance_notes IS NULL AND maintenance_location IS NULL AND maintenance_expected_back IS NULL
      AND maintenance_since IS NULL AND maintenance_by IS NULL AND maintenance_from IS NULL
      AND status_before_maintenance IS NULL)),
  ADD CONSTRAINT assets_maintenance_pending_fields
    CHECK (maintenance_pending OR (maintenance_pending_gig_id IS NULL AND maintenance_pending_quantity IS NULL)),
  ADD CONSTRAINT assets_maintenance_pending_quantity_whole
    CHECK (maintenance_pending_quantity IS NULL
           OR (maintenance_pending_quantity >= 1 AND maintenance_pending_quantity = trunc(maintenance_pending_quantity))),
  ADD CONSTRAINT assets_status_before_maintenance_known
    CHECK (status_before_maintenance IS NULL OR status_before_maintenance IN ('Active', 'Inactive'));

CREATE INDEX assets_maintenance_pending_idx ON public.assets (id) WHERE maintenance_pending;

-- 1. Who writes status ----------------------------------------------------------------------
-- Maintenance and Missing, in or out, and the maintenance columns are written only by the
-- SECURITY DEFINER functions below and the write-off functions. They mark themselves with a
-- transaction-local setting; a client's own statements run as `authenticated`, so the setting
-- alone never lets a direct write through. A foreign key's own SET NULL (a gig, user or lot
-- deleted) is let through.
CREATE OR REPLACE FUNCTION public.assets_status_writer_rules()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_writer boolean := current_setting('gigwrangler.asset_status_writer', true) = 'on'
                      AND current_user NOT IN ('authenticated', 'anon');
BEGIN
  IF v_writer THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'Missing' THEN
      RAISE EXCEPTION 'Equipment is marked missing by writing it off.' USING ERRCODE = '42501';
    END IF;
    IF NEW.maintenance_pending OR NEW.maintenance_notes IS NOT NULL OR NEW.maintenance_location IS NOT NULL
       OR NEW.maintenance_expected_back IS NOT NULL OR NEW.maintenance_since IS NOT NULL
       OR NEW.maintenance_by IS NOT NULL OR NEW.maintenance_from IS NOT NULL
       OR NEW.status_before_maintenance IS NOT NULL OR NEW.maintenance_pending_gig_id IS NOT NULL
       OR NEW.maintenance_pending_quantity IS NOT NULL THEN
      RAISE EXCEPTION 'Maintenance details are set by sending equipment to maintenance.' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  -- A foreign key clearing its own column (nested in the referenced row's delete).
  IF pg_trigger_depth() > 1 AND NEW.status IS NOT DISTINCT FROM OLD.status
     AND (NEW.maintenance_notes, NEW.maintenance_location, NEW.maintenance_expected_back, NEW.maintenance_since,
          NEW.status_before_maintenance, NEW.maintenance_pending, NEW.maintenance_pending_quantity)
         IS NOT DISTINCT FROM
         (OLD.maintenance_notes, OLD.maintenance_location, OLD.maintenance_expected_back, OLD.maintenance_since,
          OLD.status_before_maintenance, OLD.maintenance_pending, OLD.maintenance_pending_quantity)
     AND (NEW.maintenance_by IS NOT DISTINCT FROM OLD.maintenance_by OR NEW.maintenance_by IS NULL)
     AND (NEW.maintenance_from IS NOT DISTINCT FROM OLD.maintenance_from OR NEW.maintenance_from IS NULL)
     AND (NEW.maintenance_pending_gig_id IS NOT DISTINCT FROM OLD.maintenance_pending_gig_id OR NEW.maintenance_pending_gig_id IS NULL) THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     AND (OLD.status IN ('Maintenance', 'Missing') OR NEW.status IN ('Maintenance', 'Missing')) THEN
    RAISE EXCEPTION 'Maintenance and Missing are set and cleared through sending to maintenance, Return to service, or a write-off.'
      USING ERRCODE = '42501';
  END IF;
  IF (NEW.maintenance_notes, NEW.maintenance_location, NEW.maintenance_expected_back, NEW.maintenance_since,
      NEW.maintenance_by, NEW.maintenance_from, NEW.status_before_maintenance, NEW.maintenance_pending,
      NEW.maintenance_pending_gig_id, NEW.maintenance_pending_quantity)
     IS DISTINCT FROM
     (OLD.maintenance_notes, OLD.maintenance_location, OLD.maintenance_expected_back, OLD.maintenance_since,
      OLD.maintenance_by, OLD.maintenance_from, OLD.status_before_maintenance, OLD.maintenance_pending,
      OLD.maintenance_pending_gig_id, OLD.maintenance_pending_quantity) THEN
    RAISE EXCEPTION 'Maintenance details are changed through the maintenance list.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER assets_status_writer_rules
  BEFORE INSERT OR UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.assets_status_writer_rules();

-- 2. Shared pieces --------------------------------------------------------------------------
-- An activity entry for the record's organization, attributed to the signed-in user (none
-- for unsigned writes). Written directly: it can run inside a trigger on another user's write.
CREATE OR REPLACE FUNCTION public.maintenance_log(p_event text, p_asset public.assets, p_context jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.activity_log (organization_id, actor_id, event_type, entity_type, entity_id, gig_id, context)
  SELECT p_asset.organization_id, auth.uid(), p_event, 'asset', p_asset.id, NULL,
         jsonb_build_object(
           'context_version', 1,
           'actor_display_name', COALESCE(NULLIF(trim(concat_ws(' ', u.first_name, u.last_name)), ''), u.email, ''),
           'asset_model', COALESCE(p_asset.manufacturer_model, ''),
           'tag_number', p_asset.tag_number,
           'quantity', COALESCE(p_asset.quantity, 1)) || p_context
  FROM (SELECT 1) one LEFT JOIN public.users u ON u.id = auth.uid();
END $$;
REVOKE EXECUTE ON FUNCTION public.maintenance_log(text, public.assets, jsonb) FROM PUBLIC, anon, authenticated;

-- A flagged (pending) record goes into Maintenance: the whole record, or its pending quantity
-- split off into its own record with the lot's values. Returns the record now in Maintenance.
CREATE OR REPLACE FUNCTION public.maintenance_apply(p_asset_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_asset public.assets;
  v_piece public.assets;
  v_held numeric;
  v_qty numeric;
  v_line_id uuid;
BEGIN
  SELECT * INTO v_asset FROM public.assets WHERE id = p_asset_id FOR UPDATE;
  IF NOT FOUND OR NOT v_asset.maintenance_pending THEN
    RETURN p_asset_id;
  END IF;
  PERFORM set_config('gigwrangler.asset_status_writer', 'on', true);

  v_held := COALESCE(v_asset.quantity, 1);
  v_qty := LEAST(COALESCE(v_asset.maintenance_pending_quantity, v_held), v_held);

  IF v_qty < v_held THEN
    -- Part of a lot: the pieces become their own record, with the lot's values, on the lot's
    -- purchase line (or the line found through purchases.asset_id), as a write-off does.
    v_line_id := COALESCE(v_asset.purchase_line_id,
      (SELECT l.id FROM public.purchases l
        WHERE l.asset_id = v_asset.id AND l.organization_id = v_asset.organization_id
        ORDER BY (l.tax_treatment = 'depreciate') DESC, l.purchase_date NULLS LAST LIMIT 1));
    INSERT INTO public.assets (
      organization_id, equipment_item_id, purchase_line_id, purchase_id, acquisition_date, category,
      manufacturer_model, type, description, vendor, insurance_class, insurance_policy_added,
      item_cost, item_price, replacement_value, liquidation_amt, recovery_period, quantity, status,
      maintenance_notes, maintenance_location, maintenance_expected_back, maintenance_since, maintenance_by,
      maintenance_from, status_before_maintenance, created_by, updated_by)
    VALUES (
      v_asset.organization_id, v_asset.equipment_item_id, v_line_id, v_asset.purchase_id,
      v_asset.acquisition_date, v_asset.category, v_asset.manufacturer_model, v_asset.type, v_asset.description,
      v_asset.vendor, v_asset.insurance_class, v_asset.insurance_policy_added,
      v_asset.item_cost, v_asset.item_price, v_asset.replacement_value, v_asset.liquidation_amt,
      CASE WHEN v_line_id IS NOT NULL THEN v_asset.recovery_period END, v_qty::int, 'Maintenance',
      v_asset.maintenance_notes, v_asset.maintenance_location, v_asset.maintenance_expected_back,
      v_asset.maintenance_since, v_asset.maintenance_by, v_asset.id,
      CASE WHEN v_asset.status IN ('Active', 'Inactive') THEN v_asset.status ELSE 'Active' END,
      COALESCE(auth.uid(), v_asset.maintenance_by), COALESCE(auth.uid(), v_asset.maintenance_by))
    RETURNING * INTO v_piece;
    UPDATE public.assets
       SET quantity = v_held - v_qty,
           maintenance_notes = NULL, maintenance_location = NULL, maintenance_expected_back = NULL,
           maintenance_since = NULL, maintenance_by = NULL, maintenance_pending = false,
           maintenance_pending_gig_id = NULL, maintenance_pending_quantity = NULL
     WHERE id = v_asset.id;
    PERFORM public.maintenance_log('asset.sent_to_maintenance', v_piece,
      jsonb_build_object('split_from', v_asset.id, 'from_gig', v_asset.maintenance_pending_gig_id,
                         'location', v_piece.maintenance_location));
    RETURN v_piece.id;
  END IF;

  UPDATE public.assets
     SET status = 'Maintenance',
         status_before_maintenance = CASE WHEN v_asset.status IN ('Active', 'Inactive') THEN v_asset.status ELSE 'Active' END,
         maintenance_pending = false, maintenance_pending_gig_id = NULL, maintenance_pending_quantity = NULL
   WHERE id = v_asset.id
  RETURNING * INTO v_piece;
  PERFORM public.maintenance_log('asset.sent_to_maintenance', v_piece,
    jsonb_build_object('from_gig', v_asset.maintenance_pending_gig_id, 'location', v_piece.maintenance_location));
  RETURN v_asset.id;
END $$;
REVOKE EXECUTE ON FUNCTION public.maintenance_apply(uuid) FROM PUBLIC, anon, authenticated;

-- 3. Send to maintenance --------------------------------------------------------------------
-- p_gig_id: the gig it was flagged at (scanning). If the record still has pieces out at that
-- gig (its newest row there isn't a return), it's pending until it comes home; otherwise it
-- goes in now.
CREATE OR REPLACE FUNCTION public.send_to_maintenance(
  p_asset_id uuid,
  p_quantity numeric,
  p_notes text DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_expected_back date DEFAULT NULL,
  p_gig_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_asset public.assets;
  v_held numeric;
  v_newest text;
  v_out boolean := false;
BEGIN
  SELECT * INTO v_asset FROM public.assets WHERE id = p_asset_id FOR UPDATE;
  IF NOT FOUND OR NOT public.user_is_staff_or_above_of_org(v_asset.organization_id, auth.uid()) THEN
    RAISE EXCEPTION 'Sending equipment to maintenance takes Staff or above of its organization.' USING ERRCODE = '42501';
  END IF;
  IF v_asset.retired_on IS NOT NULL OR v_asset.status NOT IN ('Active', 'Inactive') THEN
    RAISE EXCEPTION 'Only equipment in service can be sent to maintenance.' USING ERRCODE = '22023';
  END IF;
  IF v_asset.maintenance_pending THEN
    RAISE EXCEPTION 'This equipment is already flagged for maintenance.' USING ERRCODE = '22023';
  END IF;
  v_held := COALESCE(v_asset.quantity, 1);
  IF p_quantity IS NULL OR p_quantity <> trunc(p_quantity) OR p_quantity < 1 OR p_quantity > v_held THEN
    RAISE EXCEPTION 'Send a whole number of pieces, between 1 and %', v_held USING ERRCODE = '22023';
  END IF;
  IF p_gig_id IS NOT NULL THEN
    IF NOT public.org_participates_in_gig(v_asset.organization_id, p_gig_id) THEN
      RAISE EXCEPTION 'The equipment''s organization isn''t on that gig' USING ERRCODE = '42501';
    END IF;
    SELECT status INTO v_newest FROM public.inventory_tracking
     WHERE gig_id = p_gig_id AND asset_id = v_asset.id
     ORDER BY scanned_at DESC, created_at DESC, id DESC LIMIT 1;
    v_out := FOUND AND v_newest <> 'In Warehouse';
  END IF;

  PERFORM set_config('gigwrangler.asset_status_writer', 'on', true);
  UPDATE public.assets
     SET maintenance_notes = NULLIF(btrim(p_notes), ''), maintenance_location = NULLIF(btrim(p_location), ''),
         maintenance_expected_back = p_expected_back, maintenance_since = now(), maintenance_by = auth.uid(),
         maintenance_pending = true, maintenance_pending_gig_id = CASE WHEN v_out THEN p_gig_id END,
         maintenance_pending_quantity = CASE WHEN p_quantity < v_held THEN p_quantity END,
         updated_by = auth.uid()
   WHERE id = v_asset.id
  RETURNING * INTO v_asset;

  IF v_out THEN
    PERFORM public.maintenance_log('asset.maintenance_flagged', v_asset,
      jsonb_build_object('quantity', p_quantity, 'gig_id', p_gig_id, 'location', v_asset.maintenance_location));
    RETURN v_asset.id;
  END IF;
  RETURN public.maintenance_apply(v_asset.id);
END $$;
REVOKE EXECUTE ON FUNCTION public.send_to_maintenance(uuid, numeric, text, text, date, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_to_maintenance(uuid, numeric, text, text, date, uuid) TO authenticated;

-- 4. Edit the details ------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_maintenance(
  p_asset_id uuid, p_notes text, p_location text, p_expected_back date
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_asset public.assets;
BEGIN
  SELECT * INTO v_asset FROM public.assets WHERE id = p_asset_id FOR UPDATE;
  IF NOT FOUND OR NOT public.user_is_staff_or_above_of_org(v_asset.organization_id, auth.uid()) THEN
    RAISE EXCEPTION 'Editing maintenance details takes Staff or above of the equipment''s organization.' USING ERRCODE = '42501';
  END IF;
  IF v_asset.status <> 'Maintenance' AND NOT v_asset.maintenance_pending THEN
    RAISE EXCEPTION 'This equipment isn''t in maintenance.' USING ERRCODE = '22023';
  END IF;
  PERFORM set_config('gigwrangler.asset_status_writer', 'on', true);
  UPDATE public.assets
     SET maintenance_notes = NULLIF(btrim(p_notes), ''), maintenance_location = NULLIF(btrim(p_location), ''),
         maintenance_expected_back = p_expected_back, updated_by = auth.uid()
   WHERE id = v_asset.id
  RETURNING * INTO v_asset;
  PERFORM public.maintenance_log('asset.maintenance_updated', v_asset,
    jsonb_build_object('location', v_asset.maintenance_location, 'expected_back', v_asset.maintenance_expected_back));
END $$;
REVOKE EXECUTE ON FUNCTION public.update_maintenance(uuid, text, text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_maintenance(uuid, text, text, date) TO authenticated;

-- 5. Return to service -----------------------------------------------------------------------
-- A pending record: the flag is cancelled. In Maintenance: back to the status it had. A piece
-- split off a lot merges back into it when the lot is still in service, of the same
-- organization, item and purchase line, and the piece has no serial or tag (as undo_write_off).
CREATE OR REPLACE FUNCTION public.return_to_service(p_asset_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_asset public.assets;
  v_lot public.assets;
BEGIN
  SELECT * INTO v_asset FROM public.assets WHERE id = p_asset_id FOR UPDATE;
  IF NOT FOUND OR NOT public.user_is_staff_or_above_of_org(v_asset.organization_id, auth.uid()) THEN
    RAISE EXCEPTION 'Returning equipment to service takes Staff or above of its organization.' USING ERRCODE = '42501';
  END IF;
  PERFORM set_config('gigwrangler.asset_status_writer', 'on', true);

  IF v_asset.maintenance_pending THEN
    UPDATE public.assets
       SET maintenance_notes = NULL, maintenance_location = NULL, maintenance_expected_back = NULL,
           maintenance_since = NULL, maintenance_by = NULL, maintenance_pending = false,
           maintenance_pending_gig_id = NULL, maintenance_pending_quantity = NULL, updated_by = auth.uid()
     WHERE id = v_asset.id
    RETURNING * INTO v_asset;
    PERFORM public.maintenance_log('asset.maintenance_cancelled', v_asset, '{}'::jsonb);
    RETURN v_asset.id;
  END IF;
  IF v_asset.status <> 'Maintenance' THEN
    RAISE EXCEPTION 'This equipment isn''t in maintenance.' USING ERRCODE = '22023';
  END IF;

  IF v_asset.maintenance_from IS NOT NULL
     AND COALESCE(btrim(v_asset.serial_number), '') = '' AND COALESCE(btrim(v_asset.tag_number), '') = '' THEN
    SELECT * INTO v_lot FROM public.assets WHERE id = v_asset.maintenance_from FOR UPDATE;
  END IF;

  IF v_lot.id IS NOT NULL AND v_lot.retired_on IS NULL AND v_lot.status IN ('Active', 'Inactive')
     AND v_lot.organization_id = v_asset.organization_id
     AND v_lot.equipment_item_id IS NOT DISTINCT FROM v_asset.equipment_item_id
     AND (v_lot.purchase_line_id IS NULL OR v_lot.purchase_line_id = v_asset.purchase_line_id) THEN
    UPDATE public.assets SET quantity = COALESCE(quantity, 1) + COALESCE(v_asset.quantity, 1), updated_by = auth.uid()
     WHERE id = v_lot.id;
    DELETE FROM public.inventory_tracking WHERE asset_id = v_asset.id;
    DELETE FROM public.assets WHERE id = v_asset.id;
    PERFORM public.maintenance_log('asset.returned_to_service', v_asset, jsonb_build_object('merged_into', v_lot.id));
    RETURN v_lot.id;
  END IF;

  UPDATE public.assets
     SET status = COALESCE(v_asset.status_before_maintenance, 'Active'),
         maintenance_notes = NULL, maintenance_location = NULL, maintenance_expected_back = NULL,
         maintenance_since = NULL, maintenance_by = NULL, maintenance_from = NULL,
         status_before_maintenance = NULL, updated_by = auth.uid()
   WHERE id = v_asset.id
  RETURNING * INTO v_asset;
  PERFORM public.maintenance_log('asset.returned_to_service', v_asset, '{}'::jsonb);
  RETURN v_asset.id;
END $$;
REVOKE EXECUTE ON FUNCTION public.return_to_service(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.return_to_service(uuid) TO authenticated;

-- 6. Coming home applies a pending flag ------------------------------------------------------
-- Only a return row ('In Warehouse') for a record flagged at that gig does anything; the
-- WHEN clause keeps every other tracking insert free. Applying writes no tracking rows.
CREATE OR REPLACE FUNCTION public.inventory_tracking_maintenance_on_return()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.assets
              WHERE id = NEW.asset_id AND maintenance_pending AND maintenance_pending_gig_id = NEW.gig_id) THEN
    PERFORM public.maintenance_apply(NEW.asset_id);
  END IF;
  RETURN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION public.inventory_tracking_maintenance_on_return() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER inventory_tracking_maintenance_on_return
  AFTER INSERT ON public.inventory_tracking
  FOR EACH ROW WHEN (NEW.status = 'In Warehouse' AND NEW.asset_id IS NOT NULL)
  EXECUTE FUNCTION public.inventory_tracking_maintenance_on_return();

-- The pending gig deleted: nothing holds the record at a gig any more, so it goes in now.
CREATE OR REPLACE FUNCTION public.assets_maintenance_gig_gone()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.maintenance_apply(NEW.id);
  RETURN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION public.assets_maintenance_gig_gone() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER assets_maintenance_gig_gone
  AFTER UPDATE OF maintenance_pending_gig_id ON public.assets
  FOR EACH ROW WHEN (OLD.maintenance_pending_gig_id IS NOT NULL AND NEW.maintenance_pending_gig_id IS NULL
                     AND NEW.maintenance_pending)
  EXECUTE FUNCTION public.assets_maintenance_gig_gone();

-- 7. update_asset_status: Maintenance through the rules above ------------------------------
-- As in 20261019000000, plus: to Maintenance sends the whole record (no gig), so phones still
-- queueing status updates keep working; out of Maintenance clears its details without merging
-- (the equipment form edits this record); Disposed or Returned clears a pending flag too.
CREATE OR REPLACE FUNCTION public.update_asset_status(p_asset_id uuid, p_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org uuid;
  v_old text;
  v_qty numeric;
BEGIN
  SELECT organization_id, status, COALESCE(quantity, 1) INTO v_org, v_old, v_qty
    FROM public.assets WHERE id = p_asset_id FOR UPDATE;
  IF NOT FOUND OR NOT public.user_is_staff_or_above_of_org(v_org, auth.uid()) THEN
    RAISE EXCEPTION 'Equipment status changes take Staff or above.' USING ERRCODE = '42501';
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
  IF p_status IS NULL OR p_status NOT IN ('Active', 'Inactive', 'Maintenance', 'Disposed', 'Returned') THEN
    RAISE EXCEPTION 'A status must be one of the known statuses.' USING ERRCODE = '22023';
  END IF;
  IF (p_status IN ('Disposed', 'Returned') OR v_old IN ('Disposed', 'Returned'))
     AND NOT public.user_is_admin_or_manager_of_org(v_org, auth.uid()) THEN
    RAISE EXCEPTION 'Only Admins and Managers can mark equipment Disposed or Returned, or bring it back.' USING ERRCODE = '42501';
  END IF;

  IF p_status = 'Maintenance' THEN
    PERFORM public.send_to_maintenance(p_asset_id, v_qty, NULL, NULL, NULL, NULL);
    RETURN;
  END IF;

  PERFORM set_config('gigwrangler.asset_status_writer', 'on', true);
  IF v_old = 'Maintenance' OR p_status IN ('Disposed', 'Returned') THEN
    UPDATE public.assets
       SET status = p_status,
           maintenance_notes = NULL, maintenance_location = NULL, maintenance_expected_back = NULL,
           maintenance_since = NULL, maintenance_by = NULL, maintenance_from = NULL,
           status_before_maintenance = NULL, maintenance_pending = false,
           maintenance_pending_gig_id = NULL, maintenance_pending_quantity = NULL
     WHERE id = p_asset_id;
  ELSE
    UPDATE public.assets SET status = p_status WHERE id = p_asset_id;
  END IF;
END $$;

REVOKE EXECUTE ON FUNCTION public.update_asset_status(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_asset_status(uuid, text) TO authenticated;

-- 8. Write-offs: as in 20261018000000, marked as status writers ------------------------------
-- A whole write-off clears the maintenance details and any pending flag; Undo restores the
-- status the record had (Maintenance included, with no details).
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

  PERFORM set_config('gigwrangler.asset_status_writer', 'on', true);
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
       SET status = 'Missing', retired_on = v_on, status_before_write_off = v_asset.status, updated_by = auth.uid(),
           maintenance_notes = NULL, maintenance_location = NULL, maintenance_expected_back = NULL,
           maintenance_since = NULL, maintenance_by = NULL, maintenance_from = NULL, status_before_maintenance = NULL,
           maintenance_pending = false, maintenance_pending_gig_id = NULL, maintenance_pending_quantity = NULL
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

  PERFORM set_config('gigwrangler.asset_status_writer', 'on', true);

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

