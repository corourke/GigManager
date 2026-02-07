


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."fin_category" AS ENUM (
    'Labor',
    'Equipment',
    'Transportation',
    'Venue',
    'Production',
    'Insurance',
    'Rebillable',
    'Other'
);


ALTER TYPE "public"."fin_category" OWNER TO "postgres";


CREATE TYPE "public"."fin_type" AS ENUM (
    'Bid Submitted',
    'Bid Accepted',
    'Bid Rejected',
    'Contract Submitted',
    'Contract Revised',
    'Contract Signed',
    'Contract Rejected',
    'Contract Cancelled',
    'Contract Settled',
    'Sub-Contract Submitted',
    'Sub-Contract Revised',
    'Sub-Contract Signed',
    'Sub-Contract Rejected',
    'Sub-Contract Cancelled',
    'Sub-Contract Settled',
    'Deposit Received',
    'Deposit Sent',
    'Deposit Refunded',
    'Payment Sent',
    'Payment Recieved',
    'Expense Incurred',
    'Expense Reimbursed',
    'Invoice Issued',
    'Invoice Settled'
);


ALTER TYPE "public"."fin_type" OWNER TO "postgres";


CREATE TYPE "public"."gig_status" AS ENUM (
    'DateHold',
    'Proposed',
    'Booked',
    'Completed',
    'Cancelled',
    'Settled'
);


ALTER TYPE "public"."gig_status" OWNER TO "postgres";


CREATE TYPE "public"."organization_type" AS ENUM (
    'Production',
    'Sound',
    'Lighting',
    'Staging',
    'Rentals',
    'Venue',
    'Act',
    'Agency'
);


ALTER TYPE "public"."organization_type" OWNER TO "postgres";


CREATE TYPE "public"."settlement_type" AS ENUM (
    'Cash',
    'Check',
    'Wire Transfer',
    'Credit Card',
    'ACH',
    'Cryptocurrency',
    'Barter',
    'Trade',
    'Other'
);


