#!/bin/bash
set -e

PROD_REF="hqnnhtxcxedisasvtbqv"
DEV_REF="qcrzwsazasaojqoqxwnr"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

cleanup() {
  echo "--- Ensuring we are linked back to dev ---"
  supabase link --project-ref "$DEV_REF" || echo "Warning: Failed to link back to dev. Please check manually."
}

trap cleanup EXIT

echo "--- Targeting prod ---"
supabase link --project-ref "$PROD_REF"

# Test to be sure we are linked to prod
if [ ! -f supabase/.temp/project-ref ]; then
  echo "Error: supabase/.temp/project-ref not found"
  exit 1
fi

CURRENT_REF=$(cat supabase/.temp/project-ref)
if [ "$CURRENT_REF" != "$PROD_REF" ]; then
  echo "Error: Not linked to prod. Current ref: $CURRENT_REF"
  exit 1
fi
echo "Confirmed: Linked to prod ($PROD_REF)"

# Pre-migration backup
echo "Checking Docker Desktop..."
if ! docker info >/dev/null 2>&1; then
  echo "Docker is not running."
  if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Starting Docker Desktop..."
    open -a Docker
  else
    echo "Please start Docker and try again."
    exit 1
  fi

  echo "Waiting for Docker to start (timeout 60s)..."
  MAX_RETRIES=12
  COUNT=0
  while ! docker info >/dev/null 2>&1; do
    if [ $COUNT -ge $MAX_RETRIES ]; then
      echo "Timeout waiting for Docker to start."
      exit 1
    fi
    sleep 5
    echo "Still waiting ($(( (COUNT+1)*5 ))s)..."
    ((COUNT++))
  done
  echo "Docker started."
fi

mkdir -p ./backups
BACKUP_FILE="./backups/prod-schema-backup-$TIMESTAMP.sql"
echo "Running pre-migration backup to $BACKUP_FILE..."
supabase db dump --schema public --schema auth --linked -f "$BACKUP_FILE"

if [ -s "$BACKUP_FILE" ]; then
  echo "Schema backup successful: $BACKUP_FILE"
else
  echo "Schema backup failed or file is empty!"
  exit 1
fi

DATA_BACKUP_FILE="./backups/prod-data-backup-$TIMESTAMP.sql"
echo "Running data-only backup to $DATA_BACKUP_FILE..."
supabase db dump --data-only --schema public --schema auth --use-copy --linked -f "$DATA_BACKUP_FILE"

if [ -s "$DATA_BACKUP_FILE" ]; then
  echo "Data backup successful: $DATA_BACKUP_FILE"
else
  echo "Data backup failed or file is empty!"
  exit 1
fi

echo "Deploying functions..."
supabase functions deploy

echo "Deploying code to CloudFlare..."
npm run build
npx wrangler pages deploy build/ --project-name gigwrangler

echo "Pushing migrations..."
supabase db push --yes

# The cleanup trap will handle linking back to dev