-- Migration: Fix role casting in create_gig_complex function
-- Date: 2026-02-07
-- Description: Fixes the type casting issue where role needs to be cast to organization_type enum

-- Drop and recreate the create_gig_complex function with proper type casting
DROP FUNCTION IF EXISTS create_gig_complex(jsonb, jsonb, jsonb);

CREATE OR REPLACE FUNCTION create_gig_complex(
  p_gig_data JSONB,
  p_participants JSONB DEFAULT '[]'::jsonb,
  p_staff_slots JSONB DEFAULT '[]'::jsonb
) RETURNS TABLE(id UUID) 
LANGUAGE plpgsql
SECURITY DEFINER
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

  -- Insert Gig
  INSERT INTO gigs (
    title, 
    start, 
    "end", 
    timezone, 
    status, 
    venue_address,
    notes,
    settlement_type,
    settlement_amount,
    tags, 
    amount_paid, 
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
    p_gig_data->>'venue_address',
    p_gig_data->>'notes',
    (p_gig_data->>'settlement_type')::settlement_type,
    (p_gig_data->>'settlement_amount')::DECIMAL,
    COALESCE((SELECT array_agg(x) FROM jsonb_array_elements_text(p_gig_data->'tags') x), ARRAY[]::TEXT[]),
    (p_gig_data->>'amount_paid')::DECIMAL,
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
      (v_participant->>'role')::organization_type,  -- Fixed: Cast to organization_type
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