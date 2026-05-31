-- Fix foreign key relationships for inventory_tracking and asset_status_history
-- Point them to public.users instead of auth.users to fix PostgREST join issues

-- 1. Fix inventory_tracking
ALTER TABLE "public"."inventory_tracking" 
  DROP CONSTRAINT IF EXISTS "inventory_tracking_scanned_by_fkey",
  ADD CONSTRAINT "inventory_tracking_scanned_by_fkey" 
  FOREIGN KEY ("scanned_by") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE SET NULL;

-- 2. Fix asset_status_history
ALTER TABLE "public"."asset_status_history"
  DROP CONSTRAINT IF EXISTS "asset_status_history_changed_by_fkey",
  ADD CONSTRAINT "asset_status_history_changed_by_fkey"
  FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON UPDATE CASCADE ON DELETE SET NULL;
