# Sprint 3 — Implementation Gate (Transição para Código)

> **Versão:** 1.0  
> **Data:** 2026-07-10  
> **Status:** Gate documental — **aprovado para iniciar Sprint 3.4**  
> **Tipo:** Documento de transição — precede qualquer implementação CMS  
> **Autoridade:** Complementa [ADR-011](../07-adrs/ADR-011_PLATFORM_PRINCIPLES.md) (Aceito)

---

## Propósito

Este documento fecha o ciclo de documentação arquitetural da Sprint 3 (3.1–3.3B) e define as **regras invioláveis** para a implementação que começa na Sprint 3.4.

Nenhum código de CMS, collections, globals, blocks ou portal dinâmico deve ser iniciado sem:

1. Leitura deste gate  
2. Conformidade com [ADR-011](../07-adrs/ADR-011_PLATFORM_PRINCIPLES.md)  
3. Revisão humana antes de cada commit  

---

## 1. Arquitetura documental aprovada

A documentação abaixo constitui a **fonte oficial** para implementação da fundação CMS e portal até nova revisão de produto.

| Fase | Documento | Escopo |
|------|-----------|--------|
| Produto | `PRODUCT_MASTER_V2.md` | Visão, CMS-first, empresas, regras de ouro |
| Domínio | `DOMAIN_MODEL_V2.md` | Entidades, RBAC, eventos, fronteiras Payload/Drizzle |
| Roadmap | `MASTER_ROADMAP_V2.md` | Sprints 0–16, critérios por sprint |
| Backlog | `BACKLOG_V2.md` | MoSCoW, IDs rastreáveis |
| Revisão | `PRODUCT_REVIEW_V2.md` | Lacunas, gate Sprint 3 |
| CMS | `S03_CMS_FOUNDATION.md` | Collections, globals, blocks, media, SEO |
| Portal | `S03_PORTAL_ARCHITECTURE.md` | Rotas, home, performance, integrações |
| Multisite | `S03_MULTISITE_BRANDING.md` | Holding, brands, sites, temas |
| Editorial | `S03_EDITORIAL_GOVERNANCE.md` | Workflow, papéis, preview, auditoria |
| Princípios | `ADR-011_PLATFORM_PRINCIPLES.md` | **Aceito** — prevalece sobre código |

### ADRs técnicos históricos

Localização: [`docs/14-adr/`](../14-adr/) (ADR-001 a ADR-008).  
Princípios transversais: [`docs/07-adrs/`](../07-adrs/) (ADR-011+).

**Dívida documental DEBT-DOC-001:** unificar pastas de ADR em sprint futura — sem mover arquivos agora.

---

## 2. Documentos fonte oficial

| Prioridade | Documento | Uso na implementação |
|------------|-----------|------------------------|
| 1 | ADR-011 | Princípios invioláveis; checklist PR |
| 2 | S03_CMS_FOUNDATION | Schema collections/globals/blocks |
| 3 | S03_MULTISITE_BRANDING | sites, domains, themes, companies expand |
| 4 | S03_EDITORIAL_GOVERNANCE | editorialStatus, workflow, preview, audit |
| 5 | S03_PORTAL_ARCHITECTURE | Consumo REST, BlockRenderer, rotas |
| 6 | DOMAIN_MODEL_V2 | RBAC, eventos, fronteiras |
| 7 | PRODUCT_MASTER_V2 | Escopo produto |
| 8 | BACKLOG_V2 | IDs Must Have Sprint 3–4 |

Em conflito: **ADR-011 > especificações S03 > PRODUCT_MASTER > código existente**.

---

## 3. Decisões obrigatórias (já aprovadas na documentação)

| ID | Decisão | Fonte |
|----|---------|-------|
| D-01 | Tenant único `omnia-holding` com N companies | S03_MULTISITE |
| D-02 | Portal consome Payload via REST — nunca import direto | ADR-004, ADR-011 |
| D-03 | Conteúdo editorial no Payload; transacional no Drizzle | ADR-002, DOMAIN_MODEL |
| D-04 | Neurofrigo Carga = Product, não Company | S03_MULTISITE §7 |
| D-05 | Sites oficiais coexistem — modelo híbrido | ADR-011 P17 |
| D-06 | Holding não é card filha no ecossistema | S03_MULTISITE |
| D-07 | `/empresas/[slug]` (plural) para páginas empresa | S03_PORTAL |
| D-08 | IA nunca auto-publica | ADR-011 P8, S03_EDITORIAL |
| D-09 | Design System federado — sem CSS arbitrário | ADR-011 P18 |
| D-10 | Site implícito `omnia-hub` na fase 3.4A | S03_MULTISITE |
| D-11 | `editorialStatus` separado de `_status` Payload | S03_EDITORIAL |
| D-12 | Evolução incremental — prompts 3.4A-1 a 3.4B | Este documento |

