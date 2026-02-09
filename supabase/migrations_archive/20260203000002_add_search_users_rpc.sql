-- Migration: Add search_users_secure RPC to allow searching all users across the system
-- Created at: 2026-02-03

-- This function is SECURITY DEFINER to bypass RLS policies on the users table
-- which normally restrict visibility to users within the same organization.
CREATE OR REPLACE FUNCTION search_users_secure(search_text TEXT)
RETURNS SETOF users
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  -- Only allow authenticated users to perform searches
  -- (Though SECURITY DEFINER functions are usually restricted by their own logic
  -- or by REVOKE/GRANT, but for now we rely on the client calling it after auth)
  SELECT * FROM users
  WHERE (
    first_name ILIKE '%' || search_text || '%' OR
    last_name ILIKE '%' || search_text || '%' OR
    email ILIKE '%' || search_text || '%'
  )
  AND user_status != 'inactive'
  ORDER BY first_name ASC
  LIMIT 20;
$$;

-- Revoke execute from public and grant to authenticated
REVOKE EXECUTE ON FUNCTION search_users_secure(TEXT) FROM public;
GRANT EXECUTE ON FUNCTION search_users_secure(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION search_users_secure(TEXT) TO service_role;
