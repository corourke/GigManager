-- Migration: Rename organization_type to organization_role and support multiple roles
-- Created at: 2026-05-22 20:55:00

-- 1. Rename organization_type to organization_role
ALTER TYPE organization_type RENAME TO organization_role;

-- 2. Update organizations table
-- Rename type to roles and change to array
ALTER TABLE organizations RENAME COLUMN type TO roles;
ALTER TABLE organizations ALTER COLUMN roles TYPE organization_role[] USING ARRAY[roles]::organization_role[];

-- 3. Create public.user_is_admin(user_uuid uuid) function
CREATE OR REPLACE FUNCTION public.user_is_admin(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = user_uuid
    AND role = 'Admin'
  );
END;
$$;

-- Grant access to the new function
GRANT ALL ON FUNCTION public.user_is_admin(user_uuid uuid) TO anon;
GRANT ALL ON FUNCTION public.user_is_admin(user_uuid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.user_is_admin(user_uuid uuid) TO service_role;

-- 4. Update RLS policy for organizations table
-- Allow any admin to update any organization
DROP POLICY IF EXISTS "Admins can update their organizations" ON organizations;
CREATE POLICY "Admins can update any organization" ON organizations
  FOR UPDATE
  TO authenticated
  USING (public.user_is_admin(auth.uid()));

-- 5. Update create_gig_complex RPC to use new type name
CREATE OR REPLACE FUNCTION "public"."create_gig_complex"("p_gig_data" "jsonb", "p_participants" "jsonb" DEFAULT '[]'::"jsonb", "p_staff_slots" "jsonb" DEFAULT '[]'::"jsonb") RETURNS TABLE("id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_gig_id UUID;
  v_user_id UUID;
  v_participant JSONB;
  v_slot JSONB;
  v_role_id UUID;
BEGIN
  -- Get current user ID
  SELECT auth.uid() INTO v_user_id;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Insert Gig with only authorized columns
  INSERT INTO gigs (
    title, 
    start, 
    "end", 
    timezone, 
    status, 
    notes,
    tags, 
    parent_gig_id, 
    hierarchy_depth, 
    created_by, 
    updated_by
  ) VALUES (
    p_gig_data->>'title',
    (p_gig_data->>'start')::TIMESTAMPTZ,
    (p_gig_data->>'end')::TIMESTAMPTZ,
    COALESCE(p_gig_data->>'timezone', 'UTC'),
    COALESCE(p_gig_data->>'status', 'DateHold')::gig_status,
    p_gig_data->>'notes',
    COALESCE((SELECT array_agg(x) FROM jsonb_array_elements_text(p_gig_data->'tags') x), ARRAY[]::TEXT[]),
    (p_gig_data->>'parent_gig_id')::UUID,
    COALESCE((p_gig_data->>'hierarchy_depth')::INTEGER, 0),
    v_user_id,
    v_user_id
  ) RETURNING gigs.id INTO v_gig_id;

  -- Insert Participants with proper role casting
  FOR v_participant IN SELECT * FROM jsonb_array_elements(p_participants) LOOP
    INSERT INTO gig_participants (gig_id, organization_id, role, notes)
    VALUES (
      v_gig_id, 
      (v_participant->>'organization_id')::UUID, 
      (v_participant->>'role')::organization_role,
      v_participant->>'notes'
    );
  END LOOP;

  -- Insert Staff Slots and Assignments
  FOR v_slot IN SELECT * FROM jsonb_array_elements(p_staff_slots) LOOP
    -- Handle Staff Role (Insert if not exists)
    INSERT INTO staff_roles (name)
    VALUES (v_slot->>'role')
    ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
    RETURNING staff_roles.id INTO v_role_id;

    INSERT INTO gig_staff_slots (gig_id, organization_id, staff_role_id, required_count, notes)
    VALUES (
      v_gig_id,
      (v_slot->>'organization_id')::UUID,
      v_role_id,
      COALESCE((v_slot->>'required_count')::INTEGER, 1),
      v_slot->>'notes'
    );
  END LOOP;

  RETURN QUERY SELECT v_gig_id;
END;
$$;
