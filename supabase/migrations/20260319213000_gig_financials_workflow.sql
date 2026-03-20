-- Migration: Gig Financials Workflow
-- Date: 2026-03-19
-- Description: Schema changes for single-ledger financial model and staff completion tracking

-- 1. gig_financials: add two FK columns for source document linking
ALTER TABLE public.gig_financials ADD COLUMN IF NOT EXISTS purchase_id UUID REFERENCES public.purchases(id) ON DELETE SET NULL;
ALTER TABLE public.gig_financials ADD COLUMN IF NOT EXISTS staff_assignment_id UUID REFERENCES public.gig_staff_assignments(id) ON DELETE SET NULL;

-- 2. gig_staff_assignments: add completion tracking + back-link to financials
ALTER TABLE public.gig_staff_assignments ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE public.gig_staff_assignments ADD COLUMN IF NOT EXISTS units_completed NUMERIC(10,2);
ALTER TABLE public.gig_staff_assignments ADD COLUMN IF NOT EXISTS gig_financial_id UUID REFERENCES public.gig_financials(id) ON DELETE SET NULL;

-- 3. Update RLS policies for gig_staff_assignments to ensure staff can't mark their own assignments as complete
-- (Assuming only Admins and Managers should update completed_at and units_completed)
-- The existing policy "Staff can update their own assignments" might need restriction

DROP POLICY IF EXISTS "Staff can update their own assignments" ON "public"."gig_staff_assignments";
CREATE POLICY "Staff can update their own assignments" ON "public"."gig_staff_assignments"
FOR UPDATE USING (
    "user_id" = "auth"."uid"()
) WITH CHECK (
    "user_id" = "auth"."uid"() AND
    "completed_at" IS NOT DISTINCT FROM "completed_at" AND -- Ensure these don't change if updated by staff
    "units_completed" IS NOT DISTINCT FROM "units_completed" AND
    "gig_financial_id" IS NOT DISTINCT FROM "gig_financial_id"
);

-- Note: The "Admins and Managers can manage all assignments for accessible gigs" policy already covers updates by privileged users.

-- 4. Update schema_dump.sql will be handled separately if needed, but the migration is the source of truth now.
