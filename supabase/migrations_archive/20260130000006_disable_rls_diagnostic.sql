-- DIAGNOSTIC Migration: Disable RLS on users and organization_members
-- Created at: 2026-01-30

-- This is for diagnostic purposes to confirm if RLS is the cause of the hang
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY;
