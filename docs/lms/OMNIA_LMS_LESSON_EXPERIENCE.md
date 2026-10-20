# Omnia LMS — Lesson Experience

> **Sprint 2.7 — Épico B**  
> Experiência completa da Aula em `apps/web` `/lms/cursos/[courseId]/atividades/[activityId]`.  
> Depende de `@omnia/learning-engine` (Épico A). Sem UI Moodle.

## Arquitetura

```text
Aluno → Lesson Page (Experience)
          ↓
     Learning Engine (events, continue, timeline, sync)
          ↓
     Connector (content + progress + completion RO)
          ↓
     Moodle
```

## Layout

| Zona       | Componente                       | Função                                         |
| ---------- | -------------------------------- | ---------------------------------------------- |
| Sidebar L2 | `LessonSidebar`                  | Módulos → aulas (SPA links + prefetch)         |
| Principal  | `LessonWorkspace`                | Meta, status, progresso, conteúdo, conclusão   |
| Conteúdo   | `LessonContent`                  | Texto / HTML sanitizado / links / placeholders |
| Nav        | `LessonNav`                      | Anterior · Próxima · Módulo · Curso            |
| Loading    | `LessonSkeleton` + `loading.tsx` | Skeleton                                       |

## Fluxo da Aula

1. RSC carrega `courses/:id`, `content`, `progress`, `completion`.
2. `SyncLearningState` → `progress.updated` / `course.completed` (uma vez, keys estáveis).
3. `LessonWorkspace` monta → `lesson.opened` + `activity.started` + `continue.updated` (+ `module.opened`).
4. `LessonContent` → `material.opened` / unmount `material.closed`.
5. CTA “Marcar como concluída” → `lesson.completed` + `activity.completed` + Continue aponta para próxima.
6. Unmount → `lesson.closed`.
7. Timeline e Continue Learning atualizados via engine (sem `localStorage` nas regras).

## Conteúdos suportados

Delegados à **Material Experience** (`MaterialViewer` + renderers). Ver [`OMNIA_LMS_MATERIAL_EXPERIENCE.md`](OMNIA_LMS_MATERIAL_EXPERIENCE.md).

| Tipo                         | Comportamento                     |
| ---------------------------- | --------------------------------- |
| Texto / HTML                 | Summary do módulo sanitizado      |
| Link externo                 | Só HTTPS/HTTP **sem** host Moodle |
| Vídeo / PDF / H5P / Arquivos | Placeholder (sem streaming CDN)   |
| Imagem                       | URL autorizada / preview futuro   |

## Estados

`loading` · `skeleton` · `offline` · `error` · `forbidden` · `blocked` · `completed` · `in_progress`

## Performance

- `Link prefetch` + `router.prefetch` da próxima aula
- Componentes client isolados (code-split natural do App Router)
- Sync/open com refs (sem eventos duplicados por re-render)
- Cache snapshot do Learning Engine (TTL)

## Acessibilidade (WCAG AA)

- Skip link do shell + landmarks (`nav` módulos, `nav` aulas, `#aula-principal`)
- `aria-current="page"` na aula ativa
- Focus ring nos links/botões
- Status com `aria-label`; tempo estudado `aria-live="polite"`
- Breadcrumb hierárquico

## Testes

```bash
pnpm --filter @omnia/web test:lms-lesson
pnpm --filter @omnia/web test:lms-smoke
pnpm --filter @omnia/web test:lms-continue
```

## Fora de escopo (2.7B)

Neurofrigo, marketplace, professor/gestor, provisionamento, streaming CDN, gamificação, pagamentos, certificados, media authorization avançada, write Moodle de conclusão.
