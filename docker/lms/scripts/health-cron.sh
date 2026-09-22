#!/usr/bin/env bash
# Cron health: heartbeat must be newer than 3 intervals
set -euo pipefail

HEARTBEAT="${MOODLE_DATAROOT:-/var/www/moodledata}/.omnia-cron-heartbeat"
MAX_AGE="${MOODLE_CRON_HEALTH_MAX_AGE_SECONDS:-180}"

if [[ ! -f "${HEARTBEAT}" ]]; then
  echo "cron heartbeat missing"
  exit 1
fi

now="$(date +%s)"
mtime="$(stat -c %Y "${HEARTBEAT}" 2>/dev/null || stat -f %m "${HEARTBEAT}")"
age=$((now - mtime))
if ((age > MAX_AGE)); then
  echo "cron heartbeat stale age=${age}s"
  exit 1
fi
echo "cron healthy age=${age}s"
exit 0
