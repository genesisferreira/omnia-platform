# Collections e Globals — Payload CMS

**Fonte:** `apps/admin/payload.config.ts` + arquivos em `apps/admin/src/collections` e `apps/admin/src/globals`  
**Data:** 2026-07-22  
**GraphQL:** chave `graphQL` no config **NÃO ENCONTRADO NO REPOSITÓRIO** (dependência `graphql` presente no package.json).

---

## Registro no config

### Collections (16, ordem)

`users`, `tenants`, `organizations`, `companies`, `crm-companies`, `contacts`, `leads`, `activities`, `sites`, `domains`, `media`, `pages`, `authors`, `categories`, `tags`, `posts`

### Globals (1)

`global-settings`

### Endpoints customizados (10)

Prefixo HTTP efetivo: `/api` + path do endpoint.

| Path | Método | Arquivo |
|------|--------|---------|
| `/omnia/resolve-site` | GET | `endpoints/resolve-site` |
| `/omnia/public-companies` | GET | `endpoints/public-companies` |
| `/omnia/public-company` | GET | `endpoints/public-companies` |
| `/omnia/public-organizations` | GET | `endpoints/public-organizations` |
| `/omnia/lead-capture` | POST | `endpoints/lead-capture` |
| `/omnia/public-page` | GET | `endpoints/public-page` |
| `/omnia/public-posts` | GET | `endpoints/public-posts` |
| `/omnia/public-post` | GET | `endpoints/public-posts` |
| `/omnia/public-post-categories` | GET | `endpoints/public-posts` |
| `/omnia/public-post-tags` | GET | `endpoints/public-posts` |

REST nativo Payload: catch-all `apps/admin/src/app/(payload)/api/[...slug]/route.ts` (GET/POST/PATCH/DELETE).

---

## Collections

### `users` — `Users.ts`

| Atributo | Evidência |
|----------|-----------|
| Auth | Sim (tokenExpiration, cookies, maxLoginAttempts, lockTime) |
| Versions | `false` |
| Upload collection | Não (`photo` → media) |
| Hooks | `beforeOperation`: rateLimitNativeLogin; `beforeChange`: preventSelfRoleEscalation, enforcePasswordPolicy; `beforeLogin` / `me` / `refresh`: rejectBlocked* |
| Endpoints collection | NÃO ENCONTRADO NO REPOSITÓRIO |

**Campos (principais):** firstName, lastName, name, phone, whatsapp, cpf, photo→media, employerName, jobTitle, segment, country/state/city, interestAreas, groupOrganizations→organizations, lgpdAccepted/At, role, accountStatus, company→companies, tenant→tenants + auth padrão (email/password).

**Access:** admin panel: super_admin/admin/editor; read/update self para não-admin; create público ou admin; delete super_admin; unlock adminsOnly.

---

### `tenants` — `Tenants.ts`

| Campo | Tipo |
|-------|------|
| name, slug, description | text/textarea |
| status | select active/inactive |

Versions: false · Hooks: NÃO ENCONTRADO · Access: read staffOnly; write adminsOnly.

---

### `organizations` — `Organizations.ts`

Labels: Organização/Organizações. Campos: name, slug, logo→media, description, active, type (holding/vertical/product/education).  
Access: read authenticated; write adminsOnly. Lista pública via endpoint `public-organizations` (overrideAccess).

---

### `companies` — `Companies.ts`

Portal/ecossistema. Campos: tenant, name, slug, portalSlug, textos, ecosystem flags, brandTheme, media (logo/cover/gallery), CTAs, seo, publishing fields.  
Hooks: beforeValidate normalizePortalSlug; beforeChange setPublishedAtOnPublish.  
Access: companyScopedRead/Write.

---

### `crm-companies` — `CrmCompanies.ts`

Contas comerciais: legalName, tradeName, cnpj, segment, city/state/country, website, owner→users, phone, status, notes, tags.  
Access: staff CRUD parcial; delete adminsOnly.

---

### `contacts` — `Contacts.ts`

