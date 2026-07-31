#!/usr/bin/env bash
# Official Moodle cron loop with heartbeat for healthcheck
set -euo pipefail

INTERVAL="${MOODLE_CRON_INTERVAL_SECONDS:-60}"
HEARTBEAT="${MOODLE_DATAROOT:-/var/www/moodledata}/.omnia-cron-heartbeat"
LOG_DIR="${MOODLE_LOG_DIR:-/var/log/omnia-lms}"
mkdir -p "${LOG_DIR}"
touch "${HEARTBEAT}"
chown www-data:www-data "${HEARTBEAT}" 2>/dev/null || true

echo "Omnia LMS cron starting (interval=${INTERVAL}s)"
cd /var/www/html

while true; do
  START="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  if php admin/cli/cron.php >>"${LOG_DIR}/cron.log" 2>&1; then
    date -u +%Y-%m-%dT%H:%M:%SZ >"${HEARTBEAT}"
    echo "${START} cron ok" >>"${LOG_DIR}/cron-meta.log"
  else
    echo "${START} cron FAILED" >>"${LOG_DIR}/cron-meta.log"
  fi
  sleep "${INTERVAL}"
done
