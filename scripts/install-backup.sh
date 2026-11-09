#!/bin/bash
# Installs the daily backup check (scripts/backup.sh) as a launchd agent.
#
# The script is copied out of the repo first: macOS does not let background
# jobs read ~/Downloads, ~/Documents or ~/Desktop without extra permission.
# Re-run this after changing backup.sh.
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
dest="$HOME/Library/Application Support/JustSplit"
label="com.justsplit.backup"
plist="$HOME/Library/LaunchAgents/$label.plist"

mkdir -p "$dest" "$HOME/Library/LaunchAgents" "$HOME/Backups/JustSplit"
cp "$here/backup.sh" "$dest/backup.sh"
chmod 700 "$dest/backup.sh"

cat >"$plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$label</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$dest/backup.sh</string>
  </array>
  <!-- Checked daily; backup.sh only copies when the newest backup is 6+ days old. -->
  <key>StartCalendarInterval</key>
  <dict><key>Hour</key><integer>11</integer><key>Minute</key><integer>0</integer></dict>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>$HOME/Backups/JustSplit/launchd.log</string>
  <key>StandardErrorPath</key><string>$HOME/Backups/JustSplit/launchd.log</string>
</dict>
</plist>
EOF

launchctl bootout "gui/$(id -u)/$label" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$plist"
echo "Installed. Backups go to ~/Backups/JustSplit; the log is ~/Backups/JustSplit/backup.log."
