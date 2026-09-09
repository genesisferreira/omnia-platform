#!/usr/bin/env bash
# RC2.1 — Staging activation: backup + deploy exact SHA (Web/Admin).
# STAGING ONLY. No production. No force push. No secrets in stdout.
#
# Usage (on authorized host):
#   bash scripts/deploy/_rc2_staging_activate.sh <RC21_SHA> [branch]
#
set -euo pipefail
cd /opt/omnia/platform

RC_SHA="${1:?RC21_SHA required}"
RC_BRANCH="${2:-release/rc2-2026-09-08}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
BACKUP_DIR="/opt/omnia/backups/staging/rc21-${STAMP}"
mkdir -p "$BACKUP_DIR" /tmp/rc21_gate

echo "=== RC2.1 PRE STATE ==="
echo "UTC=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
PREV_BRANCH="$(git branch --show-current || true)"
PREV_HEAD="$(git rev-parse HEAD)"
echo "PREV_BRANCH=$PREV_BRANCH"
echo "PREV_HEAD=$PREV_HEAD"
echo "RC_SHA=$RC_SHA"
echo "RC_BRANCH=$RC_BRANCH"
echo "BACKUP_DIR=$BACKUP_DIR"
echo "$PREV_HEAD" > "$BACKUP_DIR/PREV_HEAD.txt"
echo "$PREV_BRANCH" > "$BACKUP_DIR/PREV_BRANCH.txt"
date -u +%Y-%m-%dT%H:%M:%SZ > "$BACKUP_DIR/UTC.txt"

curl -fsS https://dev.omniafrigo.com.br/api/health | tee "$BACKUP_DIR/web_health_before.json"; echo
curl -fsS https://admin.dev.omniafrigo.com.br/api/health | tee "$BACKUP_DIR/admin_health_before.json"; echo

python3 - <<PY
import json
from pathlib import Path
w=json.load(open("$BACKUP_DIR/web_health_before.json"))
a=json.load(open("$BACKUP_DIR/admin_health_before.json"))
Path("$BACKUP_DIR/sha_before.txt").write_text(
  f"STAGING_WEB_SHA_BEFORE={w.get('gitSha')}\nSTAGING_ADMIN_SHA_BEFORE={a.get('gitSha')}\n"
)
print(Path("$BACKUP_DIR/sha_before.txt").read_text())
PY

docker ps --format '{{.Names}}\t{{.Image}}\t{{.Status}}' | tee "$BACKUP_DIR/containers_before.txt"
docker volume ls | tee "$BACKUP_DIR/volumes_before.txt"
docker inspect omnia-platform-admin-dev --format '{{json .Mounts}}' | tee "$BACKUP_DIR/admin_mounts_before.json" || true

echo "=== MEDIA FORENSICS BEFORE ==="
{
  echo "ADMIN_MOUNTS:"
  docker inspect omnia-platform-admin-dev --format '{{range .Mounts}}{{.Source}} -> {{.Destination}} ({{.Type}}){{"\n"}}{{end}}' || true
  echo "MEDIA_LS_APP_MEDIA:"
  docker exec omnia-platform-admin-dev sh -c 'ls -la /app/media 2>/dev/null | head -50; echo COUNT=$(ls -1 /app/media 2>/dev/null | wc -l)' || true
  echo "MEDIA_LS_APPS_ADMIN_MEDIA:"
  docker exec omnia-platform-admin-dev sh -c 'ls -la /app/apps/admin/media 2>/dev/null | head -50; echo COUNT=$(ls -1 /app/apps/admin/media 2>/dev/null | wc -l)' || true
  echo "PAYLOAD_MEDIA_DIR_ENV:"
  docker exec omnia-platform-admin-dev sh -c 'echo PAYLOAD_MEDIA_DIR=${PAYLOAD_MEDIA_DIR:-UNSET}' || true
} | tee "$BACKUP_DIR/media_forensics_before.txt"

echo "=== MEDIA RECONCILE DRY-RUN (idempotent) ==="
bash scripts/deploy/_rc21_media_reconcile.sh --dry-run | tee "$BACKUP_DIR/media_reconcile_before.txt" || true

echo "=== BACKUP STAGING DB ==="
DB_URL=$(grep -E '^DATABASE_URL=' .env.staging | head -n1 | cut -d= -f2- | tr -d '"' | tr -d "'")
USER=$(echo "$DB_URL" | sed -E 's#^postgres(ql)?://([^:]+):.*#\2#')
PASS=$(echo "$DB_URL" | sed -E 's#^postgres(ql)?://[^:]+:([^@]+)@.*#\2#')
DB=$(echo "$DB_URL" | sed -E 's#.*/([^/?]+).*#\1#')
echo "DB_NAME=$DB" | tee "$BACKUP_DIR/DATABASE.txt"
docker exec -e PGPASSWORD="$PASS" omnia-postgres pg_dump -U "$USER" -d "$DB" -Fc -f /tmp/omnia_staging_rc21.dump
docker cp omnia-postgres:/tmp/omnia_staging_rc21.dump "$BACKUP_DIR/omnia_staging.dump"
docker exec omnia-postgres rm -f /tmp/omnia_staging_rc21.dump
unset PASS
sha256sum "$BACKUP_DIR/omnia_staging.dump" | tee "$BACKUP_DIR/omnia_staging.dump.sha256"
ls -lah "$BACKUP_DIR/omnia_staging.dump"
test -s "$BACKUP_DIR/omnia_staging.dump"
echo "STAGING_BACKUP=PASS"

