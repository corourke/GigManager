-- Migration: Remove unauthorized columns from gigs table
-- Date: 2026-02-07
-- Description: Removes venue_address, settlement_type, settlement_amount columns that were added without authorization
--              and the settlement_type enum that was created

-- Remove unauthorized columns from gigs table
ALTER TABLE gigs 
DROP COLUMN IF EXISTS venue_address,
DROP COLUMN IF EXISTS settlement_type,
DROP COLUMN IF EXISTS settlement_amount;

-- Drop the settlement_type enum that was created
DROP TYPE IF EXISTS settlement_type;