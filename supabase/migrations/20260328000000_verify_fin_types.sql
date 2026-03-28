-- Migration: Verify and Fix Fin Types
-- Description: Ensures all required financial types exist in the enum and handles the 'Payment Received' typo.

-- First, try to rename the typo value if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_enum 
        JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
        WHERE pg_type.typname = 'fin_type' AND pg_enum.enumlabel = 'Payment Recieved'
    ) THEN
        ALTER TYPE public.fin_type RENAME VALUE 'Payment Recieved' TO 'Payment Received';
    END IF;
EXCEPTION
    WHEN others THEN
        -- If renaming fails (e.g. 'Payment Received' already exists), just continue
        NULL;
END $$;

-- Now add any missing values just in case
ALTER TYPE public.fin_type ADD VALUE IF NOT EXISTS 'Payment Received';
ALTER TYPE public.fin_type ADD VALUE IF NOT EXISTS 'Deposit Received';
ALTER TYPE public.fin_type ADD VALUE IF NOT EXISTS 'Contract Signed';
ALTER TYPE public.fin_type ADD VALUE IF NOT EXISTS 'Bid Accepted';
ALTER TYPE public.fin_type ADD VALUE IF NOT EXISTS 'Expense Incurred';
ALTER TYPE public.fin_type ADD VALUE IF NOT EXISTS 'Payment Sent';
ALTER TYPE public.fin_type ADD VALUE IF NOT EXISTS 'Deposit Sent';
