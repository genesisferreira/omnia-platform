# OMNIA PLATFORM — Release Readiness R0.4

**Date:** 2026-08-12  
**Mission:** RC Finalization — Staging Alignment + Security E2E + RC.1  
**Release branch:** `release/omnia-platform-ai-v3`  
**HEAD inicial (aprovado R0.3):** `22477b6`  
**RC_SHA:** `30ecb0a` (necessário pós-R0.3: Docker Admin typecheck + generate:types; CI GREEN)  
**Histórico:** [`R0`](./OMNIA_PLATFORM_RELEASE_READINESS_R0.md) · [`R0.1`](./OMNIA_PLATFORM_RELEASE_READINESS_R0_1.md) · [`R0.2`](./OMNIA_PLATFORM_RELEASE_READINESS_R0_2.md) · [`R0.3`](./OMNIA_PLATFORM_RELEASE_READINESS_R0_3.md) (preservados)

---

## 1. Executive summary

Staging alinhado ao RC; cross-tenant HTTP real com login Payload **PASS**; auth ordering **PASS**; Knowledge **190/190/190**; Landing/Moodle/Prod intactos; CI do `RC_SHA` **GREEN**.

**Tag `omnia-platform-ai-v3-rc.1` não criada** — `github_credential_rotated=false` (GATE 0/14).  
**PR develop:** ver §15.

**Veredito:** `🔴 OMNIA PLATFORM AI V3 RC.1 — NO-GO` (bloqueio: confirmação humana de rotação de credencial + tag).  
Gates técnicos de staging/segurança/CI: **PASS**.

---

## 2. GATE 0 — Credencial

`github_credential_rotated=false`

Possível exposição em logs de tooling em sprints anteriores. Token não repetido; não entrou em git.  
Aguardando o responsável revogar/rotacionar no GitHub e confirmar.

---

## 3. GATE 1 — Pre-flight

| Item                 | Valor                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| Branch               | `release/omnia-platform-ai-v3`                                                                    |
| Working tree tracked | limpa (scripts `_r04_*` / `_e*` untracked locais)                                                 |
| Local HEAD           | `30ecb0a`                                                                                         |
| Origin HEAD          | `30ecb0a`                                                                                         |
| CI                   | [31621804360](https://github.com/genesisferreira/omnia-platform/actions/runs/31621804360) success |
| Migrations no repo   | 31 numbered (+ index)                                                                             |

Staging **antes** do align: `feature/neurofrigo-knowledge-hub` @ `87981fc` (≠ RC).

---

## 4. GATE 2–3 — Cross-tenant + auth

Dados controlados em staging (Tenant A/B, Company A/B, User A/B students). Autenticação real via `POST /api/users/login` → JWT. Cookies/senhas **não** registrados.

| Probe                                           | Resultado                                          |
| ----------------------------------------------- | -------------------------------------------------- |
| A→A SIP                                         | 200                                                |
| B→B SIP                                         | 200                                                |
| A→B SIP                                         | **403**                                            |
| B→A SIP                                         | **403**                                            |
| A→A Adaptive                                    | 200                                                |
| B→B Adaptive                                    | 200                                                |
| A→B Adaptive                                    | **403**                                            |
| B→A Adaptive                                    | **403**                                            |
| A→B Tutor                                       | **403**                                            |
| A AI spoof body (userId/tenant/company/channel) | 200 sem elevação (campos ignorados para non-staff) |
| Admin/Portal AI/Tutor/SIP/Adaptive anônimos     | **401**                                            |
| Admin AI autenticado + payload inválido         | **400**                                            |

---

## 5. GATE 4–8 — RC_SHA, backup, align, migrate, health

| Item                       | Valor                                                                                           |
| -------------------------- | ----------------------------------------------------------------------------------------------- |
| RC_SHA                     | `30ecb0a`                                                                                       |
| Commits pós-22477b6        | `9fc0161` Docker generate:types + budget docs; `30ecb0a` reducer number                         |
| Backup 1                   | `/opt/omnia/backups/staging/r04-rc1-20260812-125138/` SHA256 `f7664dc0…9107`                    |
| Backup 2 (pré-align final) | `/opt/omnia/backups/staging/r04-rc1-20260812-142506/` SHA256 `c08bfc21…f91d` DB `omnia_staging` |
| Staging SHA                | `30ecb0a` = local = origin                                                                      |
| Migrate                    | `payload migrate` → Done (sem SQL manual)                                                       |
| Admin health               | healthy (db up, payload configured)                                                             |
| Web                        | 200                                                                                             |
| Postgres staging           | up (`omnia-postgres`)                                                                           |

Primeira tentativa de build Docker em `22477b6` falhou em `ask.ts` budget docs (`JsonObject` vs estimatedCostUsd) — corrigido; Dockerfile agora roda `generate:types` antes do build.

---

## 6. GATE 9 — Smoke

| Superfície                                                 | Resultado                                                             |
| ---------------------------------------------------------- | --------------------------------------------------------------------- |
| Portal `/`                                                 | 200                                                                   |
| Catálogo `/cursos`                                         | 200                                                                   |
| `/empresas` `/blog`                                        | 200                                                                   |
| `/login`                                                   | 307 (redirect fluxo auth)                                             |
| `/lms` `/lms/cursos`                                       | 307 (área autenticada)                                                |
| Admin `/admin`                                             | 200                                                                   |
| Admin health                                               | 200                                                                   |
| Enterprise/Tutor/Comercial/Engenharia/SIP/Adaptive UI deep | coberto via APIs Admin autenticadas + BFF 401; páginas LMS protegidas |

---

## 7. GATE 10–12 — Knowledge, OTel, isolamento

| Item                          | Resultado                                           |
| ----------------------------- | --------------------------------------------------- |
| chunks / embeddings / vectors | **190 / 190 / 190**                                 |
| queue pending/failed          | 0 / 0 (completed histórico ~205)                    |
| OTel collector                | Up                                                  |
| Prometheus / Grafana          | Up                                                  |
| Landing                       | `omnia-landing-lancamento:1.0.1` Up, não recriada   |
| Moodle                        | `omnia-lms-moodle:2.4.1-dev` healthy, intacto       |
| Production admin/web/postgres | Up healthy, **não** redeployados / **não** migrados |

---

## 8. GATE 13–15 — CI, tag, PR

| Gate                            | Status                        |
| ------------------------------- | ----------------------------- |
| CI Quality/Build no RC_SHA      | GREEN                         |
| Tag `omnia-platform-ai-v3-rc.1` | **não criada** (credencial)   |
| PR → develop                    | ver URL ao final desta sprint |

---

## 9. Riscos residuais

- Credencial GitHub potencialmente exposta: rotação pendente
- Tag RC.1 pendente
- Merge develop pendente de aprovação humana
- Assessment STUB/CONTROLLED (histórico R0)
- Scripts `_r04_*` / `_e*` permanecem untracked

---

## 10. Parada

Não mergear PR. Não produção. Não iniciar nova feature. Aguardar aprovação humana (credencial → tag → merge).
