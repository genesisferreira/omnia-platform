# Omnia LMS — Runbook Operacional (Observability)

## Escopo

Operação DEV/staging do connector LMS + telemetria. **Não** cobre PROD nesta sprint.

## Checks rápidos

```bash
# Health LMS
curl -sS https://admin.dev.omniafrigo.com.br/api/omnia/lms/health | jq .

# Metrics (sem token)
curl -sS https://admin.dev.omniafrigo.com.br/api/metrics | head

# Metrics (com token)
curl -sS -H "Authorization: Bearer $METRICS_SCRAPE_TOKEN" \
  https://admin.dev.omniafrigo.com.br/api/metrics | head
```

Esperado health: `status` healthy/degraded, `mode` read_only, Moodle autenticado, Redis reachable, sem secrets no JSON.

## Incidentes comuns

### Moodle DOWN / auth failure
1. Health: `moodle.reachable` / `authenticated`.
2. Confirmar container/rede Moodle DEV.
3. Validar token em secrets file **sem** imprimir valor.
4. Reiniciar Admin se circuit breaker aberto (auto-recupera em 30s).

### Redis DOWN
1. Health: `redis.reachable` / `sessions.storeReachable`.
2. `docker ps` + ping Redis na rede `omnia_internal`.
3. Sessões podem degradar; connector não deve expor dados Redis crus.

### Error rate > 5%
1. Grafana Segurança / Connector.
2. Filtrar logs por `traceId` / `requestId`.
3. Checar rate limit 429 vs 5xx reais.

### Latência > 2s
1. Separar HTTP P95 vs Moodle P95 vs Redis P95.
2. Se Moodle: cold cache / WS lento.
3. Se Redis: saturação / rede.

### Cache hit < 50%
1. Normal em cold start.
2. Se persistente: TTLs e keys em `omnia:lms:cache:<env>`.

### Connector OFF
1. Global `lms-settings.connectorEnabled` e env `MOODLE_CONNECTOR_ENABLED`.
2. Health retorna `status=disabled`.

## Deploy observabilidade (DEV)

```bash
cd /opt/omnia/platform   # ou path local
docker compose -f docker/observability/compose.yml --env-file .env.staging up -d
```

Garantir rede `omnia_internal` e que Prometheus alcança `omnia-platform-admin-dev:3000`.

## Rollback

- Remover stack: `docker compose -f docker/observability/compose.yml down`
- Código de telemetria é fail-open (OTLP/logs não quebram request).
- Desabilitar scrape token não remove métricas — apenas autenticação do endpoint.

## Contatos / evidências

Registrar: horário, `traceId`, status health, alert name, ação tomada.
