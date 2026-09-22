#!/usr/bin/env bash
# Epic 10 — Knowledge Hub official load (staging only)
set -euo pipefail
cd /opt/omnia/platform

echo "=== PRE ==="
git branch --show-current
echo "PREV=$(git rev-parse --short HEAD)"
docker ps --filter name=omnia-landing --format 'landing={{.Image}} {{.Status}}'
docker ps --filter name=omnia-platform-admin-prod --format 'admin-prod={{.Status}}'

if git status --porcelain | grep -v '^??' | grep -q .; then
  echo "ABORT tracked changes"; git status --porcelain; exit 20
fi

echo "=== PULL ==="
git fetch --prune origin
git pull --ff-only origin feature/neurofrigo-knowledge-hub
NEW_HEAD="$(git rev-parse --short HEAD)"
echo "NEW_HEAD=$NEW_HEAD"

echo "=== BUILD admin + bootstrap ==="
export DOCKER_BUILDKIT=1
docker compose -f docker/compose/staging.yml --env-file .env.staging \
  --profile bootstrap build admin admin-migrate
echo BUILD_OK

echo "=== MIGRATE ==="
docker compose -f docker/compose/staging.yml --env-file .env.staging \
  --profile bootstrap run --rm --no-deps admin-migrate
echo MIGRATE_OK

echo "=== SEED knowledge-hub-load ==="
docker compose -f docker/compose/staging.yml --env-file .env.staging \
  --profile bootstrap run --rm --no-deps \
  -e RETRIEVAL_EMBEDDING_PROVIDER="${RETRIEVAL_EMBEDDING_PROVIDER:-deterministic}" \
  --entrypoint sh admin-migrate -lc \
  'cd /app && /usr/local/bin/omnia-admin-bootstrap.sh knowledge-hub-load'
echo SEED_OK

echo "=== RECREATE admin ==="
docker compose -f docker/compose/staging.yml --env-file .env.staging \
  up -d --no-deps --force-recreate --no-build admin

for name in omnia-platform-admin-dev; do
  attempt=0
  while [ "$attempt" -lt 36 ]; do
    status="$(docker inspect --format '{{.State.Health.Status}}' "$name" 2>/dev/null || echo starting)"
    echo "health_$name=$status attempt=$attempt"
    [ "$status" = "healthy" ] && break
    [ "$status" = "unhealthy" ] && exit 22
    attempt=$((attempt + 1))
    sleep 5
  done
done

curl -fsS https://admin.dev.omniafrigo.com.br/api/health; echo
docker ps --filter name=omnia-landing --format 'landing={{.Image}} {{.Status}}'
docker ps --filter name=omnia-platform-admin-prod --format 'admin-prod={{.Status}}'
echo "E10_GO_RELOAD_OK HEAD=$NEW_HEAD"
