# OMNIA PLATFORM — Release Readiness R0

**Date:** 2026-08-11  
**Mission:** Sprint R0 — remove P0/P1 blockers pós-EPIC 15  
**Integration branch:** `release/omnia-platform-ai-v3`  
**Integration HEAD:** `3b07334`

---

## 1. Executive summary

R0 entregou **hardening de autenticação/ACL**, **OTel estável**, **login redirect**, **documentação de ops/Assessment**, **estratégia Git B (release branch)** e **Quality CI verde** (lint/typecheck/format/contracts).

**Staging** redesployado com evidência de **401** em AI/SIP/Adaptive/BFF anônimos; Knowledge **190/190**; Landing `1.0.1` e Moodle/prod intactos.

**CI Build** ainda falha no step `Pages migration DB validation` (job Build) — Quality verde; produto **builda no Docker staging**. Por critério estrito da R0 (**Build GREEN obrigatório**): **RELEASE CANDIDATE NO-GO**.

**R0.1:** ver [`OMNIA_PLATFORM_RELEASE_READINESS_R0_1.md`](./OMNIA_PLATFORM_RELEASE_READINESS_R0_1.md). O histórico de NO-GO desta R0 permanece; a R0.1 desbloqueou fresh migrate no CI e Quality, mas o `pnpm build` do job Build ainda falha no runner.

---

## 2. Commits R0

| SHA       | Conteúdo                                                         |
| --------- | ---------------------------------------------------------------- |
| `fa4f6cd` | docs: auditoria pós-EPIC 15 versionada                           |
| `38279b9` | auth/ACL Neurofrigo + OTel debug exporter + login page + UI lint |
| `8427686` | Prettier line-wide (format:check)                                |
| `bbf99db` | login `searchParams` Promise (Next PageProps)                    |
| `87981fc` | pages-migration: remove mid-stack rollback inseguro              |
| `3b07334` | pages-migration: invoke via workspace `payload exec`             |

---

## 3. AUTH matrix (pós-hardening)

| ENDPOINT                           | AUTH REQUIRED | CURRENT               | EXPECTED                  | NOTES                   |
| ---------------------------------- | ------------- | --------------------- | ------------------------- | ----------------------- |
| `/api/omnia/ai/chat`               | yes           | session/S2S+userId    | 401 anon                  | body.userId **ignored** |
| `/api/omnia/ai/feedback`           | yes           | same                  | 401                       |                         |
| `/api/omnia/tutor/*`               | yes           | same                  | 401 + subject ACL         |                         |
| `/api/omnia/sip/*`                 | yes           | same                  | 401 + subject ACL         |                         |
| `/api/omnia/adaptive/*`            | yes           | same                  | 401 + outcome owner check |                         |
| `/api/omnia/enterprise/assistants` | yes           | same                  | 401                       | role elevation blocked  |
| `/api/retrieval/*` search          | yes           | auth                  | 401                       | workers = service/staff |
| Dashboards `*/refresh`             | service/staff | secret **or** KiStaff | no browser anon           |                         |
| Portal BFF `/api/ai                | tutor         | sip                   | adaptive`                 | session                 | 401 sem cookie | aligns LMS connector |     |

**Staging smoke (2026-08-11):** `ai=401 sip=401 adaptive=401 bff=401` bodies `UNAUTHORIZED`.

Helper: `apps/admin/src/services/neurofrigo/auth-context.ts` (padrão LMS).

---

## 4. ACL / negative tests

Unit: `test:neurofrigo-auth-acl` — **6/6 PASS** (spoof userKey blocked).  
Adaptive outcome: owner check before update.  
Cross-tenant deep E2E: **parcial** (não suite HTTP multi-tenant completa nesta R0).

---

## 5. CI

| Gate                           | Status tip `3b07334` / prior                                                 |
| ------------------------------ | ---------------------------------------------------------------------------- |
| Lint                           | ✅ (fix `@omnia/ui` avatar eslint-disable)                                   |
| Typecheck                      | ✅                                                                           |
| Format                         | ✅ (Prettier mass)                                                           |
| Contract/SEO tests (Quality)   | ✅                                                                           |
| Pages migration DB             | ❌ Build job (ainda falhando em `87981fc`; retry `3b07334` em curso/avaliar) |
| `pnpm build` (CI)              | skipped enquanto Pages falha                                                 |
| Docker build staging Admin/Web | ✅ evidência VPS                                                             |

