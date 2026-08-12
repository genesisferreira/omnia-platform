# Omnia LMS — Observability (Sprint 2.5.3)

## Objetivo

Tornar o Omnia LMS **operável**: métricas Prometheus, tracing W3C/OTLP, logs estruturados, health expandido, alertas, dashboards Grafana e SLOs — **sem** alterar regras de negócio do connector.

## Arquitetura

```
Browser / Operator
        │
        ▼
   Admin BFF (/api/omnia/lms/*, /api/metrics)
        │  traceparent + X-Request-Id
        ▼
   @omnia/lms-connector
        ├── MoodleClient ──► Moodle REST
        ├── SessionManager / Cache ──► Redis
        └── Health / Policy / Identity
        │
        ▼
   @omnia/monitoring (registry + spans)
        │
   ┌────┴────┐
   ▼         ▼
Prometheus  OTel Collector (opcional OTLP :4318)
   │
   ▼
Grafana dashboards
```

## Componentes

| Peça                | Local                             | Função                                            |
| ------------------- | --------------------------------- | ------------------------------------------------- |
| Prometheus registry | `packages/monitoring/src/metrics` | Counters/Gauges/Histograms                        |
| Tracing             | `packages/monitoring/src/tracing` | AsyncLocalStorage + W3C + OTLP HTTP               |
| Logger              | `packages/logger`                 | JSON sanitizado                                   |
| `/api/metrics`      | `apps/admin/.../api/metrics`      | Scrape Prometheus                                 |
| Health expandido    | `/api/omnia/lms/health`           | Connector/Redis/DB/Moodle/Cache/Sessions/Policies |
| Stack DEV           | `docker/observability/`           | Prometheus + Grafana + OTel Collector             |

## Segurança

- Labels de métricas **nunca** incluem userId, courseId, tokens ou cookies.
- Logs redigem `password`, `token`, `cookie`, `authorization`, `wstoken`, secrets.
- `/api/metrics` pode exigir `METRICS_SCRAPE_TOKEN` (Bearer ou `X-Metrics-Token`).
- Health e metrics são sanitizados (sem `DATABASE_URL` completa, sem token Moodle).

## OpenTelemetry

- Context propagation: header `traceparent` (W3C).
- Spans: `withSpan()` no Moodle client e contexto HTTP no BFF.
- Export OTLP HTTP JSON quando `OTEL_EXPORTER_OTLP_ENDPOINT` está definido (ex.: `http://otel-collector:4318`).

## Produção

**PROD intocada nesta sprint.** Stack de observabilidade é para DEV/staging.
