-- #175: every gig has an owner organization (Cameron, 10-08; answers 10-12).
--   Delete: an Admin of the owner, only with no other claimed organization on the gig and no
--   child gigs. Status, owner and parent: the owner's Admins and Managers only.
--   Removing an organization: by the owner or by itself (an unclaimed venue or act by any
--   participating Admin or Manager), only with no financials, kits or staff slots on the gig;
--   removal deletes its scans and contacts there and unlinks its purchases. Otherwise it can be
--   marked Inactive (by the owner or itself, never the owner). An Inactive organization is
--   read-only on the gig's shared details until it's reactivated.
-- Checks read as: rls_test.expect(label, <rows seen or affected, -1 = rejected>, expected).
-- rls_test.try rolls each statement back; rls_test.act keeps it, for checks that read its effect.

CREATE FUNCTION rls_test.id(p text) RETURNS text LANGUAGE sql STABLE AS $$ SELECT quote_literal(rls_test.u(p)) $$;
CREATE FUNCTION rls_test.run(p_user text, p_sql text) RETURNS int LANGUAGE sql AS
  $$ SELECT rls_test.try(rls_test.u(p_user), p_sql) $$;
CREATE FUNCTION rls_test.act(p_user text, p_sql text) RETURNS int LANGUAGE plpgsql AS $$
DECLARE n int;
BEGIN
  BEGIN
    PERFORM set_config('request.jwt.claim.sub', rls_test.u(p_user)::text, true);
    SET LOCAL ROLE authenticated;
    EXECUTE p_sql;
    GET DIAGNOSTICS n = ROW_COUNT;
    RESET ROLE;
    RETURN n;
  EXCEPTION WHEN OTHERS THEN RESET ROLE; RETURN -1;
  END;
END $$;
CREATE FUNCTION rls_test.n(p_sql text) RETURNS int LANGUAGE plpgsql AS $$
DECLARE n int; BEGIN EXECUTE 'SELECT count(*)::int FROM ' || p_sql INTO n; RETURN n; END $$;

-- ── Fixture ────────────────────────────────────────────────────────────────
-- gig (fixture): owner A, with B. Org V is an unclaimed venue record (no members).
-- gig_solo: owner A, with V only. gig_parent / gig_child: owner A, A only.
INSERT INTO rls_test.ids VALUES
  ('org_v',      '00000000-0000-0000-0000-0000000000d1'),
  ('gig_solo',   '00000000-0000-0000-0000-0000000000f3'),
  ('gig_parent', '00000000-0000-0000-0000-0000000000f4'),
  ('gig_child',  '00000000-0000-0000-0000-0000000000f5'),
  ('gig_new',    '00000000-0000-0000-0000-0000000000f6');
INSERT INTO organizations (id, name, roles, claimed) VALUES (rls_test.u('org_v'), 'Venue V', '{Venue}', false);
INSERT INTO gigs (id, title, status, start, "end", timezone, created_by, updated_by, owner_organization_id, parent_gig_id, hierarchy_depth)
SELECT rls_test.u(g), g, 'Booked', now(), now() + interval '4 hours', 'UTC', rls_test.u('a_admin'), rls_test.u('a_admin'),
       rls_test.u('org_a'), CASE WHEN g = 'gig_child' THEN rls_test.u('gig_parent') END, CASE WHEN g = 'gig_child' THEN 1 ELSE 0 END
FROM unnest(ARRAY['gig_solo', 'gig_parent', 'gig_child']) g;
INSERT INTO gig_participants (gig_id, organization_id, role) VALUES
  (rls_test.u('gig_solo'), rls_test.u('org_a'), 'Production'),
  (rls_test.u('gig_solo'), rls_test.u('org_v'), 'Venue'),
  (rls_test.u('gig_parent'), rls_test.u('org_a'), 'Production'),
  (rls_test.u('gig_child'), rls_test.u('org_a'), 'Production'),
  (rls_test.u('gig'), rls_test.u('org_v'), 'Venue');

CREATE FUNCTION rls_test.del_gig(p_gig text) RETURNS text LANGUAGE sql AS
  $$ SELECT format('DELETE FROM gigs WHERE id = %s', rls_test.id(p_gig)) $$;
CREATE FUNCTION rls_test.set_gig(p_gig text, p_set text) RETURNS text LANGUAGE sql AS
  $$ SELECT format('UPDATE gigs SET %s WHERE id = %s', p_set, rls_test.id(p_gig)) $$;
