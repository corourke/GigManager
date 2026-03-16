-- Migration: Rename manufacturer_model back to description in purchases table
-- Per requirement: The purchases.manufacturer_model column still isn't working right. Let's do this -- rename it back to description

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'purchases' AND column_name = 'manufacturer_model') THEN
        ALTER TABLE "public"."purchases" RENAME COLUMN "manufacturer_model" TO "description";
    END IF;
END $$;
