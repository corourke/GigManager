-- Migration: Update Fin Categories
-- Description: Aligns gig_financials.fin_category enum with IRS Schedule C categories used in AI scanning.

-- 1. Create temporary enum
CREATE TYPE public.fin_category_new AS ENUM (
  'Advertising',
  'Commissions',
  'Depreciation',
  'Insurance',
  'Labor',
  'Legal/Accounting',
  'Meals',
  'Office',
  'Rentals',
  'Repairs',
  'Supplies',
  'Taxes/Licenses',
  'Transportation'
  'Travel',
  'Utilities',
  'Wages',
  'Other'
);

-- 2. Update gig_financials table to use new enum
-- Map existing values to best fits
ALTER TABLE public.gig_financials 
  ALTER COLUMN category TYPE text;


-- 3. Replace the old enum type
DROP TYPE public.fin_category CASCADE;
ALTER TYPE public.fin_category_new RENAME TO fin_category;

-- 4. Set the column back to the new enum type
ALTER TABLE public.gig_financials 
  ALTER COLUMN category TYPE public.fin_category USING category::public.fin_category;
