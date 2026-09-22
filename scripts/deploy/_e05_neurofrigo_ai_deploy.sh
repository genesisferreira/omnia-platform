#!/usr/bin/env bash
# Epic 05 — staging deploy + migrate + seed neurofrigo-ai (DEV only)
set -euo pipefail
cd /opt/omnia/platform

echo "=== PRE ==="
git rev-parse --short HEAD
docker ps --format '{{.Names}} {{.Status}}' | grep -E 'admin-dev|web-dev|landing' || true

echo "=== FETCH ==="
git fetch origin feature/neurofrigo-knowledge-hub
git checkout feature/neurofrigo-knowledge-hub
git reset --hard origin/feature/neurofrigo-knowledge-hub
echo "HEAD=$(git rev-parse --short HEAD)"

echo "=== BUILD ADMIN+WEB ==="
docker compose -f docker/compose/staging.yml --env-file .env.staging up -d --build admin web

echo "=== BUILD BOOTSTRAP + MIGRATE ==="
docker compose -f docker/compose/staging.yml --env-file .env.staging --profile bootstrap build admin-migrate admin-bootstrap
docker compose -f docker/compose/staging.yml --env-file .env.staging --profile bootstrap run --rm admin-migrate

echo "=== SEED NEUROFRIGO AI ==="
docker compose -f docker/compose/staging.yml --env-file .env.staging --profile bootstrap run --rm admin-bootstrap neurofrigo-ai

echo "=== HEALTH ==="
docker inspect omnia-platform-admin-dev --format 'admin={{.State.Health.Status}}' || true
docker inspect omnia-platform-web-dev --format 'web={{.State.Health.Status}}' || true
curl -fsS -o /dev/null -w 'admin_http=%{http_code}\n' https://admin.dev.omniafrigo.com.br/api/health || true
curl -fsS -o /dev/null -w 'web_http=%{http_code}\n' https://dev.omniafrigo.com.br/api/health || true

echo "=== DONE HEAD=$(git rev-parse --short HEAD) ==="
