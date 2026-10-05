-- #133 step 1: separate a purchase line's tax treatment from whether it is
-- tracked as equipment, and lock filed tax years.
--
-- Additive and backward compatible: today's app still writes row_type
-- 'item'/'asset' and no tax_treatment; a trigger fills tax_treatment in from
-- row_type until the UI sets it itself (#133 step 2).
--
-- Rules (see docs/technical/financials.md):
--   * headers have no tax_treatment; every line has one: 'expense' or 'depreciate'
--   * a depreciated line has an equipment record (asset_id) and is never a gig expense
--   * recovery_period (5/7/15 years) only on depreciated lines
--   * purchases dated in a locked tax year can't have their tax fields changed,
--     and can't be added or deleted; equipment links and descriptions can change

-- 1. Columns and backfill -----------------------------------------------------

ALTER TABLE public.purchases
  ADD COLUMN tax_treatment text,
  ADD COLUMN recovery_period smallint;

COMMENT ON COLUMN public.purchases.tax_treatment IS
  'Lines only: expense | depreciate. Independent of asset_id (tracked as equipment), except that depreciate requires one.';
COMMENT ON COLUMN public.purchases.recovery_period IS
  'Depreciated lines only: 5, 7 or 15 (years). Set by the user; the tax program computes depreciation.';

-- Keep each row's updated_at: this is a backfill, not an edit.
ALTER TABLE public.purchases DISABLE TRIGGER update_purchases_updated_at;
UPDATE public.purchases
  SET tax_treatment = CASE row_type WHEN 'asset' THEN 'depreciate' ELSE 'expense' END
  WHERE row_type <> 'header';
ALTER TABLE public.purchases ENABLE TRIGGER update_purchases_updated_at;

ALTER TABLE public.purchases
  ADD CONSTRAINT purchases_tax_treatment_values CHECK (tax_treatment IN ('expense', 'depreciate')),
  ADD CONSTRAINT purchases_tax_treatment_lines_only CHECK ((row_type = 'header') = (tax_treatment IS NULL)),
  ADD CONSTRAINT purchases_recovery_period_values CHECK (recovery_period IN (5, 7, 15)),
  ADD CONSTRAINT purchases_recovery_period_depreciate_only CHECK (recovery_period IS NULL OR tax_treatment = 'depreciate');

-- 2. Fill in tax_treatment for writers that don't set it yet -------------------
-- A line written without a treatment takes it from row_type; a row_type change
-- that leaves the treatment alone (the old "Reclassify as Asset") moves it too.

CREATE OR REPLACE FUNCTION public.purchases_default_tax_treatment()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.row_type = 'header' THEN
    RETURN NEW;  -- the check constraint refuses a header with a treatment
  END IF;
  IF (TG_OP = 'INSERT' AND NEW.tax_treatment IS NULL)
     OR (TG_OP = 'UPDATE' AND NEW.row_type IS DISTINCT FROM OLD.row_type
         AND NEW.tax_treatment IS NOT DISTINCT FROM OLD.tax_treatment) THEN
    NEW.tax_treatment := CASE NEW.row_type WHEN 'asset' THEN 'depreciate' ELSE 'expense' END;
  END IF;
  RETURN NEW;
END $$;

-- Runs before the year-lock trigger (triggers fire in name order).
CREATE TRIGGER purchases_a_default_tax_treatment
  BEFORE INSERT OR UPDATE ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.purchases_default_tax_treatment();

-- 3. A depreciated line keeps an equipment record ----------------------------
-- Checked at commit, because create_purchase_transaction_v1 inserts the line
-- before the asset it links. Also refuses deleting such a line's asset (the
-- FK would set asset_id to NULL): dispose of it, or expense the line, instead.

CREATE OR REPLACE FUNCTION public.purchases_check_depreciate_has_asset()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.purchases
             WHERE id = NEW.id AND tax_treatment = 'depreciate' AND asset_id IS NULL) THEN
    RAISE EXCEPTION 'A depreciated purchase line must keep its equipment record (purchase %). Mark the equipment disposed instead, or change the line to an expense.', NEW.id
      USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END $$;

CREATE CONSTRAINT TRIGGER purchases_depreciate_has_asset
  AFTER INSERT OR UPDATE ON public.purchases
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.purchases_check_depreciate_has_asset();

-- 4. A depreciated line is never a gig expense --------------------------------
-- Gig money-out rows may point at an expensed line (gig accounting only; tax
-- reports skip rows with a purchase_id) or at a header (old scan-from-gig rows).

CREATE OR REPLACE FUNCTION public.gig_financials_no_depreciated_purchase()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.purchase_id IS NOT NULL AND EXISTS (
       SELECT 1 FROM public.purchases WHERE id = NEW.purchase_id AND tax_treatment = 'depreciate') THEN
    RAISE EXCEPTION 'A depreciated purchase line can''t be a gig expense.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER gig_financials_no_depreciated_purchase
  BEFORE INSERT OR UPDATE OF purchase_id ON public.gig_financials
  FOR EACH ROW EXECUTE FUNCTION public.gig_financials_no_depreciated_purchase();

