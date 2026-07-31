#!/usr/bin/env bash
# Deploy + smoke Omnia LMS Observability no DEV (VPS).
# Executar em /opt/omnia/platform como root.
# NÃO imprimir secrets. NÃO tocar produção.
set -euo pipefail

cd /opt/omnia/platform
EXPECTED_TIP="${1:-}"

echo "=== 1. PREFLIGHT ==="
PREV_HEAD="$(git rev-parse --short HEAD)"
PREV_ADMIN_IMAGE="$(docker inspect --format '{{.Image}}' omnia-platform-admin-dev 2>/dev/null || echo none)"
echo "PREV_HEAD=${PREV_HEAD}"
echo "PREV_ADMIN_IMAGE=${PREV_ADMIN_IMAGE}"
echo "BRANCH=$(git branch --show-current)"
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "STOP: tracked local changes"
  git status --short --untracked-files=no
  exit 20
fi

echo "=== 2. GIT UPDATE ==="
git fetch --prune origin
git checkout feature/omnia-lms-observability
git pull --ff-only origin feature/omnia-lms-observability
NEW_HEAD="$(git rev-parse --short HEAD)"
REMOTE_HEAD="$(git rev-parse --short origin/feature/omnia-lms-observability)"
echo "NEW_HEAD=${NEW_HEAD}"
echo "REMOTE_HEAD=${REMOTE_HEAD}"
test "${NEW_HEAD}" = "${REMOTE_HEAD}"
if [ -n "${EXPECTED_TIP}" ]; then
  test "${NEW_HEAD}" = "${EXPECTED_TIP}" || test "$(git rev-parse HEAD)" = "${EXPECTED_TIP}"
fi

echo "=== 3. METRICS TOKEN (presence only) ==="
mkdir -p /opt/omnia/secrets
TOKEN_FILE=/opt/omnia/secrets/metrics_scrape_token.txt
if [ ! -s "${TOKEN_FILE}" ]; then
  openssl rand -hex 32 >"${TOKEN_FILE}"
  chmod 600 "${TOKEN_FILE}"
  echo "TOKEN_FILE=created"
else
  echo "TOKEN_FILE=present"
  chmod 600 "${TOKEN_FILE}" || true
fi
TOKEN="$(tr -d '\n\r' <"${TOKEN_FILE}")"
if grep -q '^METRICS_SCRAPE_TOKEN=' .env.staging; then
  # shellcheck disable=SC2016
  sed -i "s|^METRICS_SCRAPE_TOKEN=.*|METRICS_SCRAPE_TOKEN=${TOKEN}|" .env.staging
else
  printf '\nMETRICS_SCRAPE_TOKEN=%s\n' "${TOKEN}" >>.env.staging
fi
unset TOKEN
if ! grep -q '^APP_ENV=' .env.staging; then
  printf '\nAPP_ENV=staging\n' >>.env.staging
fi
if ! grep -q '^OTEL_EXPORTER_OTLP_ENDPOINT=' .env.staging; then
  printf '\nOTEL_EXPORTER_OTLP_ENDPOINT=http://omnia-otel-collector-dev:4318\n' >>.env.staging
fi
if ! grep -q '^OTEL_SERVICE_NAME=' .env.staging; then
  printf '\nOTEL_SERVICE_NAME=omnia-admin\n' >>.env.staging
fi
if ! grep -q '^GRAFANA_ADMIN_PASSWORD=' .env.staging; then
  GFW="$(openssl rand -hex 16)"
  printf '\nGRAFANA_ADMIN_USER=omnia_obs\nGRAFANA_ADMIN_PASSWORD=%s\n' "${GFW}" >>.env.staging
  unset GFW
  echo "GRAFANA_PASSWORD=generated_into_env"
else
  echo "GRAFANA_PASSWORD=present"
fi
# Presence audit (sem valores)
for k in APP_ENV NODE_ENV REDIS_URL MOODLE_CONNECTOR_ENABLED MOODLE_CONNECTOR_READ_ONLY \
  OTEL_EXPORTER_OTLP_ENDPOINT OTEL_SERVICE_NAME METRICS_SCRAPE_TOKEN GRAFANA_ADMIN_USER GRAFANA_ADMIN_PASSWORD; do
  if grep -q "^${k}=" .env.staging; then echo "ENV_${k}=present"; else echo "ENV_${k}=missing"; fi
