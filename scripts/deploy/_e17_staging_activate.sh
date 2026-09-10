#!/usr/bin/env bash
# Epic 17 Knowledge Governance — STAGING ONLY. Never touch production.
set -euo pipefail
cd /opt/omnia/platform
RC_SHA="${1:?usage: _e17_staging_activate.sh <sha> [branch]}"
RC_BRANCH="${2:-feature/epic17-knowledge-governance}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
BACKUP_DIR="/opt/omnia/backups/staging/epic17-${STAMP}"
mkdir -p "$BACKUP_DIR"
exec > >(tee -a "$BACKUP_DIR/REPORT.txt") 2>&1

echo "UTC=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "EPIC17_SHA=$RC_SHA"
echo "EPIC17_BRANCH=$RC_BRANCH"
echo "PRODUCTION_DEPLOY=NOT_AUTHORIZED"

if git status --porcelain --untracked-files=no | grep -q .; then
  echo "ABORT: tracked dirty"
  git status --porcelain --untracked-files=no | head -40
  exit 20
fi
echo "TRACKED_WORKTREE_CLEAN=YES"

DB_URL=$(grep -E '^DATABASE_URL=' .env.staging | head -n1 | cut -d= -f2- | tr -d '"' | tr -d "'")
DB_NAME=$(echo "$DB_URL" | sed -E 's#.*/([^/?]+).*#\1#')
DB_USER=$(echo "$DB_URL" | sed -E 's#^postgres(ql)?://([^:]+):.*#\2#')
PASS=$(echo "$DB_URL" | sed -E 's#^postgres(ql)?://[^:]+:([^@]+)@.*#\2#')
STAGING_DB_CONTAINER=omnia-postgres
echo "STAGING_DB_CONTAINER=$STAGING_DB_CONTAINER"
echo "STAGING_DB_NAME=$DB_NAME"
docker exec -e PGPASSWORD="$PASS" "$STAGING_DB_CONTAINER" \
  pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc -f /tmp/omnia_staging_e17.dump
docker cp "$STAGING_DB_CONTAINER:/tmp/omnia_staging_e17.dump" "$BACKUP_DIR/omnia_staging.dump"
docker exec "$STAGING_DB_CONTAINER" rm -f /tmp/omnia_staging_e17.dump
unset PASS
test -s "$BACKUP_DIR/omnia_staging.dump"
echo "BACKUP_PATH=$BACKUP_DIR/omnia_staging.dump"
echo "BACKUP_SIZE=$(wc -c < "$BACKUP_DIR/omnia_staging.dump" | tr -d ' ')"
echo "BACKUP_SHA256=$(sha256sum "$BACKUP_DIR/omnia_staging.dump" | awk '{print $1}')"
echo "BACKUP_VALID=PASS"

git fetch origin
git checkout -B "$RC_BRANCH" "origin/$RC_BRANCH"
git reset --hard "$RC_SHA"
test "$(git rev-parse HEAD)" = "$RC_SHA"
echo "STAGING_GIT_SHA=$(git rev-parse HEAD)"

export GIT_SHA="$RC_SHA"
export APP_VERSION="$RC_SHA"

docker compose -f docker/compose/staging.yml --env-file .env.staging --profile bootstrap run --rm \
  admin-migrate migrate 2>&1 | tee "$BACKUP_DIR/migrate.log" | tail -n 40

GIT_SHA="$RC_SHA" APP_VERSION="$RC_SHA" \
  docker compose -f docker/compose/staging.yml --env-file .env.staging \
  up -d --build --no-deps admin web 2>&1 | tee "$BACKUP_DIR/up.log" | tail -n 80

for i in $(seq 1 60); do
  if curl -fsS https://admin.dev.omniafrigo.com.br/api/health >/tmp/e17_admin.json \
    && curl -fsS https://dev.omniafrigo.com.br/api/health >/tmp/e17_web.json; then
    break
  fi
  sleep 8
done
cp /tmp/e17_admin.json "$BACKUP_DIR/admin_health.json" 2>/dev/null || true
cp /tmp/e17_web.json "$BACKUP_DIR/web_health.json" 2>/dev/null || true
python3 - <<PY
import json
from pathlib import Path
exp="$RC_SHA"
w=json.loads(Path("/tmp/e17_web.json").read_text())
a=json.loads(Path("/tmp/e17_admin.json").read_text())
print("STAGING_WEB_SHA="+str(w.get("gitSha")))
print("STAGING_ADMIN_SHA="+str(a.get("gitSha")))
ok=w.get("gitSha")==exp and a.get("gitSha")==exp
print("STAGING_SHA_MATCH="+("YES" if ok else "NO"))
print("WEB_HEALTH=PASS" if w.get("status") in ("healthy","degraded") else "WEB_HEALTH=FAIL")
print("ADMIN_HEALTH=PASS" if a.get("status")=="healthy" else "ADMIN_HEALTH=FAIL")
if not ok:
  raise SystemExit(31)
PY

cat > /tmp/e17_gitsha_override.yml <<YAML
services:
  admin:
    environment:
      GIT_SHA: "$RC_SHA"
      APP_VERSION: "$RC_SHA"
  web:
    environment:
      GIT_SHA: "$RC_SHA"
      APP_VERSION: "$RC_SHA"
YAML

GIT_SHA="$RC_SHA" APP_VERSION="$RC_SHA" \
  docker compose -f docker/compose/staging.yml --env-file .env.staging \
  -f /tmp/e17_gitsha_override.yml \
  up -d --no-deps --force-recreate admin web 2>&1 | tee -a "$BACKUP_DIR/up.log" | tail -n 30

for i in $(seq 1 40); do
  if curl -fsS https://admin.dev.omniafrigo.com.br/api/health >/tmp/e17_admin.json \
    && curl -fsS https://dev.omniafrigo.com.br/api/health >/tmp/e17_web.json; then
    break
  fi
  sleep 5
done
python3 - <<PY
import json
from pathlib import Path
exp="$RC_SHA"
w=json.loads(Path("/tmp/e17_web.json").read_text())
a=json.loads(Path("/tmp/e17_admin.json").read_text())
print("STAGING_WEB_SHA_AFTER="+str(w.get("gitSha")))
print("STAGING_ADMIN_SHA_AFTER="+str(a.get("gitSha")))
ok=w.get("gitSha")==exp and a.get("gitSha")==exp
print("STAGING_SHA_MATCH_AFTER="+("YES" if ok else "NO"))
if not ok:
  raise SystemExit(32)
PY

echo "EPIC17_STAGING_ACTIVATE_DONE"
echo "BACKUP_DIR=$BACKUP_DIR"
echo "PRODUCTION_DEPLOY=NOT_AUTHORIZED"
