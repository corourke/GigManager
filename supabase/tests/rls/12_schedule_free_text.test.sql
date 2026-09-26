-- #12: a schedule item's type is free text. The UI suggests defaults (Load-In,
-- Act Arrival, Soundcheck, Doors, Set, Load-Out, Return) and accepts anything
-- else; the database must not restrict it to a fixed list.
INSERT INTO rls_test.ids VALUES ('entry', '00000000-0000-0000-0000-0000000000d1');

SELECT rls_test.expect('schedule: A admin adds an "Act Arrival" item', rls_test.try(rls_test.u('a_admin'), format(
  $q$INSERT INTO gig_schedule_entries (gig_id, activity_type, start_time) VALUES (%L, 'Act Arrival', now())$q$, rls_test.u('gig'))), 1);
SELECT rls_test.expect('schedule: A admin adds a custom "Meet & greet" item', rls_test.try(rls_test.u('a_admin'), format(
  $q$INSERT INTO gig_schedule_entries (gig_id, activity_type, start_time) VALUES (%L, 'Meet & greet', now())$q$, rls_test.u('gig'))), 1);
SELECT rls_test.expect('schedule: an empty item is rejected', rls_test.try(rls_test.u('a_admin'), format(
  $q$INSERT INTO gig_schedule_entries (gig_id, activity_type, start_time) VALUES (%L, '  ', now())$q$, rls_test.u('gig'))), -1);
-- Shared table: sharing rules unchanged.
SELECT rls_test.expect('schedule: B admin (co-participant) can still add items', rls_test.try(rls_test.u('b_admin'), format(
  $q$INSERT INTO gig_schedule_entries (gig_id, activity_type, start_time) VALUES (%L, 'Doors', now())$q$, rls_test.u('gig'))), 1);
SELECT rls_test.expect('schedule: C admin (not on the gig) cannot', rls_test.try(rls_test.u('c_admin'), format(
  $q$INSERT INTO gig_schedule_entries (gig_id, activity_type, start_time) VALUES (%L, 'Doors', now())$q$, rls_test.u('gig'))), -1);
