# Baseline oficial — Omnia Platform 2.1.1

**Status:** documentação oficial de arquitetura (estado do código)  
**Data de consolidação:** 2026-07-22  
**Branch de referência da release:** `fix/release-2.1.1-seo-feeds`  
**Base Git (Release 2.1):** `68863ed`  
**HEAD validado (Release 2.1.1):** `a1974a6` (settle cms fetch on abort) + docs de release `6c5dc03`

Este documento é o **índice canônico** da auditoria técnica. Detalhes vivem nos documentos irmãos em `docs/auditoria/`.

---

## 1. Inventário oficial (números canônicos)

| Item | Quantidade | Fonte |
|------|------------|-------|
| Apps | **2** (`@omnia/web`, `@omnia/admin`) | `INVENTARIO_PLATAFORMA_OMNIA.md` |
| Packages | **27** (7 úteis/parciais · 17 scaffold · 3 tooling) | idem |
| Collections Payload | **16** | `COLLECTIONS_E_GLOBALS.md` |
| Globals Payload | **1** (`global-settings`) | idem |
| Endpoints custom `/api/omnia/*` | **10** | idem / `ROTAS_E_ENDPOINTS.md` |
| Migrations Payload | **12** | `COLLECTIONS_E_GLOBALS.md` |
| Middleware Next | **1** (admin, matcher `/`); **0** no web | `ROTAS_E_ENDPOINTS.md` |
| Compose files | **3** | inventário |
| Workflows CI | **1** | inventário |

Qualquer documento derivado deve **reutilizar estes números**. Em caso de divergência, prevalece o código + esta baseline.

---

## 2. Arquitetura geral

Monorepo **pnpm 9 + Turborepo**, Node ≥ 22.

```
Browser ──▶ @omnia/web (:3000) ──HTTP──▶ @omnia/admin (:3001) ──▶ PostgreSQL
                 │ BFF auth/cookie              │ Payload + CRM
                 │ SEO / CMS clients            │ /api/omnia/*
                 └─ @omnia/shared|config|ui     └─ Redis (rate-limit)
```

- Portal **não importa** Payload.
- Domínio de runtime: Collections Payload + contratos `@omnia/shared`.
- `domains/` e `modules/`: documentação apenas (sem TypeScript de runtime).

Detalhe: [`ARQUITETURA_APLICACAO.md`](./ARQUITETURA_APLICACAO.md).

---

## 3. Aplicações

| App | Papel |
|-----|--------|
| `@omnia/web` | Portal público, blog, empresas, interesse, perfil; BFF `/api/auth/*`, `/api/me`; SEO sitemap/robots/RSS |
| `@omnia/admin` | Payload Admin, painel staff, CRM Collections, APIs públicas e S2S |

Inventário: [`INVENTARIO_PLATAFORMA_OMNIA.md`](./INVENTARIO_PLATAFORMA_OMNIA.md).

---

## 4. Domínio Payload

**Collections (16):** users, tenants, organizations, companies, crm-companies, contacts, leads, activities, sites, domains, media, pages, authors, categories, tags, posts.

**Global (1):** global-settings.

**Versions (drafts):** sites, pages, authors, categories, posts.

**Upload nativo:** media.

Detalhe: [`COLLECTIONS_E_GLOBALS.md`](./COLLECTIONS_E_GLOBALS.md).

---

## 5. Integrações e fluxos

| Fluxo | Resumo |
|-------|--------|
| Multisite | `domains`/`sites` → `GET /api/omnia/resolve-site` (S2S secret) |
| Conteúdo | `public-page`, `public-posts`, `public-companies`, taxonomias |
| Lead capture | Browser → `{ADMIN}/api/omnia/lead-capture` |
| Auth portal | BFF web ↔ `/api/users/*` + cookie `omnia_payload_token` |
| Auth admin | cookie `payload-token` + hooks RBAC/blocked |
| Rate limit | Redis via `@omnia/shared/rate-limit` |

Mapa: [`DEPENDENCIAS_E_FLUXOS.md`](./DEPENDENCIAS_E_FLUXOS.md) · Rotas: [`ROTAS_E_ENDPOINTS.md`](./ROTAS_E_ENDPOINTS.md).

---

## 6. Autenticação e RBAC

| Canal | Mecanismo |
|-------|-----------|
| Portal | Cookie httpOnly `omnia_payload_token` (JWT Payload); guard `requirePortalSession` |
| Admin | Cookie `payload-token`; middleware `/` → `/login` |
| Roles | `@omnia/constants`: super_admin, admin, editor, partner, instructor, student, client |
| Staff | super_admin \| admin \| editor |
| Bloqueio | `accountStatus=blocked` (hooks Users + JWT wrap) |

