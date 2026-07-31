# Omnia LMS — Frontend Architecture (Experience MVP)

> **Sprint 2.6** — Host: `apps/web` rotas `/lms/*`.  
> Promoção para `lms.*` / `apps/lms` documentada no Product Spec (Sprint 2.7+).

## Diagrama

```text
Browser (/lms/*)
  → Cookie omnia_payload_token (Portal)
  → RSC pages + LmsShell
  → Route Handlers /api/lms/*  (S2S)
       → Admin BFF /api/omnia/lms/*
            → @omnia/lms-connector
                 → Moodle REST (RO) + Redis sessions/cache
```

## Auth

- Gate: `requirePortalSession()` no `app/lms/layout.tsx`.
- Proxy: `fetchLmsConnector` injeta `x-omnia-internal-key` + `x-omnia-user-id` + `x-omnia-lms-role`.
- Browser **nunca** recebe token Moodle, URL Moodle nem `OMNIA_INTERNAL_API_SECRET`.

## Continue Learning

Sem endpoint `/continue` no Connector. Agregação client:

1. `localStorage` chave `omnia:lms:last:{omniaUserId}` (`writeLastSeen` / `readLastSeen`).
2. Fallback: primeiro curso matriculado.
3. Rota `/lms/continuar` → `ContinueClient` resolve e redireciona.

## Session Manager

`LmsSessionLifecycle` (client):

- `POST /api/lms/sessions` ao entrar no shell.
- Heartbeat `POST /api/lms/sessions/heartbeat` (~60s).
- Logout: `POST /api/lms/sessions/logout` + `GET /api/auth/logout`.

## Rotas

| Rota | Tipo | Dados Connector |
| --- | --- | --- |
| `/lms` | RSC | `me`, `courses`, `progress` |
| `/lms/cursos` | RSC | `courses`, `progress` |
| `/lms/cursos/[id]` | RSC | `courses/:id`, `content`, `progress`, `grades`, `completion` |
| `/lms/cursos/[id]/atividades/[aid]` | RSC | `content`, `progress` (metadados; sem player) |
| `/lms/continuar` | RSC + client | `courses` + last-seen |
| `/lms/progresso` | RSC | `courses` + `progress` |
| `/lms/notas` | RSC | `courses` + `grades` |
| `/api/lms/[...path]` | Route Handler | Proxy S2S |

## Performance

- `dynamic = 'force-dynamic'` nas páginas LMS (dados por usuário).
- Cache curto fica no Connector/BFF; web usa `cache: 'no-store'` no S2S.
- Sem lib SWR/React Query nesta sprint (padrão fetch nativo).

## Segurança

- Zero links `moodle.*` no client.
- HTML de summary sanitizado (strip `<script>`).
- Path traversal bloqueado no proxy (`..`).

## Testes

- Unit: `pnpm --filter @omnia/web test:lms-continue`
- Smoke: `pnpm --filter @omnia/web test:lms-smoke`
- Homologação manual DEV: ver `OMNIA_LMS_EXPERIENCE_DEV_HOMOLOGATION.md`