CREATE FUNCTION rls_test.del_part(p_gig text, p_org text) RETURNS text LANGUAGE sql AS
  $$ SELECT format('DELETE FROM gig_participants WHERE gig_id = %s AND organization_id = %s', rls_test.id(p_gig), rls_test.id(p_org)) $$;
CREATE FUNCTION rls_test.set_part(p_gig text, p_org text, p_set text) RETURNS text LANGUAGE sql AS
  $$ SELECT format('UPDATE gig_participants SET %s WHERE gig_id = %s AND organization_id = %s', p_set, rls_test.id(p_gig), rls_test.id(p_org)) $$;

-- 1. The owner ─────────────────────────────────────────────────────────────
SELECT rls_test.expect('A gig records its owner organization',
  rls_test.n(format('gigs WHERE id = %s AND owner_organization_id = %s', rls_test.id('gig'), rls_test.id('org_a'))), 1);
SELECT rls_test.expect('A participation starts active',
  rls_test.n(format('gig_participants WHERE gig_id = %s AND inactive = false', rls_test.id('gig'))), 3);

-- 2. Delete ────────────────────────────────────────────────────────────────
SELECT rls_test.expect('The owner''s Admin can''t delete a gig another claimed organization is on',
  rls_test.run('a_admin', rls_test.del_gig('gig')), 0);
SELECT rls_test.expect('Another participant''s Admin can''t delete the gig',
  rls_test.run('b_admin', rls_test.del_gig('gig')), 0);
SELECT rls_test.expect('The owner''s Admin can delete a gig whose only other participant is an unclaimed venue',
  rls_test.run('a_admin', rls_test.del_gig('gig_solo')), 1);
SELECT rls_test.expect('The owner''s Manager can''t delete it',
  rls_test.run('a_manager', rls_test.del_gig('gig_solo')), 0);
SELECT rls_test.expect('A parent gig with children can''t be deleted',
  rls_test.run('a_admin', rls_test.del_gig('gig_parent')), 0);
SELECT rls_test.expect('A child gig can be deleted',
  rls_test.run('a_admin', rls_test.del_gig('gig_child')), 1);

-- 3. Status, owner and parent are the owner's ─────────────────────────────
SELECT rls_test.expect('The owner''s Manager can cancel the gig',
  rls_test.run('a_manager', rls_test.set_gig('gig', $$status = 'Cancelled'$$)), 1);
SELECT rls_test.expect('Another participant''s Admin can''t change its status',
  rls_test.run('b_admin', rls_test.set_gig('gig', $$status = 'Cancelled'$$)), -1);
SELECT rls_test.expect('Another participant''s Admin can still change its title and notes',
  rls_test.run('b_admin', rls_test.set_gig('gig', $$title = 'Renamed', notes = 'n'$$)), 1);
SELECT rls_test.expect('Another participant''s Admin can''t take ownership',
  rls_test.run('b_admin', rls_test.set_gig('gig', format('owner_organization_id = %s', rls_test.id('org_b')))), -1);
SELECT rls_test.expect('The owner''s Admin can hand the gig to another participant',
  rls_test.run('a_admin', rls_test.set_gig('gig', format('owner_organization_id = %s', rls_test.id('org_b')))), 1);
SELECT rls_test.expect('...but not to an organization that isn''t on it',
  rls_test.run('a_admin', rls_test.set_gig('gig', format('owner_organization_id = %s', rls_test.id('org_c')))), -1);
SELECT rls_test.expect('Another participant''s Admin can''t set the parent gig',
  rls_test.run('b_admin', rls_test.set_gig('gig', format('parent_gig_id = %s, hierarchy_depth = 1', rls_test.id('gig_parent')))), -1);
SELECT rls_test.act('a_admin', rls_test.set_gig('gig_child', format('owner_organization_id = %s', rls_test.id('org_b'))));
SELECT rls_test.expect('A child gig always has its parent''s owner',
  rls_test.n(format('gigs WHERE id = %s AND owner_organization_id = %s', rls_test.id('gig_child'), rls_test.id('org_a'))), 1);

-- 4. Inactive ──────────────────────────────────────────────────────────────
SELECT rls_test.expect('A participant''s Admin can mark its own organization Inactive',
  rls_test.run('b_admin', rls_test.set_part('gig', 'org_b', 'inactive = true')), 1);
SELECT rls_test.expect('The owner''s Manager can mark another organization Inactive',
  rls_test.run('a_manager', rls_test.set_part('gig', 'org_b', 'inactive = true')), 1);
SELECT rls_test.expect('A participant''s Staff can''t',
  rls_test.run('b_staff', rls_test.set_part('gig', 'org_b', 'inactive = true')), 0);
