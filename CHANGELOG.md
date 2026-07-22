# Changelog — Omnia Platform

Formato baseado em [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

## [2.1.1] — 2026-07-22

### Corrigido — SEO feeds (Sitemap + RSS)

Hotfix sobre a base `68863ed` (Release 2.1), branch `fix/release-2.1.1-seo-feeds`.

#### Causa raiz

Consultas CMS do portal para `/sitemap.xml` e `/blog/rss.xml` usavam `fetch` **sem timeout**. Em hang do Admin/Payload a Promise nunca encerrava → HTTP 500. O soft-fail das páginas não garantia rejeição explícita no timeout nem fallback global nos feeds.

#### Solução

- Timeout configurável via `CMS_FETCH_TIMEOUT_MS` (default seguro **5000** ms; faixa 100–60000) em `apps/web/src/lib/cms/cms-fetch.ts` (`fetchWithCmsTimeout`).
- `AbortError` / timeout tratados como fallback (não erro fatal); helper rejeita no abort mesmo se o `fetchImpl` ignorar o signal.
- Sitemap resiliente: sempre retorna lista válida para Metadata API; sob falha CMS devolve ao menos rotas estáticas absolutas; exclui noIndex / slugs inválidos; dedupe; datas inválidas ignoradas sem `RangeError`.
- RSS resiliente: sempre HTTP **200** com XML válido e `Content-Type: application/rss+xml; charset=utf-8`; sob falha CMS canal institucional com lista vazia; escape XML; ordenação por data.
- Logs estruturados seguros (`cms_feed_fallback`): módulo, endpoint, tipo da falha, duração, siteSlug, fallback — sem secrets, headers, cookies, tokens, bodies ou stack para o cliente.

#### Validação local

- lint, typecheck, testes SEO/feeds e build `@omnia/web` OK.
- Fallback do sitemap observado no build (`cms_feed_fallback` / network).
- **Nota de ambiente:** o build local nesta máquina usou `NODE_USE_SYSTEM_CA=1` para o Node confiar na CA do Windows (TLS/`next/font`). Isso é **requisito do ambiente Windows local**, não da aplicação Omnia nem do runtime de produção.

### Sprint 2 — Platform Base (em revisão)

#### Adicionado

- Payload CMS: coleções `tenants`, `companies`, `media` + global `global-settings`
- Media Library com upload local; MinIO documentado
- `@omnia/config` runtime com validação Zod
- Design System Omnia: tokens + Card, Container, Badge, SectionTitle, Input, Textarea
- Portal: homepage com Hero, Ecossistema, Empresas, CTA
- Admin: dashboard com stats, navegação e atalhos CMS
- Seed das 6 empresas da Holding (`pnpm --filter @omnia/admin seed`)

### Sprint 1.2 — Platform Standards & Governance (em revisão)

#### Adicionado

- **9 novos packages:** `config`, `testing`, `errors`, `events`, `cache`, `mail`, `queue`, `validation`, `search`
- **Governança:** `SYSTEM_OVERVIEW.md`, `PROJECT_PRINCIPLES.md`, `GOVERNANCE.md`, `QUALITY_GATES.md`
- **Regras:** `DEPENDENCY_RULES.md`, `IMPORT_RULES.md`
- **Observabilidade e segurança:** `OBSERVABILITY.md`, `SECURITY_REVIEW.md`
- **Decisões:** `DECISIONS_LOG.md`, ADR-008 (congelamento de arquitetura)
- **CODEOWNERS** atualizado por área (apps, packages, domains, docs, docker, .github)

#### Arquitetura

- Arquitetura considerada **CONGELADA** após Sprint 1.2
- Mudanças estruturais exigem ADR

### Sprint 1.1 — Architecture Refinement (em revisão)

#### Adicionado

- ADR-004 a ADR-007 (Portal/CMS, multi-tenant, IA, domínios)
- `/api/status` global via `@omnia/monitoring`
- Docker: Mailpit, pgAdmin
- `domains/` — 12 bounded contexts documentados
- `database/schemas/` — modelagem conceitual (11 schemas)
- `events/` — catálogo Event-Driven Architecture
- `storage/` — estrutura MinIO documentada
- Documentos: TENANT, DOMAIN, EVENT, STORAGE, AI, SECURITY, DEPLOYMENT architecture
- AI-core, security, monitoring, feature-flags — estruturas expandidas
- Integrations reorganizado (smtp, oauth, storage) com READMEs
- Roadmap detalhado Sprints 0–12

### Sprint 1 — Base Executável (em revisão)

#### Adicionado

- Next.js 15 em `apps/web` e `apps/admin`
- Tailwind CSS e shadcn/ui em `@omnia/ui`
- Payload CMS em `apps/admin` (exclusivo)
- Drizzle ORM em `@omnia/database`
- Docker Compose (PostgreSQL, Redis, MinIO, n8n)
- `/api/health`, scripts docker:dev/down/logs

## [0.1.5] — 2026-07-07

### Sprint 0.5 — Foundation Hardening

- Tooling compartilhado, 9 packages infra, guidelines, ADR-003

## [0.1.0] — 2026-07-07

### Sprint 0 — Fundação

- Monorepo, documentação, ADR-001/002, CI
