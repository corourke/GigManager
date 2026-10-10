-- #185 PR 2: equipment added at pack-out, and equipment status changes take Staff or above
-- (Cameron, 10-09).
--
-- 1. Staff or above: Admin, Manager or Staff of an organization.
-- 2. Kits added at pack-out: a gig assignment can be marked as added while packing. Staff or
--    above can add one to a gig their organization is on, and remove one they added. Every other
--    change to assignments stays with Admins and Managers.
-- 3. Equipment status changes take Staff or above. The rules for Disposed, Returned and Missing
--    are unchanged (20261018000000).

-- 1. Staff or above ------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_is_staff_or_above_of_org(org_id uuid, user_uuid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
     WHERE organization_id = org_id AND user_id = user_uuid AND role IN ('Admin', 'Manager', 'Staff')
  )
$$;

REVOKE EXECUTE ON FUNCTION public.user_is_staff_or_above_of_org(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_is_staff_or_above_of_org(uuid, uuid) TO authenticated;

-- 2. Kits added at pack-out ----------------------------------------------------------------
ALTER TABLE public.gig_kit_assignments
  ADD COLUMN added_at_pack_out boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.gig_kit_assignments.added_at_pack_out IS
  'Added while packing (scanned or picked on the scan screen), not planned on the gig. Who and when: assigned_by, assigned_at.';

CREATE POLICY "Org members can add kits at pack-out" ON public.gig_kit_assignments
  FOR INSERT
  WITH CHECK (
    added_at_pack_out
    AND assigned_by = auth.uid()
    AND public.user_is_staff_or_above_of_org(organization_id, auth.uid())
    AND public.org_participates_in_gig(organization_id, gig_id)
    AND EXISTS (SELECT 1 FROM public.kits k
                 WHERE k.id = gig_kit_assignments.kit_id AND k.organization_id = gig_kit_assignments.organization_id)
  );

CREATE POLICY "Org members can remove kits they added at pack-out" ON public.gig_kit_assignments
  FOR DELETE
  USING (
    added_at_pack_out
    AND assigned_by = auth.uid()
    AND public.user_is_staff_or_above_of_org(organization_id, auth.uid())
  );

-- 3. Equipment status changes take Staff or above ------------------------------------------
-- Active, Maintenance and Inactive take Staff or above of the equipment's organization.
-- Disposed and Returned, in or out, take an Admin or Manager. Missing is set only by
-- write_off_pieces and left only by undo_write_off.
CREATE OR REPLACE FUNCTION public.update_asset_status(p_asset_id uuid, p_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org uuid;
  v_old text;
BEGIN
  SELECT organization_id, status INTO v_org, v_old FROM public.assets WHERE id = p_asset_id FOR UPDATE;
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

  UPDATE public.assets SET status = p_status WHERE id = p_asset_id;
END $$;

REVOKE EXECUTE ON FUNCTION public.update_asset_status(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_asset_status(uuid, text) TO authenticated;