CREATE OR REPLACE FUNCTION public.purchases_depreciate_not_gig_expense()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.tax_treatment = 'depreciate' AND OLD.tax_treatment IS DISTINCT FROM 'depreciate'
     AND EXISTS (SELECT 1 FROM public.gig_financials WHERE purchase_id = NEW.id) THEN
    RAISE EXCEPTION 'This purchase line is a gig expense, so it can''t be depreciated. Remove it from the gig first.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER purchases_b_depreciate_not_gig_expense
  BEFORE UPDATE OF tax_treatment, row_type ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.purchases_depreciate_not_gig_expense();

-- 5. Tax years ---------------------------------------------------------------

CREATE TABLE public.tax_years (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  year smallint NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  locked boolean NOT NULL DEFAULT true,
  filed_on date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, year)
);
COMMENT ON TABLE public.tax_years IS
  'Per organization: a filed (locked) tax year. Purchases dated in a locked year keep their tax fields.';

ALTER TABLE public.tax_years ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins and Managers see their org's tax years" ON public.tax_years
  FOR SELECT USING (public.user_is_admin_or_manager_of_org(organization_id, auth.uid()));
CREATE POLICY "Admins add their org's tax years" ON public.tax_years
  FOR INSERT WITH CHECK (public.user_is_admin_of_org(organization_id, auth.uid()));
CREATE POLICY "Admins change their org's tax years" ON public.tax_years
  FOR UPDATE USING (public.user_is_admin_of_org(organization_id, auth.uid()))
  WITH CHECK (public.user_is_admin_of_org(organization_id, auth.uid()));
CREATE POLICY "Admins remove their org's tax years" ON public.tax_years
  FOR DELETE USING (public.user_is_admin_of_org(organization_id, auth.uid()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tax_years TO authenticated;

CREATE TRIGGER update_tax_years_updated_at
  BEFORE UPDATE ON public.tax_years
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Lock: purchases in a locked year keep their tax fields --------------------

-- SECURITY DEFINER so the check sees tax_years whatever the caller's role.
CREATE OR REPLACE FUNCTION public.tax_year_is_locked(p_org uuid, p_date date)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p_date IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.tax_years
    WHERE organization_id = p_org AND year = extract(year FROM p_date)::int AND locked);
$$;

CREATE OR REPLACE FUNCTION public.purchases_enforce_tax_year_lock()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_old_date date;
  v_new_date date;
BEGIN
  -- A line with no date of its own falls in its invoice's year.
  IF TG_OP <> 'INSERT' THEN
    v_old_date := COALESCE(OLD.purchase_date,
      (SELECT purchase_date FROM public.purchases WHERE id = OLD.parent_id));
  END IF;
  IF TG_OP <> 'DELETE' THEN
    v_new_date := COALESCE(NEW.purchase_date,
      (SELECT purchase_date FROM public.purchases WHERE id = NEW.parent_id));
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF public.tax_year_is_locked(NEW.organization_id, v_new_date) THEN
      RAISE EXCEPTION 'The % tax year is locked (filed), so no purchases can be added to it.',
        extract(year FROM v_new_date) USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF public.tax_year_is_locked(OLD.organization_id, v_old_date) THEN
      RAISE EXCEPTION 'The % tax year is locked (filed), so its purchases can''t be deleted.',
        extract(year FROM v_old_date) USING ERRCODE = '42501';
    END IF;
    RETURN OLD;
  END IF;

  IF (public.tax_year_is_locked(OLD.organization_id, v_old_date)
      OR public.tax_year_is_locked(NEW.organization_id, v_new_date))
     AND (NEW.tax_treatment, NEW.recovery_period, NEW.row_type, NEW.parent_id, NEW.organization_id,
          NEW.purchase_date, NEW.total_inv_amount, NEW.quantity, NEW.item_price, NEW.item_cost,
          NEW.line_amount, NEW.line_cost, NEW.category, NEW.sub_category)
         IS DISTINCT FROM
         (OLD.tax_treatment, OLD.recovery_period, OLD.row_type, OLD.parent_id, OLD.organization_id,
          OLD.purchase_date, OLD.total_inv_amount, OLD.quantity, OLD.item_price, OLD.item_cost,
          OLD.line_amount, OLD.line_cost, OLD.category, OLD.sub_category) THEN
    RAISE EXCEPTION 'The % tax year is locked (filed): this purchase''s cost, date, category and tax treatment can''t change. Equipment links and descriptions still can.',
      extract(year FROM COALESCE(v_old_date, v_new_date)) USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER purchases_c_tax_year_lock
  BEFORE INSERT OR UPDATE OR DELETE ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.purchases_enforce_tax_year_lock();
