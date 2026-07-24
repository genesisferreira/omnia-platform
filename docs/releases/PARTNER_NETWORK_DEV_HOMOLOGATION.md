# Partner Network — Homologação DEV (Sprint 2.3)

**Data:** 2026-07-24  
**Branch:** `feature/2.3-partner-network`  
**HEAD auditado:** `e44315633fd705d89f69950dc1e58c271a473169` (`docs(partners): document development validation`)  
**Ambiente alvo:** DEV / staging oficial (não produção)

| Portal | Admin |
|--------|-------|
| https://dev.omniafrigo.com.br | https://admin.dev.omniafrigo.com.br |

**Status final desta sessão:** 🔴 **BLOQUEADA** — Sprint 2.3 **não publicada** no DEV. Homologação E2E no ambiente remoto **não executável** sem desbloqueio operacional.

---

## 1. Auditoria inicial

| Item | Resultado |
|------|-----------|
| Branch | `feature/2.3-partner-network` (local) |
| Commit | `e443156` |
| Working tree (código Sprint) | Limpa; untracked irrelevantes (`docs/adr`, `docs/roadmap`, `.validation-seo-211/`, etc.) |
| Branch no `origin` | **Ausente** (`git ls-remote` sem ref) |
| Docker local | **Ausente** (CLI não instalada) |
| `gh` CLI | **Ausente** |
| SSH VPS `191.101.234.156` | **Permission denied** (root / ubuntu / omnia, BatchMode) |
| `.env.staging` local | **Ausente** (só na VPS) |
| `.env.production` local | **Ausente** / **não usado** |

### Variáveis locais (`.env`) — proteção vs produção

| Variável / área | Confirmação |
|-----------------|-------------|
| `DATABASE_URL` | `localhost:5432/omnia_platform` — **não produção** |
| `REDIS_URL` | `localhost:6379` — **não produção** |
| `PAYLOAD_SECRET` | Presente (48 chars) — local |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` |
| `NEXT_PUBLIC_ADMIN_URL` | `http://localhost:3001` |
| SMTP | Duplicado: Mailpit (`localhost`) + Titan (`smtp.titan.email`); em loaders típicos **vence o último** (Titan). Observação operacional local; **não** aponta DB/Redis para prod |
| CORS / origins | Código Partner Register usa allowlist de origins confiáveis (mesmo padrão lead-capture) |
| Compose produção | **Não alterado** nesta sessão |

### Estado atual do DEV remoto (antes de qualquer publish)

| Check | HTTP / resultado |
|-------|------------------|
| Portal `/` | 200 — Home institucional ativa |
| Portal `/parceiros` | **404** — código Sprint 2.3 **não implantado** |
| Admin health | `healthy`, `database: up`, `payload: configured` |
| `GET /api/omnia/public-partners` | **404** — endpoints Partner **não implantados** |

Conclusão: DEV roda build **anterior** à Sprint 2.3.

---

## 2. Publicação no DEV — tentativa e bloqueio

### Runbook previsto

Seguir `docker/staging/DEPLOY.md` com:

```bash
export DEPLOY_BRANCH=feature/2.3-partner-network
# em /opt/omnia/platform na VPS
git fetch --prune origin
git checkout "$DEPLOY_BRANCH"
git pull --ff-only origin "$DEPLOY_BRANCH"

docker compose -f docker/compose/staging.yml --env-file .env.staging \
  --profile bootstrap build admin web admin-migrate

docker compose -f docker/compose/staging.yml --env-file .env.staging \
  --profile bootstrap run --rm admin-migrate

docker compose -f docker/compose/staging.yml --env-file .env.staging \
  up -d --no-build admin web
```

Migration esperada: `20260724_120000_partner_network`.

### Por que não executou

1. **Sem SSH** à VPS DEV (chave/senha não disponíveis nesta máquina).  
2. **Sem push** da branch (instrução explícita da sessão + branch inexistente no remote). O runbook oficial depende de `git pull` na VPS.  
3. **Sem Docker local** para homologar stack completa nesta workstation.  
4. Conflito operacional: publicar no DEV sem push exige acesso SSH + cópia de artefato; com push proibido e SSH negado, **não há caminho seguro**.

**Nenhuma alteração em produção.** Nenhum serviço DEV remoto foi reiniciado nesta sessão.

---

## 3–8. Homologação funcional (DEV remoto)

| Etapa | Status |
|-------|--------|
| 3. Collections (Partner, Categories, Specialties, Dashboard) | ⏸ Pendente — Admin DEV sem código 2.3 |
| 4. Fluxo cadastro → pending → approve → active → published → busca → Home → perfil | ⏸ Pendente |
| 5. Portal rotas / nav / SEO / 404 | ⏸ Pendente (`/parceiros` = 404 hoje) |
| 6. Geolocalização (GPS / cidade / UF / CEP / Haversine / fallback) | ⏸ Pendente |
| 7. Segurança E2E no DEV | ⏸ Pendente (revisão de código OK — ver §7) |
| 8. UX / dark mode / responsividade no DEV | ⏸ Pendente |

