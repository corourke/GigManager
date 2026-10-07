-- =============================================================================
-- GigWrangler demo-data seed (for user-guide screenshots)
--
-- DEV ONLY. Run it with scripts/seed-demo.sh, which refuses any Supabase
-- project other than the development one (qcrzwsazasaojqoqxwnr).
--
-- Idempotent: step 1 deletes every row belonging to the demo organizations and
-- demo users (all identified by fixed UUIDs of the form
-- de000000-0000-4000-8000-<kind:4><n:8>), step 2 inserts fresh data. Dates are
-- relative to today, so a re-run always produces a current-looking calendar.
-- Rows that do not carry a demo UUID are never touched.
--
-- ID kinds (see pg_temp.d below):
--   0001 organization    0002 user           0003 gig            0004 asset
--   0005 kit             0006 purchase row   0007 gig_financial  0008 staff slot
--   0009 staff assign    0010 gig participant
--
-- Demo logins (all password DemoPass!2026):
--   demo-admin@gigwrangler.test    Admin
--   demo-manager@gigwrangler.test  Manager
--   demo-staff@gigwrangler.test    Staff
-- =============================================================================

BEGIN;

-- Deterministic demo UUID: d(kind, n) -> de000000-0000-4000-8000-<kind:4><n:8>
CREATE FUNCTION pg_temp.d(kind int, n int) RETURNS uuid LANGUAGE sql IMMUTABLE AS $$
  SELECT ('de000000-0000-4000-8000-' || lpad(kind::text, 4, '0') || lpad(n::text, 8, '0'))::uuid
$$;

-- -----------------------------------------------------------------------------
-- 1. CLEAN: remove everything demo (children before parents)
-- -----------------------------------------------------------------------------
DELETE FROM public.activity_log
 WHERE organization_id::text LIKE 'de000000-0000-4000-8000-%'
    OR actor_id::text        LIKE 'de000000-0000-4000-8000-%'
    OR gig_id::text          LIKE 'de000000-0000-4000-8000-%';
DELETE FROM public.ai_scan_usage
 WHERE organization_id::text LIKE 'de000000-0000-4000-8000-%'
    OR user_id::text         LIKE 'de000000-0000-4000-8000-%';
-- Purchase lines before headers, and all purchases before assets, so the
-- "depreciated line must keep its equipment record" check never sees a half-delete.
DELETE FROM public.purchases
 WHERE organization_id::text LIKE 'de000000-0000-4000-8000-%' AND row_type <> 'header';
DELETE FROM public.purchases
 WHERE organization_id::text LIKE 'de000000-0000-4000-8000-%';
-- Gigs cascade to participants, schedule, slots, assignments, kit assignments,
-- financials, participant contacts, inventory tracking.
DELETE FROM public.gigs WHERE id::text LIKE 'de000000-0000-4000-8000-%';
-- Organizations cascade to members, assets, kits (and components), categories,
-- attachments, invitations, access requests, tax years.
DELETE FROM public.organizations WHERE id::text LIKE 'de000000-0000-4000-8000-%';
DELETE FROM public.users WHERE id::text LIKE 'de000000-0000-4000-8000-%';
DELETE FROM auth.identities WHERE user_id::text LIKE 'de000000-0000-4000-8000-%';
DELETE FROM auth.users WHERE id::text LIKE 'de000000-0000-4000-8000-%';

-- -----------------------------------------------------------------------------
-- 2. ORGANIZATIONS
--    1 Demo Sound & Lighting (the primary, "our" org)  2-6 partner orgs
-- -----------------------------------------------------------------------------
INSERT INTO public.organizations
  (id, name, roles, url, phone_number, address_line1, city, state, postal_code, country, description, claimed)
VALUES
  (pg_temp.d(1,1), 'Demo Sound & Lighting', ARRAY['Production','Sound','Lighting']::organization_role[],
     'https://demo-sound-lighting.example', '(415) 555-0100', '1200 Foundry Way', 'Oakland', 'CA', '94607', 'US',
     'Full-service sound, lighting and staging for concerts, festivals and corporate events.', true),
  (pg_temp.d(1,2), 'Demo Harborlight Pavilion', ARRAY['Venue']::organization_role[],
     'https://demo-harborlight.example', '(415) 555-0142', '88 Pier Road', 'San Francisco', 'CA', '94111', 'US',
     'Waterfront pavilion with a 1,800-capacity main hall.', false),
  (pg_temp.d(1,3), 'Demo Cedar Hall', ARRAY['Venue']::organization_role[],
     'https://demo-cedar-hall.example', '(510) 555-0177', '417 Cedar Street', 'Berkeley', 'CA', '94704', 'US',
     'Historic 600-seat theater and listening room.', false),
  (pg_temp.d(1,4), 'Demo Neon Orchard', ARRAY['Act']::organization_role[],
     'https://demo-neon-orchard.example', '(510) 555-0119', NULL, 'Oakland', 'CA', '94612', 'US',
     'Five-piece indie pop band.', false),
  (pg_temp.d(1,5), 'Demo Paper Lanterns', ARRAY['Act']::organization_role[],
     NULL, '(415) 555-0163', NULL, 'San Rafael', 'CA', '94901', 'US',
     'Acoustic folk trio.', false),
  (pg_temp.d(1,6), 'Demo Brightwave Events', ARRAY['Agency']::organization_role[],
     'https://demo-brightwave.example', '(415) 555-0155', '350 Market Plaza, Suite 900', 'San Francisco', 'CA', '94105', 'US',
     'Corporate and festival event agency (our main client).', false);

-- -----------------------------------------------------------------------------
-- 3. USERS
--    3 logins (auth.users + auth.identities + public.users), plus no-login
--    contacts (public.users with user_status 'contact', no auth row).
-- -----------------------------------------------------------------------------
INSERT INTO auth.users
  (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
   confirmation_token, recovery_token, email_change_token_new, email_change,
   email_change_token_current, phone_change, phone_change_token, reauthentication_token,
   raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at,
   email_change_confirm_status, is_sso_user, is_anonymous)
SELECT '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
       crypt('DemoPass!2026', gen_salt('bf')), now(),
       '', '', '', '', '', '', '', '',
       '{"provider":"email","providers":["email"]}'::jsonb,
       jsonb_build_object('first_name', u.first_name, 'last_name', u.last_name, 'email_verified', true),
       false, now(), now(), 0, false, false
  FROM (VALUES
    (pg_temp.d(2,1), 'demo-admin@gigwrangler.test',   'Jordan', 'Hale'),
    (pg_temp.d(2,2), 'demo-manager@gigwrangler.test', 'Morgan', 'Reyes'),
    (pg_temp.d(2,3), 'demo-staff@gigwrangler.test',   'Casey',  'Lindqvist')
  ) AS u(id, email, first_name, last_name);

INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
SELECT au.id::text, au.id,
       jsonb_build_object('sub', au.id::text, 'email', au.email, 'email_verified', true, 'phone_verified', false),
       'email', now(), now(), now()
  FROM auth.users au
 WHERE au.id::text LIKE 'de000000-0000-4000-8000-%';

INSERT INTO public.users
  (id, email, first_name, last_name, phone, avatar_url, address_line1, address_line2, city, state,
   postal_code, country, user_status, timezone, platform_moderator)
VALUES
  -- logins
  (pg_temp.d(2,1),  'demo-admin@gigwrangler.test',   'Jordan', 'Hale',      '(415) 555-0101', '', '1200 Foundry Way', '', 'Oakland', 'CA', '94607', 'US', 'active', 'America/Los_Angeles', false),
  (pg_temp.d(2,2),  'demo-manager@gigwrangler.test', 'Morgan', 'Reyes',     '(415) 555-0102', '', '', '', 'Oakland', 'CA', '94609', 'US', 'active', 'America/Los_Angeles', false),
  (pg_temp.d(2,3),  'demo-staff@gigwrangler.test',   'Casey',  'Lindqvist', '(415) 555-0103', '', '', '', 'Alameda', 'CA', '94501', 'US', 'active', 'America/Los_Angeles', false),
  -- crew without logins (Demo Sound & Lighting)
  (pg_temp.d(2,11), 'riley.okafor@demo-crew.example', 'Riley', 'Okafor',    '(415) 555-0111', '', '', '', 'Oakland',  'CA', '94606', 'US', 'contact', 'America/Los_Angeles', false),
  (pg_temp.d(2,12), 'devon.park@demo-crew.example',   'Devon', 'Park',      '(510) 555-0112', '', '', '', 'Berkeley', 'CA', '94703', 'US', 'contact', 'America/Los_Angeles', false),
  (pg_temp.d(2,13), NULL,                             'Sam',   'Whitfield', '(510) 555-0113', '', '', '', 'Oakland',  'CA', '94610', 'US', 'contact', 'America/Los_Angeles', false),
  (pg_temp.d(2,14), 'priya.nair@demo-crew.example',   'Priya', 'Nair',      '(415) 555-0114', '', '', '', 'San Francisco', 'CA', '94110', 'US', 'contact', 'America/Los_Angeles', false),
  -- partner-org contacts
  (pg_temp.d(2,15), 'elena.costa@demo-harborlight.example', 'Elena', 'Costa',  '(415) 555-0142', '', '', '', 'San Francisco', 'CA', '94111', 'US', 'contact', 'America/Los_Angeles', false),
  (pg_temp.d(2,16), 'tom.becker@demo-brightwave.example',   'Tom',   'Becker', '(415) 555-0156', '', '', '', 'San Francisco', 'CA', '94105', 'US', 'contact', 'America/Los_Angeles', false),
  (pg_temp.d(2,17), 'maya.chen@demo-neon-orchard.example',  'Maya',  'Chen',   '(510) 555-0120', '', '', '', 'Oakland', 'CA', '94612', 'US', 'contact', 'America/Los_Angeles', false);

-- Memberships. Logins carry real roles; no-login contacts are Viewers with a title.
INSERT INTO public.organization_members
  (organization_id, user_id, role, default_staff_role_id, is_primary_contact, contact_title)
SELECT pg_temp.d(1, m.org), pg_temp.d(2, m.usr), m.role::user_role,
       (SELECT id FROM public.staff_roles WHERE name = m.staff_role),
       m.prim, m.title
  FROM (VALUES
    (1, 1,  'Admin',   'Stage Manager',    true,  'Owner'),
    (1, 2,  'Manager', 'Stage Manager',    false, 'Production Manager'),
    (1, 3,  'Staff',   'FOH Engineer',     false, 'Audio Engineer'),
    (1, 11, 'Viewer',  'FOH Engineer',     false, 'FOH Engineer (freelance)'),
    (1, 12, 'Viewer',  'Lighting Tech',    false, 'Lighting Designer (freelance)'),
    (1, 13, 'Viewer',  'Stage Hand',       false, 'Stagehand (freelance)'),
    (1, 14, 'Viewer',  'Monitor Engineer', false, 'Monitor Engineer (freelance)'),
    (2, 15, 'Viewer',  NULL,               true,  'Venue Manager'),
    (6, 16, 'Viewer',  NULL,               true,  'Event Producer'),
    (4, 17, 'Viewer',  NULL,               true,  'Tour Manager')
  ) AS m(org, usr, role, staff_role, prim, title);

-- -----------------------------------------------------------------------------
-- 4. CATEGORIES: copy the starter sets for the primary org, as
--    ensure_org_categories() does the first time the app needs them.
-- -----------------------------------------------------------------------------
INSERT INTO public.expense_categories (organization_id, name, schedule_c_line, sort_order, active)
SELECT pg_temp.d(1,1), name, schedule_c_line, sort_order, active
  FROM public.expense_categories WHERE organization_id IS NULL;
INSERT INTO public.equipment_categories (organization_id, name, sort_order, active)
SELECT pg_temp.d(1,1), name, sort_order, active
  FROM public.equipment_categories WHERE organization_id IS NULL;

