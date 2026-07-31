# Omnia LMS — Monitoring

## Endpoints

| Endpoint | Descrição |
|----------|-----------|
| `GET /api/metrics` | Prometheus text exposition |
| `GET /api/omnia/lms/health` | Health expandido do connector |
| `GET /api/health` | Health do processo Admin |
| `GET /api/status` | Status da plataforma |

## Métricas Prometheus (principais)

### Infra / HTTP
- `http_requests_total`
- `http_request_duration_seconds`
- `http_errors_total`
- `redis_operations_total`
- `redis_latency_seconds`
- `moodle_requests_total`
- `moodle_request_duration_seconds`
- `moodle_errors_total`

### Connector
- `connector_cache_hit_total` / `connector_cache_miss_total`
- `connector_active_sessions`
- `connector_revoked_sessions`
- `connector_policy_updates`
- `connector_identity_links`
- `connector_health_status` (1 healthy / 0.5 degraded / 0.25 disabled / 0 unhealthy)

### Negócio (independentes do schema Moodle)
- `lms_students_online`
- `lms_courses_opened`
- `lms_lessons_started` / `lms_lessons_completed`
- `lms_progress_requests` / `lms_grade_requests` / `lms_completion_requests`
- `lms_login_success` / `lms_login_failure`
- `lms_session_revocations`
- `lms_policy_changes`
- `lms_identity_links`
- `lms_api_errors`

## Stack Docker (DEV)

```bash
docker compose -f docker/observability/compose.yml --env-file .env.staging up -d
```

- Prometheus: `http://<host>:9090`
- Grafana: `http://<host>:3005`
- OTel Collector OTLP HTTP: `:4318`

Rede externa obrigatória: `omnia_internal` (mesma do staging).

## Variáveis

| Var | Uso |
|-----|-----|
| `METRICS_SCRAPE_TOKEN` | Protege `/api/metrics` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Ex.: `http://omnia-otel-collector-dev:4318` |
| `OTEL_SERVICE_NAME` | Default `omnia-admin` |
| `OTEL_LOG_SPANS` | `true` para logar spans OK |
| `GRAFANA_ADMIN_USER` / `GRAFANA_ADMIN_PASSWORD` | Grafana |

## Dashboards Grafana

1. Infraestrutura
2. Connector
3. Sessões
4. Acadêmico
5. Segurança

Provisionados em `docker/observability/grafana/dashboards/`.
