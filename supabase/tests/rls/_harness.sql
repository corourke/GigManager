-- Shared helpers for RLS tests. Loaded by run.sh before each *.test.sql.
-- rls_test.try(user, sql) runs `sql` as the `authenticated` role with
-- auth.uid() = user, inside a subtransaction that is always rolled back, and
-- returns the number of rows the statement saw/affected, or -1 if it was
-- rejected (RLS WITH CHECK violation / insufficient privilege / raised error).
SET client_min_messages = warning;
DROP SCHEMA IF EXISTS rls_test CASCADE;
RESET client_min_messages;
CREATE SCHEMA rls_test;
CREATE TABLE rls_test.results (label text, actual int, expected int);

CREATE FUNCTION rls_test.try(p_user uuid, p_sql text) RETURNS int LANGUAGE plpgsql AS $$
DECLARE n int;
BEGIN
  BEGIN
    PERFORM set_config('request.jwt.claim.sub', p_user::text, true);
    SET LOCAL ROLE authenticated;
    EXECUTE p_sql;
    GET DIAGNOSTICS n = ROW_COUNT;
    RAISE EXCEPTION USING ERRCODE = 'P0099', MESSAGE = n::text;  -- roll the statement back
  EXCEPTION
    WHEN SQLSTATE 'P0099' THEN RESET ROLE; RETURN SQLERRM::int;
    WHEN OTHERS THEN RESET ROLE; RETURN -1;
  END;
END $$;

-- SELECT count helper: rows of `p_table` matching `p_where` visible to the user.
CREATE FUNCTION rls_test.visible(p_user uuid, p_table text, p_where text DEFAULT 'true') RETURNS int
LANGUAGE plpgsql AS $$
DECLARE n int;
BEGIN
  BEGIN
    PERFORM set_config('request.jwt.claim.sub', p_user::text, true);
    SET LOCAL ROLE authenticated;
    EXECUTE format('SELECT count(*) FROM %s WHERE %s', p_table, p_where) INTO n;
    RAISE EXCEPTION USING ERRCODE = 'P0099', MESSAGE = n::text;
  EXCEPTION
    WHEN SQLSTATE 'P0099' THEN RESET ROLE; RETURN SQLERRM::int;
    WHEN OTHERS THEN RESET ROLE; RETURN -1;
  END;
END $$;

CREATE FUNCTION rls_test.expect(p_label text, p_actual int, p_expected int) RETURNS void
LANGUAGE sql AS $$ INSERT INTO rls_test.results VALUES (p_label, p_actual, p_expected) $$;

-- Prints every check and fails the file if any check's actual ≠ expected.
CREATE FUNCTION rls_test.report() RETURNS void LANGUAGE plpgsql AS $$
DECLARE r record; bad int := 0; total int := 0;
BEGIN
  FOR r IN SELECT * FROM rls_test.results LOOP
    total := total + 1;
    IF r.actual IS DISTINCT FROM r.expected THEN
      bad := bad + 1;
      RAISE WARNING 'FAIL  %  (got %, want %)', r.label, r.actual, r.expected;
    END IF;
  END LOOP;
  RAISE NOTICE '% checks, % failed', total, bad;
  IF bad > 0 THEN RAISE EXCEPTION '% RLS check(s) failed', bad; END IF;
END $$;
