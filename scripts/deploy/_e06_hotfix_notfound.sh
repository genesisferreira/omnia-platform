#!/usr/bin/env bash
# Epic 06 hotfix — rebuild admin + re-seed ai-experience (DEV)
set -euo pipefail
cd /opt/omnia/platform
git fetch origin feature/neurofrigo-knowledge-hub
git reset --hard origin/feature/neurofrigo-knowledge-hub
echo HEAD=$(git rev-parse --short HEAD)
docker compose -f docker/compose/staging.yml --env-file .env.staging up -d --build --force-recreate admin
docker compose -f docker/compose/staging.yml --env-file .env.staging --profile bootstrap build admin-bootstrap
docker compose -f docker/compose/staging.yml --env-file .env.staging --profile bootstrap run --rm admin-bootstrap ai-experience
docker inspect omnia-platform-admin-dev --format 'admin={{.State.Health.Status}}' || true
curl -fsS -o /dev/null -w 'admin_http=%{http_code}\n' https://admin.dev.omniafrigo.com.br/api/health || true
echo DONE_HEAD=$(git rev-parse --short HEAD)