---

## 7. Revisão de segurança (código — offline)

Revisão estática dos artefatos da Sprint 2.3 (não substitui teste E2E no DEV):

| Controle | Evidência |
|----------|-----------|
| Sem CPF/CNPJ no DTO público | `mapPublicPartner*` em `@omnia/shared` — testes privacy OK |
| Sem e-mail no detalhe público | Cobertura em `test:partners` |
| Sem `approvalNotes` / `ownerUser` / `approvedBy` / `plan` / `status` no map | Whitelist explícita no map |
| Mass assignment bloqueado no register | `test:partner-register` — campos admin ignorados |
| Rate limit | Redis `partner-register` (padrão lead-capture) |
| Honeypot | `companyWebsite` → 200 fake success |
| Origin allowlist | `isTrustedPartnerOrigin` |
| Upload público de mídia | **Não habilitado** (documentado Macro 02) |

---

## 9. Revisão geral / inconsistências

| Item | Resultado |
|------|-----------|
| Menus duplicados | Não detectado no código da Sprint (nav com item Parceiros + submenu) |
| Collections órfãs | `partners`, `partner-categories`, `partner-specialties`, global dashboard — coerentes |
| Rotas no DEV | Quebradas **porque o código não está publicado** (esperado) |
| Typecheck shared/admin/web | **OK** (esta sessão) |
| Lint shared | 1 warning histórico `no-console` em `test-partners.ts` |
| Lint admin | Warnings históricos em migrations antigas (fora do escopo 2.3) |
| Build Docker / EPERM Windows | Já conhecido; build oficial é Linux na VPS |

**Nenhum bug de código da Sprint 2.3 corrigido nesta sessão** — o bloqueio é operacional (acesso DEV), não um defeito de implementação identificado offline.

---

## 11. Testes executados nesta sessão

| Suite | Resultado |
|-------|-----------|
| `pnpm --filter @omnia/shared test:partners` | **13/13 pass** |
| `pnpm --filter @omnia/admin test:partner-register` | **3/3 pass** |
| `pnpm --filter @omnia/shared typecheck` | **OK** |
| `pnpm --filter @omnia/admin typecheck` | **OK** |
| `pnpm --filter @omnia/web typecheck` | **OK** |
| Lint shared/admin/web | Sem erros novos bloqueantes (warnings históricos) |
| E2E Portal / Admin / APIs no DEV | **Não executado** (código ausente no DEV) |
| Migrations no banco DEV | **Não aplicadas** |

---

## 12. Performance

Não mensurada no DEV (endpoints 404). Código já prevê:

- `Cache-Control: public, s-maxage=60, stale-while-revalidate=30` nas listagens públicas  
- Limites de página (`PUBLIC_PARTNER_LIST_*`)  
- Soft-fail na Home  
- Fetch com depth controlado  

Validar após publish: payloads, imagens (logo/galeria), paginação com origem GPS.

---

## 13. Migrations

| Migration | Estado |
|-----------|--------|
| `20260724_120000_partner_network` | Registrada em `apps/admin/src/migrations/index.ts` |
| Aplicada no DEV | **Não** (deploy não ocorreu) |
| Aplicada em produção | **Não** (fora de escopo; proibido) |

---

## Bugs

### Encontrados (operacionais)

1. **BLOQUEIO CRÍTICO:** impossível publicar Sprint 2.3 no DEV sem SSH e/ou push da branch.  
2. **DEV desatualizado:** `/parceiros` e APIs públicas Partner retornam 404.  
3. **Workstation:** Docker e `pnpm` global ausentes; testes via `npx pnpm@9.15.0`.  
4. **SMTP local duplicado** (Mailpit + Titan) — observação; não bloqueia DEV remoto.

### Corrigidos

Nenhum (sem alteração de código de produto nesta sessão).

### Pendências para desbloquear homologação

1. Autorizar **push** de `feature/2.3-partner-network` para `origin` **ou** fornecer acesso SSH à VPS DEV com permissão de deploy em `/opt/omnia/platform`.  
2. Na VPS: checkout da branch, build `admin`+`web`+`admin-migrate`, rodar migrate, up com healthcheck.  
3. Reexecutar checklist Etapas 3–8 e 11 E2E.  
4. Atualizar este documento com evidências (URLs 200, IDs de parceiro de teste, screenshots opcionais).  
5. Só então marcar Sprint 2.3 como **homologada no DEV**.

---

## Arquivos desta entrega documental

- `docs/releases/PARTNER_NETWORK_DEV_HOMOLOGATION.md` (este arquivo)  
- Referência: `docs/releases/PARTNER_NETWORK_MACRO_02.md`  
- Referência: `docs/releases/PARTNER_NETWORK_DEV_VALIDATION.md`  
- Runbook: `docker/staging/DEPLOY.md`

---

## Commit previsto

`docs(partners): homologation report` — sem push, sem merge.
