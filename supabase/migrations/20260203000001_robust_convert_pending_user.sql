-- Migration: Robust convert_pending_user_to_active RPC
-- Created at: 2026-02-03

CREATE OR REPLACE FUNCTION public.convert_pending_user_to_active(
  p_email TEXT,
  p_auth_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending_user_id UUID;
  v_existing_active_id UUID;
  v_updated_user JSONB;
BEGIN
  -- 1. Check if the user already exists as active with the correct ID
  SELECT id INTO v_existing_active_id
  FROM public.users
  WHERE id = p_auth_user_id
  AND user_status = 'active';

  IF v_existing_active_id IS NOT NULL THEN
    -- Already active, just return the user data
    SELECT jsonb_build_object(
      'id', id,
      'email', email,
      'first_name', first_name,
      'last_name', last_name,
      'user_status', user_status
    ) INTO v_updated_user
    FROM public.users
    WHERE id = v_existing_active_id;
    
    RETURN v_updated_user;
  END IF;

  -- 2. Find the pending user (case-insensitive email match)
  SELECT id INTO v_pending_user_id 
  FROM public.users 
  WHERE LOWER(email) = LOWER(p_email) 
  AND user_status = 'pending'
  ORDER BY created_at DESC -- In case of multiple (shouldn't happen with unique constraint but just in case)
  LIMIT 1;

  IF v_pending_user_id IS NULL THEN
    -- No pending user found. Check if there is an active user with this email but different ID
    SELECT id INTO v_existing_active_id
    FROM public.users
    WHERE LOWER(email) = LOWER(p_email)
    AND user_status = 'active'
    LIMIT 1;

    IF v_existing_active_id IS NOT NULL THEN
      -- If we found an active user with a different ID, update their ID to match Auth
      -- This handles cases where a user might have been created via a different path
      UPDATE public.users
      SET id = p_auth_user_id,
          updated_at = now()
      WHERE id = v_existing_active_id
      RETURNING jsonb_build_object(
        'id', id,
        'email', email,
        'first_name', first_name,
        'last_name', last_name,
        'user_status', user_status
      ) INTO v_updated_user;
      
      RETURN v_updated_user;
    END IF;

    -- Truly no user found, return NULL so caller can handle creation if needed
    RETURN NULL;
  END IF;

  -- 3. Update the pending user record to match Auth ID and set status to active
  -- PK update will propagate via ON UPDATE CASCADE to other tables
  UPDATE public.users
  SET id = p_auth_user_id,
      user_status = 'active',
      updated_at = now()
  WHERE id = v_pending_user_id
  RETURNING jsonb_build_object(
    'id', id,
    'email', email,
    'first_name', first_name,
    'last_name', last_name,
    'user_status', user_status
  ) INTO v_updated_user;

  -- 4. Update invitations to mark them as accepted
  UPDATE public.invitations
  SET status = 'accepted',
      accepted_at = now(),
      accepted_by = p_auth_user_id
  WHERE LOWER(email) = LOWER(p_email)
  AND status = 'pending';

  RETURN v_updated_user;
END;
$$;
