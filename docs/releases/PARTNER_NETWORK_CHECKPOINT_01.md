# Partner Network — Checkpoint 01

**Módulo:** Partner Network  
**Data:** 2026-07-24  
**Branch:** `feature/2.3-partner-network`  
**Escopo:** Consolidação da modelagem admin (sem Portal público, geo, CRM, IA, avaliações ou pagamentos)

---

## 1. Estruturas implementadas

| Slug Payload                | Tipo       | Menu Admin                                |
| --------------------------- | ---------- | ----------------------------------------- |
| `partners`                  | Collection | Partner Network → Parceiros               |
| `partner-categories`        | Collection | Partner Network → Categorias              |
| `partner-network-dashboard` | Global     | Partner Network → Dashboard (placeholder) |

---

## 2. Auditoria de campos (`partners`)

### Confirmados (já existiam)

| Campo                                            | Tipo                                      | Notas                                  |
| ------------------------------------------------ | ----------------------------------------- | -------------------------------------- |
| `companyName`                                    | text                                      | Nome da empresa                        |
| `tradeName`                                      | text                                      | Nome fantasia                          |
| `partnerType`                                    | select                                    | `company` \| `professional`            |
| `document`                                       | text                                      | CNPJ/CPF                               |
| `email`, `phone`, `whatsapp`, `website`          | text/email                                | Contatos                               |
| `social.*`                                       | group                                     | Instagram, LinkedIn, Facebook, YouTube |
| `description`                                    | textarea                                  |                                        |
| `logo`                                           | upload → media                            |                                        |
| `gallery`                                        | array                                     | image + caption                        |
| `address`, `zipCode`, `city`, `state`, `country` | text                                      |                                        |
| `latitude`, `longitude`                          | number                                    | Preparados; sem geocode                |
| `status`                                         | select                                    | Ver workflow                           |
| `featured`                                       | checkbox                                  | Default false; admin only              |
| `active`                                         | checkbox                                  | Default true                           |
| `approvedAt`                                     | date                                      | Auto na aprovação                      |
| `approvedBy`                                     | relationship → users                      | Auto na aprovação                      |
| `categories`                                     | relationship hasMany → partner-categories |                                        |

### Adicionados / ajustados no Checkpoint 01

| Campo            | Tipo                     | Notas                                                                    |
| ---------------- | ------------------------ | ------------------------------------------------------------------------ |
| `slug`           | text unique              | URL pública futura; gerado do nome fantasia; editável; unicidade no hook |
| `verified`       | checkbox                 | Default false; independente do status; admin only                        |
| `plan`           | select                   | `free` (default), `professional`, `premium`, `enterprise` — sem cobrança |
| `coverageRadius` | number ≥ 0               | Substitui `serviceRadius`; km; opcional                                  |
| `serviceCities`  | array `{ city, state? }` | Estrutura reutilizável (não texto livre)                                 |
| `approvalNotes`  | textarea                 | Interno; admin only update; não expor publicamente                       |
| `ownerUser`      | relationship → users     | Responsável pelo cadastro (≠ approvedBy)                                 |
| `publishedAt`    | date                     | Preenchido na **primeira** aprovação; não sobrescrito                    |

---

## 3. Regras de negócio

1. Todo create força `status = pending` (e limpa `approvedAt` / `approvedBy` / `publishedAt`).
2. Somente admin altera status (e campos de governança).
3. Transição → `approved`: preenche `approvedAt` + `approvedBy`; se `publishedAt` vazio, preenche uma vez.
4. Saída de `approved`: preserva `approvedAt`, `approvedBy` e `publishedAt` (rastreabilidade).
5. Slug normalizado (NFD, minúsculas, hífen); conflito → erro 400.
6. `coverageRadius` negativo → erro 400.
7. `ownerUser` default = usuário autenticado na criação, se omitido.
8. Status `draft` mantido (rascunho interno / arquitetura). **Arquivado** ainda não modelado.

---

## 4. Permissões

| Papel                          | Collection | Campos de governança*                     |
| ------------------------------ | ---------- | ----------------------------------------- |
| Admin (`super_admin`, `admin`) | CRUD       | update permitido                          |
| Moderador (`editor`)           | read only  | update negado (collection + field access) |
| Parceiro / demais              | sem acesso | —                                         |

\* `status`, `featured`, `verified`, `plan`, `approvalNotes`, `approvedAt`, `approvedBy`, `publishedAt`

API pública: **não existe nesta fase**. Campos internos (`approvalNotes`, etc.) devem permanecer fora de qualquer serializer público futuro por padrão.

---

## 5. Migration

| Nome                              | Ação                                                                     |
| --------------------------------- | ------------------------------------------------------------------------ |
| `20260724_120000_partner_network` | **Atualizada in-place** (nunca aplicada em banco; evita migration extra) |

Inclui: tabelas `partner_categories`, `partners`, `partners_service_cities`, `partners_gallery`, `partners_rels`, global `partner_network_dashboard`, enums (`partner_type`, `status`, `plan`), FKs e índices (incl. `partners_slug_idx` unique).

**Não executada** neste checkpoint (Postgres local indisponível).

---

## 6. Testes executados

| Check                    | Resultado                                                                          |
| ------------------------ | ---------------------------------------------------------------------------------- |
| Lint (`@omnia/admin`)    | OK (warnings pré-existentes em Users/migrations)                                   |
| Typecheck                | OK                                                                                 |
| `payload generate:types` | OK                                                                                 |
| Build                    | Compilação Next OK; falha final **EPERM symlink** no output `standalone` (Windows) |
| `payload migrate`        | Não executado — Postgres indisponível                                              |
| CRUD Admin               | Não validado — Postgres indisponível                                               |

---

## 7. Limitações de ambiente

- Postgres em `127.0.0.1:5432` pode estar off → migrate/CRUD Admin não afirmados.
- Build Windows: falha possível em `standalone` por `EPERM` em symlink (limitação do ambiente, não do schema).

---

## 8. Validação manual no Admin (quando o banco estiver up)

```bash
# Na raiz do monorepo
pnpm --filter @omnia/admin migrate
pnpm --filter @omnia/admin dev
```

Checklist:

1. Menu **Partner Network** → Dashboard, Parceiros, Categorias.
2. Criar categoria (ex.: Refrigeração Comercial).
3. Criar parceiro sem slug → slug gerado do nome fantasia; status = Pending.
4. Como admin: aprovar → `approvedAt`, `approvedBy`, `publishedAt` preenchidos.
5. Suspender e reaprovar → `publishedAt` **não** muda; `approvedAt` atualiza.
6. Login como editor → somente leitura; não altera status/featured/verified/plan.
7. Tentar slug duplicado → erro.
8. `coverageRadius = -1` → erro.

---

## 9. Pendências antes do Portal público

- [ ] Aplicar migration em ambiente com Postgres
- [ ] Validar CRUD e workflow no Admin
- [ ] Endpoint/API pública (somente campos públicos; excluir `approvalNotes` e metadados internos)
- [ ] Geocode CEP → lat/lng
- [ ] Busca por proximidade + Home “Parceiros próximos”
- [ ] Página `/parceiros/{slug}`
- [ ] Acesso do papel `partner` ao próprio perfil
- [ ] Integração CRM / reviews / certificados / planos pagos

---

## 10. Referências

- Arquitetura: `docs/architecture/PARTNER_NETWORK_ARCHITECTURE.md`
- Collections: `apps/admin/src/collections/Partners.ts`, `PartnerCategories.ts`
- Hooks/regras: `apps/admin/src/collections/partners/`
