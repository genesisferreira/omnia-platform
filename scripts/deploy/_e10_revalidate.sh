#!/usr/bin/env bash
# Epic 10 — revalidação final staging (backup + pull + seed + homolog)
set -euo pipefail
cd /opt/omnia/platform

echo "=== PRE ==="
hostname
pwd
git branch --show-current
PREV="$(git rev-parse --short HEAD)"
echo "PREV=$PREV"
docker ps --filter name=omnia-landing --format 'landing={{.Image}} {{.Status}}'
docker ps --filter name=omnia-platform-admin-prod --format 'admin-prod={{.Status}}'
docker ps --filter name=omnia-platform-web-prod --format 'web-prod={{.Status}}'
docker ps --filter name=omnia-platform-admin-dev --format 'admin-dev={{.Status}}'
docker ps --filter name=omnia-platform-web-dev --format 'web-dev={{.Status}}'

if git status --porcelain | grep -v '^??' | grep -q .; then
  echo "ABORT tracked changes"; git status --porcelain; exit 20
fi

echo "=== BACKUP omnia_staging ==="
STAMP="$(date +%Y%m%d-%H%M%S)"
BKDIR="/opt/omnia/backups/staging/knowledge-hub-e10-${STAMP}"
mkdir -p "$BKDIR"

# Resolve staging postgres from DATABASE_URL without sourcing whole env (special chars).
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

DATABASE_URL="$(env_get DATABASE_URL)"
python3 - <<'PY' "$DATABASE_URL" > /tmp/_e10_db_meta.env
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
source /tmp/_e10_db_meta.env
rm -f /tmp/_e10_db_meta.env

PG_CONT="$(docker ps --format '{{.Names}}' | grep -E 'postgres|pg' | grep -vi prod | head -n1 || true)"
if [ -z "$PG_CONT" ]; then
  PG_CONT="$(docker compose -f docker/compose/staging.yml --env-file .env.staging ps -q postgres 2>/dev/null | head -n1 || true)"
  if [ -n "$PG_CONT" ]; then PG_CONT="$(docker inspect --format '{{.Name}}' "$PG_CONT" | sed 's#^/##')"; fi
fi
if [ -z "$PG_CONT" ]; then echo "ABORT no staging postgres"; exit 21; fi
if [[ "$PG_CONT" == *prod* ]]; then echo "ABORT refusing prod postgres"; exit 21; fi
echo "PG_CONT=$PG_CONT DB_NAME=$DB_NAME DB_USER=$DB_USER"

export PGPASSWORD="$DB_PASS"
docker exec -e PGPASSWORD="$PGPASSWORD" "$PG_CONT" \
  pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc -f "/tmp/omnia_staging_e10_${STAMP}.dump"
docker cp "$PG_CONT:/tmp/omnia_staging_e10_${STAMP}.dump" "$BKDIR/omnia_staging.dump"
docker exec "$PG_CONT" rm -f "/tmp/omnia_staging_e10_${STAMP}.dump"
unset PGPASSWORD
cp -a .env.staging "$BKDIR/env.staging.copy" 2>/dev/null || true
{
  echo "stamp=$STAMP"
  echo "prev_head=$PREV"
  echo "branch=$(git branch --show-current)"
  echo "pg_cont=$PG_CONT"
  echo "db=$DB_NAME"
  sha256sum "$BKDIR/omnia_staging.dump"
  ls -lah "$BKDIR"
} | tee "$BKDIR/MANIFEST.txt"
echo "BACKUP_DIR=$BKDIR"

echo "=== PULL ==="
git fetch --prune origin
git pull --ff-only origin feature/neurofrigo-knowledge-hub
NEW_HEAD="$(git rev-parse --short HEAD)"
echo "NEW_HEAD=$NEW_HEAD"
# exige fix de workflow
git merge-base --is-ancestor 47aa36c HEAD
echo "ANCESTOR_47aa36c_OK"

echo "=== BUILD admin-migrate (+ admin for recreate) ==="
export DOCKER_BUILDKIT=1
docker compose -f docker/compose/staging.yml --env-file .env.staging \
  --profile bootstrap build admin admin-migrate
echo BUILD_OK

echo "=== SEED knowledge-hub-load ==="
docker compose -f docker/compose/staging.yml --env-file .env.staging \
  --profile bootstrap run --rm --no-deps \
  -e RETRIEVAL_EMBEDDING_PROVIDER="${RETRIEVAL_EMBEDDING_PROVIDER:-deterministic}" \
  --entrypoint sh admin-migrate -lc \
  'cd /app && /usr/local/bin/omnia-admin-bootstrap.sh knowledge-hub-load'
echo SEED_OK

echo "=== HOMOLOG retrieval + runtime smoke ==="
docker compose -f docker/compose/staging.yml --env-file .env.staging \
  --profile bootstrap run --rm --no-deps \
  -e RETRIEVAL_EMBEDDING_PROVIDER="${RETRIEVAL_EMBEDDING_PROVIDER:-deterministic}" \
  --entrypoint sh admin-migrate -lc \
  'cd /app && pnpm --filter @omnia/admin exec tsx src/scripts/homolog-e10-knowledge-hub.ts'
echo HOMOLOG_OK

echo "=== RECREATE admin (reload) ==="
docker compose -f docker/compose/staging.yml --env-file .env.staging \
  up -d --no-deps --force-recreate --no-build admin

for attempt in $(seq 0 35); do
  status="$(docker inspect --format '{{.State.Health.Status}}' omnia-platform-admin-dev 2>/dev/null || echo starting)"
  echo "health_admin=$status attempt=$attempt"
  [ "$status" = "healthy" ] && break
  [ "$status" = "unhealthy" ] && exit 22
  sleep 5
done

curl -fsS https://admin.dev.omniafrigo.com.br/api/health; echo
curl -fsS -o /dev/null -w "web_http=%{http_code}\n" https://dev.omniafrigo.com.br/ || true
docker inspect omnia-platform-web-dev --format 'web={{.State.Health.Status}}' 2>/dev/null || true
docker ps --filter name=omnia-landing --format 'landing={{.Image}} {{.Status}}'
docker ps --filter name=omnia-platform-admin-prod --format 'admin-prod={{.Status}}'
docker ps --filter name=omnia-platform-web-prod --format 'web-prod={{.Status}}'
echo "E10_REVALIDATE_OK HEAD=$NEW_HEAD BACKUP_DIR=$BKDIR"