-- -----------------------------------------------------------------------------
-- 5. GIGS (about 2 months back to 3 months ahead of today)
--    off = days from today, loadin/show = local clock hour (America/Los_Angeles)
-- -----------------------------------------------------------------------------
CREATE TEMP TABLE _g ON COMMIT DROP AS
SELECT * FROM (VALUES
  (1,  'Harborlight Summer Wrap Party',        'Settled',   -58, 15.0, 19.0, ARRAY['Corporate','Outdoor'],  'End-of-season party on the pavilion terrace. Full band, DJ after.'),
  (2,  'Neon Orchard Album Release Show',      'Settled',   -49, 16.0, 20.0, ARRAY['Concert'],              'Sold-out album release. Band brings their own lighting designer.'),
  (3,  'Brightwave Corporate Kickoff',         'Settled',   -41, 12.0, 18.0, ARRAY['Corporate'],            'Keynotes and a networking reception. Playback from laptop at FOH.'),
  (4,  'Paper Lanterns Acoustic Night',        'Completed', -28, 16.0, 19.5, ARRAY['Concert'],              'Seated listening-room show. Keep stage volume low.'),
  (5,  'Fall Food & Wine Festival Main Stage', 'Completed', -14, 11.0, 17.0, ARRAY['Festival','Outdoor'],   'Two acts on the main stage. Rental truck for the load.'),
  (6,  'Cedar Hall Open Mic Series',           'Cancelled',  -9, 16.0, 19.0, ARRAY['Concert'],              'Cancelled by the venue (water damage in the green room).'),
  (7,  'Harvest Gala Dinner & Dance',          'Booked',      6, 12.0, 18.0, ARRAY['Corporate','Gala'],     'Plated dinner, then a 90-minute set. Tom is the day-of contact.'),
  (8,  'Paper Lanterns Winter Tour Kickoff',   'Booked',     19, 16.0, 20.0, ARRAY['Concert'],              'First night of the winter run.'),
  (9,  'Holiday Lights Concert',               'Booked',     33, 13.0, 19.0, ARRAY['Concert','Holiday'],    'Ticketed holiday show with a lighting package.'),
  (10, 'New Years Eve Countdown Ball',         'Proposed',   85, 12.0, 21.0, ARRAY['Gala','Holiday'],       'Awaiting client sign-off on the proposal.'),
  (11, 'Spring Kickoff Block Party',           'DateHold',   74, 10.0, 14.0, ARRAY['Outdoor'],              'Holding the date while the city permit is pending.'),
  (12, 'Brightwave Annual Summit',             'Proposed',   90,  5.0, 10.0, ARRAY['Corporate'],            'Two-day summit, day one only quoted so far.')
) AS t(n, title, status, off, loadin, show, tags, notes);

INSERT INTO public.gigs (id, title, status, tags, start, "end", timezone, notes, created_by, updated_by)
SELECT pg_temp.d(3, g.n), g.title, g.status::gig_status, g.tags,
       ((current_date + g.off) + interval '1 hour' * g.loadin) AT TIME ZONE 'America/Los_Angeles',
       ((current_date + g.off) + interval '1 hour' * (g.show + 4)) AT TIME ZONE 'America/Los_Angeles',
       'America/Los_Angeles', g.notes, pg_temp.d(2,1), pg_temp.d(2,1)
  FROM _g g;

-- Participants: (gig, slot k, org, role, is_client). Our org is on every gig.
INSERT INTO public.gig_participants (id, gig_id, organization_id, role, is_client)
SELECT pg_temp.d(10, p.g * 10 + p.k), pg_temp.d(3, p.g), pg_temp.d(1, p.org), p.role::organization_role, p.cl
  FROM (VALUES
    (1,1,2,'Venue',false),(1,2,4,'Act',false),(1,3,6,'Agency',true),(1,5,1,'Sound',false),
    (2,1,3,'Venue',false),(2,2,4,'Act',true),(2,5,1,'Sound',false),
    (3,1,2,'Venue',false),(3,3,6,'Agency',true),(3,5,1,'Sound',false),
    (4,1,3,'Venue',false),(4,2,5,'Act',true),(4,5,1,'Sound',false),
    (5,1,2,'Venue',false),(5,2,4,'Act',false),(5,4,5,'Act',false),(5,3,6,'Agency',true),(5,5,1,'Sound',false),
    (6,1,3,'Venue',false),(6,5,1,'Sound',false),
    (7,1,2,'Venue',false),(7,2,4,'Act',false),(7,3,6,'Agency',true),(7,5,1,'Sound',false),
    (8,1,3,'Venue',false),(8,2,5,'Act',true),(8,5,1,'Sound',false),
    (9,1,2,'Venue',false),(9,2,4,'Act',false),(9,3,6,'Agency',true),(9,5,1,'Sound',false),
    (10,1,2,'Venue',false),(10,2,4,'Act',false),(10,3,6,'Agency',true),(10,5,1,'Sound',false),
    (11,1,3,'Venue',false),(11,5,1,'Sound',false),
    (12,1,2,'Venue',false),(12,3,6,'Agency',true),(12,5,1,'Sound',false)
  ) AS p(g, k, org, role, cl);

-- Day-of contacts per participating org (Elena = Harborlight, Tom = Brightwave, Maya = Neon Orchard)
INSERT INTO public.gig_participant_contacts (gig_id, organization_id, user_id, is_primary_contact, title)
SELECT gp.gig_id, gp.organization_id,
       CASE gp.organization_id WHEN pg_temp.d(1,2) THEN pg_temp.d(2,15)
                               WHEN pg_temp.d(1,6) THEN pg_temp.d(2,16)
                               ELSE pg_temp.d(2,17) END,
       true,
       CASE gp.organization_id WHEN pg_temp.d(1,2) THEN 'Venue manager'
                               WHEN pg_temp.d(1,6) THEN 'Day-of producer'
                               ELSE 'Tour manager' END
  FROM public.gig_participants gp
 WHERE gp.gig_id::text LIKE 'de000000-0000-4000-8000-%'
   AND gp.organization_id IN (pg_temp.d(1,2), pg_temp.d(1,6), pg_temp.d(1,4));

-- Schedule: load-in, act arrival (when there is an act), soundcheck, doors, set, load-out.
-- Gigs on hold or cancelled get no schedule yet.
INSERT INTO public.gig_schedule_entries (gig_id, activity_type, label, start_time, end_time, act_participant_id, sort_order, notes)
SELECT pg_temp.d(3, g.n), e.activity_type, e.label,
       ((current_date + g.off) + interval '1 hour' * e.s) AT TIME ZONE 'America/Los_Angeles',
       ((current_date + g.off) + interval '1 hour' * (e.s + e.len)) AT TIME ZONE 'America/Los_Angeles',
       CASE WHEN e.act_linked THEN (SELECT gp.id FROM public.gig_participants gp
                                     WHERE gp.gig_id = pg_temp.d(3, g.n) AND gp.role = 'Act'
                                     ORDER BY gp.id LIMIT 1) END,
       e.sort_order, e.notes
  FROM _g g
 CROSS JOIN LATERAL (VALUES
    ('Load-In',    NULL::text, g.loadin,       1.5, false, 1, 'Dock access via the service alley.'),
    ('Soundcheck', NULL,       g.show - 3.0,   1.0, true,  2, NULL),
    ('Doors',      NULL,       g.show - 1.0,   1.0, false, 3, NULL),
    ('Set',        NULL,       g.show,         1.5, true,  4, NULL),
    ('Load-Out',   NULL,       g.show + 2.0,   1.5, false, 5, 'Crew out by midnight.')
 ) AS e(activity_type, label, s, len, act_linked, sort_order, notes)
 WHERE g.status NOT IN ('DateHold','Cancelled')
   AND (e.act_linked = false OR EXISTS (SELECT 1 FROM public.gig_participants gp
                                         WHERE gp.gig_id = pg_temp.d(3, g.n) AND gp.role = 'Act'));