PASS2=$(grep -E '^DATABASE_URL=' .env.staging | head -n1 | cut -d= -f2- | tr -d '"' | tr -d "'" | sed -E 's#^postgres(ql)?://[^:]+:([^@]+)@.*#\2#')
docker exec -e PGPASSWORD="$PASS2" omnia-postgres \
  psql -U "$USER" -d "$DB" -Atc "SELECT COUNT(*) FROM media;" | tee "$BACKUP_DIR/media_db_count.txt" || echo "MEDIA_DB_COUNT=NA" > "$BACKUP_DIR/media_db_count.txt"
docker exec -e PGPASSWORD="$PASS2" omnia-postgres \
  psql -U "$USER" -d "$DB" -Atc "SELECT name FROM payload_migrations ORDER BY name;" \
  > "$BACKUP_DIR/staging_migrations_before.txt" || true
unset PASS2

echo "=== GIT ALIGN TO RC2.1 ==="
if git status --porcelain | grep -v '^??' | grep -q .; then
  echo "ABORT: tracked modifications on VPS"
  git status --porcelain | head -40
  exit 20
fi
git fetch origin
git checkout -B "$RC_BRANCH" "origin/$RC_BRANCH"
git reset --hard "$RC_SHA"
test "$(git rev-parse HEAD)" = "$RC_SHA"
echo "STAGING_GIT_SHA=$(git rev-parse HEAD)"

# Ensure PAYLOAD_MEDIA_DIR in env.staging if missing (no secret print)
if ! grep -q '^PAYLOAD_MEDIA_DIR=' .env.staging 2>/dev/null; then
  echo 'PAYLOAD_MEDIA_DIR=/app/media' >> .env.staging
  echo "ADDED_PAYLOAD_MEDIA_DIR=YES" | tee -a "$BACKUP_DIR/media_forensics_before.txt"
else
  echo "PAYLOAD_MEDIA_DIR_ALREADY_SET=YES" | tee -a "$BACKUP_DIR/media_forensics_before.txt"
fi

export GIT_SHA="$RC_SHA"
export APP_VERSION="$RC_SHA"

echo "=== MIGRATE STAGING ==="
docker compose -f docker/compose/staging.yml --env-file .env.staging --profile bootstrap run --rm \
  -e GIT_SHA="$RC_SHA" \
  admin-migrate migrate 2>&1 | tee "$BACKUP_DIR/migrate.log" | tail -n 40

echo "=== BUILD ADMIN+WEB ==="
GIT_SHA="$RC_SHA" APP_VERSION="$RC_SHA" \
  docker compose -f docker/compose/staging.yml --env-file .env.staging \
  up -d --build --no-deps admin web 2>&1 | tee "$BACKUP_DIR/up.log" | tail -n 80

echo "=== HEALTH WAIT ==="
for i in $(seq 1 40); do
  if curl -fsS https://admin.dev.omniafrigo.com.br/api/health >/tmp/rc21_admin_health.json \
    && curl -fsS https://dev.omniafrigo.com.br/api/health >/tmp/rc21_web_health.json; then
    break
  fi
  sleep 8
done
cp /tmp/rc21_admin_health.json "$BACKUP_DIR/admin_health_after.json" 2>/dev/null || true
cp /tmp/rc21_web_health.json "$BACKUP_DIR/web_health_after.json" 2>/dev/null || true

python3 - <<PY
import json,sys
from pathlib import Path
exp="$RC_SHA"
w=json.loads(Path("/tmp/rc21_web_health.json").read_text())
a=json.loads(Path("/tmp/rc21_admin_health.json").read_text())
print("STAGING_WEB_SHA="+str(w.get("gitSha")))
print("STAGING_ADMIN_SHA="+str(a.get("gitSha")))
print("WEB_STATUS="+str(w.get("status")))
print("ADMIN_STATUS="+str(a.get("status")))
print("WEB_DB="+str((w.get("checks") or {}).get("database")))
print("ADMIN_DB="+str((a.get("checks") or {}).get("database")))
ok = w.get("gitSha")==exp and a.get("gitSha")==exp and w.get("status") in ("healthy","degraded") and a.get("status")=="healthy"
print("STAGING_SHA_MATCH="+("YES" if ok else "NO"))
Path("$BACKUP_DIR/sha_after.txt").write_text(
  f"STAGING_WEB_SHA={w.get('gitSha')}\nSTAGING_ADMIN_SHA={a.get('gitSha')}\nSTAGING_SHA_MATCH={'YES' if ok else 'NO'}\n"
)
if not ok:
    raise SystemExit(31)
PY

{
  echo "ADMIN_MOUNTS_AFTER:"
  docker inspect omnia-platform-admin-dev --format '{{range .Mounts}}{{.Source}} -> {{.Destination}} ({{.Type}}){{"\n"}}{{end}}' || true
  echo "MEDIA_PROOF:"
  docker exec omnia-platform-admin-dev sh -c 'echo PAYLOAD_MEDIA_DIR=${PAYLOAD_MEDIA_DIR:-UNSET}; ls -la /app/media 2>/dev/null | head -30; echo COUNT=$(ls -1 /app/media 2>/dev/null | wc -l); mount | grep media || true' || true
} | tee "$BACKUP_DIR/media_forensics_after.txt"

docker ps --format '{{.Names}}\t{{.Image}}\t{{.Status}}' | tee "$BACKUP_DIR/containers_after.txt"
echo "STAGING_GIT_SHA=$(git rev-parse HEAD)"
echo "BACKUP_DIR=$BACKUP_DIR"
echo "RC21_STAGING_ACTIVATION_DONE"
