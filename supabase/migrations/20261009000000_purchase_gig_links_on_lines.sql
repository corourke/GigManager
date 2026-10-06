-- #133 step 3: a gig link lives on a purchase line, never on the purchase (header).
-- A depreciated line is bought for the business, so it is never a gig's cost.
--
-- Data: headers linked to a gig hand the link to their expensed lines that have none.
-- A gig money-out row that points at such a header (old Upload Receipt on a gig)
-- moves to the header's line when there is exactly one expensed line, so the gig's
-- totals don't change. Then headers lose their gig link and the constraints go on.
-- Lines in filed years may take the link: gig_id isn't a tax field.

-- 1. Expensed lines take their header's gig
UPDATE public.purchases l
   SET gig_id = h.gig_id
  FROM public.purchases h
 WHERE l.parent_id = h.id
   AND h.row_type = 'header'
   AND h.gig_id IS NOT NULL
   AND l.gig_id IS NULL
   AND l.tax_treatment = 'expense';

-- 2. Money-out rows on a header move to its only expensed line
UPDATE public.gig_financials f
   SET purchase_id = l.id
  FROM public.purchases h
  JOIN public.purchases l ON l.parent_id = h.id AND l.tax_treatment = 'expense'
 WHERE f.purchase_id = h.id
   AND h.row_type = 'header'
   AND (SELECT count(*) FROM public.purchases x
         WHERE x.parent_id = h.id AND x.tax_treatment = 'expense') = 1;

-- 3. Headers carry no gig
UPDATE public.purchases SET gig_id = NULL WHERE row_type = 'header' AND gig_id IS NOT NULL;

-- 4. Keep it that way
-- The updates above queue the deferred purchases_depreciate_has_asset check, and
-- ALTER TABLE refuses to run while it is pending (db push applies a migration as
-- one transaction): run it now.
SET CONSTRAINTS ALL IMMEDIATE;
ALTER TABLE public.purchases
  ADD CONSTRAINT purchases_header_no_gig CHECK (row_type <> 'header' OR gig_id IS NULL),
  ADD CONSTRAINT purchases_depreciate_no_gig CHECK (tax_treatment IS DISTINCT FROM 'depreciate' OR gig_id IS NULL);

COMMENT ON COLUMN public.purchases.gig_id IS
  'Lines only: the gig this expensed line is a cost of. Never set on a header or a depreciated line (#133).';