SELECT rls_test.expect('A participant can''t mark the owner Inactive',
  rls_test.run('b_admin', rls_test.set_part('gig', 'org_a', 'inactive = true')), -1);
SELECT rls_test.expect('The owner can''t mark itself Inactive',
  rls_test.run('a_admin', rls_test.set_part('gig', 'org_a', 'inactive = true')), -1);
SELECT rls_test.expect('A participant''s organization can''t be switched to another',
  rls_test.run('a_admin', rls_test.set_part('gig', 'org_b', format('organization_id = %s', rls_test.id('org_c')))), -1);

SELECT rls_test.act('b_admin', rls_test.set_part('gig', 'org_b', 'inactive = true'));
SELECT rls_test.expect('An Inactive organization can''t edit the gig''s title',
  rls_test.run('b_admin', rls_test.set_gig('gig', $$title = 'Renamed'$$)), 0);
SELECT rls_test.expect('An Inactive organization still adds its own staff slots',
  rls_test.run('b_admin', format('INSERT INTO gig_staff_slots (gig_id, staff_role_id, organization_id) VALUES (%s, %s, %s)',
    rls_test.id('gig'), rls_test.id('role'), rls_test.id('org_b'))), 1);
SELECT rls_test.expect('The owner still edits the gig while B is Inactive',
  rls_test.run('a_manager', rls_test.set_gig('gig', $$title = 'Renamed'$$)), 1);
SELECT rls_test.expect('An Inactive organization can reactivate itself',
  rls_test.run('b_admin', rls_test.set_part('gig', 'org_b', 'inactive = false')), 1);
SELECT rls_test.expect('An Inactive claimed organization still keeps the owner from deleting the gig',
  rls_test.run('a_admin', rls_test.del_gig('gig')), 0);
SELECT rls_test.act('a_admin', rls_test.set_part('gig', 'org_b', 'inactive = false'));

-- 5. Removing an organization ─────────────────────────────────────────────
-- Org C joins the gig with no financials, kits or slots, but with a scan, a contact and a
-- purchase line linked to the gig. Org B has a kit on the gig.
INSERT INTO rls_test.ids VALUES ('kit_c', '00000000-0000-0000-0000-0000000000cc'),
  ('ph_c', '00000000-0000-0000-0000-000000000ac1'), ('pl_c', '00000000-0000-0000-0000-000000000ac2');
INSERT INTO kits (id, organization_id, name, created_by, updated_by)
VALUES (rls_test.u('kit_c'), rls_test.u('org_c'), 'C kit', rls_test.u('c_admin'), rls_test.u('c_admin'));
INSERT INTO gig_participants (gig_id, organization_id, role) VALUES (rls_test.u('gig'), rls_test.u('org_c'), 'Lighting');
INSERT INTO inventory_tracking (organization_id, gig_id, kit_id, status)
VALUES (rls_test.u('org_c'), rls_test.u('gig'), rls_test.u('kit_c'), 'Checked Out');
INSERT INTO gig_participant_contacts (gig_id, organization_id, user_id)
VALUES (rls_test.u('gig'), rls_test.u('org_c'), rls_test.u('c_admin'));
INSERT INTO purchases (id, organization_id, parent_id, row_type, purchase_date, vendor, total_inv_amount, quantity, item_cost, line_cost, tax_treatment, description, gig_id) VALUES
  (rls_test.u('ph_c'), rls_test.u('org_c'), NULL, 'header', '2026-03-01', 'Rent-all', 80, NULL, NULL, NULL, NULL, 'Gels', NULL),
  (rls_test.u('pl_c'), rls_test.u('org_c'), rls_test.u('ph_c'), 'item', '2026-03-01', 'Rent-all', NULL, 1, 80, 80, 'expense', 'Gels', rls_test.u('gig'));
INSERT INTO gig_kit_assignments (organization_id, gig_id, kit_id, assigned_by)
VALUES (rls_test.u('org_b'), rls_test.u('gig'), rls_test.u('kit_b'), rls_test.u('b_admin'));

SELECT rls_test.expect('Another participant can''t remove an organization that isn''t its own',
  rls_test.run('b_admin', rls_test.del_part('gig', 'org_c')), 0);
SELECT rls_test.expect('The owner can''t remove an organization with kits on the gig',
  rls_test.run('a_manager', rls_test.del_part('gig', 'org_b')), -1);
SELECT rls_test.expect('...nor can that organization itself',
  rls_test.run('b_admin', rls_test.del_part('gig', 'org_b')), -1);
