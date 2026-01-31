


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


CREATE TYPE "public"."user_role" AS ENUM (
    'Admin',
    'Manager',
    'Staff',
    'Viewer'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_gig_complex"("p_gig_data" "jsonb", "p_participants" "jsonb" DEFAULT '[]'::"jsonb", "p_staff_slots" "jsonb" DEFAULT '[]'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


CREATE TABLE IF NOT EXISTS "public"."gig_bids" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "gig_id" "uuid" NOT NULL,
    "organization_id" "uuid",
    "amount" numeric(10,2) NOT NULL,
    "date_given" "date" NOT NULL,
    "result" "text",
    "notes" "text",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."gig_bids" OWNER TO "postgres";


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
    "amount_paid" numeric(10,2),
    "notes" "text",
    "parent_gig_id" "uuid",
    "hierarchy_depth" integer DEFAULT 0 NOT NULL,
    "created_by" "uuid" NOT NULL,
    "updated_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."gigs" OWNER TO "postgres";


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



ALTER TABLE ONLY "public"."gig_bids"
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



CREATE INDEX "idx_gig_bids_gig_id" ON "public"."gig_bids" USING "btree" ("gig_id");



CREATE INDEX "idx_gig_bids_org_id" ON "public"."gig_bids" USING "btree" ("organization_id");



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



CREATE OR REPLACE TRIGGER "update_gig_staff_slots_updated_at" BEFORE UPDATE ON "public"."gig_staff_slots" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_gigs_updated_at" BEFORE UPDATE ON "public"."gigs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_kits_updated_at" BEFORE UPDATE ON "public"."kits" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_organizations_updated_at" BEFORE UPDATE ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_staff_roles_updated_at" BEFORE UPDATE ON "public"."staff_roles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."assets"
    ADD CONSTRAINT "assets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gig_bids"
    ADD CONSTRAINT "gig_bids_gig_id_fkey" FOREIGN KEY ("gig_id") REFERENCES "public"."gigs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gig_bids"
    ADD CONSTRAINT "gig_bids_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



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



CREATE POLICY "Admins and Managers can manage gig bids" ON "public"."gig_bids" USING ("public"."user_can_manage_gig"("gig_id", "auth"."uid"()));



CREATE POLICY "Admins and Managers can manage gig participants" ON "public"."gig_participants" USING ("public"."user_can_manage_gig"("gig_id", "auth"."uid"()));



CREATE POLICY "Admins and Managers can manage gig staff slots" ON "public"."gig_staff_slots" USING ("public"."user_can_manage_gig"("gig_id", "auth"."uid"()));



CREATE POLICY "Admins and Managers can manage kit assets" ON "public"."kit_assets" USING ((EXISTS ( SELECT 1
   FROM "public"."kits" "k"
  WHERE (("k"."id" = "kit_assets"."kit_id") AND "public"."user_is_admin_or_manager_of_org"("k"."organization_id", "auth"."uid"())))));



CREATE POLICY "Admins and Managers can manage kit assignments" ON "public"."gig_kit_assignments" USING ("public"."user_can_manage_gig"("gig_id", "auth"."uid"()));



CREATE POLICY "Admins and Managers can manage kits" ON "public"."kits" USING ("public"."user_is_admin_or_manager_of_org"("organization_id", "auth"."uid"()));



CREATE POLICY "Admins and Managers can update invitations, users can accept th" ON "public"."invitations" FOR UPDATE USING (("public"."user_is_admin_or_manager_of_org"("organization_id", "auth"."uid"()) OR ("email" = "public"."get_user_email"("auth"."uid"())))) WITH CHECK (("public"."user_is_admin_or_manager_of_org"("organization_id", "auth"."uid"()) OR ("email" = "public"."get_user_email"("auth"."uid"()))));



CREATE POLICY "Admins and Managers can view bids for accessible gigs" ON "public"."gig_bids" FOR SELECT USING ("public"."user_can_manage_gig"("gig_id", "auth"."uid"()));



CREATE POLICY "Admins and Managers of participating orgs can update gigs" ON "public"."gigs" FOR UPDATE USING ("public"."user_can_manage_gig"("id", "auth"."uid"()));



CREATE POLICY "Admins can manage organization members" ON "public"."organization_members" USING ("public"."user_is_admin_of_org"("organization_id", "auth"."uid"()));



CREATE POLICY "Admins can update their organizations" ON "public"."organizations" FOR UPDATE USING ("public"."user_is_admin_of_org"("id", "auth"."uid"()));



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


ALTER TABLE "public"."gig_bids" ENABLE ROW LEVEL SECURITY;


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



GRANT ALL ON FUNCTION "public"."log_gig_status_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_gig_status_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_gig_status_change"() TO "service_role";



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



GRANT ALL ON TABLE "public"."gig_bids" TO "anon";
GRANT ALL ON TABLE "public"."gig_bids" TO "authenticated";
GRANT ALL ON TABLE "public"."gig_bids" TO "service_role";



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







