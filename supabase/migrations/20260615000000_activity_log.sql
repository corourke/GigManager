-- Migration: Unified Activity Log
-- Replaces gig_status_history and asset_status_history with a single activity_log table.

-- ─── 1. Create activity_log table ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "public"."activity_log" (
    "id"              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    "organization_id" UUID        REFERENCES "public"."organizations"("id") ON DELETE SET NULL,
    "actor_id"        UUID        REFERENCES "public"."users"("id") ON DELETE SET NULL,
    "event_type"      TEXT        NOT NULL,
    "entity_type"     TEXT        NOT NULL,
    "entity_id"       UUID        NOT NULL,
    "gig_id"          UUID        REFERENCES "public"."gigs"("id") ON DELETE CASCADE,
    "context"         JSONB       NOT NULL DEFAULT '{}',
    "occurred_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_activity_log_gig_id"
    ON "public"."activity_log" ("gig_id", "occurred_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_activity_log_entity"
    ON "public"."activity_log" ("entity_type", "entity_id", "occurred_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_activity_log_org_id"
    ON "public"."activity_log" ("organization_id", "occurred_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_activity_log_actor_id"
    ON "public"."activity_log" ("actor_id", "occurred_at" DESC);

-- ─── 2. RLS ──────────────────────────────────────────────────────────────────

ALTER TABLE "public"."activity_log" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_log_select_gig_scoped"
    ON "public"."activity_log"
    FOR SELECT
    USING (
        "gig_id" IS NOT NULL
        AND "public"."user_has_access_to_gig"("gig_id", "auth"."uid"())
    );

CREATE POLICY "activity_log_select_org_scoped"
    ON "public"."activity_log"
    FOR SELECT
    USING (
        "gig_id" IS NULL
        AND "organization_id" IN (
            SELECT "organization_id"
            FROM "public"."organization_members"
            WHERE "user_id" = "auth"."uid"()
        )
    );

-- ─── 3. log_activity SECURITY DEFINER RPC ────────────────────────────────────

CREATE OR REPLACE FUNCTION "public"."log_activity"(
    "p_organization_id" UUID,
    "p_event_type"      TEXT,
    "p_entity_type"     TEXT,
    "p_entity_id"       UUID,
    "p_gig_id"          UUID,
    "p_context"         JSONB
) RETURNS UUID
    LANGUAGE "plpgsql"
    SECURITY DEFINER
    SET "search_path" TO "public"
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_id       UUID;
BEGIN
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_gig_id IS NOT NULL AND NOT user_has_access_to_gig(p_gig_id, v_actor_id) THEN
        RAISE EXCEPTION 'Access denied to gig';
    END IF;

    IF p_gig_id IS NULL AND p_organization_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM organization_members
            WHERE user_id = v_actor_id AND organization_id = p_organization_id
        ) THEN
            RAISE EXCEPTION 'Access denied to organization';
        END IF;
    END IF;

    INSERT INTO activity_log
        (organization_id, actor_id, event_type, entity_type, entity_id, gig_id, context)
    VALUES
        (p_organization_id, v_actor_id, p_event_type, p_entity_type, p_entity_id, p_gig_id, p_context)
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION "public"."log_activity"(UUID, TEXT, TEXT, UUID, UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."log_activity"(UUID, TEXT, TEXT, UUID, UUID, JSONB) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."log_activity"(UUID, TEXT, TEXT, UUID, UUID, JSONB) TO "service_role";

-- ─── 4. Migrate gig_status_history → activity_log ────────────────────────────

INSERT INTO "public"."activity_log" (
    "organization_id",
    "actor_id",
    "event_type",
    "entity_type",
    "entity_id",
    "gig_id",
    "context",
    "occurred_at"
)
SELECT
    (
        SELECT CASE WHEN COUNT(DISTINCT om.organization_id) = 1 THEN MIN(om.organization_id) ELSE NULL END
        FROM "public"."organization_members" om
        INNER JOIN "public"."gig_participants" gp
            ON gp.organization_id = om.organization_id AND gp.gig_id = h.gig_id
        WHERE om.user_id = h.changed_by
    ) AS organization_id,
    h.changed_by AS actor_id,
    'gig.status_changed' AS event_type,
    'gig' AS entity_type,
    h.gig_id AS entity_id,
    h.gig_id AS gig_id,
    jsonb_build_object(
        'context_version', 1,
        'actor_display_name', COALESCE(
            (SELECT u.first_name || ' ' || u.last_name FROM "public"."users" u WHERE u.id = h.changed_by),
            '[Historical Record]'
        ),
        'actor_org_name', '[Historical Record]',
        'gig_title', COALESCE(
            (SELECT g.title FROM "public"."gigs" g WHERE g.id = h.gig_id),
            '[Historical Record]'
        ),
        'from_status', h.from_status::text,
        'to_status', h.to_status::text
    ) AS context,
    h.changed_at AS occurred_at
FROM "public"."gig_status_history" h;

-- ─── 5. Drop gig_status_history trigger, function and table ──────────────────

DROP TRIGGER IF EXISTS "log_gig_status_changes" ON "public"."gigs";
DROP FUNCTION IF EXISTS "public"."log_gig_status_change"();
DROP TABLE IF EXISTS "public"."gig_status_history";

-- ─── 6. Migrate asset_status_history → activity_log ──────────────────────────

INSERT INTO "public"."activity_log" (
    "organization_id",
    "actor_id",
    "event_type",
    "entity_type",
    "entity_id",
    "gig_id",
    "context",
    "occurred_at"
)
SELECT
    a.organization_id,
    h.changed_by AS actor_id,
    'asset.status_changed' AS event_type,
    'asset' AS entity_type,
    h.asset_id AS entity_id,
    NULL AS gig_id,
    jsonb_build_object(
        'context_version', 1,
        'actor_display_name', COALESCE(
            (SELECT u.first_name || ' ' || u.last_name FROM "public"."users" u WHERE u.id = h.changed_by),
            '[Historical Record]'
        ),
        'actor_org_name', '[Historical Record]',
        'asset_model', COALESCE(a.manufacturer_model, '[Historical Record]'),
        'category', COALESCE(a.category, '[Historical Record]'),
        'from_status', h.from_status,
        'to_status', h.to_status
    ) AS context,
    h.changed_at AS occurred_at
FROM "public"."asset_status_history" h
LEFT JOIN "public"."assets" a ON a.id = h.asset_id;

-- ─── 7. Drop asset_status_history trigger, function and table ────────────────

DROP TRIGGER IF EXISTS "on_asset_status_change" ON "public"."assets";
DROP FUNCTION IF EXISTS "public"."track_asset_status_change"();
DROP TABLE IF EXISTS "public"."asset_status_history";
