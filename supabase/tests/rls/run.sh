#!/usr/bin/env bash
# RLS tests against a throwaway Postgres: shim → every migration in order → tests.
# Usage: PGHOST=/tmp PGPORT=54329 PGUSER=postgres supabase/tests/rls/run.sh [--only-migrations]
# Needs a local Postgres (16+) superuser. Creates and drops database `gw_rls_test`.
set -euo pipefail
cd "$(dirname "$0")/../../.."
DB=gw_rls_test
PGOPTIONS="-c client_min_messages=warning" psql -qX -d postgres -c "DROP DATABASE IF EXISTS $DB" -c "CREATE DATABASE $DB" >/dev/null
sed "s/CURRENT_DATABASE_PLACEHOLDER/$DB/" supabase/tests/rls/supabase_shim.sql | psql -qX -v ON_ERROR_STOP=1 -d $DB >/dev/null
for f in supabase/migrations/*.sql; do
  # pg_cron/pg_net can't be installed on a plain Postgres; the shim stubs their functions.
  grep -vE '^CREATE EXTENSION IF NOT EXISTS pg_(cron|net)' "$f" \
    | psql -qX -v ON_ERROR_STOP=1 -d $DB >/dev/null 2>/tmp/gw_rls_mig.err \
    || { echo "FAILED applying $f"; cat /tmp/gw_rls_mig.err; exit 1; }
done
echo "Applied $(ls supabase/migrations/*.sql | wc -l) migrations."
[ "${1:-}" = "--only-migrations" ] && exit 0
status=0
for t in supabase/tests/rls/*.test.sql; do
  echo "== $t"
  { echo "BEGIN;"; cat supabase/tests/rls/_harness.sql supabase/tests/rls/_fixture.sql "$t"; echo "SELECT rls_test.report(); ROLLBACK;"; } | psql -qX -o /dev/null -v ON_ERROR_STOP=1 -d $DB || status=1
done
exit $status
