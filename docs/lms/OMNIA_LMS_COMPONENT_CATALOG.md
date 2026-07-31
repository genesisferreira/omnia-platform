# Omnia LMS — Component Catalog (MVP)

Componentes em `@omnia/ui` usados pela experiência `/lms/*`.

| Componente | Pacote | Uso no LMS |
| --- | --- | --- |
| Button | `button` | CTAs Abrir / Continuar / Voltar (`asChild` + Link) |
| Card | `card` | Course cards, painéis do dashboard |
| Badge | `badge` | Status de curso/atividade (`default`, `secondary`, `muted`) |
| Progress | `progress` | % conclusão por curso / agregado |
| Avatar | `avatar` | User menu no shell |
| Spinner | `spinner` | Continuar / loading client |
| Skeleton | `skeleton` | Placeholders dashboard |
| EmptyState | `empty-state` | Sem cursos, sem vínculo, 404 atividade |
| Alert | `alert` | Erros Connector, offline |
| Breadcrumb | `breadcrumb` | Hierarquia LMS → Curso → Aula |
| Tabs | `tabs` | Módulos / Notas / Conclusão no curso |
| Input / Textarea | legado | Formulários portal (não foco MVP LMS) |
| Container / SectionTitle | legado | Páginas institucionais |

## Componentes de app (web)

| Componente | Path | Função |
| --- | --- | --- |
| LmsShell | `components/lms/LmsShell.tsx` | Layout + nav + sessão |
| CourseCard | `components/lms/CourseCard.tsx` | Card de matrícula |
| ContinueClient | `components/lms/ContinueClient.tsx` | Redirect last-seen |
| TrackLastSeen | `components/lms/TrackLastSeen.tsx` | Persiste contexto |
| LmsSessionLifecycle | `components/lms/LmsSessionLifecycle.tsx` | create/heartbeat/logout |
| OfflineBanner | `components/lms/OfflineBanner.tsx` | Estado offline |
| PathAwareChrome | `components/layout/PathAwareChrome.tsx` | Esconde chrome institucional |

## Primitivos planejados (pós-MVP)

Modal/Dialog, Drawer, Toast dedicado, Sidebar package isolado, Search, Notifications.
