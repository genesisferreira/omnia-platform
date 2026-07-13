# S03 â€” Collection `sites` (especificaÃ§Ã£o tÃ©cnica)

> **Status:** EspecificaÃ§Ã£o aprovÃ¡vel para Feature 005B
> **Branch alvo:** `feature/sprint-03-cms-foundation`
> **NÃ£o implementar nesta etapa** â€” somente contrato documental.

---

## 1. Responsabilidade

### Representa

Uma **presenÃ§a digital administrÃ¡vel** no ecossistema Omnia: portal, microsite, aplicaÃ§Ã£o web, campanha ou referÃªncia a site externo â€” com identidade, ambiente, locale e vÃ­nculos multiempresa.

### NÃ£o representa

| Entidade | Motivo |
|----------|--------|
| Empresa jurÃ­dica | Collection `companies` |
| Marca | Futura `brands` |
| DomÃ­nio / hostname | Futura `domains` |
| Parceiro | Entidade externa / CRM |
| Produto / aplicaÃ§Ã£o de negÃ³cio | Product (ex.: Neurofrigo Carga) |
| Tenant | Collection `tenants` |

### Quando criar um Site

- Portal Holding (`holding_portal`) â€” exatamente um principal por tenant na fase 1.
- Site prÃ³prio migrado para a plataforma (fase futura).
- Campanha / microsite / application com resoluÃ§Ã£o prÃ³pria de hostname.
- Registro **externo** (`isExternal: true`) para inventÃ¡rio e links oficiais.

### Quando **nÃ£o** criar um Site

| Caso | Usar |
|------|------|
| PÃ¡gina institucional `/empresas/[slug]` no hub | `pages` no Site portal |
| ConteÃºdo editorial (blog, FAQ) | `pages` / `posts` |
| Apenas URL oficial externa sem CMS | Campo `externalUrl` em `companies` **ou** Site externo mÃ­nimo (seed) |
| Neurofrigo Carga como produto | Product/Application â€” Site `application` sÃ³ se houver presenÃ§a web dedicada |

---

## 2. Campos MVP

| Campo | Tipo Payload | Obrig. | Notas |
|-------|--------------|--------|-------|
| `name` | text | Sim | Nome pÃºblico |
| `slug` | text | Sim | Ãšnico; ver Â§5 |
| `internalName` | text | NÃ£o | Label admin |
| `status` | select | Sim | Ver Â§4 |
| `environment` | select | Sim | Ver Â§4 |
| `type` | select | Sim | Ver Â§4 |
| `locale` | select | Sim | Default `pt-BR` |
| `timezone` | select/text | Sim | Default `America/Sao_Paulo` |
| `tenant` | relationship â†’ `tenants` | Sim | Via ownership helper |
| `company` | relationship â†’ `companies` | Condicional | Null = Holding/hub |
| `externalUrl` | text | Condicional | ObrigatÃ³rio se `isExternal` |
| `isExternal` | checkbox | Sim | Default `false` |
| `isPrimaryForCompany` | checkbox | Sim | Default `false` |
| `notes` | textarea | NÃ£o | Internas admin |

### Campos futuros â€” estratÃ©gia (sem FK temporÃ¡ria)

| Campo | EstratÃ©gia |
|-------|------------|
| `brand` | **Adiar** atÃ© collection `brands` |
| `theme` | **Adiar** atÃ© `themes` |
| `primaryDomain` | **Adiar** atÃ© `domains` |
| `homePage` | **Adiar** atÃ© `pages` |
| `defaultSeo` | **Adiar** â€” usar `createSeoFields` quando SEO de Site for necessÃ¡rio |
| `analytics` | **Adiar** (Sprint 4+) |
| `defaultMenus` | **Adiar** atÃ© `menus` |

**PreferÃªncia:** nÃ£o criar `text` placeholder nem relationship stub que exija migration corretiva.

---

## 3. Campos compartilhados (Feature 001)

| Helper | MVP `sites`? | Motivo |
|--------|--------------|--------|
| `createOwnershipFields()` | **Sim** | `tenant` / `company` + `visibilityScope` / `isSharedAcrossCompanies` |
| `createSeoFields()` | **Adiar** | SEO de Site = `defaultSeo` futuro; evitar duplicar com Pages |
| `createEditorialFields()` | **Sim (leve)** | `editorialStatus` + notas/auditoria mÃ­nima |
| `createPublishingFields()` | **Adiar** | Sites nÃ£o sÃ£o conteÃºdo agendÃ¡vel no MVP |

**Anti-duplicaÃ§Ã£o:** nÃ£o declarar `tenant`/`company` fora do helper.
`status` / `environment` / `type` / `locale` / `timezone` sÃ£o **prÃ³prios do Site** (alinhados a `apps/admin/src/types/site.ts`), distintos de `editorialStatus` e de `visibilityScope`.

