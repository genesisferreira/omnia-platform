# Omnia LMS — Alerting & SLO

## SLO / SLA (targets)

| Indicador                  | Target             |
| -------------------------- | ------------------ |
| Disponibilidade plataforma | 99.9%              |
| Health endpoint            | 100% (processo up) |
| Connector                  | 99.9%              |
| Latência HTTP P95          | < 300 ms           |
| Latência Moodle P95        | < 800 ms           |
| Latência Redis P95         | < 20 ms            |
| Taxa de erro HTTP          | < 5% (burn)        |
| Cache hit rate             | ≥ 50% (info)       |

Constantes em código: `packages/monitoring/src/alerts/slo.ts`.

## Alertas Prometheus

Arquivo: `docker/observability/prometheus/alerts.yml`

| Alert                    | Severidade | Condição                              |
| ------------------------ | ---------- | ------------------------------------- |
| `ConnectorHealthDown`    | critical   | `connector_health_status == 0` por 2m |
| `MoodleUnavailable`      | critical   | erros Moodle + health < 1             |
| `RedisUnavailable`       | critical   | ops Redis com `result=error`          |
| `HighErrorRate`          | warning    | error rate > 5% por 5m                |
| `HighLatency`            | warning    | HTTP P95 > 2s por 5m                  |
| `MoodleAuthFailure`      | critical   | códigos auth/token                    |
| `ConnectorDisabled`      | warning    | health gauge 0.25 por 10m             |
| `SessionRevocationSpike` | warning    | >50 revogações / 15m                  |
| `LowCacheHitRate`        | info       | hit rate < 50% por 15m                |

## Resposta sugerida

1. Abrir Grafana → dashboard Connector / Infra.
2. Checar `/api/omnia/lms/health` (status, moodle.latencyMs, redis).
3. Se Moodle: validar token WS e `moodle.dev` reachability (sem logar token).
4. Se Redis: `REDIS_URL`, container redis, namespaces `omnia:lms:*`.
5. Se erro rate: correlacionar `traceId` nos logs estruturados.
6. Documentar incidente no runbook.

## Error tracking

Erros são rastreados via:

- métricas `http_errors_total` / `moodle_errors_total` / `lms_api_errors`
- logs JSON com `errorCode` / `code` (sem stack com secrets)
- spans OTLP com `status=error`

Integração Sentry/GlitchTip fica fora desta sprint (opcional Sprint 2.6+).
