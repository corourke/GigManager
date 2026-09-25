-- Two organizations sharing one gig, plus a third org with no part in it.
--   Org A (Production) and Org B (Sound) both participate in gig G.
--   Org C is unrelated.
-- Users: <org>_admin / _manager / _staff / _viewer, by organization_members.role.
-- Ids are fixed so tests can refer to them by name via rls_test.u('a_admin').
CREATE TABLE rls_test.ids (name text PRIMARY KEY, id uuid NOT NULL);
CREATE FUNCTION rls_test.u(p text) RETURNS uuid LANGUAGE sql STABLE AS
  $$ SELECT id FROM rls_test.ids WHERE name = p $$;

INSERT INTO rls_test.ids VALUES
  ('org_a', '00000000-0000-0000-0000-00000000000a'),
  ('org_b', '00000000-0000-0000-0000-00000000000b'),
  ('org_c', '00000000-0000-0000-0000-00000000000c'),
  ('gig',   '00000000-0000-0000-0000-0000000000f1'),
  ('role',  '00000000-0000-0000-0000-0000000000e1'),
  ('kit_a', '00000000-0000-0000-0000-0000000000ca'),
  ('kit_b', '00000000-0000-0000-0000-0000000000cb');
INSERT INTO rls_test.ids
SELECT o || '_' || r, ('00000000-0000-0000-00' || lpad(to_hex(row_number() OVER ()::int), 2, '0') || '-000000000000')::uuid
FROM unnest(ARRAY['a','b','c']) o, unnest(ARRAY['admin','manager','staff','viewer']) r;

INSERT INTO auth.users (id, email) SELECT id, name || '@example.test' FROM rls_test.ids WHERE name ~ '_(admin|manager|staff|viewer)$';
INSERT INTO public.users (id, email, first_name, last_name)
  SELECT id, name || '@example.test', name, 'Test' FROM rls_test.ids WHERE name ~ '_(admin|manager|staff|viewer)$';
INSERT INTO organizations (id, name, roles) VALUES
  (rls_test.u('org_a'), 'Org A', '{Production}'),
  (rls_test.u('org_b'), 'Org B', '{Sound}'),
  (rls_test.u('org_c'), 'Org C', '{Lighting}');
INSERT INTO organization_members (organization_id, user_id, role)
SELECT rls_test.u('org_' || split_part(name, '_', 1)), id, initcap(split_part(name, '_', 2))::user_role
FROM rls_test.ids WHERE name ~ '_(admin|manager|staff|viewer)$';

INSERT INTO gigs (id, title, status, start, "end", timezone, created_by, updated_by)
VALUES (rls_test.u('gig'), 'Shared gig', (enum_range(NULL::gig_status))[1], now(), now() + interval '4 hours',
        'UTC', rls_test.u('a_admin'), rls_test.u('a_admin'));
INSERT INTO gig_participants (gig_id, organization_id, role) VALUES
  (rls_test.u('gig'), rls_test.u('org_a'), 'Production'),
  (rls_test.u('gig'), rls_test.u('org_b'), 'Sound');

INSERT INTO staff_roles (id, name) VALUES (rls_test.u('role'), 'RLS test role');
INSERT INTO kits (id, organization_id, name, created_by, updated_by) VALUES
  (rls_test.u('kit_a'), rls_test.u('org_a'), 'A kit', rls_test.u('a_admin'), rls_test.u('a_admin')),
  (rls_test.u('kit_b'), rls_test.u('org_b'), 'B kit', rls_test.u('b_admin'), rls_test.u('b_admin'));
