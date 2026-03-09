CREATE OR REPLACE FUNCTION "public"."update_asset_status"(p_asset_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.assets a
    WHERE a.id = p_asset_id
    AND public.user_is_member_of_org(a.organization_id, auth.uid())
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE public.assets SET status = p_status WHERE id = p_asset_id;
END;
$$;

GRANT EXECUTE ON FUNCTION "public"."update_asset_status"(uuid, text) TO "authenticated";