-- Corporate gigs without an act still get a program block instead of a set.
INSERT INTO public.gig_schedule_entries (gig_id, activity_type, label, start_time, end_time, sort_order, notes)
SELECT pg_temp.d(3, g.n), x.activity_type, x.label,
       ((current_date + g.off) + interval '1 hour' * (g.show + x.o)) AT TIME ZONE 'America/Los_Angeles',
       ((current_date + g.off) + interval '1 hour' * (g.show + x.o + x.len)) AT TIME ZONE 'America/Los_Angeles',
       x.sort_order, x.notes
  FROM _g g
 CROSS JOIN LATERAL (VALUES
    ('Soundcheck', 'Mic and playback check', -3.0, 1.0, 2, NULL::text),
    ('Set',        'Keynotes and program',    0.0, 1.5, 4, 'Two wireless handhelds on stage.')
 ) AS x(activity_type, label, o, len, sort_order, notes)
 WHERE g.status NOT IN ('DateHold','Cancelled')
   AND NOT EXISTS (SELECT 1 FROM public.gig_participants gp WHERE gp.gig_id = pg_temp.d(3, g.n) AND gp.role = 'Act');

-- -----------------------------------------------------------------------------
-- 6. STAFFING: slots (n = gig*10 + k) and assignments
--    k: 1 FOH Engineer, 2 Monitor Engineer, 3 Lighting Tech, 4 Stage Hand (needs 2), 5 Stage Manager
-- -----------------------------------------------------------------------------
INSERT INTO public.gig_staff_slots (id, gig_id, staff_role_id, organization_id, required_count, notes)
SELECT pg_temp.d(8, s.g * 10 + s.k), pg_temp.d(3, s.g),
       (SELECT id FROM public.staff_roles WHERE name = r.name), pg_temp.d(1,1),
       CASE WHEN s.k = 4 THEN 2 ELSE 1 END, NULL
  FROM (VALUES
    (1,1),(1,2),(1,3),(1,4),
    (2,1),(2,2),(2,3),(2,4),
    (3,1),(3,4),
    (4,1),(4,2),(4,4),
    (5,1),(5,2),(5,3),(5,4),(5,5),
    (7,1),(7,2),(7,3),(7,4),(7,5),
    (8,1),(8,2),(8,4),
    (9,1),(9,3),(9,4),
    (10,1),(10,2),(10,3),(10,4),
    (12,1)
  ) AS s(g, k)
  JOIN (VALUES (1,'FOH Engineer'),(2,'Monitor Engineer'),(3,'Lighting Tech'),(4,'Stage Hand'),(5,'Stage Manager')) AS r(k, name)
    ON r.k = s.k;

-- Assignments: past gigs fully confirmed; upcoming gigs a mix of Confirmed / Requested;
-- Proposed gigs are left open. Casey (the Staff login) is FOH on odd-numbered gigs.
INSERT INTO public.gig_staff_assignments (id, slot_id, user_id, status, fee, notes, assigned_at, confirmed_at)
SELECT pg_temp.d(9, a.g * 10 + a.k), pg_temp.d(8, a.g * 10 + a.k),
       pg_temp.d(2, CASE a.k WHEN 1 THEN CASE WHEN a.g % 2 = 1 THEN 3 ELSE 11 END
                             WHEN 2 THEN 14 WHEN 3 THEN 12 WHEN 4 THEN 13 ELSE 2 END),
       a.status,
       CASE a.k WHEN 1 THEN 350 WHEN 2 THEN 300 WHEN 3 THEN 275 WHEN 4 THEN 150 ELSE 325 END,
       NULL,
       ((current_date + g.off) - interval '21 days'),
       CASE WHEN a.status = 'Confirmed' THEN ((current_date + g.off) - interval '14 days') END
  FROM (VALUES
    (1,1,'Confirmed'),(1,2,'Confirmed'),(1,3,'Confirmed'),(1,4,'Confirmed'),
    (2,1,'Confirmed'),(2,2,'Confirmed'),(2,3,'Confirmed'),(2,4,'Confirmed'),
    (3,1,'Confirmed'),(3,4,'Confirmed'),
    (4,1,'Confirmed'),(4,2,'Confirmed'),(4,4,'Confirmed'),
    (5,1,'Confirmed'),(5,2,'Confirmed'),(5,3,'Confirmed'),(5,4,'Confirmed'),(5,5,'Confirmed'),
    (7,1,'Confirmed'),(7,2,'Confirmed'),(7,3,'Requested'),(7,4,'Confirmed'),(7,5,'Confirmed'),
    (8,1,'Requested'),(8,2,'Requested'),
    (9,1,'Requested'),(9,3,'Requested')
  ) AS a(g, k, status)
  JOIN _g g ON g.n = a.g;

