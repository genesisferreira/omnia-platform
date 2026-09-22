# Omnia LMS — Observability DEV Homologation

**Status:** 🟢 **HOMOLOGADA NO DEV**  
**Data:** 2026-07-31  
**Branch:** `feature/omnia-lms-observability`  
**Commit implantado:** `a5bad91`  
**Commits da sprint:** `cd69053`, `81a3573`, `b53ed21`, `e49a36f`, `a5bad91`  
**Produção:** intocada

## Rollback registrado

| Item                  | Valor                                                                     |
| --------------------- | ------------------------------------------------------------------------- |
| Commit anterior       | `5589092` (`feature/omnia-lms-connector`)                                 |
| Imagem Admin anterior | `sha256:5e58630e17b1809c575b9552062bba83700f58621409ae3f70a5ccfda45120f8` |
| Imagem Admin nova     | `sha256:fc7d77dc29ff726bdd965f9aa1b4b24962d964e7423921358a2bfdb425effe0e` |

```bash
cd /opt/omnia/platform
git checkout 5589092
docker compose -f docker/compose/staging.yml --env-file .env.staging build admin
docker compose -f docker/compose/staging.yml --env-file .env.staging up -d --no-build --force-recreate admin
docker compose -f docker/observability/compose.yml --env-file .env.staging down
```

## Backup

**sem migration nesta etapa** — backup de `omnia_staging` não executado (não obrigatório).

## Serviços atualizados

| Serviço                                             | Resultado                   |
| --------------------------------------------------- | --------------------------- |
| `omnia-platform-admin-dev`                          | healthy (imagem nova)       |
| `omnia-prometheus-dev`                              | up — ports `127.0.0.1:9090` |
| `omnia-grafana-dev`                                 | up — ports `127.0.0.1:3005` |
| `omnia-otel-collector-dev`                          | up — OTLP `127.0.0.1:4318`  |
| Web / Moodle / MariaDB / Redis / Traefik / Postgres | não rebuildados             |

## Proteção `/api/metrics`

| Check                                     | Resultado                                                                       |
| ----------------------------------------- | ------------------------------------------------------------------------------- |
| Público sem token                         | **401**                                                                         |
| Interno com Bearer `METRICS_SCRAPE_TOKEN` | **200** Prometheus text                                                         |
| Token em URL                              | não usado                                                                       |
| Arquivo secret                            | `/opt/omnia/secrets/metrics_scrape_token.txt` (mode `644` para scrape non-root) |

## Health expandido

`GET /api/omnia/lms/health` → **200**

Campos observados (sanitizados): `status`, `version`, `readOnly`, `connector`, `moodle`, `redis`, `database`, `identity`, `cache`, `sessions`, `policies`, `latency`, + legado `sessionStore`/`cacheStore`/`mode`.

Sem tokens / secrets no JSON.

## Prometheus

| Check                                | Resultado              |
| ------------------------------------ | ---------------------- |
| Target `omnia-admin-lms`             | **UP** (`up=1`)        |
| `connector_health_status`            | **1**                  |
| Alert rules (`promtool check rules`) | **9 rules SUCCESS**    |
| Retenção                             | 15d (compose)          |
| Volumes                              | `omnia_prometheus_dev` |

## Grafana

| Check                           | Resultado                                                |
| ------------------------------- | -------------------------------------------------------- |
| Health API                      | ok (11.3.1)                                              |
| Datasource Prometheus           | conectado                                                |
| Query `connector_health_status` | HTTP 200                                                 |
| Dashboards                      | Infraestrutura, Connector, Sessões, Acadêmico, Segurança |
| Exposição                       | apenas `127.0.0.1:3005` + login                          |

## Tracing / Logs

| Check                                               | Resultado                                                 |
| --------------------------------------------------- | --------------------------------------------------------- |
| Headers `traceparent`, `x-request-id`, `x-trace-id` | presentes                                                 |
| Logs JSON com `traceId`/`spanId`/`requestId`        | observados no Admin                                       |
| Correlação moodle.request ↔ lms.http                | ok                                                        |
| OTLP endpoint                                       | configurado (`omnia-otel-collector-dev:4318`) — fail-open |
| Scrape self-metrics do collector                    | opcional / DNS overlay instável — **não bloqueante**      |

## SLOs

Definidos em código/docs; coleta iniciada; **baseline ainda em formação** (sem cumprimento histórico declarado).

## Segurança

- Metrics protegido (401 público)
- Grafana/Prometheus bind loopback
- Sem PII em labels de métricas (amostra interna sem secrets)
- Produção não alterada
- Rate limit LMS preservado

## Testes automatizados (pré-deploy)

monitoring 7/7 · logger 2/2 · lms-connector 30/30 · BFF helpers 3/3

## Bugs / correções durante homologação

1. `test-logger.ts` quebrava Docker build → exclude em tsconfig (`a5bad91`)
2. Token metrics `chmod 600` → Prometheus non-root sem leitura → `chmod 644`
3. Senha root anterior inválida → nova senha operacional

## Pendências não bloqueantes

- Scrape self-metrics OTel Collector (DNS overlay)
- Baseline SLO com histórico ≥ 7–14 dias
- Wiring fino `lms_policy_changes` em updates de policy
- Error tracking externo (Sentry) — fora do escopo

## Critérios de GO

| #     | Critério                                                       | Status |
| ----- | -------------------------------------------------------------- | ------ |
| 1–4   | Admin healthy, health expandido, metrics Prometheus, protegido | ✅     |
| 5–7   | Prometheus target UP, Grafana 5 dashboards, alert rules        | ✅     |
| 8–12  | Logs JSON, redaction, trace IDs, W3C, OTLP fail-open           | ✅     |
| 13–15 | Métricas connector/sessão/acadêmicas expostas                  | ✅     |
| 16–18 | Testes, DEV estável, PROD intacta                              | ✅     |

## Veredito

🟢 **OMNIA LMS OBSERVABILITY HOMOLOGADA NO DEV — GO PARA SPRINT 2.6**