done

echo "=== 4. BACKUP ==="
echo "sem migration nesta etapa — backup DB não obrigatório pelo runbook de observabilidade"

echo "=== 5. BUILD ADMIN ==="
export DOCKER_BUILDKIT=1
docker compose -f docker/compose/staging.yml --env-file .env.staging build admin

echo "=== 6. RECREATE ADMIN ==="
docker compose -f docker/compose/staging.yml --env-file .env.staging up -d --no-build --force-recreate admin

wait_healthy() {
  local c="$1"
  local i
  for i in $(seq 1 48); do
    st="$(docker inspect --format '{{.State.Health.Status}}' "${c}" 2>/dev/null || echo missing)"
    echo "health_${c}=${st} attempt=${i}"
    [ "${st}" = healthy ] && return 0
    [ "${st}" = unhealthy ] && return 1
    sleep 5
  done
  return 1
}
wait_healthy omnia-platform-admin-dev
docker compose -f docker/compose/staging.yml --env-file .env.staging ps

echo "=== 7. OBSERVABILITY STACK ==="
docker compose -f docker/observability/compose.yml --env-file .env.staging up -d
sleep 8
docker ps --filter name=omnia-prometheus-dev --filter name=omnia-grafana-dev --filter name=omnia-otel-collector-dev --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

echo "=== 8. SMOKE INTERNAL ==="
# Metrics: público sem token deve falhar
PUB_CODE="$(curl -sS -o /tmp/metrics_pub.txt -w '%{http_code}' https://admin.dev.omniafrigo.com.br/api/metrics || true)"
echo "PUBLIC_METRICS_HTTP=${PUB_CODE}"
TOKEN="$(tr -d '\n\r' </opt/omnia/secrets/metrics_scrape_token.txt)"
INT_CODE="$(docker exec omnia-platform-admin-dev node -e "
const t=process.env.METRICS_SCRAPE_TOKEN;
fetch('http://127.0.0.1:3000/api/metrics',{headers:{Authorization:'Bearer '+t}})
  .then(async r=>{const b=await r.text(); console.log('INT_METRICS_HTTP='+r.status); console.log('INT_METRICS_HAS_HTTP_TOTAL='+(b.includes('http_requests_total')?'yes':'no')); console.log('INT_METRICS_HAS_SECRET='+(/(wstoken|password|authorization)/i.test(b)?'yes':'no'));})
  .catch(e=>{console.log('INT_METRICS_ERR='+e.message); process.exit(1);});
")"
echo "${INT_CODE}"
unset TOKEN

HEALTH="$(curl -sS https://admin.dev.omniafrigo.com.br/api/omnia/lms/health)"
echo "HEALTH_LEN=${#HEALTH}"
echo "${HEALTH}" | grep -q '"status"' && echo HEALTH_HAS_STATUS=yes
echo "${HEALTH}" | grep -q '"redis"' && echo HEALTH_HAS_REDIS=yes || echo HEALTH_HAS_REDIS=no
echo "${HEALTH}" | grep -qi 'wstoken\|password\|authorization' && echo HEALTH_LEAK=yes || echo HEALTH_LEAK=no
TRACE_H="$(curl -sSI https://admin.dev.omniafrigo.com.br/api/omnia/lms/health | tr -d '\r' | grep -iE '^(traceparent|x-request-id|x-trace-id):' || true)"
echo "TRACE_HEADERS:"
echo "${TRACE_H}"

PROM_UP="$(docker exec omnia-prometheus-dev wget -qO- 'http://127.0.0.1:9090/api/v1/targets' 2>/dev/null | head -c 400 || true)"
echo "PROM_TARGETS_SNIPPET_LEN=${#PROM_UP}"
docker exec omnia-prometheus-dev wget -qO- 'http://127.0.0.1:9090/api/v1/rules' 2>/dev/null | grep -c 'ConnectorHealthDown' >/tmp/rules_count || true
echo "ALERT_RULE_CONNECTOR_HEALTH=$(cat /tmp/rules_count 2>/dev/null || echo 0)"

echo "=== DONE ==="
echo "IMPLANTED_HEAD=${NEW_HEAD}"
echo "ROLLBACK_HEAD=${PREV_HEAD}"
echo "ROLLBACK_ADMIN_IMAGE=${PREV_ADMIN_IMAGE}"
