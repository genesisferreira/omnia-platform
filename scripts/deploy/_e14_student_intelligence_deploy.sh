#!/usr/bin/env bash
# Epic 14 Student Intelligence Platform — staging only
set -euo pipefail
cd /opt/omnia/platform

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="/opt/omnia/backups/staging/student-intelligence-e14-${STAMP}"

env_get() {
  local key="$1"
  local line
  line="$(grep -E "^${key}=" .env.staging | tail -n1 || true)"
  [ -z "$line" ] && { echo ""; return 0; }
  local val="${line#*=}"
  val="${val%$'\r'}"
  if [[ "$val" == \"*\" ]]; then val="${val:1:-1}"; fi
  if [[ "$val" == \'*\' ]]; then val="${val:1:-1}"; fi
  printf '%s' "$val"
}

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
DATABASE_URL="$(env_get DATABASE_URL)"
python3 - <<'PY' "$DATABASE_URL" > /tmp/_e14_db_meta.env
import sys, urllib.parse
u = urllib.parse.urlparse(sys.argv[1])
db = (u.path or "").lstrip("/").split("?")[0]
if db != "omnia_staging":
    raise SystemExit(f"ABORT unexpected db={db!r}")
print(f"DB_NAME={db}")
print(f"DB_USER={u.username or 'postgres'}")
print(f"DB_PASS={u.password or ''}")
PY
# shellcheck disable=SC1091
source /tmp/_e14_db_meta.env
rm -f /tmp/_e14_db_meta.env

PG_CONT="$(docker ps --format '{{.Names}}' | grep -E 'postgres|pg' | grep -vi prod | head -n1 || true)"
if [ -z "$PG_CONT" ]; then echo "ABORT no staging postgres"; exit 21; fi
export PGPASSWORD="$DB_PASS"
docker exec -e PGPASSWORD="$PGPASSWORD" "$PG_CONT" \
  pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc -f "/tmp/omnia_staging_e14_${STAMP}.dump"
docker cp "$PG_CONT:/tmp/omnia_staging_e14_${STAMP}.dump" "$BACKUP_DIR/omnia_staging.dump"
docker exec "$PG_CONT" rm -f "/tmp/omnia_staging_e14_${STAMP}.dump"
unset PGPASSWORD
{
  echo "stamp=$STAMP"
  echo "prev_head=$PREV"
  echo "branch=$(git branch --show-current)"
  echo "pg_cont=$PG_CONT"
  echo "db=$DB_NAME"
  sha256sum "$BACKUP_DIR/omnia_staging.dump"
} | tee "$BACKUP_DIR/MANIFEST.txt"
echo "BACKUP_DIR=$BACKUP_DIR"

echo "=== PULL ==="
git fetch --prune origin
git pull --ff-only origin feature/neurofrigo-knowledge-hub
NEW_HEAD="$(git rev-parse --short HEAD)"
echo "NEW_HEAD=$NEW_HEAD"

echo "=== BUILD ==="
export DOCKER_BUILDKIT=1
docker compose -f docker/compose/staging.yml --env-file .env.staging \
  --profile bootstrap build admin web admin-migrate
echo BUILD_OK

echo "=== MIGRATE + SEED + HOMOLOG ==="
docker compose -f docker/compose/staging.yml --env-file .env.staging \
  --profile bootstrap run --rm --no-deps \
  -e NEUROFRIGO_LLM_PROVIDER=grounded \
  --entrypoint sh admin-migrate -lc \
  'cd /app && /usr/local/bin/omnia-admin-bootstrap.sh student-intelligence-epic14'
echo SEED_HOMOLOG_OK

echo "=== RECREATE admin + web ==="
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
echo "E14_DEPLOY_OK HEAD=$NEW_HEAD BACKUP_DIR=$BACKUP_DIR"
