# Dependências e Fluxos

**Data:** 2026-07-22  
**Regra:** apenas relações comprovadas por imports/chamadas HTTP no código.

---

## 1. Mapa de dependências workspace (apps)

### `@omnia/web` depende de

`@omnia/config`, `@omnia/constants`, `@omnia/database`, `@omnia/monitoring`, `@omnia/shared`, `@omnia/ui`

### `@omnia/admin` depende de

`@omnia/config`, `@omnia/constants`, `@omnia/database`, `@omnia/monitoring`, `@omnia/shared`, `@omnia/ui` + Payload stack

### Packages scaffold

Sem consumidores de runtime nas apps (exports vazios). Dependências circulares entre packages de domínio: **NÃO ENCONTRADO** (scaffolds isolados).

---

## 2. Fluxo: resolve-site (S2S)

```
layout/getSiteContext (web)
  → resolveSite / fetchSiteResolution
  → GET {ADMIN_URL}/api/omnia/resolve-site?hostname=...
  → Header secret (OMNIA_INTERNAL_API_SECRET)
  → Domains/Sites no Payload
  → SiteResolutionResult
```

Arquivos: `apps/web/src/lib/site-resolver/*`, `apps/admin/src/endpoints/resolve-site*`.

---

## 3. Fluxo: página institucional

```
page.tsx / [slug]
  → getSiteContext (site slug)
  → fetchPublicPage(site, slug)
  → GET /api/omnia/public-page
  → mapPublicPage (@omnia/shared)
  → buildPageMetadata + JsonLd
```

---

## 4. Fluxo: blog

```
/blog, /blog/[slug], categoria, tag
  → fetchPublicPosts / fetchPublicPost / categories / tags
  → GET /api/omnia/public-posts|post|post-categories|post-tags
```

RSS:

```
GET /blog/rss.xml
  → fetchFeedPosts (propaga falha)
  → buildRssXml | empty channel 200
```

---

## 5. Fluxo: empresas portal

```
/empresas/[slug] + home CompanyCards
  → fetchPublicCompany / fetchCompanies (cms.ts)
  → GET /api/omnia/public-company | public-companies
```

**Nota de duplicidade:** `lib/cms.ts` (`fetchCompanies`) e `lib/cms-companies.ts` (`fetchPublicCompanies`) ambos consomem `public-companies` — ver dívida técnica.

---

## 6. Fluxo: autenticação portal

```
RegisterForm / login BFF
  → POST /api/auth/register|login (web)
  → POST {ADMIN}/api/users | /api/users/login
  → cookie omnia_payload_token
  → requirePortalSession → GET /api/users/me
  → páginas /meu-perfil/*
  → PATCH /api/me → PATCH /api/users/{id}
```

Rate limit: `@omnia/shared/rate-limit` + Redis (`REDIS_URL`).

---

## 7. Fluxo: lead capture / CRM

```
/interesse (force-dynamic)
  → fetchOrganizations → GET /api/omnia/public-organizations
  → LeadCaptureForm POST /api/omnia/lead-capture
  → cria/atualiza Leads (+ Activities via hook)
  → staff vê Collections no Payload Admin
```

---

## 8. Fluxo: SEO sitemap

```
/sitemap.xml
  → resolveFeedSite
  → fetchPublicPage (candidatos) [soft-fail]
  → fetchFeedCompanies/Posts/Taxonomies [propaga]
  → buildSitemapEntries | buildStaticSitemapEntries
  → logFeedFailure se fallback
```

Timeout: `CMS_FETCH_TIMEOUT_MS` via `fetchWithCmsTimeout`.

---

## 9. Providers / Services / Hooks

| Camada | Evidência |
|--------|-----------|
| Services nomeados (pasta services/) | NÃO ENCONTRADO NO REPOSITÓRIO (lógica em lib/ e endpoints/) |
| React Providers | NÃO ENCONTRADO NO REPOSITÓRIO |
| Payload hooks | Collections (Users, Companies, Pages, Posts, Domains, Leads, …) |
| Monitoring | `getPlatformStatus` → `/api/status` |

---

## 10. Matriz consumidor × API Admin

| API Admin | Consumidores web |
|-----------|------------------|
| `/api/omnia/resolve-site` | site-resolver |
| `/api/omnia/public-page` | cms.ts |
| `/api/omnia/public-companies` | cms.ts, cms-companies, cms-feed-client |
| `/api/omnia/public-company` | cms-companies |
| `/api/omnia/public-posts` | cms-blog, cms-feed-client |
| `/api/omnia/public-post` | cms-blog |
| `/api/omnia/public-post-categories` | cms-blog, cms-feed-client |
| `/api/omnia/public-post-tags` | cms-blog, cms-feed-client |
| `/api/omnia/public-organizations` | payload-client (auth) |
| `/api/omnia/lead-capture` | `LeadCaptureForm` → `{getPublicAdminUrl()}/api/omnia/lead-capture` (browser direto ao Admin) |
| `/api/globals/global-settings` | cms.ts |
| `/api/users/*` | payload-client |

Lead capture: browser chama diretamente `{NEXT_PUBLIC_ADMIN_URL}/api/omnia/lead-capture` (`LeadCaptureForm.tsx`).

---

## 11. Integrações externas

| Integração | Código de runtime |
|------------|-------------------|
| DeepSeek / OpenAI | Vars em `.env.example`; packages integrations scaffold |
| SMTP / Mailpit | Compose + env; `@omnia/mail` scaffold |
| MinIO | Compose; Media local |
| Google Fonts (build) | `next/font` em layout web (dependência de rede no build) |

---

## Documentos relacionados

Baseline: [`BASELINE_PLATAFORMA_2.1.1.md`](./BASELINE_PLATAFORMA_2.1.1.md) · Arquitetura: [`ARQUITETURA_APLICACAO.md`](./ARQUITETURA_APLICACAO.md) · Rotas: [`ROTAS_E_ENDPOINTS.md`](./ROTAS_E_ENDPOINTS.md)
