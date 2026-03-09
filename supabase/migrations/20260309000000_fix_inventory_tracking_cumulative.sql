DROP INDEX IF EXISTS "public"."inventory_tracking_unique_idx";

CREATE INDEX IF NOT EXISTS "inventory_tracking_lookup_idx"
  ON "public"."inventory_tracking" ("gig_id", "kit_id", COALESCE("asset_id", '00000000-0000-0000-0000-000000000000'), "scanned_at" DESC);
