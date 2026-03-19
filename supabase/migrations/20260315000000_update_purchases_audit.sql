-- Migration: Update purchases table for asset auditing and model tracking
-- 1. Add asset_id column to link purchases (items) to assets
ALTER TABLE "public"."purchases" ADD COLUMN IF NOT EXISTS "asset_id" "uuid" REFERENCES "public"."assets"("id") ON DELETE SET NULL;

-- 2. Rename description to manufacturer_model in purchases table
-- Per requirement: The purchases.description column should replaced with the manufacturer_model column.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'purchases' AND column_name = 'description') THEN
        ALTER TABLE "public"."purchases" RENAME COLUMN "description" TO "manufacturer_model";
    END IF;
END $$;