---

## 4. Status e tipos (oficiais)

Alinhados a `SITE_STATUSES`, `SITE_ENVIRONMENTS`, `SITE_TYPES`, `SITE_LOCALES`.

### `status`
`draft` | `active` | `inactive` | `maintenance` | `archived`

### `environment`
`local` | `development` | `staging` | `production`

### `type`
`holding_portal` | `company_profile` | `institutional` | `education` | `campaign` | `application` | `marketplace`

> Nota: tipos `hub`/`external` do inventÃ¡rio Multisite mapeiam para `holding_portal` + `isExternal`, e `company` path-based **nÃ£o** cria Site separado (ver Â§13).

### `locale`
`pt-BR` | `en` | `es` â€” **default:** `pt-BR`

### `timezone`
**Default:** `America/Sao_Paulo`

---

## 5. Slug e identidade

| Regra | DefiniÃ§Ã£o |
|-------|-----------|
| Formato | kebab-case (`[a-z0-9]+(?:-[a-z0-9]+)*`) |
| Unicidade | Ãšnico global no MVP; evoluir para Ãºnico por `tenant` se necessÃ¡rio |
| Ãndice | Unique index em `slug` |
| NormalizaÃ§Ã£o | Hook futuro: lowercase, trim, colapsar hÃ­fens |
| vs domÃ­nio | Slug = ID interno CMS; hostname = `domains` |
| EdiÃ§Ã£o pÃ³s-publish | Restringir se Site `active` em production; exigir redirect planejado |
| Canonical | Depende de domÃ­nio futuro; mudanÃ§a de slug nÃ£o altera hostname |
| Conflito | Rejeitar create/update com slug existente |

SugestÃ£o seed hub: `omnia-hub`.

---

## 6. Relacionamentos

### MVP

| Campo | Collection | Cardinalidade |
|-------|------------|---------------|
| `tenant` | `tenants` | N:1 |
| `company` | `companies` | N:1 opcional |

### Futuro (nÃ£o implementar agora)

`brand` â†’ `brands` Â· `theme` â†’ `themes` Â· `domains` â†’ `domains` Â· `homePage` â†’ `pages` Â· `defaultMenus` â†’ `menus`

---

## 7. Access control

| Papel | IntenÃ§Ã£o futura |
|-------|-----------------|
| Superadmin Holding | CRUD total |
| Admin Holding | CRUD Sites do tenant |
| Admin Company | CRUD Sites da prÃ³pria company |
| Editor | Update limitado (nÃ£o arquivar/excluir) |
| SEO | Meta/domÃ­nio quando existirem |
| Auditor | Read-only |

### MVP inicial (005B)

| OperaÃ§Ã£o | Regra |
|----------|-------|
| Admin create/update/delete | **Autenticado** (Payload users) |
| API pÃºblica read | **Ainda nÃ£o** â€” preparar; quando existir: sÃ³ `status=active` (+ regras de ambiente) |
| Multiempresa | Filtro tenant/company na etapa RBAC |

---

## 8. Drafts, versions e editorial

| Aspecto | MVP |
|---------|-----|
| `versions.drafts` | Sim |
| `maxPerDoc` | 25 |
| Autosave | Sim (intervalo padrÃ£o Payload) |
| `editorialStatus` | Via `createEditorialFields` â€” separado de `_status` |
| Preview | Preparar contrato; token JWT em sprint Portal |
| PublicaÃ§Ã£o programada | Adiada (`createPublishingFields`) |
| Soft delete | Futuro (`deleted` editorial / `deletedAt`) |

---

## 9. Admin UX

| Item | Valor |
|------|-------|
| `useAsTitle` | `name` |
| `defaultColumns` | `name`, `slug`, `type`, `status`, `environment`, `company`, `isExternal` |
| `group` | `Multiempresa` |
| Description | PresenÃ§a digital administrÃ¡vel (portal, externo, app, campanha) |
| Sidebar | Ownership + status/environment + flags |
| Filtros | status, environment, type, isExternal, company |
| OrdenaÃ§Ã£o | `name` asc |
| Read-only | Timestamps de auditoria editorial quando preenchidos por hook |
| ValidaÃ§Ã£o visual | Aviso se `isExternal` sem `externalUrl`; slug invÃ¡lido |

---

## 10. Ãndices (proposta â€” sem migration nesta feature)

| Ãndice | Campos |
|--------|--------|
| Unique | `slug` |
| Index | `status` |
| Index | `environment` |
| Index | `tenant` |
| Index | `company` |
| Index | `isPrimaryForCompany` |
| Composto (futuro) | `(company, isPrimaryForCompany)` onde `isPrimaryForCompany = true` |

---

