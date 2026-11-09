#!/bin/bash
# Weekly copy of JustSplit's data to this Mac.
#
# The free Supabase plan keeps no backups, and the app's data has been lost
# twice. launchd runs this every day (scripts/com.justsplit.backup.plist); it
# only does work when the newest copy is six days old or more, so a week the
# Mac spent asleep or switched off is caught up the next time it is on.
#
# The connection string never lives in this repo. It is read from the login
# Keychain, where `scripts/backup.sh --setup` asks you to paste it.
#
#   scripts/backup.sh --setup   store the connection string (once)
#   scripts/backup.sh --now     take a backup now, whatever its age
#   scripts/backup.sh           what launchd runs
set -euo pipefail

KEYCHAIN_SERVICE="justsplit-db-backup"
BACKUP_ROOT="$HOME/Backups/JustSplit"
KEEP=26 # about six months of weekly copies
PG_BIN="/opt/homebrew/opt/libpq/bin"

notify() {
  osascript -e "display notification \"$1\" with title \"JustSplit backup\"" >/dev/null 2>&1 || true
}

log() {
  mkdir -p "$BACKUP_ROOT"
  echo "$(date '+%Y-%m-%d %H:%M:%S') $*" | tee -a "$BACKUP_ROOT/backup.log"
}

if [[ "${1:-}" == "--setup" ]]; then
  echo "Paste the Session pooler connection string from Supabase"
  echo "(Connect button -> Session pooler), with your database password filled in."
  echo "It is stored in your login Keychain, not shown and not written to disk."
  read -r -s -p "Connection string: " uri
  echo
  [[ "$uri" == postgresql://* ]] || { echo "That does not look like a postgresql:// connection string."; exit 1; }
  # Characters like @ # / : in the password break the URI unless encoded, and
  # Supabase's copy button leaves that to you. The host follows the LAST @, so
  # everything between the first : and that @ is the password: encode it.
  # Already-encoded passwords are decoded first, so this is safe to repeat.
  uri=$(URI="$uri" /usr/bin/python3 -c '
import os, urllib.parse as u
s = os.environ["URI"]
scheme, rest = s.split("://", 1)
userinfo, host = rest.rsplit("@", 1)
user, _, pw = userinfo.partition(":")
pw = pw.strip("[]") if pw.startswith("[") and pw.endswith("]") else pw
print(f"{scheme}://{user}:{u.quote(u.unquote(pw), safe=str())}@{host}")
')
  security add-generic-password -U -a "$USER" -s "$KEYCHAIN_SERVICE" -w "$uri"
  echo "Saved. Run scripts/backup.sh --now to take the first backup."
  exit 0
fi

mkdir -p "$BACKUP_ROOT"
chmod 700 "$BACKUP_ROOT"

if [[ "${1:-}" != "--now" ]]; then
  newest=$(find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -name '20*' -mtime -6 | head -1)
  if [[ -n "$newest" ]]; then
    exit 0
  fi
fi

if ! uri=$(security find-generic-password -a "$USER" -s "$KEYCHAIN_SERVICE" -w 2>/dev/null); then
  log "FAILED: no connection string in the Keychain. Run scripts/backup.sh --setup."
  notify "Not set up yet. Run scripts/backup.sh --setup."
  exit 1
fi

stamp=$(date '+%Y-%m-%d_%H%M')
dir="$BACKUP_ROOT/$stamp"
mkdir -p "$dir"

# Tables and data for the app itself, then the accounts that own them. The
# auth schema belongs to Supabase, so only its rows are copied: restoring into
# a fresh project means running supabase/migrations first, then these files.
if "$PG_BIN/pg_dump" "$uri" --schema=public --no-owner --no-privileges | gzip >"$dir/public.sql.gz" \
  && "$PG_BIN/pg_dump" "$uri" --data-only --table=auth.users --table=auth.identities | gzip >"$dir/auth-users.sql.gz"; then
  size=$(du -sh "$dir" | cut -f1)
  log "OK $stamp ($size)"
else
  rm -rf "$dir"
  log "FAILED: pg_dump could not read the database. Is the project paused, or did the password change?"
  notify "Backup failed. See ~/Backups/JustSplit/backup.log"
  exit 1
fi

# Oldest copies go once there are more than $KEEP.
copies=$(find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -name '20*' | sort)
count=$(printf '%s\n' "$copies" | grep -c . || true)
if ((count > KEEP)); then
  # macOS head has no negative counts, so take the oldest (count - KEEP).
  printf '%s\n' "$copies" | head -n $((count - KEEP)) | while read -r old; do
    rm -rf "$old"
  done
fi
