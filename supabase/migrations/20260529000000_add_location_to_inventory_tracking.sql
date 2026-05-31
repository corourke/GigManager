ALTER TABLE "public"."inventory_tracking"
  ADD COLUMN IF NOT EXISTS "location" text;
