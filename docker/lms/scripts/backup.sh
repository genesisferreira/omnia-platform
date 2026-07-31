#!/usr/bin/env bash
# Backup MariaDB + moodledata for Omnia LMS
set -euo pipefail

ENV_NAME="${OMNIA_LMS_ENV:-dev}"
BACKUP_ROOT="${OMNIA_LMS_BACKUP_ROOT:-/opt/omnia/backups/lms/${ENV_NAME}}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT_DIR="${BACKUP_ROOT}/${STAMP}"
COMPOSE_FILE="${COMPOSE_FILE:-docker/lms/compose/development.yml}"
ENV_FILE="${ENV_FILE:-docker/lms/env/.env.dev}"

mkdir -p "${OUT_DIR}"

# shellcheck disable=SC1090
set -a
# Load only needed vars without sourcing complex shell syntax issues
MOODLE_DB_NAME="$(grep -E '^MOODLE_DB_NAME=' "${ENV_FILE}" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")"
MOODLE_DB_USER="$(grep -E '^MOODLE_DB_USER=' "${ENV_FILE}" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")"
MOODLE_DB_PASSWORD="$(grep -E '^MOODLE_DB_PASSWORD=' "${ENV_FILE}" | head -1 | cut -d= -f2-)"
MOODLE_DB_PASSWORD="${MOODLE_DB_PASSWORD#\"}"; MOODLE_DB_PASSWORD="${MOODLE_DB_PASSWORD%\"}"
MOODLE_DB_PASSWORD="${MOODLE_DB_PASSWORD#\'}"; MOODLE_DB_PASSWORD="${MOODLE_DB_PASSWORD%\'}"
set +a

MARIADB_CTR="$(docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" ps -q mariadb)"
MOODLE_CTR="$(docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" ps -q moodle)"

test -n "${MARIADB_CTR}"
test -n "${MOODLE_CTR}"

echo "Dumping database..."
docker exec -e MYSQL_PWD="${MOODLE_DB_PASSWORD}" "${MARIADB_CTR}" \
  mariadb-dump -u "${MOODLE_DB_USER}" --single-transaction --routines --triggers "${MOODLE_DB_NAME}" \
  | gzip -c >"${OUT_DIR}/mariadb.sql.gz"

BYTES_DB="$(wc -c <"${OUT_DIR}/mariadb.sql.gz")"
test "${BYTES_DB}" -gt 1000

echo "Archiving moodledata..."
docker run --rm --volumes-from "${MOODLE_CTR}" alpine:3.20 \
  tar -czf - -C /var/www/moodledata . >"${OUT_DIR}/moodledata.tgz"

BYTES_DATA="$(wc -c <"${OUT_DIR}/moodledata.tgz")"
test "${BYTES_DATA}" -gt 100

cat >"${OUT_DIR}/manifest.json" <<EOF
{
  "env": "${ENV_NAME}",
  "stamp": "${STAMP}",
  "mariadb_bytes": ${BYTES_DB},
  "moodledata_bytes": ${BYTES_DATA},
  "compose_file": "${COMPOSE_FILE}"
}
EOF

echo "BACKUP_OK=${OUT_DIR} db=${BYTES_DB} data=${BYTES_DATA}"
