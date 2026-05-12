-- Migration: Fix Fin Categories
-- Description: Corrects fin_category enum values to proper IRS Schedule C names.
-- The previous migration (20260328000001) had abbreviated values and a string-
-- concatenation bug that merged 'Transportation' and 'Travel' into 'TransportationTravel'.

-- 1. Create corrected enum
CREATE TYPE public.fin_category_new AS ENUM (
  'Advertising',
  'Car and truck expenses',
  'Commissions and fees',
  'Contract labor',
  'Depreciation',
  'Insurance',
  'Legal and professional services',
  'Office expense',
  'Rent or lease',
  'Repairs and maintenance',
  'Supplies',
  'Taxes and licenses',
  'Travel',
  'Meals',
  'Utilities',
  'Wages',
  'Other expenses'
);

-- 2. Convert column to text so we can remap values
ALTER TABLE public.gig_financials 
  ALTER COLUMN category TYPE text;

-- 3. Map all known old values to correct IRS Schedule C names
UPDATE public.gig_financials SET category = 'Commissions and fees'          WHERE category = 'Commissions';
UPDATE public.gig_financials SET category = 'Wages'                          WHERE category = 'Labor';
UPDATE public.gig_financials SET category = 'Legal and professional services' WHERE category = 'Legal/Accounting';
UPDATE public.gig_financials SET category = 'Office expense'                 WHERE category = 'Office';
UPDATE public.gig_financials SET category = 'Rent or lease'                  WHERE category IN ('Rentals', 'Venue');
UPDATE public.gig_financials SET category = 'Repairs and maintenance'        WHERE category = 'Repairs';
UPDATE public.gig_financials SET category = 'Taxes and licenses'             WHERE category = 'Taxes/Licenses';
UPDATE public.gig_financials SET category = 'Travel'                         WHERE category IN ('Transportation', 'TransportationTravel');
UPDATE public.gig_financials SET category = 'Other expenses'                 WHERE category IN ('Other', 'Rebillable', 'Equipment', 'Production');

-- 4. Replace old enum
DROP TYPE public.fin_category CASCADE;
ALTER TYPE public.fin_category_new RENAME TO fin_category;

-- 5. Restore column to enum type
ALTER TABLE public.gig_financials 
  ALTER COLUMN category TYPE public.fin_category USING category::public.fin_category;
