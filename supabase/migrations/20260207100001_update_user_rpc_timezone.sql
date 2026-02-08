-- Update get_complete_user_data RPC to include timezone field
-- This ensures the timezone field is returned when fetching complete user data

CREATE OR REPLACE FUNCTION get_complete_user_data(user_uuid UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
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