SELECT rls_test.expect('The owner''s own participation can''t be removed',
  rls_test.run('a_admin', rls_test.del_part('gig', 'org_a')), -1);
SELECT rls_test.expect('Any participating Manager can remove an unclaimed venue',
  rls_test.run('b_manager', rls_test.del_part('gig', 'org_v')), 1);
SELECT rls_test.expect('A non-participant can''t remove the unclaimed venue',
  rls_test.run('c_admin', rls_test.del_part('gig_solo', 'org_v')), 0);
SELECT rls_test.expect('An organization with nothing on the gig can remove itself',
  rls_test.act('c_admin', rls_test.del_part('gig', 'org_c')), 1);
SELECT rls_test.expect('...which deletes its scans on the gig',
  rls_test.n(format('inventory_tracking WHERE gig_id = %s AND organization_id = %s', rls_test.id('gig'), rls_test.id('org_c'))), 0);
SELECT rls_test.expect('...and its contacts on the gig',
  rls_test.n(format('gig_participant_contacts WHERE gig_id = %s AND organization_id = %s', rls_test.id('gig'), rls_test.id('org_c'))), 0);
SELECT rls_test.expect('...and unlinks its purchases from the gig, keeping them',
  rls_test.n(format('purchases WHERE id = %s AND gig_id IS NULL', rls_test.id('pl_c'))), 1);
SELECT rls_test.expect('Other organizations'' rows on the gig are untouched',
  rls_test.n(format('gig_kit_assignments WHERE gig_id = %s AND organization_id = %s', rls_test.id('gig'), rls_test.id('org_b'))), 1);

-- An organization on the gig under two roles: dropping one role isn't leaving.
INSERT INTO gig_participants (gig_id, organization_id, role) VALUES (rls_test.u('gig'), rls_test.u('org_b'), 'Rentals');
SELECT rls_test.expect('Dropping one of two roles is allowed even with kits on the gig',
  rls_test.run('b_admin', format('DELETE FROM gig_participants WHERE gig_id = %s AND organization_id = %s AND role = ''Rentals''',
    rls_test.id('gig'), rls_test.id('org_b'))), 1);

-- Deleting a gig still removes every participation, the owner's included.
SELECT rls_test.expect('Deleting a gig removes its participations',
  rls_test.act('a_admin', rls_test.del_gig('gig_child')), 1);
SELECT rls_test.expect('...the owner''s included',
  rls_test.n(format('gig_participants WHERE gig_id = %s', rls_test.id('gig_child'))), 0);

-- 6. create_gig_complex stores the owner ──────────────────────────────────
CREATE FUNCTION rls_test.create(p_user text, p_owner text, p_parts text[], p_parent text DEFAULT NULL) RETURNS text LANGUAGE sql AS $$
  SELECT format('SELECT * FROM create_gig_complex(%L::jsonb, %L::jsonb)',
    jsonb_build_object('title', 'New', 'start', now(), 'end', now() + interval '1 hour', 'timezone', 'UTC',
      'primary_organization_id', rls_test.u(p_owner), 'parent_gig_id', CASE WHEN p_parent IS NOT NULL THEN rls_test.u(p_parent) END),
    (SELECT jsonb_agg(jsonb_build_object('organization_id', rls_test.u(o), 'role', 'Production')) FROM unnest(p_parts) o))
$$;
SELECT rls_test.expect('A Manager creates a gig owned by their organization',
  rls_test.act('a_manager', rls_test.create('a_manager', 'org_a', ARRAY['org_a', 'org_b'])) * 0
  + rls_test.n(format('gigs WHERE title = ''New'' AND owner_organization_id = %s', rls_test.id('org_a'))), 1);
SELECT rls_test.expect('A gig can''t be created without its owner among the participants',
  rls_test.run('a_manager', rls_test.create('a_manager', 'org_a', ARRAY['org_b'])), -1);
SELECT rls_test.expect('Only the parent''s owner can add a child gig',
  rls_test.run('b_admin', rls_test.create('b_admin', 'org_b', ARRAY['org_b'], 'gig_parent')), -1);
SELECT rls_test.expect('A child gig is created with its parent''s owner',
  rls_test.act('a_manager', rls_test.create('a_manager', 'org_a', ARRAY['org_a'], 'gig_parent')) * 0
  + rls_test.n(format('gigs WHERE parent_gig_id = %s AND owner_organization_id = %s', rls_test.id('gig_parent'), rls_test.id('org_a'))), 1);
