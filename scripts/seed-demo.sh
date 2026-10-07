#!/usr/bin/env bash
# Seed (or re-seed) the demo data used for user-guide screenshots.
# DEV ONLY: refuses to run against any Supabase project other than the development one.
#
# Usage: scripts/seed-demo.sh
# Requires: curl, jq. Auth is expected to be injected by your environment/proxy
# (no token is read or sent by this script). Override the endpoint only for testing
# via SEED_DEMO_API_BASE.
set -euo pipefail

DEV_REF="qcrzwsazasaojqoqxwnr"
PROJECT_REF="${SEED_DEMO_PROJECT_REF:-$DEV_REF}"
API_BASE="${SEED_DEMO_API_BASE:-https://api.supabase.com/v1/projects}"

if [[ "$PROJECT_REF" != "$DEV_REF" ]]; then
  echo "Refusing to run: project ref '$PROJECT_REF' is not the development project ($DEV_REF)." >&2
  exit 1
fi
# If a Supabase CLI link exists, it must also point at dev (never seed while linked to prod).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LINK_FILE="$SCRIPT_DIR/../supabase/.temp/project-ref"
if [[ -f "$LINK_FILE" && "$(tr -d '[:space:]' < "$LINK_FILE")" != "$DEV_REF" ]]; then
  echo "Note: supabase CLI is linked to $(tr -d '[:space:]' < "$LINK_FILE"); this script ignores the link and targets $DEV_REF only." >&2
fi

SQL_FILE="$SCRIPT_DIR/seed-demo.sql"
[[ -f "$SQL_FILE" ]] || { echo "Missing $SQL_FILE" >&2; exit 1; }

echo "Seeding demo data into DEV project $DEV_REF ..."
RESPONSE="$(jq -n --rawfile q "$SQL_FILE" '{query:$q}' \
  | curl -sS -X POST "$API_BASE/$DEV_REF/database/query" \
      -H 'Content-Type: application/json' -d @-)"

# A successful run returns [{"counts": "<json>"}]; anything else is an error body.
if ! jq -e 'type == "array" and (.[0].counts // empty)' >/dev/null 2>&1 <<<"$RESPONSE"; then
  echo "Seed failed:" >&2
  echo "$RESPONSE" >&2
  exit 1
fi

echo "Done. Demo row counts:"
jq -r '.[0].counts | fromjson | to_entries[] | "  \(.key): \(.value)"' <<<"$RESPONSE"
echo
echo "Logins (password DemoPass!2026): demo-admin@ / demo-manager@ / demo-staff@gigwrangler.test"
