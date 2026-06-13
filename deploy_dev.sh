#!/bin/bash
# Deploy migrations and edge functions to the DEV Supabase project.
#
# Encodes the AGENTS.md safety ritual: link to dev, hard-verify the linked
# project-ref before any remote command, and guarantee the CLI is left linked
# to dev on every exit path. Dev is where unmerged work lands, so unlike
# deploy_prod.sh there are no branch/cleanliness/test gates and no backups.
#
# Usage:
#   ./deploy_dev.sh           # link, verify, db push, functions deploy
#   ./deploy_dev.sh --check   # dry run: link + verify only, deploy nothing

set -euo pipefail

DEV_REF="qcrzwsazasaojqoqxwnr"
PROD_REF="hqnnhtxcxedisasvtbqv"
CHECK_ONLY=false

# Leave the CLI linked to dev no matter how we exit — registered before ANY
# other logic so every exit path (including usage errors) is covered. If the
# link state is already correct this is a no-op check, not a relink.
cleanup() {
  local ref=""
  [ -f supabase/.temp/project-ref ] && ref=$(cat supabase/.temp/project-ref)
  if [ "$ref" != "$DEV_REF" ]; then
    echo "--- Relinking to dev ---"
    supabase link --project-ref "$DEV_REF" || echo "Warning: failed to link to dev. Run: supabase link --project-ref $DEV_REF"
  fi
}

trap cleanup EXIT

if [ "${1:-}" = "--check" ]; then
  CHECK_ONLY=true
elif [ -n "${1:-}" ]; then
  echo "Usage: $0 [--check]"
  exit 64
fi

echo "--- Linking to dev ($DEV_REF) ---"
supabase link --project-ref "$DEV_REF"

# Hard verification before any remote command (per AGENTS.md)
if [ ! -f supabase/.temp/project-ref ]; then
  echo "Error: supabase/.temp/project-ref not found after linking."
  exit 1
fi

CURRENT_REF=$(cat supabase/.temp/project-ref)
if [ "$CURRENT_REF" = "$PROD_REF" ]; then
  echo "Error: linked to PROD ($PROD_REF) — refusing to continue."
  exit 1
fi
if [ "$CURRENT_REF" != "$DEV_REF" ]; then
  echo "Error: linked to unexpected project '$CURRENT_REF' (expected dev: $DEV_REF)."
  exit 1
fi
echo "Confirmed: linked to dev ($DEV_REF)"

if [ "$CHECK_ONLY" = true ]; then
  echo "--- Check mode: would push migrations and deploy these functions ---"
  supabase migration list || true
  ls -1 supabase/functions | grep -v '^_' || true
  echo "Check complete. Nothing was deployed."
  exit 0
fi

echo "--- Pushing migrations to dev ---"
supabase db push

echo "--- Deploying edge functions to dev ---"
supabase functions deploy

echo "Dev deploy complete."