ALTER TYPE "public"."settlement_type" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'Admin',
    'Manager',
    'Staff',
    'Viewer'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."convert_pending_user_to_active"("p_email" "text", "p_auth_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."convert_pending_user_to_active"("p_email" "text", "p_auth_user_id" "uuid") OWNER TO "postgres";


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


ALTER FUNCTION "public"."create_gig_complex"("p_gig_data" "jsonb", "p_participants" "jsonb", "p_staff_slots" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_complete_user_data"("user_uuid" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    profile_data JSONB;
    orgs_data JSONB;
BEGIN
    -- 1. Fetch user profile
    SELECT jsonb_build_object(
        'id', u.id,
        'email', u.email,
        'first_name', u.first_name,
        'last_name', u.last_name,
        'avatar_url', u.avatar_url,
        'phone', u.phone,
        'address_line1', u.address_line1,
        'address_line2', u.address_line2,
        'city', u.city,
        'state', u.state,
        'postal_code', u.postal_code,
        'country', u.country,
        'user_status', u.user_status,
        'created_at', u.created_at,
        'updated_at', u.updated_at
    ) INTO profile_data
    FROM users u
    WHERE u.id = user_uuid;

    -- 2. Fetch organizations
    SELECT jsonb_agg(
        jsonb_build_object(
            'user_id', om.user_id,
            'organization_id', om.organization_id,
            'role', om.role,
            'created_at', om.created_at,
            'organization', jsonb_build_object(
                'id', o.id,
                'name', o.name,
                'description', o.description,
                'type', o.type,
                'created_at', o.created_at,
                'updated_at', o.updated_at
            )
        )
    ) INTO orgs_data
    FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE om.user_id = user_uuid;

    -- 3. Return combined result
    RETURN jsonb_build_object(
        'profile', profile_data,
        'organizations', COALESCE(orgs_data, '[]'::jsonb)
    );
END;
$$;


ALTER FUNCTION "public"."get_complete_user_data"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_email"("user_uuid" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN (SELECT email FROM auth.users WHERE id = user_uuid);
END;
$$;


ALTER FUNCTION "public"."get_user_email"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_ids_in_same_orgs"("user_uuid" "uuid") RETURNS TABLE("member_user_id" "uuid")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT om.user_id
  FROM organization_members om
  WHERE om.organization_id IN (
    SELECT om2.organization_id
    FROM organization_members om2
    WHERE om2.user_id = user_uuid
  );
END;
$$;


ALTER FUNCTION "public"."get_user_ids_in_same_orgs"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_organizations_secure"("user_uuid" "uuid") RETURNS TABLE("user_id" "uuid", "organization_id" "uuid", "role" "public"."user_role", "created_at" timestamp with time zone, "organization" "jsonb")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    om.user_id,
    om.organization_id,
    om.role,
    om.created_at,
    jsonb_build_object(
      'id', o.id,
      'name', o.name,
      'description', o.description,
      'created_at', o.created_at,
      'updated_at', o.updated_at
    ) as organization
  FROM organization_members om
  JOIN organizations o ON o.id = om.organization_id
  WHERE om.user_id = user_uuid;
END;
$$;


ALTER FUNCTION "public"."get_user_organizations_secure"("user_uuid" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "phone" "text",
    "avatar_url" "text",
    "address_line1" "text",
    "address_line2" "text",
    "city" "text",
    "state" "text",
    "postal_code" "text",
    "country" "text",
    "role_hint" "text",
    "user_status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "users_user_status_check" CHECK (("user_status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'pending'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON COLUMN "public"."users"."user_status" IS 'User account status: active (authenticated), pending (invited but not yet authenticated), inactive (disabled)';



CREATE OR REPLACE FUNCTION "public"."get_user_profile_secure"("user_uuid" "uuid") RETURNS SETOF "public"."users"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY SELECT * FROM users WHERE id = user_uuid;
END;
$$;


ALTER FUNCTION "public"."get_user_profile_secure"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_role_in_org"("org_id" "uuid", "user_uuid" "uuid") RETURNS "public"."user_role"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT role FROM organization_members
  WHERE organization_id = org_id AND user_id = user_uuid;
$$;


ALTER FUNCTION "public"."get_user_role_in_org"("org_id" "uuid", "user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."invite_user_to_organization"("p_organization_id" "uuid", "p_email" "text", "p_role" "text", "p_first_name" "text" DEFAULT NULL::"text", "p_last_name" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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
    SELECT 1 FROM public.organization_members
    WHERE organization_id = p_organization_id
    AND user_id = v_inviter_id
    AND role IN ('Admin', 'Manager')
  ) THEN
    RAISE EXCEPTION 'Permission denied: Only Admins and Managers can invite users';
  END IF;

  -- 3. Check for existing active user
  SELECT id INTO v_user_id FROM public.users WHERE email = p_email AND user_status = 'active';
  IF v_user_id IS NOT NULL THEN
    RAISE EXCEPTION 'A user with this email already exists and is active. Please use "Add Existing User" instead.';
  END IF;

  -- 4. Check for existing pending invitation
  IF EXISTS (
    SELECT 1 FROM public.invitations
    WHERE organization_id = p_organization_id
    AND email = p_email
    AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'An invitation has already been sent to this email address';
  END IF;

  -- 5. Create or get pending user
  SELECT id INTO v_user_id FROM public.users WHERE email = p_email AND user_status = 'pending';
  
  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    INSERT INTO public.users (
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
    ) INTO v_new_user FROM public.users WHERE id = v_user_id;
  END IF;

  -- 6. Add to organization_members if not already a member
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = p_organization_id
    AND user_id = v_user_id
  ) THEN
    INSERT INTO public.organization_members (
      organization_id,
      user_id,
      role
    ) VALUES (
      p_organization_id,
      v_user_id,
      p_role::public.user_role
    );
  END IF;

  -- 7. Create invitation
  INSERT INTO public.invitations (
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


ALTER FUNCTION "public"."invite_user_to_organization"("p_organization_id" "uuid", "p_email" "text", "p_role" "text", "p_first_name" "text", "p_last_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."invite_user_to_organization"("p_organization_id" "uuid", "p_email" "text", "p_role" "text", "p_first_name" "text" DEFAULT NULL::"text", "p_last_name" "text" DEFAULT NULL::"text", "p_inviter_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_inviter_id UUID;
  v_user_id UUID;
  v_invitation_id UUID;
  v_new_user JSONB;
  v_invitation JSONB;
  v_is_resend BOOLEAN := FALSE;
BEGIN
  -- 1. Determine inviter ID (passed explicitly from Edge Function or from auth.uid())
  v_inviter_id := COALESCE(p_inviter_id, auth.uid());
  
  IF v_inviter_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated: No inviter ID found';
  END IF;

  -- 2. Check if inviter has permission (Admin or Manager of the organization)
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = p_organization_id
    AND user_id = v_inviter_id
    AND role IN ('Admin', 'Manager')
  ) THEN
    RAISE EXCEPTION 'Permission denied: Only Admins and Managers can invite users';
  END IF;

  -- 3. Check for existing active user
  SELECT id INTO v_user_id FROM public.users WHERE email = p_email AND user_status = 'active';
  IF v_user_id IS NOT NULL THEN
    -- Check if they are already a member of this organization
    IF EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_id = p_organization_id
      AND user_id = v_user_id
    ) THEN
      RAISE EXCEPTION 'This user is already an active member of this organization.';
    END IF;
    
    RAISE EXCEPTION 'A user with this email already exists and is active in the system. Please use "Add Existing User" instead.';
  END IF;

  -- 4. Check for existing pending invitation
  SELECT id INTO v_invitation_id FROM public.invitations
    WHERE organization_id = p_organization_id
    AND email = p_email
    AND status = 'pending';
  
  IF v_invitation_id IS NOT NULL THEN
    -- Update existing invitation to refresh token and expiry
    UPDATE public.invitations
    SET token = gen_random_uuid()::text,
        expires_at = now() + interval '7 days',
        invited_by = v_inviter_id,
        role = p_role,
        updated_at = now()
    WHERE id = v_invitation_id
    RETURNING jsonb_build_object(
      'id', id,
      'organization_id', organization_id,
      'email', email,
      'role', role,
      'invited_by', invited_by,
      'status', status,
      'expires_at', expires_at
    ) INTO v_invitation;

    -- Get user data (they must exist if they have an invitation)
    SELECT jsonb_build_object(
      'id', id,
      'email', email,
      'first_name', first_name,
      'last_name', last_name,
      'user_status', user_status
    ) INTO v_new_user FROM public.users WHERE email = p_email;

    RETURN jsonb_build_object(
      'user', v_new_user,
      'invitation', v_invitation,
      'resend', true
    );
  END IF;

  -- 5. Create or get pending user (if no active user found in Step 3 and no pending invitation in Step 4)
  SELECT id INTO v_user_id FROM public.users WHERE email = p_email AND user_status = 'pending';
  
  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    INSERT INTO public.users (
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
    ) INTO v_new_user FROM public.users WHERE id = v_user_id;
  END IF;

  -- 6. Add to organization_members if not already a member
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = p_organization_id
    AND user_id = v_user_id
  ) THEN
    INSERT INTO public.organization_members (
      organization_id,
      user_id,
      role
    ) VALUES (
      p_organization_id,
      v_user_id,
      p_role::public.user_role
    );
  END IF;

  -- 7. Create invitation
  INSERT INTO public.invitations (
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
    'invitation', v_invitation,
    'resend', false
  );
END;
$$;


ALTER FUNCTION "public"."invite_user_to_organization"("p_organization_id" "uuid", "p_email" "text", "p_role" "text", "p_first_name" "text", "p_last_name" "text", "p_inviter_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_gig_status_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO gig_status_history (gig_id, from_status, to_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, NEW.updated_by);
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_gig_status_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_users_secure"("search_text" "text") RETURNS SETOF "public"."users"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."search_users_secure"("search_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_can_manage_gig"("gig_id" "uuid", "user_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."user_can_manage_gig"("gig_id" "uuid", "user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_has_access_to_gig"("gig_id" "uuid", "user_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."user_has_access_to_gig"("gig_id" "uuid", "user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_is_admin_of_gig"("gig_id" "uuid", "user_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."user_is_admin_of_gig"("gig_id" "uuid", "user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_is_admin_of_org"("org_id" "uuid", "user_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id 
    AND user_id = user_uuid
    AND role = 'Admin'
  );
END;
$$;


ALTER FUNCTION "public"."user_is_admin_of_org"("org_id" "uuid", "user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_is_admin_or_manager_of_org"("org_id" "uuid", "user_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id 
    AND user_id = user_uuid
    AND role IN ('Admin', 'Manager')
  );
END;
$$;


ALTER FUNCTION "public"."user_is_admin_or_manager_of_org"("org_id" "uuid", "user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_is_member_of_org"("org_id" "uuid", "user_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id 
    AND user_id = user_uuid
  );
END;
$$;


ALTER FUNCTION "public"."user_is_member_of_org"("org_id" "uuid", "user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_organization_ids"("user_uuid" "uuid") RETURNS TABLE("organization_id" "uuid")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT om.organization_id 
  FROM organization_members om
  WHERE om.user_id = user_uuid;
END;
$$;


ALTER FUNCTION "public"."user_organization_ids"("user_uuid" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assets" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "acquisition_date" "date" NOT NULL,
    "vendor" "text",
    "cost" numeric(10,2),
    "category" "text" NOT NULL,
    "sub_category" "text",
    "insurance_policy_added" boolean DEFAULT false NOT NULL,
    "manufacturer_model" "text" NOT NULL,
    "type" "text",
    "serial_number" "text",
    "description" "text",
    "replacement_value" numeric(10,2),
    "insurance_class" "text",
    "quantity" integer DEFAULT 1,
    "created_by" "uuid" NOT NULL,
    "updated_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."assets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gig_financials" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "gig_id" "uuid" NOT NULL,
    "organization_id" "uuid",
    "amount" numeric(10,2) NOT NULL,
    "date" "date" NOT NULL,
    "notes" "text",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "type" "public"."fin_type" DEFAULT 'Bid Submitted'::"public"."fin_type" NOT NULL,
    "category" "public"."fin_category" DEFAULT 'Other'::"public"."fin_category" NOT NULL,
    "reference_number" "text",
    "counterparty_id" "uuid",
    "external_entity_name" "text",
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "description" "text",
    "due_date" "date",
    "paid_at" timestamp with time zone,
    "updated_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."gig_financials" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gig_kit_assignments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "gig_id" "uuid" NOT NULL,
    "kit_id" "uuid" NOT NULL,
    "notes" "text",
    "assigned_by" "uuid" NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."gig_kit_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gig_participants" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "gig_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "role" "public"."organization_type" NOT NULL,
    "notes" "text"
);


ALTER TABLE "public"."gig_participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gig_staff_assignments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "slot_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" NOT NULL,
    "rate" numeric(10,2),
    "fee" numeric(10,2),
    "notes" "text",
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "confirmed_at" timestamp with time zone
);


ALTER TABLE "public"."gig_staff_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gig_staff_slots" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "gig_id" "uuid" NOT NULL,
    "staff_role_id" "uuid" NOT NULL,
    "organization_id" "uuid",
    "required_count" integer DEFAULT 1 NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."gig_staff_slots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gig_status_history" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "gig_id" "uuid" NOT NULL,
    "from_status" "public"."gig_status",
    "to_status" "public"."gig_status" NOT NULL,
    "changed_by" "uuid" NOT NULL,
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."gig_status_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gigs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" "text" NOT NULL,
    "status" "public"."gig_status" NOT NULL,
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "start" timestamp with time zone NOT NULL,
    "end" timestamp with time zone NOT NULL,
    "timezone" "text" NOT NULL,
    "notes" "text",
    "parent_gig_id" "uuid",
    "hierarchy_depth" integer DEFAULT 0 NOT NULL,
    "created_by" "uuid" NOT NULL,
    "updated_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "venue_address" "text",
    "settlement_type" "public"."settlement_type",
    "settlement_amount" numeric(10,2)
);


ALTER TABLE "public"."gigs" OWNER TO "postgres";


COMMENT ON COLUMN "public"."gigs"."venue_address" IS 'Specific address for the gig venue (nullable)';



COMMENT ON COLUMN "public"."gigs"."settlement_type" IS 'Type of settlement payment method (nullable)';



COMMENT ON COLUMN "public"."gigs"."settlement_amount" IS 'Amount for settlement payment (nullable)';



CREATE TABLE IF NOT EXISTS "public"."invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "role" "text" NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "token" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "accepted_at" timestamp with time zone,
    "accepted_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "invitations_role_check" CHECK (("role" = ANY (ARRAY['Admin'::"text", 'Manager'::"text", 'Staff'::"text", 'Viewer'::"text"]))),
    CONSTRAINT "invitations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'expired'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."invitations" OWNER TO "postgres";


COMMENT ON TABLE "public"."invitations" IS 'Tracks pending and completed invitations to join organizations';



CREATE TABLE IF NOT EXISTS "public"."kit_assets" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "kit_id" "uuid" NOT NULL,
    "asset_id" "uuid" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."kit_assets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."kits" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "category" "text",
    "description" "text",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "tag_number" "text",
    "rental_value" numeric(10,2),
    "created_by" "uuid" NOT NULL,
    "updated_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."kits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."kv_store_de012ad4" (
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL
);


ALTER TABLE "public"."kv_store_de012ad4" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_members" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."user_role" NOT NULL,
    "default_staff_role_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."organization_members" OWNER TO "postgres";


COMMENT ON COLUMN "public"."organization_members"."default_staff_role_id" IS 'The default staff role for this member when they are assigned to gigs';



CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "type" "public"."organization_type" NOT NULL,
    "url" "text",
    "phone_number" "text",
    "address_line1" "text",
    "address_line2" "text",
    "city" "text",
    "state" "text",
    "postal_code" "text",
    "country" "text",
    "description" "text",
    "allowed_domains" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_roles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."staff_roles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "assets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gig_financials"
    ADD CONSTRAINT "gig_bids_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gig_kit_assignments"
    ADD CONSTRAINT "gig_kit_assignments_gig_id_kit_id_key" UNIQUE ("gig_id", "kit_id");



ALTER TABLE ONLY "public"."gig_kit_assignments"
    ADD CONSTRAINT "gig_kit_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gig_participants"
    ADD CONSTRAINT "gig_participants_gig_id_organization_id_role_key" UNIQUE ("gig_id", "organization_id", "role");



ALTER TABLE ONLY "public"."gig_participants"
    ADD CONSTRAINT "gig_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gig_staff_assignments"
    ADD CONSTRAINT "gig_staff_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gig_staff_slots"
    ADD CONSTRAINT "gig_staff_slots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gig_status_history"
    ADD CONSTRAINT "gig_status_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gigs"
    ADD CONSTRAINT "gigs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."kit_assets"
    ADD CONSTRAINT "kit_assets_kit_id_asset_id_key" UNIQUE ("kit_id", "asset_id");



ALTER TABLE ONLY "public"."kit_assets"
    ADD CONSTRAINT "kit_assets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kits"
    ADD CONSTRAINT "kits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kv_store_de012ad4"
    ADD CONSTRAINT "kv_store_de012ad4_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_organization_id_user_id_key" UNIQUE ("organization_id", "user_id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_roles"
    ADD CONSTRAINT "staff_roles_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."staff_roles"
    ADD CONSTRAINT "staff_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "unique_pending_invitation" UNIQUE ("organization_id", "email", "status");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_assets_category" ON "public"."assets" USING "btree" ("category");



CREATE INDEX "idx_assets_org_id" ON "public"."assets" USING "btree" ("organization_id");



CREATE INDEX "idx_gig_financials_gig_id" ON "public"."gig_financials" USING "btree" ("gig_id");



CREATE INDEX "idx_gig_financials_org_id" ON "public"."gig_financials" USING "btree" ("organization_id");



CREATE INDEX "idx_gig_kit_assignments_gig_id" ON "public"."gig_kit_assignments" USING "btree" ("gig_id");



CREATE INDEX "idx_gig_kit_assignments_kit_id" ON "public"."gig_kit_assignments" USING "btree" ("kit_id");



CREATE INDEX "idx_gig_kit_assignments_org_id" ON "public"."gig_kit_assignments" USING "btree" ("organization_id");



CREATE INDEX "idx_gig_participants_gig_id" ON "public"."gig_participants" USING "btree" ("gig_id");



CREATE INDEX "idx_gig_participants_org_id" ON "public"."gig_participants" USING "btree" ("organization_id");



CREATE INDEX "idx_gig_staff_assignments_slot_id" ON "public"."gig_staff_assignments" USING "btree" ("slot_id");



CREATE INDEX "idx_gig_staff_assignments_user_id" ON "public"."gig_staff_assignments" USING "btree" ("user_id");



CREATE INDEX "idx_gig_staff_slots_gig_id" ON "public"."gig_staff_slots" USING "btree" ("gig_id");



CREATE INDEX "idx_gig_staff_slots_org_id" ON "public"."gig_staff_slots" USING "btree" ("organization_id");



CREATE INDEX "idx_gig_staff_slots_role_id" ON "public"."gig_staff_slots" USING "btree" ("staff_role_id");



CREATE INDEX "idx_gig_status_history_changed_at" ON "public"."gig_status_history" USING "btree" ("changed_at");



CREATE INDEX "idx_gig_status_history_gig_id" ON "public"."gig_status_history" USING "btree" ("gig_id");



CREATE INDEX "idx_gigs_parent_gig_id" ON "public"."gigs" USING "btree" ("parent_gig_id");



CREATE INDEX "idx_gigs_start" ON "public"."gigs" USING "btree" ("start");



CREATE INDEX "idx_invitations_email" ON "public"."invitations" USING "btree" ("email");



CREATE INDEX "idx_invitations_organization" ON "public"."invitations" USING "btree" ("organization_id");



CREATE INDEX "idx_invitations_status" ON "public"."invitations" USING "btree" ("status");



CREATE INDEX "idx_invitations_token" ON "public"."invitations" USING "btree" ("token");



CREATE INDEX "idx_kit_assets_asset_id" ON "public"."kit_assets" USING "btree" ("asset_id");



CREATE INDEX "idx_kit_assets_kit_id" ON "public"."kit_assets" USING "btree" ("kit_id");



CREATE INDEX "idx_kits_category" ON "public"."kits" USING "btree" ("category");



CREATE INDEX "idx_kits_org_id" ON "public"."kits" USING "btree" ("organization_id");



CREATE INDEX "idx_org_members_default_staff_role" ON "public"."organization_members" USING "btree" ("default_staff_role_id");



CREATE INDEX "idx_org_members_org_id" ON "public"."organization_members" USING "btree" ("organization_id");



CREATE INDEX "idx_org_members_user_id" ON "public"."organization_members" USING "btree" ("user_id");



CREATE INDEX "idx_staff_roles_name" ON "public"."staff_roles" USING "btree" ("name");



CREATE INDEX "idx_users_email" ON "public"."users" USING "btree" ("email") WHERE ("user_status" = 'pending'::"text");



CREATE INDEX "idx_users_status" ON "public"."users" USING "btree" ("user_status");



CREATE INDEX "kv_store_de012ad4_key_idx" ON "public"."kv_store_de012ad4" USING "btree" ("key" "text_pattern_ops");



CREATE OR REPLACE TRIGGER "log_gig_status_changes" AFTER UPDATE ON "public"."gigs" FOR EACH ROW EXECUTE FUNCTION "public"."log_gig_status_change"();



CREATE OR REPLACE TRIGGER "update_assets_updated_at" BEFORE UPDATE ON "public"."assets" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_gig_financials_updated_at" BEFORE UPDATE ON "public"."gig_financials" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_gig_staff_slots_updated_at" BEFORE UPDATE ON "public"."gig_staff_slots" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_gigs_updated_at" BEFORE UPDATE ON "public"."gigs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_kits_updated_at" BEFORE UPDATE ON "public"."kits" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_organizations_updated_at" BEFORE UPDATE ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_staff_roles_updated_at" BEFORE UPDATE ON "public"."staff_roles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "assets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gig_financials"
    ADD CONSTRAINT "gig_bids_gig_id_fkey" FOREIGN KEY ("gig_id") REFERENCES "public"."gigs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gig_financials"
    ADD CONSTRAINT "gig_bids_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gig_financials"
    ADD CONSTRAINT "gig_financials_counterparty_id_fkey" FOREIGN KEY ("counterparty_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."gig_financials"
    ADD CONSTRAINT "gig_financials_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."gig_kit_assignments"
    ADD CONSTRAINT "gig_kit_assignments_gig_id_fkey" FOREIGN KEY ("gig_id") REFERENCES "public"."gigs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gig_kit_assignments"
    ADD CONSTRAINT "gig_kit_assignments_kit_id_fkey" FOREIGN KEY ("kit_id") REFERENCES "public"."kits"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gig_kit_assignments"
    ADD CONSTRAINT "gig_kit_assignments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gig_participants"
    ADD CONSTRAINT "gig_participants_gig_id_fkey" FOREIGN KEY ("gig_id") REFERENCES "public"."gigs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gig_participants"
    ADD CONSTRAINT "gig_participants_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gig_staff_assignments"
    ADD CONSTRAINT "gig_staff_assignments_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "public"."gig_staff_slots"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gig_staff_assignments"
    ADD CONSTRAINT "gig_staff_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gig_staff_slots"
    ADD CONSTRAINT "gig_staff_slots_gig_id_fkey" FOREIGN KEY ("gig_id") REFERENCES "public"."gigs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gig_staff_slots"
    ADD CONSTRAINT "gig_staff_slots_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gig_staff_slots"
    ADD CONSTRAINT "gig_staff_slots_staff_role_id_fkey" FOREIGN KEY ("staff_role_id") REFERENCES "public"."staff_roles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."gig_status_history"
    ADD CONSTRAINT "gig_status_history_gig_id_fkey" FOREIGN KEY ("gig_id") REFERENCES "public"."gigs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gigs"
    ADD CONSTRAINT "gigs_parent_gig_id_fkey" FOREIGN KEY ("parent_gig_id") REFERENCES "public"."gigs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_accepted_by_fkey" FOREIGN KEY ("accepted_by") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."kit_assets"
    ADD CONSTRAINT "kit_assets_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."kit_assets"
    ADD CONSTRAINT "kit_assets_kit_id_fkey" FOREIGN KEY ("kit_id") REFERENCES "public"."kits"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."kits"
    ADD CONSTRAINT "kits_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_default_staff_role_id_fkey" FOREIGN KEY ("default_staff_role_id") REFERENCES "public"."staff_roles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE CASCADE;



CREATE POLICY "Admins and Managers can create invitations" ON "public"."invitations" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['Admin'::"public"."user_role", 'Manager'::"public"."user_role"]))))));



CREATE POLICY "Admins and Managers can delete invitations" ON "public"."invitations" FOR DELETE USING ("public"."user_is_admin_or_manager_of_org"("organization_id", "auth"."uid"()));



CREATE POLICY "Admins and Managers can manage all assignments for accessible g" ON "public"."gig_staff_assignments" USING ((EXISTS ( SELECT 1
   FROM "public"."gig_staff_slots" "gss"
  WHERE (("gss"."id" = "gig_staff_assignments"."slot_id") AND "public"."user_can_manage_gig"("gss"."gig_id", "auth"."uid"())))));



CREATE POLICY "Admins and Managers can manage assets" ON "public"."assets" USING ("public"."user_is_admin_or_manager_of_org"("organization_id", "auth"."uid"()));



CREATE POLICY "Admins and Managers can manage gig bids" ON "public"."gig_financials" USING ("public"."user_can_manage_gig"("gig_id", "auth"."uid"()));



CREATE POLICY "Admins and Managers can manage gig participants" ON "public"."gig_participants" USING ("public"."user_can_manage_gig"("gig_id", "auth"."uid"()));



CREATE POLICY "Admins and Managers can manage gig staff slots" ON "public"."gig_staff_slots" USING ("public"."user_can_manage_gig"("gig_id", "auth"."uid"()));



CREATE POLICY "Admins and Managers can manage kit assets" ON "public"."kit_assets" USING ((EXISTS ( SELECT 1
   FROM "public"."kits" "k"
  WHERE (("k"."id" = "kit_assets"."kit_id") AND "public"."user_is_admin_or_manager_of_org"("k"."organization_id", "auth"."uid"())))));



CREATE POLICY "Admins and Managers can manage kit assignments" ON "public"."gig_kit_assignments" USING ("public"."user_can_manage_gig"("gig_id", "auth"."uid"()));



CREATE POLICY "Admins and Managers can manage kits" ON "public"."kits" USING ("public"."user_is_admin_or_manager_of_org"("organization_id", "auth"."uid"()));



CREATE POLICY "Admins and Managers can update invitations, users can accept th" ON "public"."invitations" FOR UPDATE USING (("public"."user_is_admin_or_manager_of_org"("organization_id", "auth"."uid"()) OR ("email" = "public"."get_user_email"("auth"."uid"())))) WITH CHECK (("public"."user_is_admin_or_manager_of_org"("organization_id", "auth"."uid"()) OR ("email" = "public"."get_user_email"("auth"."uid"()))));



CREATE POLICY "Admins and Managers can view bids for accessible gigs" ON "public"."gig_financials" FOR SELECT USING ("public"."user_can_manage_gig"("gig_id", "auth"."uid"()));



CREATE POLICY "Admins and Managers of participating orgs can update gigs" ON "public"."gigs" FOR UPDATE USING ("public"."user_can_manage_gig"("id", "auth"."uid"()));



CREATE POLICY "Admins can delete their organization's financials" ON "public"."gig_financials" FOR DELETE TO "authenticated" USING ("public"."user_is_admin_of_org"("organization_id", "auth"."uid"()));



CREATE POLICY "Admins can insert their organization's financials" ON "public"."gig_financials" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_is_admin_of_org"("organization_id", "auth"."uid"()));



CREATE POLICY "Admins can manage organization members" ON "public"."organization_members" USING ("public"."user_is_admin_of_org"("organization_id", "auth"."uid"()));



CREATE POLICY "Admins can update their organization's financials" ON "public"."gig_financials" FOR UPDATE TO "authenticated" USING ("public"."user_is_admin_of_org"("organization_id", "auth"."uid"())) WITH CHECK ("public"."user_is_admin_of_org"("organization_id", "auth"."uid"()));



CREATE POLICY "Admins can update their organizations" ON "public"."organizations" FOR UPDATE USING ("public"."user_is_admin_of_org"("id", "auth"."uid"()));



CREATE POLICY "Admins can view their organization's financials" ON "public"."gig_financials" FOR SELECT TO "authenticated" USING ("public"."user_is_admin_of_org"("organization_id", "auth"."uid"()));



CREATE POLICY "Admins of participating orgs can delete gigs" ON "public"."gigs" FOR DELETE USING ("public"."user_is_admin_of_gig"("id", "auth"."uid"()));



CREATE POLICY "Allow inserting status history for authorized users" ON "public"."gig_status_history" FOR INSERT TO "authenticated" WITH CHECK ("public"."user_can_manage_gig"("gig_id", "auth"."uid"()));



CREATE POLICY "Anyone can view all organizations for participant selection" ON "public"."organizations" FOR SELECT USING (true);



CREATE POLICY "Anyone can view staff roles" ON "public"."staff_roles" FOR SELECT USING (true);



CREATE POLICY "Authenticated users can create gigs" ON "public"."gigs" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can create organizations" ON "public"."organizations" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Staff can update their own assignments" ON "public"."gig_staff_assignments" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can join organizations as viewers" ON "public"."organization_members" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) AND ("role" = 'Viewer'::"public"."user_role")));



CREATE POLICY "Users can view assignments for accessible gigs" ON "public"."gig_staff_assignments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."gig_staff_slots" "gss"
  WHERE (("gss"."id" = "gig_staff_assignments"."slot_id") AND "public"."user_has_access_to_gig"("gss"."gig_id", "auth"."uid"())))));



