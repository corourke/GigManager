#!/usr/bin/env bash
# Data-conversion tests for migrations that rewrite existing rows.
# For each <migration-version>.before.sql here: apply every earlier migration to a
# throwaway database, load the .before.sql rows, apply that migration, then run
# <migration-version>.after.sql, which raises on any wrong result.
# Usage: PGHOST=/tmp PGPORT=54329 PGUSER=postgres supabase/tests/conversion/run.sh
set -euo pipefail
cd "$(dirname "$0")/../../.."
DB=gw_conversion_test
status=0
for before in supabase/tests/conversion/*.before.sql; do
  version=$(basename "$before" .before.sql)
  echo "== $version"
  PGOPTIONS="-c client_min_messages=warning" psql -qX -d postgres -c "DROP DATABASE IF EXISTS $DB" -c "CREATE DATABASE $DB" >/dev/null
  sed "s/CURRENT_DATABASE_PLACEHOLDER/$DB/" supabase/tests/rls/supabase_shim.sql | psql -qX -v ON_ERROR_STOP=1 -d $DB >/dev/null
  target=""
  for f in supabase/migrations/*.sql; do
    name=$(basename "$f")
    if [[ "$name" == "$version"_* ]]; then target=$f; break; fi
    grep -vE '^CREATE EXTENSION IF NOT EXISTS pg_(cron|net)' "$f" \
      | psql -qX -v ON_ERROR_STOP=1 -d $DB >/dev/null 2>/tmp/gw_conv.err \
      || { echo "FAILED applying $f"; cat /tmp/gw_conv.err; exit 1; }
  done
  [ -n "$target" ] || { echo "No migration named ${version}_*"; exit 1; }
  psql -qX -v ON_ERROR_STOP=1 -d $DB -f "$before" >/dev/null
  PGOPTIONS="-c client_min_messages=warning" psql -qX -v ON_ERROR_STOP=1 --single-transaction -d $DB -f "$target" >/dev/null \
    || { echo "FAILED applying $target to the test rows"; status=1; continue; }
  psql -qX -v ON_ERROR_STOP=1 -d $DB -f "supabase/tests/conversion/$version.after.sql" || status=1
done
exit $status
