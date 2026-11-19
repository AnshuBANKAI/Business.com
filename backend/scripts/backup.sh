#!/usr/bin/env bash
# Nightly backup of the database and uploaded client files.
# Needs `mongodump` (MongoDB Database Tools). Example cron entry (2:30 am daily):
#   30 2 * * * cd /path/to/Portfolio_Anshu/backend && MONGODB_URI="..." ./scripts/backup.sh >> backup.log 2>&1
# Copy the backups folder OFF this server too (another cloud bucket or drive); a backup on the same disk is not a backup.
set -euo pipefail
: "${MONGODB_URI:?Set MONGODB_URI}"
ROOT="${BACKUP_DIR:-./backups}"
UP="${UPLOAD_DIR:-./uploads}"
OUT="$ROOT/$(date +%F_%H%M)"
mkdir -p "$OUT"
mongodump --uri="$MONGODB_URI" --gzip --archive="$OUT/db.archive.gz"
if [ -d "$UP" ]; then tar -czf "$OUT/uploads.tgz" -C "$(dirname "$UP")" "$(basename "$UP")"; fi
find "$ROOT" -mindepth 1 -maxdepth 1 -type d -mtime +14 -exec rm -rf {} +   # keep 14 days locally
echo "Backup written to $OUT"
# Restore:  mongorestore --uri="$MONGODB_URI" --gzip --archive=db.archive.gz --drop