-- -----------------------------------------------------------------------------
-- 7. EQUIPMENT: 26 assets, 4 kits (one nested), kit assignments
--    pur: 0 = bought outside the tracked invoices, 1/2 = on purchase 1/2 (see section 8)
-- -----------------------------------------------------------------------------
CREATE TEMP TABLE _a ON COMMIT DROP AS
SELECT * FROM (VALUES
  (1,  'Halden HX-12P Powered Speaker',             'Speaker, Powered, Full-Range',    'Audio',            849.00,  4, 'Stagecraft Supply Co.', 0, 'Active',      '12-inch two-way powered loudspeaker'),
  (2,  'Halden HS-18 Powered Subwoofer',            'Speaker, Powered, Subwoofer',     'Audio',           1099.00,  2, 'Stagecraft Supply Co.', 0, 'Active',      '18-inch powered subwoofer'),
  (3,  'Halden HX-8M Floor Monitor',                'Speaker, Monitor, Wedge',         'Audio',            429.00,  4, 'Stagecraft Supply Co.', 0, 'Active',      'Powered stage wedge'),
  (4,  'Quillon QM-32 Digital Mixing Console',      'Mixer, Digital',                  'Audio',           4299.00,  1, 'Stagecraft Supply Co.', 1, 'Active',      '32-channel digital console'),
  (5,  'Quillon QS-16 Digital Stage Box',           'Mixer, Stage Box',                'Audio',           1199.00,  1, 'Stagecraft Supply Co.', 1, 'Active',      '16 in / 8 out remote stage box'),
  (6,  'Quillon QM-12 Compact Digital Mixer',       'Mixer, Digital',                  'Audio',            799.00,  1, 'Stagecraft Supply Co.', 0, 'Active',      '12-channel mixer for small rooms'),
  (7,  'Tessel T58 Dynamic Vocal Microphone',       'Microphone, Dynamic, Vocal',      'Audio',             99.00,  6, 'Stagecraft Supply Co.', 1, 'Active',      NULL),
  (8,  'Tessel T57 Dynamic Instrument Microphone',  'Microphone, Dynamic, Instrument', 'Audio',             89.00,  4, 'Stagecraft Supply Co.', 0, 'Active',      NULL),
  (9,  'Tessel W2 Wireless Handheld System',        'Microphone, Wireless',            'Audio',            649.00,  2, 'Stagecraft Supply Co.', 0, 'Active',      'Dual-channel wireless with handheld transmitters'),
  (10, 'Tessel K91 Kick Drum Microphone',           'Microphone, Dynamic, Drum',       'Audio',            179.00,  1, 'Stagecraft Supply Co.', 0, 'Active',      NULL),
  (11, 'Linebacker PDI-1 Passive DI Box',           'DI Box, Passive',                 'Audio',             49.00,  8, 'Stagecraft Supply Co.', 1, 'Active',      NULL),
  (12, 'Linebacker ADI-2 Active DI Box',            'DI Box, Active',                  'Audio',            129.00,  4, 'Stagecraft Supply Co.', 0, 'Active',      NULL),
  (13, 'Fennimore LED Par 64 RGBW',                 'Light Fixture, LED Par',          'Lighting',         129.00, 12, 'Brightline Lighting',   0, 'Active',      'RGBW wash par, DMX'),
  (14, 'Fennimore Spot 150 Moving Head',            'Light Fixture, Moving Head, Spot','Lighting',         549.00,  4, 'Brightline Lighting',   0, 'Active',      '150 W LED moving head spot'),
  (15, 'Fennimore Wash Bar 8',                      'Light Fixture, LED Bar',          'Lighting',         219.00,  4, 'Brightline Lighting',   0, 'Maintenance', 'Two units have a failing DMX input'),
  (16, 'Brightforge Cue-Pro 512 Lighting Controller','Lighting Console, DMX',          'Lighting',         699.00,  1, 'Brightline Lighting',   0, 'Active',      '512-channel DMX controller'),
  (17, 'DMX Cable 5-pin, 25 ft',                    'Cable, DMX',                      'Lighting',          19.00, 12, 'Cablesmith Direct',     0, 'Active',      NULL),
  (18, 'XLR Cable, 25 ft',                          'Cable, XLR',                      'Audio',             14.00, 30, 'Cablesmith Direct',     2, 'Active',      NULL),
  (19, 'XLR Cable, 50 ft',                          'Cable, XLR',                      'Audio',             22.00, 10, 'Cablesmith Direct',     2, 'Active',      NULL),
  (20, 'Speakon Speaker Cable, 50 ft',              'Cable, Speaker',                  'Audio',             39.00,  8, 'Cablesmith Direct',     0, 'Active',      NULL),
  (21, 'Voltline PD-20 Power Distribution',         'Power Distribution, 20A',         'Power',            389.00,  2, 'Stagecraft Supply Co.', 0, 'Active',      NULL),
  (22, 'Edison Extension Cord, 50 ft',              'Cable, Power',                    'Power',             34.00, 10, 'Cablesmith Direct',     0, 'Active',      NULL),
  (23, 'Armorline 8U Rack Case',                    'Case, Rack, Shock-Mount',         'Cases and Bags',   189.00,  3, 'Stagecraft Supply Co.', 0, 'Active',      NULL),
  (24, 'Spanline T-10 Truss Section, 10 ft',        'Truss, Box',                      'Rigging and Truss',249.00,  8, 'Brightline Lighting',   0, 'Active',      NULL),
  (25, 'Speaker Stand, Tripod',                     'Stand, Speaker',                  'Rigging and Truss', 59.00,  6, 'Stagecraft Supply Co.', 0, 'Active',      NULL),
  (26, 'Netline 8-Port PoE Switch',                 'Network Switch',                  'Networking',       119.00,  2, 'Stagecraft Supply Co.', 0, 'Active',      NULL)
) AS t(n, model, type, category, price, qty, vendor, pur, status, descr);

-- Purchase headers first (assets reference them); totals are filled in after the lines exist.
INSERT INTO public.purchases
  (id, organization_id, row_type, purchase_date, vendor, total_inv_amount, payment_method, description, created_by, updated_by)
VALUES
  (pg_temp.d(6,1), pg_temp.d(1,1), 'header', current_date - 200, 'Stagecraft Supply Co.', 0, 'Business Visa', 'Invoice SS-20418: console, stage box, mics and DI boxes', pg_temp.d(2,1), pg_temp.d(2,1)),
  (pg_temp.d(6,2), pg_temp.d(1,1), 'header', current_date - 75,  'Cablesmith Direct',     0, 'Business Visa', 'Order CD-77231: cables and consumables',                 pg_temp.d(2,1), pg_temp.d(2,1)),
  (pg_temp.d(6,3), pg_temp.d(1,1), 'header', current_date - 14,  'Harbor Truck Rental',   0, 'Business Visa', 'Rental agreement HT-5509: festival load-in truck',       pg_temp.d(2,2), pg_temp.d(2,2));

INSERT INTO public.assets
  (id, organization_id, acquisition_date, vendor, item_cost, category, insurance_policy_added, manufacturer_model,
   type, serial_number, description, replacement_value, quantity, created_by, updated_by, tag_number, status, item_price, purchase_id)
SELECT pg_temp.d(4, a.n), pg_temp.d(1,1),
       CASE a.pur WHEN 1 THEN current_date - 200 WHEN 2 THEN current_date - 75 ELSE current_date - (260 + a.n * 23) END,
       a.vendor,
       CASE a.pur WHEN 1 THEN round(a.price * 1.0875, 2) WHEN 2 THEN round(a.price * 1.07, 2) ELSE a.price END,
       a.category, (a.price * a.qty >= 1000), a.model, a.type,
       CASE WHEN a.qty <= 2 THEN 'DSL' || lpad(a.n::text, 3, '0') || '-' || (24000 + a.n * 37)::text END,
       a.descr, round(a.price * 1.15), a.qty, pg_temp.d(2,1), pg_temp.d(2,1),
       'DSL-' || lpad(a.n::text, 4, '0'), a.status, a.price,
       CASE WHEN a.pur > 0 THEN pg_temp.d(6, a.pur) END
  FROM _a a;