name, jobTitle, email, phone, whatsapp, company→crm-companies, origin, notes.  
Access: staff; delete adminsOnly.

---

### `leads` — `Leads.ts`

name, companyName, company→crm-companies, contact→contacts, origin, interest, groupOrganization→organizations, status, temperature, owner→users, estimatedValue, probability, notes.  
Hooks: afterChange logLeadActivity.  
Access: staff; delete adminsOnly.

---

### `activities` — `Activities.ts`

type, message, relatedTo (polimórfico leads|contacts|crm-companies), author→users.  
Access: read/create staff; update/delete adminsOnly.

---

### `sites` — `Sites.ts`

**Versions:** drafts + autosave, maxPerDoc 25.  
Campos: name, internalName, slug, type, ownership/editorial factories, siteStatus, environment, locale, timezone, isExternal, isPrimaryForCompany.  
Access: read staff; write adminsOnly.

---

### `domains` — `Domains.ts`

hostname, normalizedHostname, site→sites, environment, isPrimary, isActive, redirectToPrimary, forceHttps.  
Hooks: beforeValidate normalizeDomainHostnames.  
Access: read staff; write adminsOnly.

---

### `media` — `Media.ts`

**Upload:** staticDir `media`, mimeTypes image/*, sizes thumbnail/card.  
Campos: alt (required), caption.  
Access: read público; write staffOnly.

---

### `pages` — `Pages.ts`

**Versions:** drafts + autosave.  
site→sites, title, slug, pageType, layout (blocks), seo group.  
Hooks: normalizeSlug, ensureSiteSlugUniqueness, ensureSingleHomePerSite.  
Access: staffOnly.

---

### `authors` — `Authors.ts`

**Versions:** drafts. name, slug, bio, avatar→media, social. Hook normalizeSlug. Access staffOnly.

---

### `categories` — `Categories.ts`

**Versions:** drafts. site, name, slug, description, parent→categories, seo. Hooks normalizeSlug + uniqueness. Access staffOnly.

---

### `tags` — `Tags.ts`

Versions false. site, name, slug. Hooks normalizeSlug + uniqueness. Access staffOnly.

---

### `posts` — `Posts.ts`

**Versions:** drafts. site, title, slug, excerpt, type, content, featuredImage, author, categories, tags, relatedPosts, company, seo, publishing.  
Hooks: normalizeSlug, uniqueness, setPublishedAtOnPublish. Access staffOnly.

---

## Global `global-settings`

| Campo | Tipo |
|-------|------|
| siteName, tagline, contactEmail | text |
| heroTitle, heroSubtitle, ctaLabel, ctaUrl | text |

Access: read público; update adminsOnly. Hooks/versions: NÃO ENCONTRADO NO REPOSITÓRIO.

---

## Versions (resumo)

| Collection | Versions |
|------------|----------|
| sites, pages, authors, categories, posts | Sim (drafts/autosave) |
| Demais | false |

---

## Migrations

Pasta: `apps/admin/src/migrations` — **12** registradas em `index.ts`:

1. `20260709_181730`
2. `20260713_142511_sites`
3. `20260713_174436_domains`
4. `20260716_124305_pages`
5. `20260716_172340_pages_institutional`
6. `20260717_160602_blog_collections`
7. `20260717_180310_companies_strategic_pages`
8. `20260717_194500_users_rbac`
9. `20260720_120000_identity_crm_foundation`
10. `20260720_180000_lead_capture_activity`
11. `20260720_190000_crm_companies_texts`
12. `20260720_191000_locked_documents_crm_rels`

---

## Documentos relacionados

Baseline: [`BASELINE_PLATAFORMA_2.1.1.md`](./BASELINE_PLATAFORMA_2.1.1.md) · Inventário: [`INVENTARIO_PLATAFORMA_OMNIA.md`](./INVENTARIO_PLATAFORMA_OMNIA.md) · Rotas: [`ROTAS_E_ENDPOINTS.md`](./ROTAS_E_ENDPOINTS.md)
