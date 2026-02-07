-- Migration: Optimize Gig Operations
-- Created at: 2026-01-29

-- RPC for complex gig creation in a single transaction
CREATE OR REPLACE FUNCTION create_gig_complex(
  p_gig_data JSONB,
  p_participants JSONB DEFAULT '[]'::JSONB,
  p_staff_slots JSONB DEFAULT '[]'::JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gig_id UUID;
  v_user_id UUID;
  v_gig_record JSONB;
  v_participant JSONB;
  v_slot JSONB;
  v_assignment JSONB;
  v_role_id UUID;
  v_slot_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Insert Gig
  INSERT INTO gigs (
    title, 
    start, 
    "end", 
    timezone, 
    status, 
    notes,
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
    p_gig_data->>'notes',
    COALESCE((SELECT array_agg(x) FROM jsonb_array_elements_text(p_gig_data->'tags') x), ARRAY[]::TEXT[]),
    (p_gig_data->>'amount_paid')::DECIMAL,
    (p_gig_data->>'parent_gig_id')::UUID,
    COALESCE((p_gig_data->>'hierarchy_depth')::INTEGER, 0),
    v_user_id,
    v_user_id
  ) RETURNING id INTO v_gig_id;

  -- Insert Participants
  FOR v_participant IN SELECT * FROM jsonb_array_elements(p_participants) LOOP
    INSERT INTO gig_participants (gig_id, organization_id, role, notes)
    VALUES (
      v_gig_id, 
      (v_participant->>'organization_id')::UUID, 
      v_participant->>'role', 
      v_participant->>'notes'
    );
  END LOOP;

  -- Insert Staff Slots and Assignments
  FOR v_slot IN SELECT * FROM jsonb_array_elements(p_staff_slots) LOOP
    -- Handle Staff Role (Insert if not exists)
    INSERT INTO staff_roles (name)
    VALUES (v_slot->>'role')
    ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_role_id;

    INSERT INTO gig_staff_slots (gig_id, organization_id, staff_role_id, required_count, notes)
    VALUES (
      v_gig_id, 
      COALESCE((v_slot->>'organization_id')::UUID, (p_gig_data->>'primary_organization_id')::UUID),
      v_role_id,
      COALESCE((v_slot->>'count')::INTEGER, (v_slot->>'required_count')::INTEGER, 1),
      v_slot->>'notes'
    ) RETURNING id INTO v_slot_id;

    -- Insert Assignments for this slot
    IF v_slot ? 'assignments' THEN
      FOR v_assignment IN SELECT * FROM jsonb_array_elements(v_slot->'assignments') LOOP
        IF v_assignment->>'user_id' IS NOT NULL THEN
          INSERT INTO gig_staff_assignments (slot_id, user_id, status, rate, fee, notes)
          VALUES (
            v_slot_id,
            (v_assignment->>'user_id')::UUID,
            COALESCE(v_assignment->>'status', 'Requested'),
            (v_assignment->>'rate')::DECIMAL,
            (v_assignment->>'fee')::DECIMAL,
            v_assignment->>'notes'
          );
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  -- Return the created gig ID
  RETURN jsonb_build_object('id', v_gig_id);
END;
$$;
