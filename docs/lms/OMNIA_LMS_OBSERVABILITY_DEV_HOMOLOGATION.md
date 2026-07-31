# Omnia LMS — Observability DEV Homologation

**Status:** 🔴 **BLOQUEADO POR ACESSO VPS** (senha root recusada em 2026-07-31)  
**Branch:** `feature/omnia-lms-observability`  
**Tip remoto no momento do bloqueio:** `b53ed21` (`fix(observability): complete LMS DEV homologation`)  
**Commits base:** `cd69053`, `81a3573`, + `b53ed21` (proteção metrics)  
**Produção:** intocada

## Objetivo

Implantar Admin instrumentado + stack Prometheus/Grafana/OTel no DEV e validar critérios de GO da Sprint 2.5.3.

## O que já está pronto (código / remoto Git)

| Item | Estado |
|------|--------|
| Branch publicada | ✅ `origin/feature/omnia-lms-observability` |
| `/api/metrics` com fail-closed em staging | ✅ exige `METRICS_SCRAPE_TOKEN` |
| Ports Grafana/Prometheus/OTLP em `127.0.0.1` | ✅ |
| Prometheus Bearer scrape via arquivo | ✅ |
| Script VPS | ✅ `scripts/deploy/deploy-observability-dev.sh` |
| Testes locais | ✅ monitoring 7/7, logger 2/2, connector 30/30, BFF 3/3 |

## Evidência pública atual (pré-deploy)

| Check | Resultado |
|-------|-----------|
| `GET /api/omnia/lms/health` | 200 — contrato **legado** (sem campos expandidos do tip) |
| `GET /api/metrics` | **404** Route not found |
| Admin DEV | saudável no build **anterior** |

## Bloqueio

Tentativa `plink` → `root@191.101.234.156` com hostkey conhecida: **Configured password was not accepted**.  
`OMNIA_VPS_PASSWORD` ausente no ambiente do agente. Sem chave SSH local.

## Como desbloquear

1. Definir senha atual / `OMNIA_VPS_PASSWORD`, **ou**
2. Executar na VPS:

```bash
cd /opt/omnia/platform
# opcional: baixar tip se o script ainda não estiver no server
git fetch origin feature/omnia-lms-observability
git checkout feature/omnia-lms-observability
git pull --ff-only origin feature/omnia-lms-observability
chmod +x scripts/deploy/deploy-observability-dev.sh
./scripts/deploy/deploy-observability-dev.sh b53ed21
```

3. Colar o output (sem secrets) para fechar a homologação.

## Rollback (preparado)

Após o deploy, o script imprime:

- `ROLLBACK_HEAD`
- `ROLLBACK_ADMIN_IMAGE`

Comandos típicos (somente Admin; sem Moodle/Redis/Postgres):

```bash
cd /opt/omnia/platform
git checkout <ROLLBACK_HEAD>
docker compose -f docker/compose/staging.yml --env-file .env.staging build admin
docker compose -f docker/compose/staging.yml --env-file .env.staging up -d --no-build --force-recreate admin
# opcional: derrubar só observabilidade
docker compose -f docker/observability/compose.yml --env-file .env.staging down
```

Volumes `omnia_prometheus_dev` / `omnia_grafana_dev` preservam série temporal se não forem removidos.

## Sem migration

**sem migration nesta etapa** — backup de `omnia_staging` não obrigatório para esta entrega.

## Critérios de GO (checklist)

| # | Critério | Estado |
|---|----------|--------|
| 1 | Admin healthy | ⏳ pós-deploy |
| 2 | Health expandido 200 | ⏳ |
| 3 | `/api/metrics` Prometheus | ⏳ |
| 4 | Metrics protegido | ⏳ (código pronto) |
| 5 | Prometheus target UP | ⏳ |
| 6 | 5 dashboards Grafana | ⏳ |
| 7 | Alert rules válidas | ⏳ |
| 8–12 | Logs / tracing / OTLP fail-open | ⏳ |
| 13–15 | Métricas connector/sessão/acadêmicas | ⏳ |
| 16 | Testes automatizados | ✅ locais |
| 17 | DEV estável | ⏳ |
| 18 | Produção intacta | ✅ |

## Veredito atual

🔴 **OMNIA LMS OBSERVABILITY NÃO HOMOLOGADA — VER PENDÊNCIAS**

Pendência bloqueante: acesso SSH à VPS DEV para executar o deploy do tip `b53ed21`.