-- Kits. K4 is a container holding two other kits plus loose gear (nested kit).
INSERT INTO public.kits (id, organization_id, name, category, description, tags, tag_number, rental_value, created_by, updated_by, is_container)
VALUES
  (pg_temp.d(5,1), pg_temp.d(1,1), 'FOH Console Package',           'Audio',    'Console, stage box and snake for a front-of-house position.', ARRAY['FOH'],            'KIT-001', 650.00,  pg_temp.d(2,1), pg_temp.d(2,1), false),
  (pg_temp.d(5,2), pg_temp.d(1,1), 'Main PA: 4 Top / 2 Sub',        'Audio',    'Four powered tops, two subs, cables and stands.',            ARRAY['PA'],             'KIT-002', 1100.00, pg_temp.d(2,1), pg_temp.d(2,1), false),
  (pg_temp.d(5,3), pg_temp.d(1,1), 'Club Lighting Package',         'Lighting', 'LED pars, moving heads, controller and truss.',              ARRAY['Lighting'],       'KIT-003', 900.00,  pg_temp.d(2,1), pg_temp.d(2,1), false),
  (pg_temp.d(5,4), pg_temp.d(1,1), 'Full Band Sound Package',       'Audio',    'FOH package, main PA, monitors, mics and DIs: everything for a five-piece band.', ARRAY['Band','Sound'], 'KIT-004', 2200.00, pg_temp.d(2,1), pg_temp.d(2,1), true);

INSERT INTO public.kit_components (kit_id, asset_id, child_kit_id, quantity, notes)
SELECT pg_temp.d(5, c.kit), CASE WHEN c.asset IS NOT NULL THEN pg_temp.d(4, c.asset) END,
       CASE WHEN c.child IS NOT NULL THEN pg_temp.d(5, c.child) END, c.qty, c.notes
  FROM (VALUES
    -- K1 FOH Console Package
    (1, 4,    NULL::int, 1, NULL::text), (1, 5, NULL, 1, NULL), (1, 19, NULL, 2, 'Console to stage box'),
    (1, 23,   NULL, 1, NULL), (1, 26, NULL, 1, NULL),
    -- K2 Main PA
    (2, 1,    NULL, 4, NULL), (2, 2, NULL, 2, NULL), (2, 20, NULL, 6, NULL), (2, 25, NULL, 4, NULL), (2, 21, NULL, 1, NULL),
    -- K3 Club Lighting
    (3, 13,   NULL, 8, NULL), (3, 14, NULL, 2, NULL), (3, 16, NULL, 1, NULL), (3, 17, NULL, 6, NULL),
    (3, 24,   NULL, 4, NULL), (3, 22, NULL, 4, NULL),
    -- K4 Full Band Sound Package (nested: contains K1 and K2)
    (4, NULL, 1, 1, NULL), (4, NULL, 2, 1, NULL),
    (4, 3,    NULL, 4, 'Four monitor mixes'), (4, 7, NULL, 4, NULL), (4, 8, NULL, 2, NULL), (4, 10, NULL, 1, NULL),
    (4, 11,   NULL, 6, NULL), (4, 12, NULL, 2, NULL), (4, 18, NULL, 16, NULL)
  ) AS c(kit, asset, child, qty, notes);

INSERT INTO public.gig_kit_assignments (organization_id, gig_id, kit_id, notes, assigned_by)
SELECT pg_temp.d(1,1), pg_temp.d(3, k.g), pg_temp.d(5, k.kit), NULL, pg_temp.d(2,2)
  FROM (VALUES
    (1,4),(2,4),(4,4),(5,4),(7,4),(8,4),(9,4),(10,4),   -- full band sound
    (5,3),(7,3),(9,3),(10,3),                           -- lighting
    (3,2),(12,2)                                        -- PA only (corporate)
  ) AS k(g, kit);

-- -----------------------------------------------------------------------------
-- 8. PURCHASES: lines for the assets above plus a few expensed lines
--    Live dev schema uses row_type header|item|asset (the 'line' rename in
--    migration 20261012 is not applied there yet).
-- -----------------------------------------------------------------------------
-- Equipment lines: purchase 1 is depreciated (7-year), purchase 2 is expensed.
INSERT INTO public.purchases
  (id, organization_id, parent_id, row_type, purchase_date, vendor, payment_method, line_amount, line_cost, quantity,
   item_price, item_cost, description, category, created_by, updated_by, asset_id, tax_treatment, recovery_period)
SELECT pg_temp.d(6, 100 + a.n), pg_temp.d(1,1), pg_temp.d(6, a.pur), 'asset',
       h.purchase_date, h.vendor, h.payment_method,
       a.price * a.qty, round(a.price * CASE a.pur WHEN 1 THEN 1.0875 ELSE 1.07 END, 2) * a.qty, a.qty,
       a.price, round(a.price * CASE a.pur WHEN 1 THEN 1.0875 ELSE 1.07 END, 2),
       a.model, a.category, pg_temp.d(2,1), pg_temp.d(2,1), pg_temp.d(4, a.n),
       CASE a.pur WHEN 1 THEN 'depreciate' ELSE 'expense' END,
       CASE a.pur WHEN 1 THEN 7 END
  FROM _a a
  JOIN public.purchases h ON h.id = pg_temp.d(6, a.pur)
 WHERE a.pur > 0;

-- Expensed lines: gaffer tape (gig 4) and batteries (no gig) on purchase 2; truck rental (gig 5) on purchase 3.
INSERT INTO public.purchases
  (id, organization_id, parent_id, gig_id, row_type, purchase_date, vendor, payment_method, line_amount, line_cost, quantity,
   item_price, item_cost, description, category, created_by, updated_by, tax_treatment)
SELECT pg_temp.d(6, l.n), pg_temp.d(1,1), pg_temp.d(6, l.hdr), CASE WHEN l.gig IS NOT NULL THEN pg_temp.d(3, l.gig) END,
       'item', h.purchase_date, h.vendor, h.payment_method,
       l.price * l.qty, round(l.price * l.factor, 2) * l.qty, l.qty, l.price, round(l.price * l.factor, 2),
       l.descr, l.category, pg_temp.d(2, l.usr), pg_temp.d(2, l.usr), 'expense'
  FROM (VALUES
    (201, 2, 4,        14.99, 6, 1.07, 'Gaffer tape, 2 in, black',      'Expendables and supplies',  1),
    (202, 2, NULL::int, 8.25, 4, 1.07, 'AA batteries, 24-pack',         'Expendables and supplies',  1),
    (301, 3, 5,       172.00, 1, 1.10, 'Cargo truck rental, 1 day',     'Vehicle and truck rental',  2)
  ) AS l(n, hdr, gig, price, qty, factor, descr, category, usr)
  JOIN public.purchases h ON h.id = pg_temp.d(6, l.hdr);