## 11. Hooks futuros (somente documentaÃ§Ã£o)

1. Normalizar `slug` no `beforeValidate`
2. Garantir no mÃ¡ximo um `isPrimaryForCompany` por company
3. `revalidateTag` / portal on publish
4. Auditoria (AuditLog Drizzle)
5. Sync com `domains` quando existir
6. Validar tema via `validateThemeTokens`
7. Bloquear delete se houver pages/domains dependentes

---

## 12. Seed

### DecisÃ£o de inventÃ¡rio (fase 1)

**Um Site principal** `omnia-hub` (`holding_portal`, `active`, staging/production conforme ambiente).

**NÃ£o** criar Sites separados para hubs path-based `/empresas/*`.

**Sites externos** (mÃ­nimos, `isExternal: true`) para URLs oficiais:

| Site | Company | `externalUrl` (exemplo) |
|------|---------|-------------------------|
| RR oficial | RenovaÃ§Ã£o | renovacaorefrigeracao.com.br |
| FDFA oficial | Fred do Frio | freddofrio.com.br |
| CTE oficial | CTE | escolacte.com.br |
| Sapientia oficial | CES | centroeducacionalsapientia.com.br |
| Neurofrigo oficial | Neurofrigo | neurofrigo.com.br |

Neurofrigo Carga: **nÃ£o** como Company/Brand; Product â€” Site `application` sÃ³ se houver escopo web dedicado (fora do seed MVP hub).

PÃ¡ginas hub das empresas: seed de **`pages`** (Feature posterior), nÃ£o de `sites`.

---

## 13. DecisÃ£o arquitetural obrigatÃ³ria

**Resposta: B** â€” pÃ¡ginas institucionais das empresas = registros em `pages` vinculados ao **Site principal** (Portal Omnia).

| DecisÃ£o | Modelo |
|---------|--------|
| Portal Omnia | Um Site (`omnia-hub`) |
| `/empresas/[slug]` | Pages no Site hub |
| Sites externos oficiais | Sites `isExternal` (referÃªncia) |
| Sites prÃ³prios migrados | Novos registros `sites` (fase 3) |

**Justificativa:** evita explosÃ£o de Sites sem hostname prÃ³prio; alinha path-based fase 1 (S03_MULTISITE); preserva coexistÃªncia dos sites oficiais (ADR-011 P17); Site Resolver resolve hostname â†’ um contexto hub.

---

## 14. CritÃ©rios de aceite â€” Feature 005B

- [ ] Collection `sites` registrada em `payload.config.ts`
- [ ] Campos MVP + ownership + editorial leve
- [ ] Sem relationships para collections inexistentes
- [ ] Status/environment/type/locale alinhados a `types/site.ts`
- [ ] Slug unique + validaÃ§Ã£o bÃ¡sica
- [ ] Admin UX conforme Â§9
- [ ] Access: autenticado no Admin; sem API pÃºblica ainda
- [ ] Versions/drafts habilitados
- [ ] Seed idempotente: `omnia-hub` + externos oficiais
- [ ] Sem pÃ¡ginas hub como Sites
- [ ] Migration versionada (quando gerada)
- [ ] `typecheck` / lint direcionado passam
- [ ] Commit seletivo sem `payload-generated-schema.ts`

---

## Riscos

| Risco | MitigaÃ§Ã£o |
|-------|-----------|
| Confundir Page hub com Site | DecisÃ£o Â§13 explÃ­cita no seed |
| Duplicar `tenant`/`company` fora do helper | Usar sÃ³ `createOwnershipFields` |
| FK prematura brand/theme/domain | Adiar campos |
| Slug editÃ¡vel quebrando URLs | Travar em production + redirects futuros |
| `isPrimaryForCompany` mÃºltiplo | Hook de garantia |

---

## Arquivos previstos â€” Feature 005B

```
apps/admin/src/collections/Sites.ts
apps/admin/payload.config.ts          # registrar collection
apps/admin/src/seed/...               # omnia-hub + externos
apps/admin/src/migrations/<ts>        # quando gerada
```

Hooks, access RBAC fino e `domains` ficam para features seguintes.

---

## RecomendaÃ§Ã£o de implementaÃ§Ã£o (005B)

1. Criar `Sites.ts` com campos MVP + `createOwnershipFields` + `createEditorialFields`.
2. Registrar collection; gerar migration versionada.
3. Seed `omnia-hub` + 5 externos; nÃ£o seedar Sites por empresa path-based.
4. NÃ£o conectar Site Resolver a DB ainda (contratos 004A permanecem).
5. Commit seletivo apÃ³s typecheck/lint; excluir schema gerado.

**PrÃ³ximo apÃ³s 005B:** `domains` / resoluÃ§Ã£o hostname (004B+) e `pages` com `site` relationship.
