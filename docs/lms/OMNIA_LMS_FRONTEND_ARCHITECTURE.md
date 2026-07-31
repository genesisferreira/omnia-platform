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

Agregação via **`@omnia/learning-engine`** (Continue provider central):

1. Pointer hidratado por `LearningPersistence` (browser adapter na UI).
2. Fallback: progresso incompleto / primeiro curso.
3. Rota `/lms/continuar` → `ContinueClient` → `engine.resolveContinue()`.

**Não** acoplar regras a `localStorage` diretamente.

## Learning Engine

Ver [`OMNIA_LMS_LEARNING_ENGINE.md`](OMNIA_LMS_LEARNING_ENGINE.md). Timeline no Dashboard; eventos emitidos em `TrackLastSeen` / `SyncLearningState` / **`LessonWorkspace`**.

## Lesson Experience

Ver [`OMNIA_LMS_LESSON_EXPERIENCE.md`](OMNIA_LMS_LESSON_EXPERIENCE.md).

- Layout: sidebar módulos + área principal + nav prev/next.
- Conteúdo via **Material Experience** (`MaterialViewer` + renderers).
- Lifecycle: `openLesson` → materiais (`material.*`) → `completeLesson` → `closeLesson`.

## Material Experience

Ver [`OMNIA_LMS_MATERIAL_EXPERIENCE.md`](OMNIA_LMS_MATERIAL_EXPERIENCE.md) · [`OMNIA_LMS_CONTENT_ARCHITECTURE.md`](OMNIA_LMS_CONTENT_ARCHITECTURE.md).

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
| `/lms/cursos/[id]/atividades/[aid]` | RSC + client | Lesson + Material Experience |
| `/lms/continuar` | RSC + client | `courses` + Learning Engine continue |
| `/lms/progresso` | RSC | `courses` + `progress` |
| `/lms/notas` | RSC | `courses` + `grades` |
| `/api/lms/[...path]` | Route Handler | Proxy S2S |

## Performance

- `dynamic = 'force-dynamic'` nas páginas LMS (dados por usuário).
- Prefetch da próxima aula + lazy renderers de material (`next/dynamic`).
- Cache snapshot Learning Engine (TTL); sync com keys estáveis.
- Sem lib SWR/React Query nesta sprint (padrão fetch nativo).

## Segurança

- Zero links `moodle.*` no client.
- HTML de summary sanitizado (`sanitizeLmsHtml`).
- Proxy `/api/lms/*` aplica `scrubMoodleLeakage` antes de responder ao browser (URLs Moodle / `wstoken`).
- Path traversal bloqueado no proxy (`..`).
- `OMNIA_INTERNAL_API_SECRET` só no server.
- Portas stub Media Authorization / Signed URL / Watermark / Protected Viewer (Épico C).

## Testes

- Material: `pnpm --filter @omnia/web test:lms-material`
- Lesson: `pnpm --filter @omnia/web test:lms-lesson`
- Continue: `pnpm --filter @omnia/web test:lms-continue`
- Smoke: `pnpm --filter @omnia/web test:lms-smoke`
