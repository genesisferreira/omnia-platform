#!/usr/bin/env bash
# Restore Omnia LMS from a backup directory created by backup.sh
set -euo pipefail

BACKUP_DIR="${1:-}"
if [[ -z "${BACKUP_DIR}" || ! -d "${BACKUP_DIR}" ]]; then
  echo "Usage: $0 /opt/omnia/backups/lms/dev/YYYYMMDD-HHMMSS" >&2
  exit 1
fi

COMPOSE_FILE="${COMPOSE_FILE:-docker/lms/compose/development.yml}"
ENV_FILE="${ENV_FILE:-docker/lms/env/.env.dev}"

MOODLE_DB_NAME="$(grep -E '^MOODLE_DB_NAME=' "${ENV_FILE}" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")"
MOODLE_DB_USER="$(grep -E '^MOODLE_DB_USER=' "${ENV_FILE}" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")"
MOODLE_DB_PASSWORD="$(grep -E '^MOODLE_DB_PASSWORD=' "${ENV_FILE}" | head -1 | cut -d= -f2-)"
MOODLE_DB_PASSWORD="${MOODLE_DB_PASSWORD#\"}"; MOODLE_DB_PASSWORD="${MOODLE_DB_PASSWORD%\"}"
MOODLE_DB_PASSWORD="${MOODLE_DB_PASSWORD#\'}"; MOODLE_DB_PASSWORD="${MOODLE_DB_PASSWORD%\'}"

MARIADB_CTR="$(docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" ps -q mariadb)"
MOODLE_CTR="$(docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" ps -q moodle)"

test -f "${BACKUP_DIR}/mariadb.sql.gz"
test -f "${BACKUP_DIR}/moodledata.tgz"

echo "WARNING: This overwrites DB and moodledata. Continuing in 5s..."
sleep 5

echo "Restoring database..."
gunzip -c "${BACKUP_DIR}/mariadb.sql.gz" | docker exec -i -e MYSQL_PWD="${MOODLE_DB_PASSWORD}" "${MARIADB_CTR}" \
  mariadb -u "${MOODLE_DB_USER}" "${MOODLE_DB_NAME}"

echo "Restoring moodledata..."
docker run --rm --volumes-from "${MOODLE_CTR}" -v "${BACKUP_DIR}:/backup:ro" alpine:3.20 \
  sh -c 'rm -rf /var/www/moodledata/* /var/www/moodledata/.[!.]* 2>/dev/null; tar -xzf /backup/moodledata.tgz -C /var/www/moodledata'

docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" restart moodle cron
sleep 10
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" ps
echo "RESTORE_OK=${BACKUP_DIR}"