Login UI no web: **não existe** — redirect para Admin.

---

## 7. SEO

| Recurso | Comportamento vigente (2.1.1) |
|---------|-------------------------------|
| `/robots.txt` | allow `/`, disallow `/api/`, sitemap absoluto |
| `/sitemap.xml` | Lista válida; timeout CMS; fallback rotas estáticas; logs `cms_feed_fallback` |
| `/blog/rss.xml` | Sempre HTTP 200 + XML; canal vazio no fallback |
| Metadata / OG / JSON-LD | `lib/seo/*` |
| Timeout | `CMS_FETCH_TIMEOUT_MS` (default 5000 ms) |

---

## 8. Release 2.1.1 — estado validado

| Check | Resultado |
|-------|-----------|
| Causa raiz | fetch CMS sem timeout → hang → 500 |
| Solução | timeout + fallback sitemap/RSS + logs + settle on abort |
| lint / typecheck / testes feeds / build | OK na validação local |
| Build Windows | `NODE_USE_SYSTEM_CA=1` (ambiente local; **não** requisito da app) |
| Commits (código+docs release) | `dae6529` → `707434d` → `ffda04a` → `6c5dc03` → `a1974a6` |
| Push/merge/deploy desta auditoria | **não realizados** |

Riscos operacionais pós-código: [`RISCOS_E_PENDENCIAS.md`](./RISCOS_E_PENDENCIAS.md) · matriz: [`MATRIZ_STATUS_PLATAFORMA.csv`](./MATRIZ_STATUS_PLATAFORMA.csv).

---

## 9. Riscos e dívida (P0–P3)

Resumo alinhado a [`DIVIDA_TECNICA.md`](./DIVIDA_TECNICA.md) e riscos de release:

| Prioridade | Temas |
|------------|--------|
| **P0** | Feeds em **produção publicada** até deploy 2.1.1; SPOF conta admin (operacional) |
| **P1** | Packages auth/mail/logger scaffold; SMTP ausente; schema Drizzle vazio; Media em disco; TLS Node no build Windows |
| **P2** | Clientes CMS duplicados; stubs `/area/[role]`; drift versão npm; GraphQL não explícito no config; lint `useRouter` |
| **P3** | Packages/docs aspiracionais; placeholders; img sem next/image |

---

## 10. Limitações conhecidas

- Sem Kanban / opportunities / tasks / LMS / IA runtime (só scaffold/docs).
- Sem workers/jobs in-app; n8n só compose/status.
- Sem middleware de auth no web (proteção por página).
- GraphQL: não configurado explicitamente no `payload.config.ts`.
- Dead-code automatizado (knip): não executado nesta baseline.
- Conteúdo prod (ex.: neurofrigo-carga) pode divergir do DEV — não é gap de código de plataforma.

---

## 11. Decisões arquiteturais vigentes

1. CMS e Portal desacoplados por HTTP.
2. Contratos públicos em `@omnia/shared` com testes de contrato.
3. Rate limit Redis fora do Edge middleware.
4. Feeds SEO resilientes (timeout + fallback + log seguro).
5. Runtime concentrado em web/admin; packages de domínio futuros permanecem scaffold até implementação real.

---

## 12. Índice da pasta `docs/auditoria`

| Arquivo | Função |
|---------|--------|
| `BASELINE_PLATAFORMA_2.1.1.md` | **Este documento** — baseline oficial |
| `INVENTARIO_PLATAFORMA_OMNIA.md` | Inventário monorepo |
| `COLLECTIONS_E_GLOBALS.md` | Payload collections/globals |
| `ROTAS_E_ENDPOINTS.md` | Rotas e APIs |
| `ARQUITETURA_APLICACAO.md` | Arquitetura |
| `DEPENDENCIAS_E_FLUXOS.md` | Dependências e fluxos |
| `DIVIDA_TECNICA.md` | Dívida P0–P3 |
| `RISCOS_E_PENDENCIAS.md` | Riscos e pendências (release) |
| `MATRIZ_STATUS_PLATAFORMA.csv` | Matriz de status |

---

*Baseline gerada por consolidação de auditoria técnica somente leitura. Não substitui ADRs históricos em `docs/07-adrs` / `docs/14-adr`; complementa-os com o estado comprovado do repositório na Release 2.1.1.*
