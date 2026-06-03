-- Add mileage column to gig_financials table
ALTER TABLE gig_financials ADD COLUMN mileage NUMERIC(10, 2);

-- Add comment to explain the column
COMMENT ON COLUMN gig_financials.mileage IS 'Mileage traveled to/from gig for expense purposes';