-- Invoice totals = sum of the burdened line costs.
UPDATE public.purchases h
   SET total_inv_amount = (SELECT sum(l.line_cost) FROM public.purchases l WHERE l.parent_id = h.id)
 WHERE h.id IN (pg_temp.d(6,1), pg_temp.d(6,2), pg_temp.d(6,3));

-- -----------------------------------------------------------------------------
-- 9. GIG LEDGER (gig_financials). amount_settled = amount on paid rows.
--    cols: n, gig, dir, stage, amount, date_off, due_off, paid_off, category,
--          description, counterparty org, external name, reference, mileage
-- -----------------------------------------------------------------------------
INSERT INTO public.gig_financials
  (id, gig_id, organization_id, amount, date, notes, created_by, category, reference_number, counterparty_id,
   external_entity_name, currency, description, due_date, paid_at, direction, stage, amount_settled, mileage)
SELECT pg_temp.d(7, f.n), pg_temp.d(3, f.g), pg_temp.d(1,1), f.amount, current_date + f.date_off, NULL, pg_temp.d(2,1),
       f.category::fin_category, f.ref, CASE WHEN f.cp IS NOT NULL THEN pg_temp.d(1, f.cp) END,
       f.ext, 'USD', f.descr,
       CASE WHEN f.due_off IS NOT NULL THEN current_date + f.due_off END,
       CASE WHEN f.paid_off IS NOT NULL THEN (current_date + f.paid_off) + interval '14 hours' END,
       f.dir::fin_direction, f.stage::fin_stage,
       CASE WHEN f.stage = 'paid' THEN f.amount END, f.mileage
  FROM (VALUES
    -- Gig 1 (Settled): fee in two payments, fuel
    (1,  1, 'in',  'paid',      2400.00, -90, -75, -85, NULL::text, 'Deposit (50%)',                 6,    NULL::text, 'INV-2026-0388', NULL::numeric),
    (2,  1, 'in',  'paid',      2400.00, -58, -28, -40, NULL,       'Balance (50%)',                 6,    NULL,       'INV-2026-0389', NULL),
    (3,  1, 'out', 'paid',       118.40, -58, NULL, -58, 'Car and truck expenses', 'Van fuel and parking', NULL, NULL, NULL, NULL),
    -- Gig 2 (Settled): fee, rental
    (4,  2, 'in',  'paid',      1600.00, -75, -60, -70, NULL,       'Deposit (50%)',                 4,    NULL,       'INV-2026-0394', NULL),
    (5,  2, 'in',  'paid',      1600.00, -49, -19, -47, NULL,       'Balance (50%)',                 4,    NULL,       'INV-2026-0395', NULL),
    (6,  2, 'out', 'paid',       220.00, -49, NULL, -45, 'Rent or lease', 'Extra wireless mic packs (2 nights)', NULL, 'Westbay Rental Depot', NULL, NULL),
    -- Gig 3 (Settled): corporate fee, mileage
    (7,  3, 'in',  'paid',      3100.00, -70, -55, -66, NULL,       'Deposit (50%)',                 6,    NULL,       'INV-2026-0401', NULL),
    (8,  3, 'in',  'paid',      3100.00, -41, -11, -38, NULL,       'Balance (50%)',                 6,    NULL,       'INV-2026-0402', NULL),
    (9,  3, 'out', 'paid',        41.54, -41, NULL, -41, 'Car and truck expenses', 'Mileage to Harborlight Pavilion', NULL, NULL, NULL, 62.0),
    -- Gig 4 (Completed): half paid, half overdue
    (10, 4, 'in',  'paid',       900.00, -50, -40, -45, NULL,       'Deposit (50%)',                 5,    NULL,       'INV-2026-0412', NULL),
    (11, 4, 'in',  'invoiced',   900.00, -28, -14, NULL, NULL,      'Balance (50%)',                 5,    NULL,       'INV-2026-0413', NULL),
    (12, 4, 'out', 'paid',        41.54, -28, NULL, -28, 'Car and truck expenses', 'Mileage to Cedar Hall', NULL, NULL, NULL, 62.0),
    -- Gig 5 (Completed): festival fee, subcontract
    (13, 5, 'in',  'paid',      4750.00, -45, -30, -32, NULL,       'Deposit (50%)',                 6,    NULL,       'INV-2026-0421', NULL),
    (14, 5, 'in',  'invoiced',  4750.00, -14,  16, NULL, NULL,      'Balance (50%)',                 6,    NULL,       'INV-2026-0422', NULL),
    (15, 5, 'out', 'contracted', 1200.00, -30,   7, NULL, 'Contract labor', 'Stage rigging crew (sub-contract)', NULL, 'Skyline Rigging Partners', NULL, NULL),
    -- Gig 6 (Cancelled)
    (16, 6, 'in',  'cancelled',  750.00, -30, NULL, NULL, NULL,     'Production fee, cancelled by venue', 3, NULL,    NULL, NULL),
    -- Gig 7 (Booked): deposit received, balance contracted, sub-contract accepted
    (17, 7, 'in',  'paid',      3900.00, -12,   3, -10, NULL,       'Deposit (50%)',                 6,    NULL,       'INV-2026-0440', NULL),
    (18, 7, 'in',  'contracted',3900.00,   6,  20, NULL, NULL,      'Balance (50%), due net-14 after the event', 6, NULL, NULL, NULL),
    (19, 7, 'out', 'accepted',   600.00,  -5, NULL, NULL, 'Contract labor', 'Truss and rigging (quoted and accepted)', NULL, 'Lumen Trussing Co.', NULL, NULL),
    -- Gig 8 (Booked): verbal agreement
    (20, 8, 'in',  'accepted',  2400.00,  -3, NULL, NULL, NULL,     'Informal agreement by email',   5,    NULL,       NULL, NULL),
    -- Gig 9 (Booked): contract out for signature
    (21, 9, 'in',  'contract_sent', 6500.00, -2, 40, NULL, NULL,    'Production fee, contract sent', 6,    NULL,       NULL, NULL),
    -- Gig 10 (Proposed): quote, plus a bid request for rental lighting
    (22, 10,'in',  'quoted',   12000.00,  -1, NULL, NULL, NULL,     'Quote for sound, lighting and crew', 6, NULL,     NULL, NULL),
    (23, 10,'out', 'requested',    NULL,  -1, NULL, NULL, 'Rent or lease', 'Bid requested: extra moving heads', NULL, 'Westbay Rental Depot', NULL, NULL),
    -- Gig 12 (Proposed)
    (24, 12,'in',  'quoted',   15000.00,   0, NULL, NULL, NULL,     'Quote, day one only',           6,    NULL,       NULL, NULL)
  ) AS f(n, g, dir, stage, amount, date_off, due_off, paid_off, category, descr, cp, ext, ref, mileage);

