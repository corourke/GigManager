-- Seed default staff roles. public.staff_roles was empty in production, which
-- blocks the "Add Staff" role dropdown in GigStaffSlotsSection (it only reads
-- existing roles and has no way to create a new one from the UI).
INSERT INTO "public"."staff_roles" ("name", "description") VALUES
    ('FOH Engineer', 'Front of House - Sound engineer managing audience-facing audio'),
    ('Monitor Engineer', 'Monitor Engineer - Manages on-stage audio for performers'),
    ('Lighting Tech', 'Lighting Technician - Operates and designs lighting systems'),
    ('Lighting Operator', NULL),
    ('Stage Manager', 'Stage Manager - Coordinates all stage activities and crew'),
    ('Stage Hand', NULL),
    ('Rigger', 'Rigger - Installs and maintains rigging systems'),
    ('Video', 'Video Engineer - Manages video switching and routing'),
    ('CameraOp', 'Camera Operator - Operates video cameras for live production'),
    ('Runner', 'Runner - General support and errands during production')
ON CONFLICT (name) DO NOTHING;
