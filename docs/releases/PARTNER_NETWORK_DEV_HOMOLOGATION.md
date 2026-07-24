# Partner Network — Homologação DEV (Sprint 2.3)

**Data:** 2026-07-24  
**Branch:** `feature/2.3-partner-network`  
**HEAD implantado:** `3408937` (`fix(partners): avoid null-island origin on public partners API`)  
**Ambiente:** DEV / staging oficial (não produção)

| Portal | Admin |
|--------|-------|
| https://dev.omniafrigo.com.br | https://admin.dev.omniafrigo.com.br |

**Status (base Sprint 2.3):** 🟢 publicada no DEV  
**Status (geo CEP/proximidade):** ver `PARTNER_NETWORK_GEOLOCATION_FIX.md`

---

## 1. Ambiente e serviços

| Item | Valor |
|------|-------|
| VPS path | `/opt/omnia/platform` |
| Compose | `docker/compose/staging.yml` + `.env.staging` |
| Branch VPS | `feature/2.3-partner-network` |
| Containers | `omnia-platform-admin-dev`, `omnia-platform-web-dev` (healthy) |
| Postgres DEV | container `omnia-postgres`, DB `omnia_staging` |
| Redis | rede `omnia_internal` (rate-limit partner-register) |
| Produção | **não alterada** (containers prod intactos; compose prod apenas stash preservado) |

### Operação SMTP (DEV)

`.env.staging` **não tinha** chaves `SMTP_*` (APIs Payload retornavam 500).  
Foram copiadas as chaves `SMTP_*` de `.env.production` → `.env.staging` (backup `.env.staging.bak-pre-smtp-*`), sem alterar produção. Admin recriado.

---

## 2. Migrations

| Migration | Resultado |
|-----------|-----------|
| `20260724_120000_partner_network` | **Aplicada** (512ms) via `admin-migrate` |

Collections/tabelas: `partners`, `partner_categories`, `partner_specialties` + global dashboard.

---

## 3. Build / restart

1. Build: `admin`, `web`, `admin-migrate`
2. `admin-migrate` (migration Partner Network)
3. Recreate `admin` + `web` (`--no-build --force-recreate`)
4. Rebuild `admin` após fix `parseOrigin` (`3408937`)

---

## 4. Fluxos homologados

| Fluxo | Resultado |
|-------|-----------|
| Cadastro público `POST /api/omnia/partner-register` | OK → pending / active false |
| Pending oculto na busca pública | OK |
| Aprovação (status approved + active + publishedAt) | OK |
| Listagem pública | OK (`homolog-frio`) |
| Perfil `/parceiros/homolog-frio` | 200 |
| Busca `/parceiros` | 200 |
| Cadastro `/parceiros/cadastro` | 200 |
| 404 slug inexistente | 404 |
| Menu Parceiros (header/footer/mobile) | Presente |
| Geo `lat/lng/radiusKm` | OK |
| Taxonomias categorias/especialidades públicas | OK |
| Mass assignment (status/featured/plan) | Bloqueado → pending/free |
| Privacidade API (sem document/email/approvalNotes/ownerUser/approvedBy) | OK |
| `meta.origin` sem lat/lng | `null` (após fix) |

---

## 5. Bugs encontrados e corrigidos

| Bug | Correção |
|-----|----------|
| APIs públicas 500 — `SMTP_HOST é obrigatório` | SMTP_* adicionados ao `.env.staging` (cópia de prod keys) |
| `lat`/`lng` ausentes viravam `0,0` (Null Island) | `parseOrigin` em `public-partners.ts` — commit `3408937` |

---

## 6. Testes

| Suite | Resultado |
|-------|-----------|
| `@omnia/shared` `test:partners` | 13/13 |
| `@omnia/admin` `test:partner-register` | 3/3 |
| Smoke HTTP DEV | Portal + APIs 200; 404 slug inválido |
| E2E cadastro→aprovação→público | OK |

---

## 7. Limitações / pendências

- Homologação Admin UI (CRUD visual no painel) não foi clicada manualmente; validada via APIs + DB DEV.
- Upload público de mídia continua desabilitado (escopo Macro 02).
- Parceiros de teste no DEV: `homolog-frio` (publicado) e registro mass-assignment `hack*` (pending).
- **Trocar senha root da VPS** (exposta no chat) e preferir chave SSH.
- Sem merge para `main`/`develop`. Sem deploy produção.

---

## 8. Commits remotos relevantes

| Commit | Mensagem |
|--------|----------|
| `fcc1310` | Macroentrega 02 |
| `fe28432` / `d579718` | docs homologação |
| `3408937` | fix origin Null Island |
