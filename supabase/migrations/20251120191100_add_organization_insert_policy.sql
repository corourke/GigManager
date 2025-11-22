-- Add INSERT policy for organizations
-- This allows authenticated users to create organizations (e.g., acts/venues during CSV import)
-- The user creating the organization will automatically become an Admin member

CREATE POLICY "Authenticated users can create organizations" ON organizations
  FOR INSERT TO authenticated
  WITH CHECK (true);

