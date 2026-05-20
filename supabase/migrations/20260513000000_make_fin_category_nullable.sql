-- Migration: Make fin_category nullable
-- Description: category is an IRS Schedule C expense category and only applies
-- to records of type 'Expense Incurred' or 'Expense Reimbursed'. All other
-- financial record types (payments, bids, contracts, etc.) should have NULL category.

ALTER TABLE public.gig_financials
  ALTER COLUMN category DROP NOT NULL;

UPDATE public.gig_financials
  SET category = NULL
  WHERE type NOT IN ('Expense Incurred', 'Expense Reimbursed');