Decisões **ainda pendentes** de steering (não bloqueiam 3.4A-1): ADR-009 dual users, ADR-010 PostGIS, reorganização pasta ADRs.

---

## 4. Escopo da Sprint 3.4 (visão geral)

**Objetivo:** Implementar fundação CMS no Payload + preparar portal para consumo dinâmico (3.4B).

**Não inclui:** Auth Drizzle completo, blog, CRM, parceiros, LMS operacional, IA runtime, migração sites externos.

---

## 5. Escopo dividido em prompts (implementação futura)

> **Não implementar nesta etapa de fechamento documental.**

### Sprint 3.4A-1 — Fundação de tipos e campos compartilhados

- Campos SEO (`@payloadcms/plugin-seo` ou group padronizado)
- Ownership multiempresa: `tenant`, `company`, `scope`, `site` (nullable default hub)
- `editorialStatus` (estados S03_EDITORIAL)
- `publishedAt`, `unpublishedAt`, timezone
- Hooks de auditoria básica (preparação AuditLog Drizzle)
- Shared field groups em `apps/admin/src/fields/`

### Sprint 3.4A-2 — Collections fundamentais

- `sites`
- `domains`
- `themes`
- `products` (incl. Neurofrigo Carga seed)
- Expansão `companies` (brand group, officialSiteUrl, pageContent, tagline, etc.)

### Sprint 3.4A-3 — Globals

- `global-settings` (expandir — escopo hub)
- `header`
- `footer`
- `home-page`
- `seo-settings`

### Sprint 3.4A-4 — Blocks MVP e Page Builder

- Hero, RichText, CTA, Cards, CompanyGrid, ServiceGrid, CourseGrid, Testimonials, FAQ
- Registry `blocks/` no admin + documentação slugs para portal

### Sprint 3.4A-5 — Migrations, seed, testes e staging

- Migrations Payload versionadas
- Seed: sites, themes, companies URLs oficiais, product Carga
- Testes unitários access control + E2E smoke admin
- Validação staging `dev.omniafrigo.com.br`

### Sprint 3.4B — Frontend dinâmico

- `BlockRenderer` + `blocks-map.ts`
- Home via `home-page` global
- Header/footer dinâmicos
- `/empresas/[slug]`, `/[slug]`, `/lp/[slug]`
- Preview API + `draftMode`
- Remoção hardcoded (EcosystemSection, Header, Footer, CtaSection, layout metadata)
- `revalidateTag` on publish

---

## 6. Itens proibidos durante a implementação

| # | Proibido | Motivo |
|---|----------|--------|
| X1 | Hardcodar conteúdo de marketing no portal | ADR-011 P1 |
| X2 | Importar Payload em `apps/web` | ADR-004 |
| X3 | Criar autenticação paralela ad hoc | ADR-011 N5 |
| X4 | Publicar conteúdo via IA sem humano | ADR-011 P8 |
| X5 | CSS arbitrário por página | ADR-011 P18 |
| X6 | Company para Neurofrigo Carga | S03_MULTISITE |
| X7 | Substituir sites oficiais sem plano migração | ADR-011 P17 |
| X8 | Collections não documentadas em S03_CMS / MULTISITE | Scope creep |
| X9 | Migrations sem versionamento em `src/migrations/` | Rollback |
| X10 | `git push` sem revisão humana explícita | Este gate |
| X11 | Commit sem passar lint/typecheck/build | Qualidade |
| X12 | Alterar Docker/staging sem ADR se estrutural | ADR-008 |
| X13 | Drizzle schema CRM/LMS na 3.4A | Fora de escopo |
| X14 | Reorganizar sprints ou roadmap nos docs durante código | Governança |

---

## 7. Critérios para aprovação de código

Todo PR da Sprint 3.4 deve satisfazer:

### 7.1 Checklist ADR-011 §12

- CMS-First, multiempresa, SEO, sem hardcode, access control, migrations versionadas

