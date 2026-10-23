#!/usr/bin/env bash
# Backs up the HeartLink database (the shared Supabase project staging and live both use) to this PC.
#
#   bash scripts/backup_database.sh              (run from the backend folder)
#   bash scripts/backup_database.sh D:/backups   (or choose where the backups go)
#
# Needs: Docker Desktop running (the Supabase CLI runs pg_dump inside it) and the project linked, the same setup
# as `npx supabase db push`. It only reads the database; nothing there changes.
#
# Each run makes a dated folder with three files:
#   roles.sql   database roles
#   schema.sql  tables, functions and security rules
#   data.sql    every row
# Uploaded files (recipe and exercise images in Supabase Storage) are not included.
#
# These files hold patients' health data. The default folder is outside the project, so they don't land in git
# or in OneDrive. Keep them off shared drives, and delete old ones you no longer need.
#
# Restore into an EMPTY database (a new Supabase project), with its connection string from
# Supabase > Project Settings > Database:
#   psql --single-transaction --variable ON_ERROR_STOP=1 \
#     --file roles.sql --file schema.sql \
#     --command 'SET session_replication_role = replica' --file data.sql \
#     --dbname "<connection string>"
set -euo pipefail

cd "$(dirname "$0")/.."

if ! docker info >/dev/null 2>&1; then
  echo "Docker isn't running. Open Docker Desktop, wait until it says it's running, then try again."
  exit 1
fi

root="${1:-$HOME/HeartLink-backups}"
out="$root/$(date +%Y-%m-%d_%H%M)"
mkdir -p "$out"

echo "Backing up the database to $out"
npx supabase db dump --linked --role-only -f "$out/roles.sql"
npx supabase db dump --linked -f "$out/schema.sql"
npx supabase db dump --linked --data-only --use-copy -f "$out/data.sql"

for f in roles.sql schema.sql data.sql; do
  if [ ! -s "$out/$f" ]; then
    echo "Backup failed: $f is empty."
    exit 1
  fi
done

echo "Done. Backup saved in $out"
ls -lh "$out"
