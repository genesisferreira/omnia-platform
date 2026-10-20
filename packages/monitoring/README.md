# @omnia/monitoring

Observabilidade centralizada.

## Estrutura (Sprint 1.1)

```
src/
├── health/       # Status global (/api/status) ✅ Sprint 1.1
├── metrics/      # Prometheus (Sprint 2+)
├── logs/         # Agregação de logs
├── tracing/      # OpenTelemetry
├── alerts/       # Alertas e notificações
└── dashboards/   # Grafana
```

## Integrações futuras

| Ferramenta    | Módulo        | Sprint |
| ------------- | ------------- | ------ |
| Prometheus    | `metrics/`    | 2+     |
| Grafana       | `dashboards/` | 2+     |
| OpenTelemetry | `tracing/`    | 2+     |
| Sentry        | `alerts/`     | 2+     |

## Uso

```typescript
import { getPlatformStatus } from '@omnia/monitoring';

const status = await getPlatformStatus({ includePayload: false });
```

## Pilares de observabilidade

Documentação completa: [OBSERVABILITY.md](../../OBSERVABILITY.md)

| Pilar      | Módulo                     | Sprint |
| ---------- | -------------------------- | ------ |
| Logs       | `@omnia/logger` + `logs/`  | 2+     |
| Tracing    | `tracing/` (OpenTelemetry) | 2+     |
| Métricas   | `metrics/` (Prometheus)    | 2+     |
| Alertas    | `alerts/` (Sentry)         | 2+     |
| Dashboards | `dashboards/` (Grafana)    | 11     |
| Auditoria  | `@omnia/security/audit`    | 2+     |
| Health     | `health/`                  | 1.1 ✅ |

## Status

**Sprint 1.1** — Health/status operacional. Métricas na **Sprint 2+**.