### 7.2 Checklist por sub-sprint

| Sub-sprint | Gate mínimo |
|------------|-------------|
| 3.4A-1 | Field groups reutilizáveis; plugin SEO instalado; sem collection nova |
| 3.4A-2 | Collections criadas conforme spec; seed idempotente preparado |
| 3.4A-3 | Globals com `site` FK; drafts habilitados |
| 3.4A-4 | 9 blocks registrados; `generate:importmap` CI |
| 3.4A-5 | `pnpm build` verde; migration up/down testada; staging smoke |
| 3.4B | Zero hardcode Must; preview staging; home CMS-driven |

### 7.3 Comandos obrigatórios antes de commit

```bash
pnpm lint
pnpm typecheck
pnpm build
```

### 7.4 Revisão humana

- **Obrigatória antes de cada commit** — agente/automação não commita sem aprovação explícita do responsável
- PR description referencia IDs backlog (ex: CMS-005, CMS-007)
- Screenshots staging para mudanças visuais

---

## 8. Regras arquiteturais (resumo executivo)

### 8.1 CMS-First

Código = estrutura + renderers. Payload = conteúdo, ordem, SEO, publicação, mídia.

### 8.2 Multiempresa

Todo conteúdo: `tenant` + `company` (opcional) + `scope`. Access control filtra por company. Slug único por `{tenant}:{site}:{slug}`.

### 8.3 Multisite

Site entity `omnia-hub` default fase 1. Domains collection preparada. Resolução por hostname — Sprint 6+.

### 8.4 Branding

Themes collection + tokens validados. `@omnia/ui` + ThemeProvider. Sem customCss no admin.

### 8.5 Não hardcode

Inventário Must: `EcosystemSection`, `Header`, `Footer`, `CtaSection`, `layout.tsx` metadata — remover em 3.4B.

### 8.6 Testes

- Unit: access control, field validation
- E2E: admin login, criar page draft, preview URL (3.4B)
- Snapshot: block renderers (opcional 3.4B)

### 8.7 Migrations

- Uma migration por entrega lógica em `apps/admin/src/migrations/`
- Nome: `YYYYMMDD_HHMMSS.ts`
- Testar `payload migrate` up em dev antes de commit
- **Nunca** alterar migration já aplicada em staging — nova migration para correções

### 8.8 Rollback

- Payload versions para conteúdo editorial
- Migration `down` documentada para schema
- Git revert preferido a amend em commits já revisados
- Feature flag `CMS_HOME_ENABLED` para home dinâmica em 3.4B (deploy seguro)

### 8.9 Revisão humana antes de commit

| Etapa | Responsável |
|-------|-------------|
| Código conforme spec | Dev / agente |
| Lint/typecheck/build | CI local |
| Conformidade ADR-011 | Revisor |
| Aprovação commit | **Humano explícito** |
| Deploy staging | Humano após smoke |

---

## 9. Estado do repositório no fechamento documental

| Item | Estado Sprint 2 |
|------|-----------------|
| Collections Payload | users, tenants, companies, media |
| Globals | global-settings |
| Portal hardcoded | Parcial (hero CMS; resto hardcoded) |
| Documentação V2 | Completa em `docs/00-product/`, `docs/01-specifications/` |
| ADR-011 | Aceito |

---

## 10. Próximo passo

1. Humano revisa este gate + ADR-011 v1.1  
2. Commit documentação (branch sugerida: `docs/sprint-03-implementation-gate` ou continuação em feature branch)  
3. Iniciar **Sprint 3.4A-1** em prompt dedicado — somente após commit aprovado  
4. Cada sub-sprint = um PR revisável  

---

## Referências

- [ADR-011_PLATFORM_PRINCIPLES.md](../07-adrs/ADR-011_PLATFORM_PRINCIPLES.md)
- [S03_CMS_FOUNDATION.md](./S03_CMS_FOUNDATION.md)
- [S03_EDITORIAL_GOVERNANCE.md](./S03_EDITORIAL_GOVERNANCE.md)
- [S03_MULTISITE_BRANDING.md](./S03_MULTISITE_BRANDING.md)
- [S03_PORTAL_ARCHITECTURE.md](./S03_PORTAL_ARCHITECTURE.md)

---

*Omnia Platform — Implementation Gate — Fechamento documental Sprint 3*  
*Aguardando revisão humana para commit.*
