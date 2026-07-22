# Rotas e Endpoints

**Data:** 2026-07-22  
**Fontes:** `apps/web/src/app/**`, `apps/admin/src/app/**`, `payload.config.ts`

---

## Contagens

| Escopo | Quantidade (evidência) |
|--------|------------------------|
| Páginas web (`page.tsx`) | 13 |
| Route handlers web (`route.ts`) | 7 |
| Metadata web (sitemap/robots) | 2 |
| Layouts web | 1 (raiz) |
| Middleware web | **0** (NÃO ENCONTRADO) |
| Middleware admin | **1** (`apps/admin/src/middleware.ts`, matcher `/`) |
| Endpoints Payload custom | 10 |
| Páginas admin frontend | 5 (`login`, panel `/`, `unauthorized`, `area/[role]`, Payload admin) |

---

## A. Portal `@omnia/web`

### Rotas públicas (páginas)

| URL | Arquivo | Auth | Cache / notas |
|-----|---------|------|---------------|
| `/` | `app/page.tsx` | Não | Server; CMS revalidate 60s nos fetches |
| `/[slug]` | `app/[slug]/page.tsx` | Não | Dinâmica CMS pages |
| `/blog` | `app/blog/page.tsx` | Não | Server |
| `/blog/[slug]` | `app/blog/[slug]/page.tsx` | Não | Server + JSON-LD Article |
| `/blog/categoria/[slug]` | `app/blog/categoria/[slug]/page.tsx` | Não | Server |
| `/blog/tag/[slug]` | `app/blog/tag/[slug]/page.tsx` | Não | Server |
| `/empresas/[slug]` | `app/empresas/[slug]/page.tsx` | Não | Server |
| `/interesse` | `app/interesse/page.tsx` | Não | `dynamic = 'force-dynamic'` |
| `/cadastro` | `app/cadastro/page.tsx` | Não | Server + form client |

### Rotas autenticadas (portal)

| URL | Arquivo | Auth | Middleware |
|-----|---------|------|------------|
| `/minha-conta` | `minha-conta/page.tsx` | `requirePortalSession()` | N/A (guard server) |
| `/meu-perfil` | `meu-perfil/page.tsx` | idem | N/A |
| `/meu-perfil/organizacao` | `meu-perfil/organizacao/page.tsx` | idem | N/A |
| `/meu-perfil/senha` | `meu-perfil/senha/page.tsx` | idem | N/A |

Login UI no web: **NÃO ENCONTRADO** — redirect para Admin (`getAdminLoginUrl`).

### Rotas API (BFF web)

| URL | Métodos | Arquivo | Auth | Entrada/saída (resumo) |
|-----|---------|---------|------|------------------------|
| `/api/auth/login` | POST, GET | `api/auth/login/route.ts` | Cookie após POST | POST credentials → set `omnia_payload_token`; GET `{ authenticated }` |
| `/api/auth/logout` | POST, GET | `api/auth/logout/route.ts` | Cookie | Invalida Payload + limpa cookie |
| `/api/auth/register` | POST | `api/auth/register/route.ts` | — | Cria user + auto-login |
| `/api/me` | GET, PATCH | `api/me/route.ts` | Cookie JWT | Perfil / senha |
| `/api/health` | GET | `api/health/route.ts` | Não | Health |
| `/api/status` | GET | `api/status/route.ts` | Não | Status plataforma (`@omnia/monitoring`) |

Consumidores: browser (forms), Server Components.

### Rotas SEO

| URL | Arquivo | Tipo | Cache |
|-----|---------|------|-------|
| `/sitemap.xml` | `app/sitemap.ts` | MetadataRoute | Fallback estático se CMS falhar |
| `/robots.txt` | `app/robots.ts` | MetadataRoute | allow `/`, disallow `/api/` |
| `/blog/rss.xml` | `blog/rss.xml/route.ts` | GET XML | `s-maxage=60, stale-while-revalidate=30`; sempre 200 |

### ISR / revalidate

| Padrão | Evidência |
|--------|-----------|
| `export const revalidate = N` | NÃO ENCONTRADO NO REPOSITÓRIO |
| `next: { revalidate: 60 }` | `lib/cms.ts`, `cms-blog.ts`, `cms-companies.ts`, `seo/cms-feed-client.ts` |
| Auth fetches | `cache: 'no-store'` |

### Server vs Client (entry points)

Todos os `page.tsx` / `layout.tsx` são Server Components. Forms client: `RegisterForm`, `LeadCaptureForm`, `ProfileForm`, `OrganizationForm`, `ChangePasswordForm`.

---

## B. Admin `@omnia/admin`

### Rotas frontend

