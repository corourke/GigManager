-- Allow attachments to be linked directly to a gig_financials row.
--
-- The single-ledger model (docs/technical/gig-financials.md §5) always intended
-- receipts/invoices to be attachable to a financial record "independent of any
-- linked purchases record", but entity_attachments.entity_type only permitted
-- 'asset' | 'gig' | 'purchase'. Widen it to include 'gig_financial' so a
-- manually-entered or non-gig-sourced expense can carry its own receipt.
--
-- No new RLS is required: the entity_attachments policies
-- ("Admins and Managers can manage entity attachments" / "Users can view
-- entity attachments", migration 20260313184600) gate purely on the parent
-- attachment's organization and role, independent of entity_type. The
-- attachments table and the 'attachments' storage bucket are likewise already
-- scoped to Admin/Manager writes (migration 20260612000000).
--
-- Orphan cleanup for entity_attachments when the ledger row is deleted is
-- handled by a BEFORE DELETE trigger in migration 20260831000100.

ALTER TABLE "public"."entity_attachments"
  DROP CONSTRAINT IF EXISTS "entity_attachments_entity_type_check";

ALTER TABLE "public"."entity_attachments"
  ADD CONSTRAINT "entity_attachments_entity_type_check"
  CHECK ("entity_type" = ANY (ARRAY['asset'::text, 'gig'::text, 'purchase'::text, 'gig_financial'::text]));
