-- Fix: get_complete_user_data() builds its JSON with an explicit column
-- list (jsonb_build_object), so it silently omitted every field added by
-- 20260908000000_access_requests_and_claimed_orgs.sql — platform_moderator
-- was never returned to the client regardless of its actual value, and
-- organization.claimed/allowed_domains were missing from every membership's
-- nested org object. This is the RPC that populates AuthContext's user and
-- organizations on every login, so the entire platform-moderator pathway
-- (queue screen route guard, notification bell, org-picker link) was
-- unreachable in practice. Add the missing fields.
CREATE OR REPLACE FUNCTION "public"."get_complete_user_data"("user_uuid" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    profile_data JSONB;
    orgs_data JSONB;
BEGIN
    -- 1. Fetch user profile (including timezone)
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
        'timezone', u.timezone,
        'user_status', u.user_status,
        'platform_moderator', u.platform_moderator,
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
                'roles', to_jsonb(o.roles),
                'claimed', o.claimed,
                'allowed_domains', o.allowed_domains,
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
