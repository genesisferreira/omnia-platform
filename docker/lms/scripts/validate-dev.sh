#!/usr/bin/env bash
# Validate Omnia LMS DEV stack
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker/lms/compose/development.yml}"
ENV_FILE="${ENV_FILE:-docker/lms/env/.env.dev}"
WWWROOT="$(grep -E '^MOODLE_WWWROOT=' "${ENV_FILE}" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")"

echo "=== compose ps ==="
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" ps

for svc in mariadb redis moodle cron; do
  cid="$(docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" ps -q "${svc}")"
  health="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "${cid}")"
  echo "${svc}=${health}"
  [[ "${health}" == "healthy" || "${health}" == "running" ]] || { echo "FAIL ${svc}"; exit 1; }
done

echo "=== HTTPS ==="
code="$(curl -fsS -o /tmp/omnia-lms-validate.html -w '%{http_code}' "${WWWROOT}/login/index.php" || true)"
echo "http_code=${code}"
[[ "${code}" == "200" ]] || exit 1

echo "=== platform untouched sample ==="
docker ps --format '{{.Names}}' | grep -E '^omnia-platform-' | head -5 || true

echo "VALIDATE_DEV_OK"
