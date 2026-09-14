-- Fix confirmed cross-org RLS leak on gig_financials (issue #61).
--
-- gig_financials carried six permissive policies: two gig-scoped ("Admins and
-- Managers can manage gig bids" / "...can view bids for accessible gigs") via
-- user_can_manage_gig(gig_id, ...), which is satisfied by an Admin/Manager of
-- ANY participating org, not just the row's own organization_id. Because
-- Postgres ORs all permissive policies together, the four org-scoped policies
-- ("Admins can {view,insert,update,delete} their organization's financials")
-- were fully shadowed on every command. Net effect: any Admin/Manager of any
-- org sharing a gig could read/write every other org's financial rows on it.
--
-- This migration reconciles all six down to the two-policy shape already used
-- correctly on assets/kits (single SELECT, single ALL, both scoped only to
-- organization_id, no gig-participation fallback), matching the documented
-- target in docs/technical/security-scheme.md §3 ("gig_financials: only
-- accessible to Admin and Manager roles of the owning organization"). Manager
-- is included alongside Admin per §2's role table (Manager has full CRUD on
-- Financials) — the old org-scoped policies only checked user_is_admin_of_org,
-- which under-scoped Manager independently of the gig-scoped leak.
--
-- No schema change: gig_financials.organization_id is already NOT NULL.

DROP POLICY IF EXISTS "Admins and Managers can manage gig bids" ON "public"."gig_financials";
DROP POLICY IF EXISTS "Admins and Managers can view bids for accessible gigs" ON "public"."gig_financials";
DROP POLICY IF EXISTS "Admins can delete their organization's financials" ON "public"."gig_financials";
DROP POLICY IF EXISTS "Admins can insert their organization's financials" ON "public"."gig_financials";
DROP POLICY IF EXISTS "Admins can update their organization's financials" ON "public"."gig_financials";
DROP POLICY IF EXISTS "Admins can view their organization's financials" ON "public"."gig_financials";

CREATE POLICY "Admins and managers can view their organization's financials" ON "public"."gig_financials"
  FOR SELECT
  USING ("public"."user_is_admin_or_manager_of_org"("organization_id", "auth"."uid"()));

CREATE POLICY "Admins and managers can manage their organization's financials" ON "public"."gig_financials"
  FOR ALL
  USING ("public"."user_is_admin_or_manager_of_org"("organization_id", "auth"."uid"()))
  WITH CHECK ("public"."user_is_admin_or_manager_of_org"("organization_id", "auth"."uid"()));
