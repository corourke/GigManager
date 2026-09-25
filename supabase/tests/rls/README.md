# RLS tests

Tenant isolation lives in Postgres RLS, so it's tested against a real Postgres. It isn't mocked.

`run.sh` does four things:

1. Creates a throwaway database, `gw_rls_test`.
2. Loads `supabase_shim.sql`, a minimal stand-in for the Supabase pieces the migrations need: the `anon`/`authenticated`/`service_role` roles, `auth.uid()`, and the storage, vault, cron and net objects.
3. Applies every file in `supabase/migrations/` in order.
4. Runs each `*.test.sql`, rolling each one back afterwards.

A test acts as a user with `rls_test.try(user, sql)` and `rls_test.visible(user, table, where)`. These run as the `authenticated` role with `auth.uid()` set to that user. It records checks with `rls_test.expect(label, actual, expected)`, where `actual` is the number of rows seen or affected, or `-1` if the statement was rejected. The file fails if any check doesn't match.

`_fixture.sql` sets up two orgs sharing one gig (A and B) and an unrelated org (C). Each org has an Admin, Manager, Staff and Viewer, named `a_admin` … `c_viewer`.

## Running locally

You need any Postgres 16+ that you can reach as a superuser:

```bash
PGHOST=/tmp PGPORT=5432 PGUSER=postgres supabase/tests/rls/run.sh
PGHOST=... supabase/tests/rls/run.sh --only-migrations   # just check the migrations apply
```

CI runs it against `postgres:17`; see the `rls` job in `.github/workflows/ci.yml`.

## When to add a test

Add one for any new org-private table, and for any change to a policy or to a `SECURITY DEFINER` function that writes rows on a user's behalf. Write the test first and watch it fail.
