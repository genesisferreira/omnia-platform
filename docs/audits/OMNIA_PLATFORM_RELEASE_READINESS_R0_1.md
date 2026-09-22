# OMNIA PLATFORM — Release Readiness R0.1

**Date:** 2026-08-12  
**Mission:** Sprint R0.1 — CI / fresh migration / Release Candidate stabilization  
**Release branch:** `release/omnia-platform-ai-v3`  
**HEAD inicial:** `06d079e`  
**HEAD final:** `6f32cb0`  
**R0 anterior:** [`OMNIA_PLATFORM_RELEASE_READINESS_R0.md`](./OMNIA_PLATFORM_RELEASE_READINESS_R0.md) (histórico de NO-GO preservado)

---

## 1. Executive summary

R0.1 removeu o bloqueio original do CI Build: **fresh PostgreSQL → Payload migrate → schema Pages/SIP/Adaptive/Knowledge válido**. Quality no GitHub Actions ficou **GREEN** (lint, typecheck, format, contratos, ACL). Auth negativa HTTP em staging continua **401**. Admin `next build` passa **localmente**.

O job **Build** ainda falha em `pnpm build` (`apps/admin`) ~90s após o migrate, no runner Linux. Os logs completos do Actions exigem login; anotações públicas só confirmam `pnpm run build exited (1)`. Staging **não** foi alinhado ao SHA candidato (sem credencial VPS nesta sessão).

**Por critério estrito (GitHub Build GREEN + staging == RC):** **RELEASE CANDIDATE NO-GO**.

Não iniciar EPIC 16. Não merge em `develop`. Não deploy em produção.

---

## 2. Fase 1 — auditoria Git

| Item             | Valor                                                              |
| ---------------- | ------------------------------------------------------------------ |
| Branch           | `release/omnia-platform-ai-v3`                                     |
| Remote           | `https://github.com/genesisferreira/omnia-platform.git`            |
| `develop`        | `dc069e9` — **0** commits únicos vs release; release **179** ahead |
| `main`           | `454d21e`                                                          |
| `origin/staging` | **não existe** (staging é checkout no VPS, não branch)             |
| Merge            | **não feito**                                                      |

---

## 3. Causa raiz do CI Build (R0)

