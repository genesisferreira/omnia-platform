# Inventário da Plataforma Omnia

**Tipo:** auditoria técnica (somente leitura)  
**Data:** 2026-07-22  
**Base de evidência:** código no repositório `omnia-platform`  
**Regra:** o que não constar no código aparece como `NÃO ENCONTRADO NO REPOSITÓRIO`

---

## 1. Resumo do monorepo

| Item | Evidência |
|------|-----------|
| Package manager | `pnpm@9.15.0` (`package.json`) |
| Workspaces | `apps/*`, `packages/*` (`pnpm-workspace.yaml`) |
| Orquestração | Turborepo (`turbo.json`: build, dev, lint, typecheck, clean) |
| Node | `>=22.0.0` (engines) |
| Nome raiz | `omnia-platform` versão `0.3.0` |

### Contagens

| Categoria | Quantidade |
|-----------|------------|
| Apps | **2** (`@omnia/web`, `@omnia/admin`) |
| Packages | **27** (7 implementados/parciais, 17 scaffold, 3 tooling) |
| Collections Payload | **16** (ver `COLLECTIONS_E_GLOBALS.md`) |
| Globals Payload | **1** (`global-settings`) |
| Endpoints custom `/omnia/*` | **10** |
| Domínios DDD (só docs) | **12** (`domains/*/README.md`) |
| Módulos (só docs) | **9** (`modules/*/README.md`) |
| Compose Docker | **3** |
| Workflows CI | **1** (`.github/workflows/ci.yml`) |
| Migrations Payload | **12** |

---

## 2. Apps

### 2.1 `@omnia/web` — `apps/web`

| Campo | Valor |
|-------|-------|
| Finalidade | Portal público, blog, área do parceiro/perfil (description em `package.json`) |
| Runtime | Next.js 15 (App Router), React 19 |
| Porta dev | 3000 |
| Dependências workspace | `@omnia/config`, `@omnia/constants`, `@omnia/database`, `@omnia/monitoring`, `@omnia/shared`, `@omnia/ui` |
| Payload | **Não importa** Payload (README + código) |
| Consumo | Público (browser) + BFF server → Admin HTTP |
| Responsável (CODEOWNERS) | Ver `.github/CODEOWNERS` se presente |

### 2.2 `@omnia/admin` — `apps/admin`

| Campo | Valor |
|-------|-------|
| Finalidade | Painel administrativo, CRM e CMS (`package.json`) |
| Runtime | Next.js 15 + Payload CMS 3 |
| Porta dev | 3001 |
| Dependências workspace | mesmas do web + `@payloadcms/*`, `payload`, `graphql`, `sharp` |
| Consumo | Staff via `/admin` e frontend panel; APIs públicas `/api/omnia/*` |
| Migrations | 12 em `apps/admin/src/migrations` |

---

## 3. Packages (`packages/`)

### Implementados / parciais

| Package | Finalidade | Dependências relevantes | Consumo |
|---------|------------|-------------------------|---------|
| `@omnia/shared` | Contratos CMS públicos, hostname, rate-limit Redis | usado por web+admin | Portal, Admin endpoints, CI |
| `@omnia/constants` | Roles, password policy, lead-interest | web+admin | RBAC, Users, leads |
| `@omnia/config` | Zod env: app URLs, DB, Redis, secrets | zod | Ambos apps |
| `@omnia/database` | Client Drizzle + health; **schema `export {}`** | drizzle/pg | Status/health; schema não modela domínio Payload |
| `@omnia/errors` | Hierarquia `AppError` etc. | — | Disponível; uso amplo **não inventariado aqui** |
| `@omnia/monitoring` | `getPlatformStatus` / health | — | `/api/status` web e admin |
| `@omnia/ui` | Design system (Button, Card, …) | React, Tailwind | Portal + Admin frontend |

### Scaffold (`src/index.ts` = `export {}`)

`@omnia/auth`, `@omnia/validation`, `@omnia/testing`, `@omnia/security`, `@omnia/search`, `@omnia/queue`, `@omnia/mail`, `@omnia/integrations`, `@omnia/feature-flags`, `@omnia/events`, `@omnia/cache`, `@omnia/ai-core`, `@omnia/i18n`, `@omnia/logger`, `@omnia/sdk`, `@omnia/types`, `@omnia/automation`

**Responsável / consumo:** documentados em READMEs como sprints futuras; **sem consumidores de runtime no código das apps** (além de deps declaradas onde existirem).

### Tooling

| Package | Finalidade |
|---------|------------|
| `@omnia/eslint-config` | ESLint compartilhado |
| `@omnia/typescript-config` | tsconfig base/next/node |
| `@omnia/prettier-config` | Prettier |

---

## 4. Infraestrutura e ferramentas