CREATE POLICY "Users can view gigs they are participating in" ON "public"."gigs" FOR SELECT USING ("public"."user_has_access_to_gig"("id", "auth"."uid"()));



CREATE POLICY "Users can view invitations for their organizations" ON "public"."invitations" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view kit assets for their organization's kits" ON "public"."kit_assets" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."kits" "k"
  WHERE (("k"."id" = "kit_assets"."kit_id") AND "public"."user_is_member_of_org"("k"."organization_id", "auth"."uid"())))));



CREATE POLICY "Users can view kit assignments for accessible gigs" ON "public"."gig_kit_assignments" FOR SELECT USING ("public"."user_has_access_to_gig"("gig_id", "auth"."uid"()));



CREATE POLICY "Users can view members of their organizations" ON "public"."organization_members" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("organization_id" IN ( SELECT "user_organization_ids"."organization_id"
   FROM "public"."user_organization_ids"("auth"."uid"()) "user_organization_ids"("organization_id")))));



CREATE POLICY "Users can view participants for accessible gigs" ON "public"."gig_participants" FOR SELECT USING ("public"."user_has_access_to_gig"("gig_id", "auth"."uid"()));



CREATE POLICY "Users can view staff slots for accessible gigs" ON "public"."gig_staff_slots" FOR SELECT USING ("public"."user_has_access_to_gig"("gig_id", "auth"."uid"()));



