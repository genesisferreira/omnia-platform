# Omnia LMS — Component Map

> **Sprint 2.6.5** — Mapa de componentes de produto/UX.  
> Complementa o catálogo de implementação [`OMNIA_LMS_COMPONENT_CATALOG.md`](OMNIA_LMS_COMPONENT_CATALOG.md) (`@omnia/ui` + app).

**Legenda status:** ● MVP · ○ Parcial/placeholder · — Futuro

---

## 1. Shell & Navigation

| Componente | Job | Status | Notas |
| --- | --- | :---: | --- |
| Layout / LmsShell | Frame aluno | ● | Sidebar + header + footer |
| Navigation | L1 routes | ● | Dashboard, Continuar, Cursos, Progresso, Notas |
| Breadcrumb | Hierarquia | ● | |
| UserMenu / Avatar | Conta + logout | ● | |
| Search | Busca global | ○ | Placeholder |
| Notifications | Sino | ○ | Placeholder |
| SkipLink | A11y | ● | |

## 2. Learning surfaces

| Componente | Job | Status |
| --- | --- | :---: |
| DashboardHero / Greeting | Saudação | ● |
| CourseCard | Matrícula resumida | ● |
| ModuleTree | Árvore módulos/aulas | ● (lista em Cards) |
| ActivityCard / ActivityRow | Item de atividade | ● |
| Progress | % visual | ● |
| Timeline | Sequência temporal | ● | `LearningTimeline` (Dashboard) |
| CompletionBadge | Estado conclusão | ● | `LessonStatusBadge` + Badge |
| GradeCard | Item de nota | ● | lista |
| EmptyState | Sem dados | ● | |
| Alert / Toast | Feedback | ● / — Toast dedicado |
| Spinner / Skeleton | Loading | ● | `LessonSkeleton` |
| OfflineBanner | Offline | ● | |
| Tabs | Seções do curso | ● | |
| **LessonSidebar** | Nav módulos/aulas (L2) | ● | Épico B |
| **LessonWorkspace** | Shell da aula | ● | Lifecycle Learning Engine |
| **LessonContent** | Conteúdo + placeholders | ● | HTML sanitizado / links |
| **LessonNav** | Prev/next/módulo/curso | ● | SPA + prefetch |
| **MaterialProvider** | Resolve material + security ports | ● | Épico C |
| **MaterialViewer** | Consumo de material | ● | Lazy renderers |
| **MaterialExperience** | Host materiais da aula | ● | |
| **MaterialNav** | Prev/next material | ● | |

## 3. Media & assessment (futuro)

| Componente | Job | Status |
| --- | --- | :---: |
| Player | Streaming Omnia | — |
| MaterialViewer | PDF/doc view_only | — |
| QuizRunner | Quiz UX | — |
| AssignmentSubmit | Entrega | — |

## 4. Teaching / Governance (futuro)

| Componente | Job | Status |
| --- | --- | :---: |
| ClassRoster | Turma | — |
| GradingQueue | Fila correção | — |
| KpiStrip | Indicadores gestor | — |
| ReportTable | Relatórios | — |

## 5. Mapa rota → componentes (MVP)

| Rota | Componentes principais |
| --- | --- |
| `/lms` | Shell, Greeting, CourseCard, Progress, EmptyState |
| `/lms/cursos` | Shell, CourseCard grid |
| `/lms/cursos/[id]` | Breadcrumb, Progress, ModuleTree, Tabs, Grade list, CompletionBadge |
| `.../atividades/[id]` | LessonWorkspace, MaterialExperience, Sidebar, Nav, SyncLearningState |
| `/lms/continuar` | Spinner + redirect |
| `/lms/progresso` | Progress rows |
| `/lms/notas` | Grade lists |

## 6. Design tokens

Ver [`OMNIA_LMS_DESIGN_SYSTEM.md`](OMNIA_LMS_DESIGN_SYSTEM.md): `lms-sidebar`, `lms-surface`, `lms-progress`, dark AA.

---

## Referências

Component Catalog · Design System · Learning Experience Spec · Frontend Architecture
