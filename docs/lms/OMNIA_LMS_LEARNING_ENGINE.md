# Omnia LMS — Learning Engine

> **Sprint 2.7 — Épico A**  
> Camada entre **Experience** (`apps/web` `/lms/*`) e **Connector** (`@omnia/lms-connector`).  
> Package: `@omnia/learning-engine`

## Arquitetura

```text
Aluno → Experience (UI)
          ↓
     Learning Engine  (@omnia/learning-engine)
          ↓
     Connector BFF    (/api/omnia/lms)
          ↓
     Moodle REST RO
```

### Responsabilidades

| Módulo | Função |
| --- | --- |
| Continue Learning | Resolve alvo via pointer + progresso; **sem** regra acoplada a `localStorage` |
| Learning Timeline | Itens derivados de eventos (Hoje → aula → material → conclusão) |
| Learning Events | Envelope do Event Catalog + store |
| Learning State | Snapshot: continue, progress, completion, timeline |
| Learning Cache | Cache TTL in-memory de snapshots |
| Progress Sync | Agrega completion Moodle → % + evento `progress.updated` |
| Completion Sync | Curso completed → `course.completed` |

### Persistência

Porta `LearningPersistence` injetada:

- `createMemoryPersistence()` — SSR / testes / Node
- `createBrowserPersistence()` — adapter que usa `localStorage` **somente na borda UI**

A regra de negócio **nunca** importa `window.localStorage`.

## Eventos (Épico A + C)

`lesson.*` · `module.*` · `material.opened|closed|viewed|completed` · `activity.*` · `progress.updated` · `continue.updated` · `course.completed` (+ `course.opened`, `continue.resolved`)

Envelope: `eventId`, `type`, `timestamp`, `actor`, `origin`, `correlationId`, `payload`, `schemaVersion`.

## Experience wiring

- `LearningEngineProvider` no shell LMS
- LessonWorkspace → `openLesson` / `closeLesson` / `completeLesson`
- `ContinueClient` → `resolveContinue`
- `SyncLearningState` → `syncProgress` / `syncCompletion`
- `LearningTimeline` no Dashboard
- **MaterialViewer** → `openMaterial` / `viewMaterial` / `completeMaterial` / `closeMaterial`

## Testes

```bash
pnpm --filter @omnia/learning-engine test
pnpm --filter @omnia/web test:lms-continue
pnpm --filter @omnia/web test:lms-material
```

## Fora de escopo (2.7A+)

IA, marketplace, professor/gestor, provisionamento, streaming CDN, gamificação, pagamentos.
