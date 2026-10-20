# Observabilidade — Omnia Platform

> Estratégia de logs, métricas, tracing, alertas e auditoria.

Package principal: [`@omnia/monitoring`](packages/monitoring/)

---

## Visão geral

```mermaid
flowchart LR
    Apps[Apps / Packages] --> Logger[@omnia/logger]
    Apps --> Monitoring[@omnia/monitoring]
    Logger --> Logs[Agregação]
    Monitoring --> Metrics[Prometheus]
    Monitoring --> Traces[OpenTelemetry]
    Monitoring --> Alerts[Sentry / PagerDuty]
    Logs --> Dashboards[Grafana]
    Metrics --> Dashboards
    Traces --> Dashboards
```

---

## Logs

| Aspecto | Padrão                           |
| ------- | -------------------------------- |
| Package | `@omnia/logger`                  |
| Formato | JSON estruturado em produção     |
| Níveis  | `error`, `warn`, `info`, `debug` |
| Config  | `@omnia/config/logging`          |
| PII     | Redação automática (Sprint 2+)   |

### Campos obrigatórios

```json
{
  "timestamp": "ISO-8601",
  "level": "info",
  "message": "...",
  "tenantId": "uuid",
  "userId": "uuid",
  "traceId": "uuid",
  "service": "apps/web"
}
```

### Regras

- Nunca logar senhas, tokens, CPF completo
- `error` sempre com stack em dev; sanitizado em prod
- Correlação via `traceId` (OpenTelemetry)

---

## Tracing

| Aspecto    | Padrão                      |
| ---------- | --------------------------- |
| Módulo     | `@omnia/monitoring/tracing` |
| Padrão     | OpenTelemetry               |
| Propagação | W3C Trace Context           |
| Sprint     | 2+                          |

### Spans críticos

- Request HTTP (Next.js middleware)
- Queries database (Drizzle)
- Chamadas LLM (`@omnia/ai-core`)
- Jobs de fila (`@omnia/queue`)

---

## Métricas

| Aspecto  | Padrão                      |
| -------- | --------------------------- |
| Módulo   | `@omnia/monitoring/metrics` |
| Formato  | Prometheus                  |
| Endpoint | `/api/metrics` (interno)    |
| Sprint   | 2+                          |

### Métricas essenciais

| Métrica                         | Tipo      | Descrição                |
| ------------------------------- | --------- | ------------------------ |
| `http_requests_total`           | Counter   | Requests por rota/status |
| `http_request_duration_seconds` | Histogram | Latência                 |
| `db_query_duration_seconds`     | Histogram | Queries Drizzle          |
| `queue_jobs_total`              | Counter   | Jobs processados/falhos  |
| `ai_tokens_total`               | Counter   | Uso de tokens LLM        |
| `cache_hit_ratio`               | Gauge     | Eficiência cache         |

---

## Alertas

| Módulo | `@omnia/monitoring/alerts` |
| Ferramenta | Sentry (erros), Prometheus Alertmanager (SLOs) |
| Sprint | 2+ (Sentry), 11 (Alertmanager) |

### Condições de alerta (produção)

| Alerta          | Condição     | Severidade |
| --------------- | ------------ | ---------- |
| Error rate alto | > 1% em 5min | Critical   |
| Latência P99    | > 2s em 5min | Warning    |
| DB connections  | > 80% pool   | Warning    |
| Queue backlog   | > 1000 jobs  | Warning    |
| AI rate limit   | Provider 429 | Warning    |
| Disk/MinIO      | > 85%        | Critical   |

---

## Health Checks

| Endpoint      | App        | Status        |
| ------------- | ---------- | ------------- |
| `/api/health` | web, admin | ✅ Sprint 1   |
| `/api/status` | web, admin | ✅ Sprint 1.1 |

`getPlatformStatus()` verifica: database, redis, storage (quando configurado).

### Kubernetes (futuro)

- **Liveness:** `/api/health`
- **Readiness:** `/api/status`

---

## Dashboards

| Módulo | `@omnia/monitoring/dashboards` |
| Ferramenta | Grafana |
| Sprint | 11 |

### Dashboards planejados

1. **Platform Overview** — requests, errors, latency
2. **Database** — queries, connections, slow queries
3. **Queue** — throughput, failures, DLQ
4. **AI** — tokens, latency, costs
5. **Business** — leads, orders, signups (Sprint 5+)

---

## Auditoria

| Módulo | `@omnia/security/audit` |
| Compliance | LGPD |

### Eventos auditados

- Login/logout
- Acesso a dados pessoais
- Alteração de permissões
- Exportação de dados
- Exclusão (direito ao esquecimento)

### Retenção

- Logs de auditoria: 5 anos (configurável)
- Logs operacionais: 90 dias

---

## Status por sprint

| Capacidade             | Sprint |
| ---------------------- | ------ |
| Health + Status        | 1.1 ✅ |
| Logs estruturados      | 2      |
| Tracing OpenTelemetry  | 2      |
| Métricas Prometheus    | 2      |
| Sentry                 | 2      |
| Grafana + Alertmanager | 11     |

---

## Documentos relacionados

- [packages/monitoring/README.md](packages/monitoring/README.md)
- [packages/logger/README.md](packages/logger/README.md)
- [SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md)
