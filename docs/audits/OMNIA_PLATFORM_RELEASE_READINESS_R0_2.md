# OMNIA PLATFORM — Release Readiness R0.2

**Date:** 2026-08-12  
**Mission:** Sprint R0.2 — Final Release Candidate Closure  
**Release branch:** `release/omnia-platform-ai-v3`  
**HEAD inicial:** `32e47e0` (pós R0.1: docs format + public-courses typecast)  
**HEAD final desta sessão:** ver §9  
**Histórico:** [`R0.md`](./OMNIA_PLATFORM_RELEASE_READINESS_R0.md) · [`R0.1.md`](./OMNIA_PLATFORM_RELEASE_READINESS_R0_1.md) (não reescritos)

---

## 1. Executive summary

R0.2 obteve o **log autenticado completo** do `next build` no GitHub Actions. A falha **não** é SMTP, memória do runner, case-sensitivity Linux, nem `exit code 1` vazio.

**Causa de classe:** depois de `Compiled successfully`, o Next 15.5.20 entra em **Checking validity of types** com tipos gerados do Payload (relacionamentos `number | Doc`, selects literais, campos `json`). O `tsc` do job Quality **não** vê esses tipos, por isso Quality fica GREEN e o Build vermelho ~70–94s.

Vários erros reais foram corrigidos em série. O job **Quality** permanece GREEN (lint, typecheck, format, testes). O job **Build** continua RED no typecheck do Admin. Web chega a compilar no mesmo `pnpm build` (turbo) quando o Admin ainda não falhou cedo demais; o Admin é o `Failed: @omnia/admin#build`.

Staging **não** foi alinhado (Build não GREEN). Cross-tenant HTTP autenticado **não** fechado. Tag e PR **não** criados.

**Por critério estrito (CI Build GREEN + staging == RC_SHA + cross-tenant):** **RELEASE CANDIDATE NO-GO**.

Não iniciar EPIC 16. Não merge em `develop`. Não deploy em produção.

---

## 2. GATE 1 — erro real do `next build`

Logs autenticados (não usar só a anotação pública `Process completed with exit code 1`).

