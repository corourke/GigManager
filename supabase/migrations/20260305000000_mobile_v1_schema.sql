-- Mobile v1 Schema Migration
-- Assets, Kits, Inventory Tracking, User Devices, Asset Status History

-- 1. Extend assets table
ALTER TABLE "public"."assets" 
ADD COLUMN IF NOT EXISTS "tag_number" text,
ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'Active' NOT NULL,
ADD COLUMN IF NOT EXISTS "service_life" integer,
ADD COLUMN IF NOT EXISTS "dep_method" text,
ADD COLUMN IF NOT EXISTS "liquidation_amt" numeric(10,2);

-- 2. Extend kits table
ALTER TABLE "public"."kits"
ADD COLUMN IF NOT EXISTS "is_container" boolean DEFAULT false NOT NULL;

-- 3. Create asset_status_history table
CREATE TABLE IF NOT EXISTS "public"."asset_status_history" (
    "id" uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    "asset_id" uuid NOT NULL REFERENCES "public"."assets"("id") ON DELETE CASCADE,
    "from_status" text,
    "to_status" text NOT NULL,
    "changed_by" uuid REFERENCES auth.users(id),
    "changed_at" timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on asset_status_history
ALTER TABLE "public"."asset_status_history" ENABLE ROW LEVEL SECURITY;

-- 4. Create track_asset_status_change trigger function
CREATE OR REPLACE FUNCTION "public"."track_asset_status_change"() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.asset_status_history (asset_id, from_status, to_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

-- Add trigger to assets table
DROP TRIGGER IF EXISTS "on_asset_status_change" ON "public"."assets";
CREATE TRIGGER "on_asset_status_change"
AFTER UPDATE ON "public"."assets"
FOR EACH ROW EXECUTE FUNCTION "public"."track_asset_status_change"();

-- 5. Create inventory_tracking table
CREATE TABLE IF NOT EXISTS "public"."inventory_tracking" (
    "id" uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    "organization_id" uuid NOT NULL REFERENCES "public"."organizations"("id") ON DELETE CASCADE,
    "gig_id" uuid NOT NULL REFERENCES "public"."gigs"("id") ON DELETE CASCADE,
    "kit_id" uuid REFERENCES "public"."kits"("id") ON DELETE SET NULL,
    "asset_id" uuid REFERENCES "public"."assets"("id") ON DELETE SET NULL,
    "status" text NOT NULL,
    "scanned_at" timestamptz DEFAULT now() NOT NULL,
    "scanned_by" uuid REFERENCES auth.users(id),
    "notes" text,
    "created_at" timestamptz DEFAULT now() NOT NULL
);

-- Unique constraint: (gig_id, kit_id, asset_id)
-- Using COALESCE for asset_id because it's nullable
CREATE UNIQUE INDEX IF NOT EXISTS "inventory_tracking_unique_idx" ON "public"."inventory_tracking" ("gig_id", "kit_id", COALESCE("asset_id", '00000000-0000-0000-0000-000000000000'));

-- Enable RLS on inventory_tracking
ALTER TABLE "public"."inventory_tracking" ENABLE ROW LEVEL SECURITY;

-- 6. Create user_devices table for WebAuthn
CREATE TABLE IF NOT EXISTS "public"."user_devices" (
    "id" uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    "user_id" uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "credential_id" text NOT NULL UNIQUE,
    "public_key" text NOT NULL,
    "device_name" text,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "last_used_at" timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on user_devices
ALTER TABLE "public"."user_devices" ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies

-- asset_status_history: Viewable by anyone with access to the asset
CREATE POLICY "Users can view asset status history" ON "public"."asset_status_history"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.assets a
            WHERE a.id = asset_status_history.asset_id
            AND public.user_is_member_of_org(a.organization_id, auth.uid())
        )
    );

-- inventory_tracking: Staff and above of the gig's participating orgs can manage
CREATE POLICY "Users with gig access can manage inventory tracking" ON "public"."inventory_tracking"
    USING (public.user_has_access_to_gig(gig_id, auth.uid()));

-- user_devices: Users can only manage their own devices
CREATE POLICY "Users can manage their own devices" ON "public"."user_devices"
    USING (auth.uid() = user_id);

-- 8. Grants
GRANT ALL ON TABLE "public"."asset_status_history" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_tracking" TO "authenticated";
GRANT ALL ON TABLE "public"."user_devices" TO "authenticated";
GRANT ALL ON TABLE "public"."asset_status_history" TO "service_role";
GRANT ALL ON TABLE "public"."inventory_tracking" TO "service_role";
GRANT ALL ON TABLE "public"."user_devices" TO "service_role";