| Item | Path | Finalidade |
|------|------|------------|
| Docker Compose | `docker/compose/{development,staging,production}.yml` | Postgres, Redis, MinIO, n8n, Mailpit (dev); Web+Admin staging/prod |
| Bootstrap | `docker/scripts/admin-bootstrap.sh` | Migrate/seed staging |
| CI | `.github/workflows/ci.yml` | lint, typecheck, format, testes contrato/SEO, build+migrate |
| Scripts raiz | `scripts/` | Placeholder + READMEs backup/deploy/setup |
| Seeds/testes | `apps/admin/src/scripts/*`, `apps/web/src/scripts/*` | Seed holding, testes de contrato, SEO, timeout CMS |

### Jobs / filas / cron in-app

**NÃO ENCONTRADO NO REPOSITÓRIO** (nenhum worker BullMQ/cron no código das apps).  
n8n aparece em compose + campo `n8n` em `/api/status` via `@omnia/monitoring`.

---

## 5. Providers e hooks (React)

| Tipo | Evidência |
|------|-----------|
| React Context / Provider em `apps/web` | **NÃO ENCONTRADO NO REPOSITÓRIO** |
| Site context | `getSiteContext()` (server, memoizado) — não é Provider React |
| Hooks Payload (collections) | Ver `COLLECTIONS_E_GLOBALS.md` |
| Hooks Next (useEffect em forms client) | Forms em `cadastro`, `interesse`, `meu-perfil/*` |

---

## 6. Configuração e variáveis de ambiente

Arquivos: `.env.example`, `.env.staging.example`, `.env.production.example`.

### Nomes presentes em `.env.example` (sem valores)

`POSTGRES_*`, `DATABASE_URL`, `REDIS_URL`, `MINIO_*`, `N8N_*`, `PAYLOAD_SECRET`, `OMNIA_INTERNAL_API_SECRET`, `DEEPSEEK_API_KEY`, `OPENAI_API_KEY`, `JWT_SECRET`, `PGADMIN_*`, `SMTP_*`, `MAILPIT_WEB_URL`, `APP_VERSION`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_ADMIN_URL`, `CMS_FETCH_TIMEOUT_MS`, `NODE_ENV`

Validação runtime: `@omnia/config` (`getConfig`, `getInternalApiConfig`).

---

## 7. Domínios e módulos (documentação)

| Área | Conteúdo de código TypeScript |
|------|-------------------------------|
| `domains/*` (12) | **NÃO ENCONTRADO** — apenas README |
| `modules/*` (9) | **NÃO ENCONTRADO** — apenas README |
| `database/schemas/` | Documentação/modelagem conceitual (não é schema Payload) |
| `events/`, `storage/` | Docs de arquitetura |

---

## 8. Dependências internas (mapa resumido)

```
Browser → @omnia/web (Next)
            ├─ @omnia/ui, @omnia/shared, @omnia/config, @omnia/constants
            ├─ BFF /api/auth/* , /api/me
            └─ fetch → @omnia/admin (/api/omnia/*, /api/users/*, /api/globals/*)

Staff → @omnia/admin (Next + Payload)
            ├─ Collections/Globals/Endpoints
            ├─ @omnia/shared (contratos, rate-limit)
            └─ Postgres (Payload adapter)
```

Detalhamento: `DEPENDENCIAS_E_FLUXOS.md`.

---

## 9. Itens não encontrados

| Item | Status |
|------|--------|
| App mobile | NÃO ENCONTRADO NO REPOSITÓRIO |
| GraphQL route dedicada | NÃO ENCONTRADO NO REPOSITÓRIO |
| Workers/jobs in-process | NÃO ENCONTRADO NO REPOSITÓRIO |
| Storybook | NÃO ENCONTRADO NO REPOSITÓRIO |
| Playwright e2e package ativo | Package `@omnia/testing` scaffold |

---

## Documentos relacionados

| Documento | Conteúdo |
|-----------|----------|
| [`BASELINE_PLATAFORMA_2.1.1.md`](./BASELINE_PLATAFORMA_2.1.1.md) | Baseline oficial consolidada |
| [`COLLECTIONS_E_GLOBALS.md`](./COLLECTIONS_E_GLOBALS.md) | Domínio Payload |
| [`ROTAS_E_ENDPOINTS.md`](./ROTAS_E_ENDPOINTS.md) | Rotas e APIs |
| [`ARQUITETURA_APLICACAO.md`](./ARQUITETURA_APLICACAO.md) | Arquitetura |
| [`DEPENDENCIAS_E_FLUXOS.md`](./DEPENDENCIAS_E_FLUXOS.md) | Dependências e fluxos |
| [`DIVIDA_TECNICA.md`](./DIVIDA_TECNICA.md) | Dívida P0–P3 |
| [`RISCOS_E_PENDENCIAS.md`](./RISCOS_E_PENDENCIAS.md) | Riscos e pendências |
| [`MATRIZ_STATUS_PLATAFORMA.csv`](./MATRIZ_STATUS_PLATAFORMA.csv) | Matriz de status |
