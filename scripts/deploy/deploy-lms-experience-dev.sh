#!/usr/bin/env bash
# Deploy Omnia LMS Experience MVP (web only) no DEV.
# Executar em /opt/omnia/platform como root.
# NÃO imprimir secrets. NÃO tocar produção / NÃO rebuild admin.
set -euo pipefail

cd /opt/omnia/platform
BRANCH="${1:-feature/omnia-lms-experience-mvp}"
EXPECTED_TIP="${2:-}"

echo "=== 1. PREFLIGHT ==="
PREV_HEAD="$(git rev-parse --short HEAD)"
PREV_WEB_IMAGE="$(docker inspect --format '{{.Image}}' omnia-platform-web-dev 2>/dev/null || echo none)"
echo "PREV_HEAD=${PREV_HEAD}"
echo "PREV_WEB_IMAGE=${PREV_WEB_IMAGE}"
echo "BRANCH_NOW=$(git branch --show-current)"
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "STOP: tracked local changes"
  git status --short --untracked-files=no
  exit 20
fi

echo "=== 2. GIT UPDATE ==="
git fetch --prune origin
git checkout "${BRANCH}"
git pull --ff-only "origin" "${BRANCH}"
NEW_HEAD="$(git rev-parse --short HEAD)"
REMOTE_HEAD="$(git rev-parse --short "origin/${BRANCH}")"
echo "NEW_HEAD=${NEW_HEAD}"
echo "REMOTE_HEAD=${REMOTE_HEAD}"
test "${NEW_HEAD}" = "${REMOTE_HEAD}"
if [ -n "${EXPECTED_TIP}" ]; then
  test "${NEW_HEAD}" = "${EXPECTED_TIP}" || test "$(git rev-parse HEAD)" = "${EXPECTED_TIP}"
fi

echo "=== 3. ENV PRESENCE (no values) ==="
for k in OMNIA_INTERNAL_API_SECRET NEXT_PUBLIC_ADMIN_URL NEXT_PUBLIC_APP_URL; do
  if grep -q "^${k}=." .env.staging 2>/dev/null; then echo "ENV_${k}=present"; else echo "ENV_${k}=missing"; fi
done
if grep -q '^INTERNAL_ADMIN_URL=.' .env.staging 2>/dev/null; then
  echo "ENV_INTERNAL_ADMIN_URL=present"
else
  echo "ENV_INTERNAL_ADMIN_URL=absent_ok_fallback_public"
fi

echo "=== 4. BUILD WEB ONLY ==="
docker compose -f docker/compose/staging.yml --env-file .env.staging build web
docker compose -f docker/compose/staging.yml --env-file .env.staging up -d --no-deps web

echo "=== 5. HEALTH ==="
sleep 8
docker compose -f docker/compose/staging.yml --env-file .env.staging ps web
curl -fsS -o /dev/null -w "web_root=%{http_code}\n" https://dev.omniafrigo.com.br/ || true
# /lms exige auth → esperamos redirect/401/303, não 500
LMS_CODE="$(curl -sS -o /dev/null -w '%{http_code}' https://dev.omniafrigo.com.br/lms || true)"
echo "lms_http=${LMS_CODE}"
case "${LMS_CODE}" in
  200|302|303|307|308|401|403) echo "lms_route=reachable" ;;
  *) echo "lms_route=unexpected"; exit 30 ;;
esac

NEW_WEB_IMAGE="$(docker inspect --format '{{.Image}}' omnia-platform-web-dev 2>/dev/null || echo none)"
echo "NEW_HEAD=${NEW_HEAD}"
echo "NEW_WEB_IMAGE=${NEW_WEB_IMAGE}"
echo "PROD_UNTOUCHED=yes"
echo "GO_CANDIDATE=yes"