CREATE POLICY "Users can view status history for accessible gigs" ON "public"."gig_status_history" FOR SELECT USING ("public"."user_has_access_to_gig"("gig_id", "auth"."uid"()));



CREATE POLICY "Users can view their organization's assets" ON "public"."assets" FOR SELECT USING ("public"."user_is_member_of_org"("organization_id", "auth"."uid"()));



CREATE POLICY "Users can view their organization's kits" ON "public"."kits" FOR SELECT USING ("public"."user_is_member_of_org"("organization_id", "auth"."uid"()));



ALTER TABLE "public"."assets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gig_financials" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gig_kit_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gig_participants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gig_staff_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gig_staff_slots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gig_status_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gigs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."kit_assets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."kits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."kv_store_de012ad4" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "org_view" ON "public"."users" FOR SELECT USING (("id" IN ( SELECT "get_user_ids_in_same_orgs"."member_user_id"
   FROM "public"."get_user_ids_in_same_orgs"("auth"."uid"()) "get_user_ids_in_same_orgs"("member_user_id"))));



ALTER TABLE "public"."organization_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "self_insert" ON "public"."users" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "self_update" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "self_view" ON "public"."users" FOR SELECT USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."staff_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."convert_pending_user_to_active"("p_email" "text", "p_auth_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."convert_pending_user_to_active"("p_email" "text", "p_auth_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."convert_pending_user_to_active"("p_email" "text", "p_auth_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_gig_complex"("p_gig_data" "jsonb", "p_participants" "jsonb", "p_staff_slots" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_gig_complex"("p_gig_data" "jsonb", "p_participants" "jsonb", "p_staff_slots" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_gig_complex"("p_gig_data" "jsonb", "p_participants" "jsonb", "p_staff_slots" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_complete_user_data"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_complete_user_data"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_complete_user_data"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_email"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_email"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_email"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_ids_in_same_orgs"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_ids_in_same_orgs"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_ids_in_same_orgs"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_organizations_secure"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_organizations_secure"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_organizations_secure"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_profile_secure"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_profile_secure"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_profile_secure"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_role_in_org"("org_id" "uuid", "user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_role_in_org"("org_id" "uuid", "user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role_in_org"("org_id" "uuid", "user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."invite_user_to_organization"("p_organization_id" "uuid", "p_email" "text", "p_role" "text", "p_first_name" "text", "p_last_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."invite_user_to_organization"("p_organization_id" "uuid", "p_email" "text", "p_role" "text", "p_first_name" "text", "p_last_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."invite_user_to_organization"("p_organization_id" "uuid", "p_email" "text", "p_role" "text", "p_first_name" "text", "p_last_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."invite_user_to_organization"("p_organization_id" "uuid", "p_email" "text", "p_role" "text", "p_first_name" "text", "p_last_name" "text", "p_inviter_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."invite_user_to_organization"("p_organization_id" "uuid", "p_email" "text", "p_role" "text", "p_first_name" "text", "p_last_name" "text", "p_inviter_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."invite_user_to_organization"("p_organization_id" "uuid", "p_email" "text", "p_role" "text", "p_first_name" "text", "p_last_name" "text", "p_inviter_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_gig_status_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_gig_status_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_gig_status_change"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."search_users_secure"("search_text" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."search_users_secure"("search_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."search_users_secure"("search_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_users_secure"("search_text" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."user_can_manage_gig"("gig_id" "uuid", "user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_can_manage_gig"("gig_id" "uuid", "user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_can_manage_gig"("gig_id" "uuid", "user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_has_access_to_gig"("gig_id" "uuid", "user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_has_access_to_gig"("gig_id" "uuid", "user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_access_to_gig"("gig_id" "uuid", "user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_is_admin_of_gig"("gig_id" "uuid", "user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_is_admin_of_gig"("gig_id" "uuid", "user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_is_admin_of_gig"("gig_id" "uuid", "user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_is_admin_of_org"("org_id" "uuid", "user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_is_admin_of_org"("org_id" "uuid", "user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_is_admin_of_org"("org_id" "uuid", "user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_is_admin_or_manager_of_org"("org_id" "uuid", "user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_is_admin_or_manager_of_org"("org_id" "uuid", "user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_is_admin_or_manager_of_org"("org_id" "uuid", "user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_is_member_of_org"("org_id" "uuid", "user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_is_member_of_org"("org_id" "uuid", "user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_is_member_of_org"("org_id" "uuid", "user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_organization_ids"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_organization_ids"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_organization_ids"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."assets" TO "anon";
GRANT ALL ON TABLE "public"."assets" TO "authenticated";
GRANT ALL ON TABLE "public"."assets" TO "service_role";



GRANT ALL ON TABLE "public"."gig_financials" TO "anon";
GRANT ALL ON TABLE "public"."gig_financials" TO "authenticated";
GRANT ALL ON TABLE "public"."gig_financials" TO "service_role";



GRANT ALL ON TABLE "public"."gig_kit_assignments" TO "anon";
GRANT ALL ON TABLE "public"."gig_kit_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."gig_kit_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."gig_participants" TO "anon";
GRANT ALL ON TABLE "public"."gig_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."gig_participants" TO "service_role";



GRANT ALL ON TABLE "public"."gig_staff_assignments" TO "anon";
GRANT ALL ON TABLE "public"."gig_staff_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."gig_staff_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."gig_staff_slots" TO "anon";
GRANT ALL ON TABLE "public"."gig_staff_slots" TO "authenticated";
GRANT ALL ON TABLE "public"."gig_staff_slots" TO "service_role";



GRANT ALL ON TABLE "public"."gig_status_history" TO "anon";
GRANT ALL ON TABLE "public"."gig_status_history" TO "authenticated";
GRANT ALL ON TABLE "public"."gig_status_history" TO "service_role";



GRANT ALL ON TABLE "public"."gigs" TO "anon";
GRANT ALL ON TABLE "public"."gigs" TO "authenticated";
GRANT ALL ON TABLE "public"."gigs" TO "service_role";



GRANT ALL ON TABLE "public"."invitations" TO "anon";
GRANT ALL ON TABLE "public"."invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."invitations" TO "service_role";



GRANT ALL ON TABLE "public"."kit_assets" TO "anon";
GRANT ALL ON TABLE "public"."kit_assets" TO "authenticated";
GRANT ALL ON TABLE "public"."kit_assets" TO "service_role";



GRANT ALL ON TABLE "public"."kits" TO "anon";
GRANT ALL ON TABLE "public"."kits" TO "authenticated";
GRANT ALL ON TABLE "public"."kits" TO "service_role";



GRANT ALL ON TABLE "public"."kv_store_de012ad4" TO "anon";
GRANT ALL ON TABLE "public"."kv_store_de012ad4" TO "authenticated";
GRANT ALL ON TABLE "public"."kv_store_de012ad4" TO "service_role";



GRANT ALL ON TABLE "public"."organization_members" TO "anon";
GRANT ALL ON TABLE "public"."organization_members" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_members" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."staff_roles" TO "anon";
GRANT ALL ON TABLE "public"."staff_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_roles" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







