-- #175: gigs before they had an owner organization. One gig per backfill rule.
-- Users ...0a1 (Admin of A and B), ...0a2 (Admin of A), ...0a3 (Staff of B), ...0a4 (no org).
INSERT INTO auth.users (id, email) SELECT ('00000000-0000-0000-0000-0000000000a' || n)::uuid, 'conv' || n || '@example.test'
FROM unnest(ARRAY['1', '2', '3', '4']) n;
INSERT INTO public.users (id, email, first_name, last_name) SELECT id, email, 'Conv', 'Test' FROM auth.users;
INSERT INTO organizations (id, name, roles) VALUES
  ('00000000-0000-0000-0000-00000000000a', 'Org A', '{Production}'),
  ('00000000-0000-0000-0000-00000000000b', 'Org B', '{Sound}'),
  ('00000000-0000-0000-0000-00000000000c', 'Org C', '{Venue}');
INSERT INTO organization_members (organization_id, user_id, role) VALUES
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'Admin'),
  ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000a1', 'Admin'),
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a2', 'Admin'),
  ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000a3', 'Staff');

-- 01: created in B per its activity entry, by someone who is Admin of both A and B.
-- 02: no activity entry; the creator manages only A of the participants.
-- 03: no activity entry; the creator is only Staff of B.
-- 04: the creator belongs to no participant; C is the only participant.
-- 05: a child of 02 with A and C on it: it takes its parent's owner, A.
INSERT INTO gigs (id, title, status, start, "end", timezone, created_by, updated_by, parent_gig_id, hierarchy_depth)
SELECT ('00000000-0000-0000-0000-0000000000' || g.n)::uuid, g.title, 'Booked', now(), now() + interval '4 hours', 'UTC',
       ('00000000-0000-0000-0000-0000000000a' || g.creator)::uuid, ('00000000-0000-0000-0000-0000000000a' || g.creator)::uuid,
       CASE WHEN g.n = '05' THEN '00000000-0000-0000-0000-000000000002'::uuid END, CASE WHEN g.n = '05' THEN 1 ELSE 0 END
FROM (VALUES ('01', 'By activity', '1'), ('02', 'By managing creator', '2'), ('03', 'By member creator', '3'),
             ('04', 'Only participant', '4'), ('05', 'Child', '2')) g(n, title, creator);
INSERT INTO gig_participants (gig_id, organization_id, role) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Production'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000b', 'Sound'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', 'Production'),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000b', 'Sound'),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000b', 'Sound'),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000c', 'Venue'),
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-00000000000c', 'Venue'),
  ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-00000000000c', 'Venue'),
  ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-00000000000a', 'Production');
INSERT INTO activity_log (organization_id, actor_id, event_type, entity_type, entity_id, gig_id) VALUES
  ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000a1', 'gig.created', 'gig',
   '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001');
