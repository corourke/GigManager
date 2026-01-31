-- Migration: Fix RLS recursion in gig security functions
-- Created at: 2026-01-30

-- 1. Convert user_has_access_to_gig to plpgsql
CREATE OR REPLACE FUNCTION public.user_has_access_to_gig(gig_id UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM gig_participants gp
    WHERE gp.gig_id = user_has_access_to_gig.gig_id
    AND EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = gp.organization_id
      AND om.user_id = user_uuid
    )
  );
END;
$$;

-- 2. Convert user_can_manage_gig to plpgsql
CREATE OR REPLACE FUNCTION public.user_can_manage_gig(gig_id UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM gig_participants gp
    WHERE gp.gig_id = user_can_manage_gig.gig_id
    AND EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = gp.organization_id
      AND om.user_id = user_uuid
      AND om.role IN ('Admin', 'Manager')
    )
  );
END;
$$;

-- 3. Convert user_is_admin_of_gig to plpgsql
CREATE OR REPLACE FUNCTION public.user_is_admin_of_gig(gig_id UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM gig_participants gp
    WHERE gp.gig_id = user_is_admin_of_gig.gig_id
    AND EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = gp.organization_id
      AND om.user_id = user_uuid
      AND om.role = 'Admin'
    )
  );
END;
$$;
