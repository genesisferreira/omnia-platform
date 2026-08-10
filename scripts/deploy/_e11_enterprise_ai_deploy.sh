#!/usr/bin/env bash
# Epic 11 Enterprise AI gap-close — staging only (sem prod/landing/CRM)
set -euo pipefail
cd /opt/omnia/platform

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="/opt/omnia/backups/staging/enterprise-ai-e11-${STAMP}"

echo "=== PRE ==="
hostname
pwd
git branch --show-current
PREV="$(git rev-parse --short HEAD)"
echo "PREV=$PREV"
docker ps --filter name=omnia-landing --format 'landing={{.Image}} {{.Status}}'
docker ps --filter name=omnia-platform-admin-prod --format 'admin-prod={{.Status}}'
docker ps --filter name=omnia-platform-web-prod --format 'web-prod={{.Status}}'
docker ps --filter name=omnia-lms-moodle-dev --format 'moodle={{.Status}}'

if git status --porcelain | grep -v '^??' | grep -q .; then
  echo "ABORT tracked changes"; git status --porcelain; exit 20
fi

echo "=== BACKUP ==="
mkdir -p "$BACKUP_DIR"
PG="$(docker ps --filter name=omnia-postgres --format '{{.Names}}' | head -n1)"
DB_NAME="${POSTGRES_DB:-omnia_staging}"
docker exec "$PG" pg_dump -U postgres -Fc "$DB_NAME" > "$BACKUP_DIR/omnia_staging.dump"
sha256sum "$BACKUP_DIR/omnia_staging.dump" > "$BACKUP_DIR/SHA256.txt"
{
  echo "stamp=$STAMP"
  echo "prev_head=$PREV"
  echo "branch=$(git branch --show-current)"
  echo "pg_cont=$PG"
  echo "db=$DB_NAME"
  cat "$BACKUP_DIR/SHA256.txt"
} > "$BACKUP_DIR/MANIFEST.txt"
echo "BACKUP_DIR=$BACKUP_DIR"

echo "=== PULL ==="
git fetch --prune origin
git pull --ff-only origin feature/neurofrigo-knowledge-hub
NEW_HEAD="$(git rev-parse --short HEAD)"
echo "NEW_HEAD=$NEW_HEAD"

echo "=== BUILD admin + web + bootstrap ==="
export DOCKER_BUILDKIT=1
docker compose -f docker/compose/staging.yml --env-file .env.staging \
  --profile bootstrap build admin web admin-migrate
echo BUILD_OK

echo "=== MIGRATE + SEED + HOMOLOG EPIC11 ==="
docker compose -f docker/compose/staging.yml --env-file .env.staging \
  --profile bootstrap run --rm --no-deps \
  -e NEUROFRIGO_LLM_PROVIDER=grounded \
  --entrypoint sh admin-migrate -lc \
  'cd /app && /usr/local/bin/omnia-admin-bootstrap.sh enterprise-ai-epic11'
echo SEED_HOMOLOG_OK

echo "=== RECREATE admin + web (DEV only) ==="
docker compose -f docker/compose/staging.yml --env-file .env.staging \
  up -d --no-deps --force-recreate --no-build admin web

for name in omnia-platform-admin-dev omnia-platform-web-dev; do
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
curl -fsS -o /dev/null -w "web_http=%{http_code}\n" https://dev.omniafrigo.com.br/ || true
docker ps --filter name=omnia-landing --format 'landing={{.Image}} {{.Status}}'
docker ps --filter name=omnia-platform-admin-prod --format 'admin-prod={{.Status}}'
docker ps --filter name=omnia-platform-web-prod --format 'web-prod={{.Status}}'
docker ps --filter name=omnia-lms-moodle-dev --format 'moodle={{.Status}}'
echo "E11_DEPLOY_OK HEAD=$NEW_HEAD BACKUP_DIR=$BACKUP_DIR"
