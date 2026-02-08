-- Migration: Add missing columns to gigs table
-- Date: 2026-02-07
-- Description: Adds venue_address, settlement_type, and settlement_amount columns to the gigs table
--              to fix schema mismatch in create_gig_complex function

-- Create settlement_type enum
DO $$ BEGIN
    CREATE TYPE settlement_type AS ENUM (
        'Cash',
        'Check', 
        'Wire Transfer',
        'Credit Card',
        'ACH',
        'Cryptocurrency',
        'Barter',
        'Trade',
        'Other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add missing columns to gigs table
ALTER TABLE gigs 
ADD COLUMN IF NOT EXISTS venue_address TEXT,
ADD COLUMN IF NOT EXISTS settlement_type settlement_type,
ADD COLUMN IF NOT EXISTS settlement_amount DECIMAL(10,2);

-- Add comments to document the new columns
COMMENT ON COLUMN gigs.venue_address IS 'Specific address for the gig venue (nullable)';
COMMENT ON COLUMN gigs.settlement_type IS 'Type of settlement payment method (nullable)';
COMMENT ON COLUMN gigs.settlement_amount IS 'Amount for settlement payment (nullable)';