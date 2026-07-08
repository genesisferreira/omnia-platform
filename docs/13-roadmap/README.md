# Roadmap — Omnia Platform

> Planejamento de sprints 0 a 12.

## Milestones

| Sprint | Foco | Status |
|--------|------|--------|
| **0** | Fundação — monorepo, docs, CI | ✅ Concluída |
| **0.5** | Foundation Hardening — tooling, packages infra | ✅ Concluída |
| **1** | Base executável — Next.js, Payload, Docker, Drizzle | 🟡 Em revisão |
| **1.1** | Architecture Refinement — domínios, status, ADRs | 🟡 Em revisão |
| **1.2** | Platform Standards & Governance — packages, docs, freeze | 🟡 Em revisão |
| **2** | Auth (JWT, RBAC), design system, migrations base | ⬜ Planejada |
| **3** | Portal institucional + CMS coleções | ⬜ Planejada |
| **4** | Blog + conteúdo editorial | ⬜ Planejada |
| **5** | CRM — leads, pipeline, eventos | ⬜ Planejada |
| **6** | Marketplace — catálogo, pedidos | ⬜ Planejada |
| **7** | Parceiros + Academy — área parceiro, cursos | ⬜ Planejada |
| **8** | Chat IA + integração DeepSeek | ⬜ Planejada |
| **9** | Automações n8n + workflows | ⬜ Planejada |
| **10** | API pública + SDK | ⬜ Planejada |
| **11** | Observabilidade — Grafana, Prometheus, Sentry | ⬜ Planejada |
| **12** | Mobile + otimização escala | ⬜ Planejada |

---

## Detalhamento por Sprint

### Sprint 0 — Fundação ✅
Monorepo, documentação, ADR-001/002, CI placeholder.

### Sprint 0.5 — Foundation Hardening ✅
18 packages, tooling shared, guidelines, modules/, ADR-003.

### Sprint 1 — Base Executável 🟡
- Next.js 15 (web + admin)
- Payload CMS mínimo (admin only)
- Drizzle ORM conexão base
- Docker Compose (PG, Redis, MinIO, n8n)
- shadcn/ui preparado
- `/api/health`

### Sprint 1.1 — Architecture Refinement 🟡
- ADR-004 a ADR-007
- `/api/status` global
- Docker: Mailpit, pgAdmin
- `domains/`, `database/schemas/`, `events/`, `storage/`
- AI-core, security, monitoring expandidos
- Documentação multi-tenant

### Sprint 1.2 — Platform Standards & Governance 🟡
- **Arquitetura CONGELADA** — mudanças estruturais exigem ADR
- 9 packages: config, testing, errors, events, cache, mail, queue, validation, search
- Governança: GOVERNANCE, QUALITY_GATES, DEPENDENCY_RULES, IMPORT_RULES
- SYSTEM_OVERVIEW, PROJECT_PRINCIPLES, DECISIONS_LOG
- OBSERVABILITY, SECURITY_REVIEW expandidos
- ADR-008

### Sprint 2 — Auth & Design System
- JWT + refresh tokens
- RBAC básico
- Design system completo (`@omnia/ui`)
- Migrations: tenants, users, companies
- SMTP real (Mailpit → produção)
- Login admin

### Sprint 3 — Portal & CMS
- Portal institucional
- Coleções Payload: pages, banners, companies
- API conteúdo portal ← CMS (sem acoplamento direto)
- i18n pt-BR

### Sprint 4 — Blog
- Coleções Payload: posts, categories, tags
- Listagem e detalhe de posts
- RSS, SEO

### Sprint 5 — CRM
- Leads, pipeline, oportunidades
- Eventos: LeadCreated, LeadConverted
- Dashboard CRM admin

### Sprint 6 — Marketplace
- Catálogo, carrinho, checkout
- MinIO para imagens
- Eventos: OrderPlaced

### Sprint 7 — Parceiros & Academy
- Área do parceiro
- Cursos, matrículas, certificados
- Comissões

### Sprint 8 — Chat IA
- Chat em tempo real
- DeepSeek integration
- RAG básico
- Agentes especializados

### Sprint 9 — Automações
- Workflows n8n productivos
- Webhooks bidirecionais
- Event bus

### Sprint 10 — API Pública
- REST API v1 documentada
- `@omnia/sdk` funcional
- `apps/docs` (dev portal)
- Rate limiting API

### Sprint 11 — Observabilidade
- OpenTelemetry, Prometheus, Grafana
- Sentry error tracking
- Dashboards operacionais

### Sprint 12 — Mobile & Escala
- React Native + SDK
- CDN, cache avançado
- Load testing 100k usuários
- LGPD: exportação/exclusão

---

## Critérios de Done — Sprint 1.1

- [x] Portal desacoplado do Payload (ADR-004)
- [x] `/api/status` em web e admin
- [x] Docker: Mailpit + pgAdmin
- [x] `domains/` com 12 bounded contexts
- [x] `database/schemas/` modelagem conceitual
- [x] `events/` documentado
- [x] ADR-004 a ADR-007
- [x] 7 documentos de arquitetura na raiz
- [x] AI-core, security, monitoring, feature-flags expandidos

## Referências

- [SPRINT-01-STATUS](SPRINT-01-STATUS.md)
- [SPRINT-01.1-STATUS](SPRINT-01.1-STATUS.md)
