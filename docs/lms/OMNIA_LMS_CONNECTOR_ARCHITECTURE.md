# Omnia LMS — Connector Architecture

> Sprint 2.5 / Macroentrega 01 — BFF read-only + Policy Engine + Session Manager.

## Decisão de colocação

| Camada                                         | Local                           | Motivo                       |
| ---------------------------------------------- | ------------------------------- | ---------------------------- |
| Cliente Moodle, policy, session, cache, health | `packages/lms-connector`        | Reutilizável, tipado, sem UI |
| DTOs estáveis                                  | `packages/shared/src/lms`       | Contrato frontend/BFF        |
| Endpoints HTTP                                 | `apps/admin` `/api/omnia/lms/*` | BFF existente (Payload)      |
| Vínculo + auditoria + políticas admin          | Collections/Global Payload      | Padrão Global/Collection     |

**Não** foi criado um terceiro runtime. O Admin continua sendo o BFF.

## Fluxo

```
Browser / Portal → Admin BFF (/api/omnia/lms/*)
                 → Identity link (Postgres Payload)
                 → MoodleClient (REST whitelist)
                 → Moodle 4.5.12 (SoR acadêmico)

Sessões produto → Redis Platform `omnia:lms:sessions:{env}:…`
Cache leitura   → Redis Platform `omnia:lms:cache:{env}:…`
```

## Princípios

1. Browser **nunca** recebe `MOODLE_REST_TOKEN`.
2. Moodle permanece SoR; Omnia não duplica verdade acadêmica.
3. Funções Moodle apenas via whitelist no cliente centralizado.
4. Políticas via `resolveLmsPolicy` — sem `if` espalhado.
5. Sessões Omnia-first; Moodle server-to-server nesta entrega.

## Componentes

- `MoodleClient` — timeout, retry idempotente, circuit breaker simples, redaction
- `resolveLmsPolicy` — sessão global/perfil (curso/material preparados)
- `LmsSessionManager` — limites, familyId, revogação atômica (Redis Lua / memory fallback DEV)
- `LmsCache` — site info / catálogo / conteúdo (não notas/progresso)
- `checkConnectorHealth` — status agregado sem secrets

## Modo

`MOODLE_CONNECTOR_READ_ONLY=true` (obrigatório nesta macroentrega). Escrita acadêmica = próxima entrega.
