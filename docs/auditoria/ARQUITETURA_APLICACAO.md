# Arquitetura da Aplicação — Omnia Platform

**Data:** 2026-07-22  
**Tipo:** auditoria (estado atual do código)  
**Não substitui:** ADRs em `docs/07-adrs` / `docs/14-adr` (complementar)

---

## 1. Visão geral

A plataforma é um **monorepo pnpm + Turborepo** com dois runtimes Next.js:

| Runtime | Papel |
|---------|--------|
| `@omnia/web` | Portal público + BFF de autenticação do usuário final |
| `@omnia/admin` | CMS Payload 3 + CRM Collections + painel staff + APIs públicas `/api/omnia/*` |

Separação explícita: **Portal nunca importa Payload** (evidência README + imports). Comunicação portal→admin é **HTTP**.

```
┌─────────────┐     HTTP      ┌──────────────────────────┐
│  Browser    │──────────────▶│  @omnia/web (Next :3000) │
└─────────────┘               │  pages + BFF /api/auth   │
                              └────────────┬─────────────┘|
                                           │ fetch S2S / público
                                           ▼
                              ┌──────────────────────────┐
│  Staff UI   │──────────────▶│  @omnia/admin (Next:3001)│
└─────────────┘               │  Payload + CRM + omnia/* │
                              └────────────┬─────────────┘
                                           │
                                           ▼
                                      PostgreSQL
                                      Redis (rate-limit)
```

---

## 2. Camadas

### 2.1 Apresentação

- **Web:** App Router Server Components; forms client pontuais.
- **Admin:** Payload Admin UI (`/admin`) + frontend panel (`/`, `/login`, `/area/[role]`).

### 2.2 Aplicação / BFF

- Web: `lib/auth/*`, `lib/cms*`, `lib/site-resolver`, `lib/seo`, `lib/site-context`.
- Admin: endpoints Payload custom, hooks de collection, seeds/scripts.

### 2.3 Domínio (código)

Implementação de domínio vive principalmente em **Collections Payload** e contratos `@omnia/shared` (`public-page`, `public-post`, `public-company`).  
Pastas `domains/` e `modules/` são **documentação**, sem TypeScript de runtime.

### 2.4 Infraestrutura

| Serviço | Uso no código |
|---------|---------------|
| PostgreSQL | Payload `postgresAdapter` |
| Redis | `@omnia/shared/rate-limit` (login, register, lead-capture, etc.) |
| MinIO | Compose/docs; Media usa `staticDir` local |
| n8n | Compose + status monitoring; **sem jobs app** |

---

## 3. Multisite

1. Collections `sites` + `domains` (hostname → site).
2. Web resolve hostname via `getSiteContext()` → `GET /api/omnia/resolve-site` com `OMNIA_INTERNAL_API_SECRET`.
3. Conteúdo público filtrado por `site` slug nas APIs `public-page` / `public-posts` / taxonomias.

---

## 4. Autenticação e RBAC (arquitetura)

| Canal | Cookie / token | Onde |
|-------|----------------|------|
| Portal | `omnia_payload_token` | Setado pelo BFF web |
| Admin | `payload-token` | Payload nativo |

Roles: `@omnia/constants` `PLATFORM_ROLES` / `STAFF_ROLES`.  
Bloqueio: `accountStatus=blocked` via hooks Users + JWT wrap (`account-status`).  
Middleware Edge admin: **apenas** redirect `/` → `/login` sem cookie (sem Redis no Edge).

---

## 5. SEO e feeds

Camada `apps/web/src/lib/seo/*`:

- Metadata + JSON-LD por página
- Sitemap resiliente (`CMS_FETCH_TIMEOUT_MS`, fallback estático)
- RSS sempre HTTP 200
- Logs `cms_feed_fallback` (operacionais)

---

## 6. CRM

Collections: `organizations`, `crm-companies`, `contacts`, `leads`, `activities`.  
Captura pública: `POST /api/omnia/lead-capture` + página `/interesse`.  
**Não encontrado:** Kanban UI, opportunities, tasks, calendar, reports (apenas ausência no código).

---

## 7. Middleware

| App | Arquivo | Escopo |
|-----|---------|--------|
| web | NÃO ENCONTRADO | Proteção via `requirePortalSession` |
| admin | `src/middleware.ts` | matcher `/` |

---

## 8. Providers

React Context Providers custom no web: **NÃO ENCONTRADO NO REPOSITÓRIO**.  
Payload fornece seu próprio contexto interno na Admin UI (framework).

---

## 9. Jobs / automação

Workers in-app / BullMQ: **NÃO ENCONTRADO NO REPOSITÓRIO**.  
Package `@omnia/queue` / `@omnia/automation`: scaffold.

---

## 10. Decisões arquiteturais observadas no código

1. CMS e Portal desacoplados por HTTP (não monólito Payload no web).
2. Contratos públicos tipados em `@omnia/shared` + testes de contrato.
3. Rate limit Redis fora do Edge middleware (comentário explícito no middleware admin).
4. Soft-fail nos clientes CMS de página; feeds usam cliente que propaga erro + fallback.
5. Grande superfície de packages scaffold → arquitetura-alvo documentada, runtime concentrado em web/admin/shared/config/ui.

---

## Documentos relacionados

Baseline: [`BASELINE_PLATAFORMA_2.1.1.md`](./BASELINE_PLATAFORMA_2.1.1.md) · Inventário: [`INVENTARIO_PLATAFORMA_OMNIA.md`](./INVENTARIO_PLATAFORMA_OMNIA.md) · Dívida: [`DIVIDA_TECNICA.md`](./DIVIDA_TECNICA.md)
