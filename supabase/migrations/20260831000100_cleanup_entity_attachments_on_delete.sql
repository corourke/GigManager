-- Orphan cleanup for the polymorphic attachment system.
--
-- entity_attachments.entity_id is a polymorphic reference with NO foreign key,
-- so deleting the row it points at (an asset, gig, purchase, or gig_financials
-- row) leaves the join row — and often the attachments metadata row — dangling
-- forever. Nothing in the app catches every delete path (RLS cascades, bulk
-- updateGigFinancials deletes, reclassify_expense_as_asset, direct SQL), so the
-- metadata cleanup is enforced at the database with one generic BEFORE DELETE
-- trigger function, parameterised by entity type via TG_ARGV, wired to all four
-- host tables.
--
-- Scope note: this trigger cleans DB metadata only (entity_attachments join
-- rows, plus attachments rows that become orphaned). It does NOT delete the
-- underlying storage object — Postgres is blocked from writing storage.objects
-- directly ("Use the Storage API instead"), so blob cleanup is done best-effort
-- app-side in deleteGigFinancial and by an eventual storage lifecycle sweep.
-- The metadata cleanup here is what prevents dangling joins and wrong
-- attachment counts.

CREATE OR REPLACE FUNCTION "public"."cleanup_orphaned_attachments"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_entity_type text := TG_ARGV[0];
BEGIN
  -- Delete attachments linked ONLY to the row being removed (not shared with
  -- any other entity). This cascades to their entity_attachments join rows.
  DELETE FROM public.attachments a
  USING public.entity_attachments ea
  WHERE ea.attachment_id = a.id
    AND ea.entity_type = v_entity_type
    AND ea.entity_id = OLD.id
    AND NOT EXISTS (
      SELECT 1 FROM public.entity_attachments other
      WHERE other.attachment_id = a.id
        AND NOT (other.entity_type = v_entity_type AND other.entity_id = OLD.id)
    );

  -- Remove this row's remaining join rows (attachment still shared elsewhere).
  DELETE FROM public.entity_attachments
  WHERE entity_type = v_entity_type
    AND entity_id = OLD.id;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS "trg_cleanup_attachments" ON "public"."gig_financials";
CREATE TRIGGER "trg_cleanup_attachments"
  BEFORE DELETE ON "public"."gig_financials"
  FOR EACH ROW EXECUTE FUNCTION "public"."cleanup_orphaned_attachments"('gig_financial');

DROP TRIGGER IF EXISTS "trg_cleanup_attachments" ON "public"."assets";
CREATE TRIGGER "trg_cleanup_attachments"
  BEFORE DELETE ON "public"."assets"
  FOR EACH ROW EXECUTE FUNCTION "public"."cleanup_orphaned_attachments"('asset');

DROP TRIGGER IF EXISTS "trg_cleanup_attachments" ON "public"."gigs";
CREATE TRIGGER "trg_cleanup_attachments"
  BEFORE DELETE ON "public"."gigs"
  FOR EACH ROW EXECUTE FUNCTION "public"."cleanup_orphaned_attachments"('gig');

DROP TRIGGER IF EXISTS "trg_cleanup_attachments" ON "public"."purchases";
CREATE TRIGGER "trg_cleanup_attachments"
  BEFORE DELETE ON "public"."purchases"
  FOR EACH ROW EXECUTE FUNCTION "public"."cleanup_orphaned_attachments"('purchase');