Job anterior: [run 31527574957](https://github.com/genesisferreira/omnia-platform/actions/runs/31527574957) / Build `93900037992` @ `06d079e`.

| Evidência             | Valor                                                                                                            |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Step                  | `Pages migration DB validation`                                                                                  |
| Duração               | **5s** (`19:25:31` → `19:25:36` UTC) — curto demais para 31 SQL migrations                                       |
| `pnpm build`          | skipped                                                                                                          |
| Banco do job          | service `postgres:16-alpine`, `DATABASE_URL=postgresql://omnia:omnia_dev_password@localhost:5432/omnia_platform` |
| SMTP no workflow (R0) | **ausente**                                                                                                      |

**Causa raiz:** `payload migrate` carrega `apps/admin/payload.config.ts`, que chamava `buildNodemailerEmailAdapter()` fora de tooling. Sem `SMTP_HOST`, `resolveSmtpConfig` lançava `SMTP_HOST é obrigatório.` **antes** de qualquer SQL. `onInit` reforçava o mesmo caminho.

Não era drift de schema Pages nem migration SQL editável. Staging já tinha as 31 migrations aplicadas.

---

## 4. Correção (migrations / CI)

Nenhuma migration SQL existente foi editada (já aplicadas em staging).

| Correção                                                                        | Onde                                                |
| ------------------------------------------------------------------------------- | --------------------------------------------------- |
| `migrate` / `migrate:status` tratados como tooling SMTP                         | `apps/admin/src/email/smtp-config.ts`               |
| `CI=true` e `OMNIA_SMTP_ALLOW_BUILD` também tooling                             | idem                                                |
| `onInit` não força adapter quando SMTP está adiado                              | `apps/admin/payload.config.ts`                      |
| Workflow dispara em `release/**`; env dummy SMTP + S2S; step fresh migrate      | `.github/workflows/ci.yml`                          |
| Probe aplica **todas** as migrations do registry (≥31) + re-migrate idempotente | `apps/admin/src/scripts/test-pages-migration-db.ts` |
| Importmap + `DOCKER_BUILD` no job Build (espelha Dockerfile)                    | `.github/workflows/ci.yml`                          |

---

## 5. Gates — evidência

| Gate                                     | Resultado        | Evidência                                                                                                                                                               |
| ---------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Working tree limpa                       | 🟡               | untracked `scripts/deploy/_e*` / `_r0_*` **não** commitados                                                                                                             |
| Fresh DB migrate                         | ✅ CI            | run [193](https://github.com/genesisferreira/omnia-platform/actions/runs/31597366857) step `Fresh Payload migrations + Pages schema` **success** (~15s, duas passagens) |
| Upgrade migrate                          | ✅ CI            | segundo `payload migrate` no mesmo probe (idempotente; sem migration SQL nova)                                                                                          |
| Zero SQL manual                          | ✅               | nenhuma alteração ad-hoc                                                                                                                                                |
| `pnpm install --frozen-lockfile`         | ✅ CI            | Quality + Build                                                                                                                                                         |
| Lint                                     | ✅ CI            | Quality ~23s                                                                                                                                                            |
| Tests (contratos + ACL + SIP + Adaptive) | ✅ CI            | Quality                                                                                                                                                                 |
| Typecheck                                | ✅ CI            | Quality ~30s                                                                                                                                                            |
| Build Admin                              | ✅ local / ❌ CI | local `next build` exit 0 (~157s, Next 15.5.20); CI `apps/admin` `pnpm run build` exit 1 ~90s                                                                           |
| Build Web                                | 🟡               | não isolado no CI (turbo para no Admin)                                                                                                                                 |
| GitHub Quality                           | ✅               | runs 191–193 Quality **success**                                                                                                                                        |
| GitHub Build                             | ❌               | migrate ✅, importmap ✅, `pnpm build` ❌                                                                                                                               |
| Cross-tenant HTTP E2E autenticado        | 🟡               | unitário ✅; HTTP 200/403 com Tenant A/B **não** executado (sem pares de sessão)                                                                                        |
| Auth negative tests                      | ✅               | unitário CI; HTTP staging 401 (ver §6)                                                                                                                                  |
| Staging == RC SHA                        | ❌               | não redesployado nesta sessão (`OMNIA_VPS_PW` ausente)                                                                                                                  |
| Staging smoke / Knowledge / OTel         | 🟡               | health 200 no SHA **anterior** (R0); não revalidado em `6f32cb0`                                                                                                        |
| Landing 1.0.1                            | ✅               | não tocada                                                                                                                                                              |
| Moodle                                   | ✅               | não tocado                                                                                                                                                              |
| Production untouched                     | ✅               | compose prod não executado                                                                                                                                              |

### CI runs R0.1

| Run                                                                               | SHA       | Quality                                | Migrate | Importmap | `pnpm build`  |
| --------------------------------------------------------------------------------- | --------- | -------------------------------------- | ------- | --------- | ------------- |
| [190](https://github.com/genesisferreira/omnia-platform/actions/runs/31594726549) | `7feb25c` | ❌ typecheck (homolog top-level await) | skipped | —         | skipped       |
| [191](https://github.com/genesisferreira/omnia-platform/actions/runs/31595124785) | `1eaf7ca` | ✅                                     | ✅      | —         | ❌ ~93s Admin |
| [192](https://github.com/genesisferreira/omnia-platform/actions/runs/31596153862) | `0934df4` | ✅                                     | ✅      | —         | ❌ ~94s Admin |
| [193](https://github.com/genesisferreira/omnia-platform/actions/runs/31597366857) | `6f32cb0` | ✅                                     | ✅      | ✅ 5s     | ❌ ~88s Admin |

Anotação pública do Build: `command (.../apps/admin) pnpm run build exited (1)`. Logs do job exigem GitHub sign-in.

---

## 6. Auth / cross-tenant

### Bind de escopo (código)

Não-staff não pode spoofar `tenantId`, `companyIds` ou `channel` (forçado `portal_chat`). S2S carrega tenant/company do user Payload. Staff pode mirar outro tenant.

### Unitário (CI Quality)

- `test:neurofrigo-auth-acl` — userKey + tenant/channel spoof
- `@omnia/retrieval` — ACL cross-tenant e ownerCompany

### HTTP negativo (staging público, SHA R0 ainda)

| Probe                                            | HTTP    |
| ------------------------------------------------ | ------- |
| Admin `/api/health`                              | 200     |
| Web `/`                                          | 200     |
| `POST /api/omnia/ai/chat` anônimo                | **401** |
| `GET /api/omnia/sip/profile` spoof userKey       | **401** |
| `GET /api/omnia/adaptive/next` spoof userKey     | **401** |
| `GET /api/omnia/tutor/profile` spoof userId      | **401** |
| `POST https://dev.omniafrigo.com.br/api/ai/chat` | **401** |
| BFF SIP / Adaptive                               | **401** |

Harness: `pnpm --filter @omnia/admin homolog:r01-http-acl` (TLS leaf do Node local pode falhar; `curl.exe` ok).

---

## 7. Isolamento

| Superfície      | Estado                                                     |
| --------------- | ---------------------------------------------------------- |
| Landing         | `omnia-landing-lancamento:1.0.1` não recriada nesta sprint |
| Moodle          | intacto                                                    |
| Containers PROD | não recriados                                              |
| Banco PROD      | não migrado                                                |

---

## 8. Segurança operacional (RC)

- Nenhum `.env` commitado
- SMTP dummy do CI não é secret de produção
- `OMNIA_INTERNAL_API_SECRET` do workflow é valor de CI (≥32), não o secret de staging
- Scripts `_e*` / `_r0_*` permanecem untracked

---

## 9. Commits R0.1

| SHA       | Mensagem                                                            |
| --------- | ------------------------------------------------------------------- |
| `8eea9f7` | `fix(ci): allow payload migrate without SMTP on a fresh database`   |
| `b7f6ad9` | `fix(security): bind tenant, company, and channel from session`     |
| `7feb25c` | `test(security): enforce cross-tenant ACL and anonymous HTTP 401`   |
| `1eaf7ca` | `fix(ci): mark R0.1 HTTP homolog script as a TypeScript module`     |
| `0934df4` | `fix(ci): treat GitHub Actions as SMTP tooling during next build`   |
| `6f32cb0` | `fix(ci): build Admin like Docker with deferred SMTP and importmap` |

---

## 10. Riscos residuais / não bloqueantes registados

- `pnpm build` Admin no GitHub Actions ainda vermelho (P0 remanescente)
- E2E HTTP autenticado Tenant A vs B não homologado
- Staging SHA ≠ `6f32cb0`
- Assessment STUB/CONTROLLED (já documentado na R0)
- `gh` CLI ausente; logs Actions 403 sem token
- Docker Desktop local ausente
- Node 20 deprecation warning nas Actions v4
- packages órfãos / README Neurofrigo drift (P2/P3, fora de escopo)

---

## 11. RC tag / PR

| Item                                          | Status                          |
| --------------------------------------------- | ------------------------------- |
| Tag `omnia-platform-ai-v3-rc.1`               | **não criada** (Build vermelho) |
| PR `release/omnia-platform-ai-v3` → `develop` | **não aberto**                  |

---

## 12. Próxima ação (humana)

1. Abrir o log autenticado do job Build @ `6f32cb0` ([run 193](https://github.com/genesisferreira/omnia-platform/actions/runs/31597366857/job/94116502940)) e capturar o erro de `next build`.
2. Corrigir só isso; re-correr CI até Quality **e** Build GREEN.
3. Alinhar staging ao SHA verde; smoke; Knowledge 190/190; OTel.
4. Só então: tag RC.1 + PR para `develop` (sem merge automático).

**PARAR. Não iniciar EPIC 16. Não mergear `develop`. Não tocar produção.**

---

## 13. Decision

### 🔴 OMNIA PLATFORM AI V3 RELEASE CANDIDATE NO-GO — VER PENDÊNCIAS

Pendência P0: GitHub Actions **Build** / `pnpm build` Admin. Fresh migrate e Quality já não bloqueiam.

**R0.2:** ver [`OMNIA_PLATFORM_RELEASE_READINESS_R0_2.md`](./OMNIA_PLATFORM_RELEASE_READINESS_R0_2.md). O histórico de NO-GO desta R0.1 permanece.
