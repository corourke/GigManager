-- Migration: Add secure RPC for inviting users
-- Created at: 2026-01-31

=CREATE OR REPLACE FUNCTION invite_user_to_organization(
  p_organization_id UUID,
  p_email TEXT,
  p_role TEXT,
  p_first_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inviter_id UUID;
  v_user_id UUID;
  v_invitation_id UUID;
  v_new_user JSONB;
  v_invitation JSONB;
BEGIN
  -- 1. Check if caller is authenticated
  v_inviter_id := auth.uid();
  IF v_inviter_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 2. Check if caller has permission (Admin or Manager of the organization)
  IF NOT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_organization_id
    AND user_id = v_inviter_id
    AND role IN ('Admin', 'Manager')
  ) THEN
    RAISE EXCEPTION 'Permission denied: Only Admins and Managers can invite users';
  END IF;

  -- 3. Check for existing active user
  SELECT id INTO v_user_id FROM users WHERE email = p_email AND user_status = 'active';
  IF v_user_id IS NOT NULL THEN
    RAISE EXCEPTION 'A user with this email already exists and is active. Please use "Add Existing User" instead.';
  END IF;

  -- 4. Check for existing pending invitation
  IF EXISTS (
    SELECT 1 FROM invitations
    WHERE organization_id = p_organization_id
    AND email = p_email
    AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'An invitation has already been sent to this email address';
  END IF;

  -- 5. Create or get pending user
  SELECT id INTO v_user_id FROM users WHERE email = p_email AND user_status = 'pending';
  
  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    INSERT INTO users (
      id, 
      email, 
      first_name, 
      last_name, 
      user_status
    ) VALUES (
      v_user_id,
      p_email,
      COALESCE(p_first_name, ''),
      COALESCE(p_last_name, ''),
      'pending'
    )
    RETURNING jsonb_build_object(
      'id', id,
      'email', email,
      'first_name', first_name,
      'last_name', last_name,
      'user_status', user_status
    ) INTO v_new_user;
  ELSE
    SELECT jsonb_build_object(
      'id', id,
      'email', email,
      'first_name', first_name,
      'last_name', last_name,
      'user_status', user_status
    ) INTO v_new_user FROM users WHERE id = v_user_id;
  END IF;

  -- 6. Add to organization_members if not already a member
  IF NOT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_organization_id
    AND user_id = v_user_id
  ) THEN
    INSERT INTO organization_members (
      organization_id,
      user_id,
      role
    ) VALUES (
      p_organization_id,
      v_user_id,
      p_role::user_role
    );
  END IF;

  -- 7. Create invitation
  INSERT INTO invitations (
    organization_id,
    email,
    role,
    invited_by,
    token,
    expires_at,
    status
  ) VALUES (
    p_organization_id,
    p_email,
    p_role,
    v_inviter_id,
    gen_random_uuid()::text,
    now() + interval '7 days',
    'pending'
  )
  RETURNING jsonb_build_object(
    'id', id,
    'organization_id', organization_id,
    'email', email,
    'role', role,
    'invited_by', invited_by,
    'status', status,
    'expires_at', expires_at
  ) INTO v_invitation;

  -- 8. Return combined result
  RETURN jsonb_build_object(
    'user', v_new_user,
    'invitation', v_invitation
  );
END;
$$;

-- Function to convert a pending user to an active user
-- This is called during signup to link the auth user to the pending user record
CREATE OR REPLACE FUNCTION convert_pending_user_to_active(
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
  v_updated_user JSONB;
BEGIN
  -- 1. Find the pending user
  SELECT id INTO v_pending_user_id 
  FROM users 
  WHERE email = p_email 
  AND user_status = 'pending';

  IF v_pending_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- 2. Update the user record:
  --    - Change ID to the new auth user ID
  --    - Set status to active
  --    - This updates all foreign keys pointing to the old ID (on update cascade)
  UPDATE users
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

  -- 3. Update invitations
  UPDATE invitations
  SET status = 'accepted',
      accepted_at = now(),
      accepted_by = p_auth_user_id
  WHERE email = p_email
  AND status = 'pending';

  RETURN v_updated_user;
END;
$$;
