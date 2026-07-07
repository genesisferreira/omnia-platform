# @omnia/monitoring

Observabilidade centralizada — métricas, traces, logs e alertas.

## Estrutura

```
src/
├── opentelemetry/  # Traces distribuídos, spans, context propagation
├── grafana/        # Dashboards e alertas
├── prometheus/     # Métricas de aplicação (RED/USE)
├── sentry/         # Error tracking e performance monitoring
└── index.ts
```

## Pilares de observabilidade

| Pilar | Ferramenta | Package |
|-------|------------|---------|
| Traces | OpenTelemetry | `opentelemetry/` |
| Metrics | Prometheus + Grafana | `prometheus/`, `grafana/` |
| Logs | `@omnia/logger` | — |
| Errors | Sentry | `sentry/` |

## Status

**Sprint 0.5** — Estrutura preparada. Implementação na **Sprint 1+**.