-- Expense rows that came from purchase lines (gig accounting only; amount mirrors the line cost).
INSERT INTO public.gig_financials
  (id, gig_id, organization_id, amount, date, created_by, category, currency, description, paid_at, direction, stage,
   amount_settled, purchase_id, external_entity_name)
SELECT pg_temp.d(7, x.n), p.gig_id, p.organization_id, p.line_cost, p.purchase_date, p.created_by, x.category::fin_category,
       'USD', p.description, p.purchase_date::timestamp + interval '14 hours', 'out', 'paid', p.line_cost, p.id, p.vendor
  FROM (VALUES (901, 201, 'Supplies'), (902, 301, 'Rent or lease')) AS x(n, line, category)
  JOIN public.purchases p ON p.id = pg_temp.d(6, x.line);

-- Staff pay for finished gigs: one ledger row per assignment, as "Finalize staff" creates.
-- Settled gigs and gig 4: paid. Gig 5: owed (invoiced, due next week).
INSERT INTO public.gig_financials
  (id, gig_id, organization_id, amount, date, created_by, category, currency, description, due_date, paid_at,
   direction, stage, amount_settled, staff_assignment_id, external_entity_name)
SELECT pg_temp.d(7, 1000 + (substring(a.id::text from 29)::int)), s.gig_id, pg_temp.d(1,1), a.fee,
       (g.start AT TIME ZONE 'America/Los_Angeles')::date, pg_temp.d(2,2), 'Contract labor'::fin_category, 'USD',
       sr.name || ': ' || u.first_name || ' ' || u.last_name,
       CASE WHEN gg.status = 'Completed' AND gg.n = 5 THEN current_date + 7 END,
       CASE WHEN NOT (gg.status = 'Completed' AND gg.n = 5)
            THEN (g.start AT TIME ZONE 'America/Los_Angeles')::date + interval '5 days' + interval '14 hours' END,
       'out',
       CASE WHEN gg.status = 'Completed' AND gg.n = 5 THEN 'invoiced' ELSE 'paid' END::fin_stage,
       CASE WHEN NOT (gg.status = 'Completed' AND gg.n = 5) THEN a.fee END,
       a.id, u.first_name || ' ' || u.last_name
  FROM public.gig_staff_assignments a
  JOIN public.gig_staff_slots s ON s.id = a.slot_id
  JOIN public.gigs g ON g.id = s.gig_id
  JOIN _g gg ON pg_temp.d(3, gg.n) = g.id
  JOIN public.staff_roles sr ON sr.id = s.staff_role_id
  JOIN public.users u ON u.id = a.user_id
 WHERE gg.status IN ('Completed','Settled');

UPDATE public.gig_staff_assignments a
   SET gig_financial_id = pg_temp.d(7, 1000 + (substring(a.id::text from 29)::int)),
       completed_at = ((current_date + g.off) + interval '1 day')
  FROM public.gig_staff_slots s
  JOIN _g g ON pg_temp.d(3, g.n) = s.gig_id
 WHERE s.id = a.slot_id AND g.status IN ('Completed','Settled');

COMMIT;

-- Summary (last statement, so the API returns it)
SELECT jsonb_pretty(jsonb_build_object(
  'organizations',        (SELECT count(*) FROM public.organizations WHERE id::text LIKE 'de000000-0000-4000-8000-%'),
  'auth_users',           (SELECT count(*) FROM auth.users WHERE id::text LIKE 'de000000-0000-4000-8000-%'),
  'auth_identities',      (SELECT count(*) FROM auth.identities WHERE user_id::text LIKE 'de000000-0000-4000-8000-%'),
  'users_login',          (SELECT count(*) FROM public.users WHERE id::text LIKE 'de000000-0000-4000-8000-%' AND user_status = 'active'),
  'users_contact',        (SELECT count(*) FROM public.users WHERE id::text LIKE 'de000000-0000-4000-8000-%' AND user_status = 'contact'),
  'organization_members', (SELECT count(*) FROM public.organization_members WHERE organization_id::text LIKE 'de000000-0000-4000-8000-%'),
  'expense_categories',   (SELECT count(*) FROM public.expense_categories WHERE organization_id::text LIKE 'de000000-0000-4000-8000-%'),
  'equipment_categories', (SELECT count(*) FROM public.equipment_categories WHERE organization_id::text LIKE 'de000000-0000-4000-8000-%'),
  'gigs',                 (SELECT count(*) FROM public.gigs WHERE id::text LIKE 'de000000-0000-4000-8000-%'),
  'gig_participants',     (SELECT count(*) FROM public.gig_participants WHERE gig_id::text LIKE 'de000000-0000-4000-8000-%'),
  'gig_participant_contacts', (SELECT count(*) FROM public.gig_participant_contacts WHERE gig_id::text LIKE 'de000000-0000-4000-8000-%'),
  'gig_schedule_entries', (SELECT count(*) FROM public.gig_schedule_entries WHERE gig_id::text LIKE 'de000000-0000-4000-8000-%'),
  'gig_staff_slots',      (SELECT count(*) FROM public.gig_staff_slots WHERE gig_id::text LIKE 'de000000-0000-4000-8000-%'),
  'gig_staff_assignments',(SELECT count(*) FROM public.gig_staff_assignments WHERE id::text LIKE 'de000000-0000-4000-8000-%'),
  'assets',               (SELECT count(*) FROM public.assets WHERE organization_id::text LIKE 'de000000-0000-4000-8000-%'),
  'kits',                 (SELECT count(*) FROM public.kits WHERE organization_id::text LIKE 'de000000-0000-4000-8000-%'),
  'kit_components',       (SELECT count(*) FROM public.kit_components WHERE kit_id::text LIKE 'de000000-0000-4000-8000-%'),
  'gig_kit_assignments',  (SELECT count(*) FROM public.gig_kit_assignments WHERE organization_id::text LIKE 'de000000-0000-4000-8000-%'),
  'purchases_headers',    (SELECT count(*) FROM public.purchases WHERE organization_id::text LIKE 'de000000-0000-4000-8000-%' AND row_type = 'header'),
  'purchases_lines',      (SELECT count(*) FROM public.purchases WHERE organization_id::text LIKE 'de000000-0000-4000-8000-%' AND row_type <> 'header'),
  'gig_financials',       (SELECT count(*) FROM public.gig_financials WHERE organization_id::text LIKE 'de000000-0000-4000-8000-%')
)) AS counts;