**Classification Pages failure:** **PRE_EXISTING / EXPOSED** — Quality antes falhava no Lint; Build nunca rodava na feature. Causa raiz do migrate fresh com stack E03–E15 ainda **UNKNOWN** sem logs CI autenticados.

---

## 6. Tests matrix (R0)

| Suite                              | Result   |
| ---------------------------------- | -------- |
| `@omnia/adaptive-learning` unit    | PASS 7/7 |
| `@omnia/student-intelligence` unit | PASS 6/6 |
| neurofrigo auth ACL                | PASS 6/6 |
| Local lint/typecheck monorepo      | PASS     |
| CI Quality contracts               | PASS     |
| CI Build + Pages migrate           | FAIL     |
| Staging auth smoke                 | PASS     |
| Staging health                     | PASS     |

---

## 7. OTel

**Cause:** CONFIG — exporter `logging` deprecated in collector 0.114.  
**Fix:** `docker/observability/otel/collector.yaml` → `debug`.  
**Staging:** collector **Up**, logs `Everything is ready`. Prometheus scrape path intact.

---

## 8. Assessment

**STUB / CONTROLLED (read-only)** — `docs/audits/ASSESSMENT_RELEASE_LIMITATION_R0.md`.  
Não bloqueia fluxo Login→Cursos→AI→Tutor→SIP→Adaptive.

---

## 9. Login UX

`/login` → redirect Admin login (`307`) com `next` preservável. Sem redesign.

---

## 10. Staging ops

`docs/ops/STAGING_OPERATIONS.md` — deploy/migrate/seed/health/rollback oficiais (sem credentials).

---

## 11. Git strategy

**B) release branch** — `docs/audits/R0_GIT_INTEGRATION_STRATEGY.md`.  
`release/omnia-platform-ai-v3` = tip feature. Landing isolada. Sem merge em `main`/`develop` nesta R0.

---

## 12. Knowledge / EPIC 10

Runtime staging: chunks **190**, embeddings **190**.  
**EPIC 10: GO REAL / CURRENT PIPELINE VALIDATED** (não NO-GO histórico).

---

## 13. Production delta (READ-ONLY)

| Item                           | Staging RC               | Production           |
| ------------------------------ | ------------------------ | -------------------- |
| Admin/Web                      | tip Neurofrigo + R0 auth | `2.3.0` (2026-07-25) |
| Migrations                     | 31 applied               | UNKNOWN / behind     |
| Collections SIP/Adaptive/KH/AI | present                  | absent expected      |
| Landing                        | 1.0.1                    | 1.0.1                |
| Deploy                         | **NOT EXECUTED**         |                      |

Plano prod: backup → migrate → deploy Admin/Web only → smoke auth → rollback dump. **Não executar.**

---

## 14. Landing / Moodle

Landing `omnia-landing-lancamento:1.0.1` Up. Moodle DEV healthy. Prod Admin/Web untouched.

---

## 15. Readiness matrix

| COMPONENT             | CI       | AUTH | TEST | STAGING | PROD_DELTA | READY |
| --------------------- | -------- | ---- | ---- | ------- | ---------- | ----- |
| Foundation/CMS        | 🟡       | ✅   | 🟡   | ✅      | large      | 🟡    |
| Knowledge/Retrieval   | 🟡       | ✅   | 🟡   | ✅      | large      | 🟡    |
| AI/Tutor/SIP/Adaptive | 🟡       | ✅   | 🟡   | ✅      | large      | 🟡    |
| Observability         | 🟡       | n/a  | 🟡   | ✅ OTel | n/a        | 🟡    |
| Portal/Admin          | 🟡 Build | ✅   | 🟡   | ✅      | large      | 🟡    |
| Landing               | n/a      | n/a  | ✅   | ✅      | none       | ✅    |
| **RC overall**        | ❌ Build | ✅   | 🟡   | ✅      | large      | ❌    |

---

## 16. Decision

### 🔴 RELEASE CANDIDATE NO-GO

**Blocker remanescente P0:** CI **Build** job (Pages migration DB validation) não verde.

**Não-blockers resolvidos nesta R0:** auth anônima, OTel restart, format/lint Quality, login 404, Assessment disclosure, Git strategy, staging auth smoke.

---

## 17. Next action

1. Obter logs autenticados do job Build / corrigir `payload migrate` fresh com 31 migrations.
2. Re-run CI até Build GREEN.
3. Só então: PR `release/omnia-platform-ai-v3` → `develop` e plano prod.

**PARAR. Não iniciar EPIC 16. Não deployar produção.**
