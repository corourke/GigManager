# Data conversion tests

Some migrations rewrite existing rows rather than only changing the schema. These tests prove the rewrite on known rows.

For each `<migration-version>.before.sql` in this folder, `run.sh`:

1. Creates a throwaway database, `gw_conversion_test`, and loads the RLS shim (`../rls/supabase_shim.sql`).
2. Applies every migration that comes before `<migration-version>`.
3. Loads the `.before.sql` rows, which are in the old shape.
4. Applies the migration, in one transaction.
5. Runs `<migration-version>.after.sql`, which raises an exception if any row is not exactly as expected.

```bash
PGHOST=/tmp PGPORT=5432 PGUSER=postgres supabase/tests/conversion/run.sh
```

CI runs it in the `rls` job, after the RLS tests.