| URL | Arquivo | Auth / middleware |
|-----|---------|-------------------|
| `/` | `(frontend)/(panel)/page.tsx` | Cookie `payload-token`; middleware redireciona sem sessão → `/login` |
| `/login` | `(frontend)/login/page.tsx` | Público |
| `/unauthorized` | `(frontend)/unauthorized/page.tsx` | — |
| `/area/[role]` | `(frontend)/area/[role]/page.tsx` | Stub por role |
| `/admin/[[...segments]]` | `(payload)/admin/[[...segments]]/page.tsx` | Payload Admin UI |

### Rotas API admin (Next)

| URL | Métodos | Arquivo |
|-----|---------|---------|
| `/api/health` | GET | `(frontend)/api/health/route.ts` |
| `/api/status` | GET | `(frontend)/api/status/route.ts` |
| `/api/auth/logout` | POST, GET | `(frontend)/api/auth/logout/route.ts` |
| `/api/*` | GET/POST/PATCH/DELETE | `(payload)/api/[...slug]/route.ts` |

Pasta `apps/admin/src/app/api/`: **NÃO ENCONTRADO** (rotas sob `(frontend)/api` e `(payload)/api`).

### Middleware admin

Arquivo: `apps/admin/src/middleware.ts`  
Matcher: `['/']`  
Comportamento: se path `/` sem cookie `payload-token` → redirect `/login`.  
Rate limit Redis do login: **não** no Edge; em `Users.beforeOperation`.

---

## C. APIs Payload REST + custom

### Custom `/api/omnia/*`

| Método | Path | Auth | Consumidores |
|--------|------|------|--------------|
| GET | `/api/omnia/resolve-site` | Header secret S2S (`OMNIA_INTERNAL_API_SECRET`) | `apps/web` site-resolver |
| GET | `/api/omnia/public-companies` | Público | web cms / cms-companies / feeds |
| GET | `/api/omnia/public-company` | Público | web cms-companies |
| GET | `/api/omnia/public-organizations` | Público | web auth payload-client (interesse/cadastro) |
| POST | `/api/omnia/lead-capture` | Público + rate limit | `LeadCaptureForm` |
| GET | `/api/omnia/public-page` | Público | web cms |
| GET | `/api/omnia/public-posts` | Público | web cms-blog / feeds |
| GET | `/api/omnia/public-post` | Público | web cms-blog |
| GET | `/api/omnia/public-post-categories` | Público | web cms-blog / feeds |
| GET | `/api/omnia/public-post-tags` | Público | web cms-blog / feeds |

### Auth Users (consumidos pelo BFF web)

| Método | Path | Uso |
|--------|------|-----|
| POST | `/api/users/login` | Login |
| POST | `/api/users` | Register |
| GET | `/api/users/me` | Sessão |
| POST | `/api/users/logout` | Logout |
| PATCH | `/api/users/{id}` | Perfil / senha |

### Globals

| Método | Path | Consumidor |
|--------|------|------------|
| GET | `/api/globals/global-settings` | `fetchGlobalSettings` no web |

### Webhooks externos

**NÃO ENCONTRADO NO REPOSITÓRIO** (nenhuma rota webhook dedicada nas apps).

---

## D. Autenticação (fluxo comprovado)

```
[Portal form] → POST /api/auth/login (web)
    → POST {ADMIN}/api/users/login
    → cookie omnia_payload_token (httpOnly, 8h)
    → requirePortalSession → GET /api/users/me (JWT)

[Admin browser] → cookie payload-token
    → middleware / → /login se ausente
    → Payload Admin + hooks accountStatus/RBAC
```

RBAC roles (`@omnia/constants`): `super_admin`, `admin`, `editor`, `partner`, `instructor`, `student`, `client`.  
Staff: `super_admin|admin|editor`.  
accountStatus: `active|pending|blocked` (hooks reject blocked).

---

## E. SEO (mapa)

| Capacidade | Local |
|------------|-------|
| robots | `apps/web/src/app/robots.ts` |
| sitemap | `apps/web/src/app/sitemap.ts` + `lib/seo/sitemap-entries.ts` |
| RSS | `apps/web/src/app/blog/rss.xml/route.ts` + `lib/seo/rss-feed.ts` |
| Metadata | `lib/seo/build-page-metadata.ts` |
| Canonical | `lib/seo/site-url.ts` |
| Open Graph | via `buildPageMetadata` |
| Schema.org | `lib/seo/json-ld.ts` + `components/seo/JsonLd.tsx` |
| Redirects next.config | NÃO ENCONTRADO NO REPOSITÓRIO (sem inventário de redirects de app neste audit) |

---

## Documentos relacionados

Baseline: [`BASELINE_PLATAFORMA_2.1.1.md`](./BASELINE_PLATAFORMA_2.1.1.md) · Collections: [`COLLECTIONS_E_GLOBALS.md`](./COLLECTIONS_E_GLOBALS.md) · Fluxos: [`DEPENDENCIAS_E_FLUXOS.md`](./DEPENDENCIAS_E_FLUXOS.md)