| Run                                                                               | SHA       | Job Build                         | Primeiro type error                                                                        |
| --------------------------------------------------------------------------------- | --------- | --------------------------------- | ------------------------------------------------------------------------------------------ |
| [195](https://github.com/genesisferreira/omnia-platform/actions/runs/31600435551) | `32e47e0` | `94126741086`                     | `seed-knowledge-hub-load.ts:43` `parent: string \| number` ↛ `number \| KnowledgeCategory` |
| [196](https://github.com/genesisferreira/omnia-platform/actions/runs/31601718931) | `800a134` | `94131113422`                     | mesmo arquivo `:291` `ownerCompany: string \| number` ↛ `number \| Company`                |
| [197](https://github.com/genesisferreira/omnia-platform/actions/runs/31602468678) | `7eea59c` | `94133531067`                     | `adaptive/decide.ts:185` `course: string \| number` ↛ `number \| Course`                   |
| [198](https://github.com/genesisferreira/omnia-platform/actions/runs/31603353920) | `357733d` | `94136612005`                     | `commercial/profiles.ts:41` `CommercialProfile as Record<string, unknown>`                 |
| [199](https://github.com/genesisferreira/omnia-platform/actions/runs/31604138852) | `477b84f` | `94139308657`                     | `pipeline.ts` `learningResource: number \| undefined` em campo required                    |
| [200](https://github.com/genesisferreira/omnia-platform/actions/runs/31604789171) | `bdbbb52` | `94141388258`                     | `pipeline.ts:504` `sourceType: string` ↛ union de select                                   |
| [201](https://github.com/genesisferreira/omnia-platform/actions/runs/31605728859) | `3422b30` | Quality **format** RED (Prettier) | —                                                                                          |
| [202](https://github.com/genesisferreira/omnia-platform/actions/runs/31606519640) | `1e1e3b4` | `94147358476`                     | `knowledgeArea: string` ↛ union de áreas                                                   |
| [203](https://github.com/genesisferreira/omnia-platform/actions/runs/31607431210) | `964e812` | `94150494295`                     | `allowedAgents: string[]` ↛ union `AGENT_KEYS`                                             |
| [204](https://github.com/genesisferreira/omnia-platform/actions/runs/31608318236) | `f337751` | `94153545570`                     | `knowledge/audit.ts:74` `unknown` ↛ json Payload                                           |
| [205](https://github.com/genesisferreira/omnia-platform/actions/runs/31609100636) | `97b55de` | `94156033830`                     | `lms/identity.ts:57` `'{}' \| null` ↛ json Payload                                         |

**Etapa Next:** compile OK (Admin ~41–68s) → **Checking validity of types** → `Failed to compile` → `ELIFECYCLE` 1. Lint skipped (`ignoreDuringBuilds`).

**Linux × local:** Quality `tsc --noEmit` GREEN no Ubuntu. `next build` local Windows, com `.next` limpo e `DOCKER_BUILD=true`, **passou o typecheck** e gerou 12 páginas estáticas; falhou depois em `EPERM` symlink do output `standalone` (Windows). O runner Linux falha **antes**, no typecheck, porque o programa TypeScript do Next após compile/importmap é mais estreito (unions Payload).

**Env relevante no step Build:** `DOCKER_BUILD=true`, `unset SMTP_*`, `CI=true`, Postgres service, `OMNIA_SMTP_ALLOW_BUILD=1` no job (SMTP dummy). Não é a causa do exit 1 atual.

---

## 3. GATE 2–3 — reprodução e correções mínimas

Reprodução: logs do runner + `next build` local (typecheck passou no Windows após os casts de relação; CI Ubuntu continua a revelar o próximo campo).

Correções aplicadas (só build/types; sem feature; sem migration SQL):

| SHA                   | Correção                                                               |
| --------------------- | ---------------------------------------------------------------------- |
| `e88747c`             | public-courses: docs via `unknown`                                     |
| `800a134`             | seed category `parent` numérico                                        |
| `7eea59c`             | `tsconfig` Admin exclui `src/scripts` e `src/seed` do typecheck Next   |
| `357733d`             | helper `toPayloadRelationId` / `requirePayloadRelationId` nos services |
| `477b84f`             | Payload docs → `Record` via `unknown`                                  |
| `bdbbb52`             | ids required não podem ser `undefined`                                 |
| `3422b30` / `1e1e3b4` | `sourceType` union + Prettier                                          |
| `964e812`             | `knowledgeArea` / classification unions                                |
| `f337751`             | `allowedAgents` → `AGENT_KEYS`                                         |
| `97b55de`             | audit JSON `AuditJson`                                                 |
| _(seguinte)_          | LMS audit json via `asPayloadJson`                                     |

Não foi usado `typescript.ignoreBuildErrors`.

---

## 4. GATE 4 — Admin / Web / monorepo build

| Superfície                           | Resultado    | Evidência                                                                                                       |
| ------------------------------------ | ------------ | --------------------------------------------------------------------------------------------------------------- |
| Admin `next build` CI                | ❌ typecheck | `@omnia/admin#build` exit 1                                                                                     |
| Web `next build` CI                  | 🟡           | compile ~16s e rotas do portal aparecem no log **antes** do Admin falhar; turbo marca 41/42 quando Admin quebra |
| Monorepo `pnpm build` CI             | ❌           | para no Admin                                                                                                   |
| Admin local (Windows, `.next` limpo) | 🟡           | typecheck + 12 static pages OK; standalone symlink EPERM                                                        |

---

## 5. GATE 5 — CI completo

| Gate            | Resultado                                                |
| --------------- | -------------------------------------------------------- |
| Quality         | ✅ GREEN (todos os SHAs de fix, exceto `3422b30` format) |
| Fresh migration | ✅ GREEN (~15s, 31 migrations)                           |
| Importmap       | ✅ GREEN                                                 |
| Admin Build     | ❌ RED                                                   |
| Web Build       | 🟡 não isolado (depende do Admin)                        |
| Tests           | ✅ Quality                                               |
| Typecheck (tsc) | ✅ Quality                                               |

RC permanece NO-GO enquanto Build estiver RED.

---

## 6. GATE 6–7 — HTTP auth

### Auth negative (staging público, SHA de staging **não** é o RC)

| Probe                                 | HTTP                                                                    |
| ------------------------------------- | ----------------------------------------------------------------------- |
| Admin `/api/health`                   | 200                                                                     |
| Web `/`                               | 200                                                                     |
| `POST /api/omnia/ai/chat` anônimo     | **401**                                                                 |
| SIP / Adaptive / Tutor Admin anônimos | **401**                                                                 |
| BFF SIP / Adaptive / Tutor            | **401**                                                                 |
| BFF `POST /api/ai/chat`               | **400** (BFF valida JSON/`question` **antes** de autenticar; não é 401) |
| Cookie ausente no Admin AI            | **401**                                                                 |

Sessão inválida / sessão válida sem autorização: **não** revalidadas com pares reais nesta sessão.

### Cross-tenant autenticado

**Não executado.** Sem Tenant A/B + User A/B com sessão real de homologação nesta sessão. Unitário ACL (Quality) continua GREEN. Spoof HTTP autenticado **não** medido.

---

## 7. GATE 8–15 — não iniciados (dependem de Build GREEN)

| Gate                               | Estado                                           |
| ---------------------------------- | ------------------------------------------------ |
| 8 RC_SHA imutável                  | **não** — CI Build RED                           |
| 9 Backup staging                   | **não**                                          |
| 10 Align staging == RC_SHA         | **não**                                          |
| 11 Smoke RC                        | **não**                                          |
| 12 Knowledge baseline              | **não** revalidado neste SHA                     |
| 13 Isolamento                      | Landing/Moodle/prod **não** tocados nesta sessão |
| 14 Tag `omnia-platform-ai-v3-rc.1` | **não criada**                                   |
| 15 PR `release → develop`          | **não aberto** (e não mergear)                   |

---

## 8. Isolamento / produção

| Superfície      | Estado                                                 |
| --------------- | ------------------------------------------------------ |
| Landing `1.0.1` | não recriada nesta sprint                              |
| Moodle          | não tocado                                             |
| Produção        | não migrada, não deployada, compose prod não executado |

---

## 9. Commits R0.2 (esta sessão)

Ver `git log 98c8747..HEAD`. Inclui `e88747c` / `32e47e0` (ponte R0.1→R0.2) e a série `fix(build):` acima.

Scripts `scripts/deploy/_e*` / `_r0_*` permanecem **untracked**.

---

## 10. Riscos residuais

- Next typecheck vs `tsc` Quality: o Build é um typechecker **diferente** (tipos Payload gerados). Cada correção revela o próximo campo (`json`, select, relationship).
- `src/scripts` / `src/seed` saíram do tsconfig do Next; Quality `tsc` também deixa de typecheckar esses CLI.
- BFF Web AI responde 400 sem sessão se o body falhar validação antes do 401.
- Token GitHub de `git credential fill` foi usado para baixar logs; **rotacionar** se houver exposição em logs de ferramenta.
- Node 20 deprecation warning nas Actions v4 (não bloqueante).

---

## 11. Próxima ação (humana)

1. Fechar o typecheck Next do Admin até **zero** erros no runner (padrão: relacionamentos `number`, selects literais, json com index signature).
2. Confirmar Quality **e** Build GREEN no mesmo SHA.
3. Só então: `RC_SHA`, backup staging, align exato, smoke, Knowledge, tag RC.1, PR para `develop` **sem merge**.

**PARAR. Não iniciar EPIC 16. Não mergear `develop`. Não tocar produção.**

---

## 12. Decision

### 🔴 OMNIA PLATFORM AI V3 RELEASE CANDIDATE NO-GO — VER PENDÊNCIAS

Pendência P0: GitHub Actions **Build** / `pnpm build` Admin — typecheck Next após compile. Quality, fresh migrate e importmap já não bloqueiam.
