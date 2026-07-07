# @omnia/logger

Logging centralizado estruturado para toda a Omnia Platform.

## Estrutura

```
src/
├── transports/  # Console, arquivo, OpenTelemetry, Sentry
├── formatters/  # JSON estruturado, redação de PII (LGPD)
└── index.ts
```

## Padrão de log (planejado)

```json
{
  "level": "info",
  "message": "Lead criado",
  "correlationId": "uuid",
  "tenantId": "ofh",
  "userId": "uuid",
  "module": "crm",
  "timestamp": "2026-07-07T18:00:00.000Z"
}
```

## Integração

- `@omnia/monitoring` — traces e métricas
- `@omnia/security` — auditoria

## Status

**Sprint 0.5** — Estrutura preparada. Implementação na **Sprint 1+**.
