-- SQL to populate Gig Manager database with sample data
-- Run this against your Supabase database

-- First, we need to manually create some organizations since we need real IDs
-- Replace these UUIDs with actual organization IDs from your database after creating them

-- Sample Venues
INSERT INTO organizations (name, type, city, state, country, address_line1, postal_code)
VALUES 
  ('Central Park Amphitheater', 'Venue', 'Los Angeles', 'CA', 'USA', NULL, NULL),
  ('Grand Ballroom Hotel', 'Venue', 'New York', 'NY', 'USA', NULL, NULL),
  ('Lakeside Garden Venue', 'Venue', 'Chicago', 'IL', 'USA', NULL, NULL),
  ('The Blue Note Jazz Club', 'Venue', 'New York', 'NY', 'USA', NULL, NULL),
  ('Metropolitan Center', 'Venue', 'Chicago', 'IL', 'USA', NULL, NULL),
  ('Red Rocks Amphitheatre', 'Venue', 'Morrison', 'CO', 'USA', NULL, NULL),
  ('Radio City Music Hall', 'Venue', 'New York', 'NY', 'USA', NULL, NULL),
  ('The Greek Theatre', 'Venue', 'Los Angeles', 'CA', 'USA', NULL, NULL),
  ('The Fillmore', 'Venue', 'San Francisco', 'CA', 'USA', NULL, NULL),
  ('House of Blues', 'Venue', 'Boston', 'MA', 'USA', NULL, NULL);

-- Sample Acts
INSERT INTO organizations (name, type, city, state, country)
VALUES 
  ('The Midnight Riders', 'Act', 'Nashville', 'TN', 'USA'),
  ('Sarah Johnson Quartet', 'Act', 'New York', 'NY', 'USA'),
  ('Electric Dreams Band', 'Act', 'Los Angeles', 'CA', 'USA'),
  ('Jazz Collective', 'Act', 'Chicago', 'IL', 'USA'),
  ('The Acoustic Sessions', 'Act', 'Austin', 'TX', 'USA'),
  ('Symphony Orchestra', 'Act', 'Boston', 'MA', 'USA'),
  ('Rock Revolution', 'Act', 'Seattle', 'WA', 'USA'),
  ('Country Roads Trio', 'Act', 'Nashville', 'TN', 'USA'),
  ('The Blues Brothers Tribute', 'Act', 'Chicago', 'IL', 'USA'),
  ('Classical Ensemble', 'Act', 'Philadelphia', 'PA', 'USA');

-- Sample Production/Sound/Lighting Companies
INSERT INTO organizations (name, type, city, state, country, url)
VALUES 
  ('Soundwave Productions', 'Production', 'Los Angeles', 'CA', 'USA', 'https://soundwaveprod.com'),
  ('Lumina Lighting Co.', 'Lighting', 'Nashville', 'TN', 'USA', 'https://luminalighting.com'),
  ('ProStage Rentals', 'Staging', 'Chicago', 'IL', 'USA', NULL),
  ('Elite Sound Systems', 'Sound', 'New York', 'NY', 'USA', NULL),
  ('Brilliance Lighting', 'Lighting', 'Los Angeles', 'CA', 'USA', NULL);

-- Sample Staff Roles
INSERT INTO staff_roles (name)
VALUES 
  ('FOH Engineer', 'Front of House - Sound engineer managing audience-facing audio'),
  ('Monitor Engineer', 'Monitor Engineer - Manages on-stage audio for performers'),
  ('CameraOp', 'Camera Operator - Operates video cameras for live production'),
  ('Lighting Tech', 'Lighting Technician - Operates and designs lighting systems'),
  ('Lighting Operator'),
  ('Stage Manager', 'Stage Manager - Coordinates all stage activities and crew'),
   ('Rigger', 'Rigger - Installs and maintains rigging systems'),
  ('Video', 'Video Engineer - Manages video switching and routing'),
  ('Runner', 'Runner - General support and errands during production');

-- Note: To create sample gigs with participants, you'll need to:
-- 1. Get the actual organization IDs from the organizations table
-- 2. Get actual user IDs from the users table
-- 3. Run the following template, replacing the UUIDs

/*
-- Example Gig Creation (replace UUIDs with actual IDs)

-- First, create a gig
INSERT INTO gigs (title, start, "end", timezone, status, tags, created_by, updated_by)
VALUES (
  'Summer Music Festival 2025',
  '2025-07-15 14:00:00',
  '2025-07-15 23:00:00',
  'America/Los_Angeles',
  'Booked',
  ARRAY['Festival', 'Outdoor', 'Multi-Day'],
  '<your-user-id>',  -- Replace with actual user ID
  '<your-user-id>'   -- Replace with actual user ID
)
RETURNING id;  -- Note this gig ID for the next steps

-- Add financial records (replace <gig-id>, <org-id>, <your-user-id>)
INSERT INTO gig_financials (gig_id, organization_id, amount, date, type, category, created_by)
VALUES 
  ('<gig-id>', '<org-id>', 25000.00, '2025-07-15', 'Payment Received', 'Production', '<your-user-id>');

-- Add participants to the gig (replace <gig-id>, <production-org-id>, <venue-org-id>, <act-org-id>)
INSERT INTO gig_participants (gig_id, organization_id, role, notes)
VALUES 
  ('<gig-id>', '<production-org-id>', 'Production', NULL),
  ('<gig-id>', '<venue-org-id>', 'Venue', NULL),
  ('<gig-id>', '<act-org-id>', 'Act', NULL);

-- Add staff slots (replace <gig-id>, <org-id>, <staff-role-id>)
INSERT INTO gig_staff_slots (gig_id, organization_id, staff_role_id, required_count, notes)
VALUES 
  ('<gig-id>', '<org-id>', '<foh-engineer-role-id>', 1, NULL),
  ('<gig-id>', '<org-id>', '<monitor-engineer-role-id>', 1, NULL),
  ('<gig-id>', '<org-id>', '<lighting-designer-role-id>', 1, NULL)
RETURNING id;  -- Note these slot IDs for assignments

-- Add staff assignments (replace <slot-id>, <user-id>)
INSERT INTO gig_staff_assignments (slot_id, user_id, status, rate, fee, notes)
VALUES 
  ('<slot-id>', '<user-id>', 'Confirmed', 75.00, NULL, NULL);
*/

-- To get IDs for reference:
-- SELECT id, name FROM organizations WHERE type = 'Venue';
-- SELECT id, name FROM organizations WHERE type = 'Act';
-- SELECT id, name FROM organizations WHERE type = 'Production';
-- SELECT id, name FROM staff_roles;
-- SELECT id, email FROM users;
