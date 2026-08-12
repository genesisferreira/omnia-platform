# OMNIA PLATFORM — Release Readiness R0.3

**Date:** 2026-08-12  
**Mission:** Sprint R0.3 — Linux Build Parity + Auth Ordering Closure  
**Release branch:** `release/omnia-platform-ai-v3`  
**HEAD inicial:** `b1d76db` (docs R0.2 NO-GO)  
**HEAD final desta sessão:** ver §17  
**Histórico:** [`R0.md`](./OMNIA_PLATFORM_RELEASE_READINESS_R0.md) · [`R0.1.md`](./OMNIA_PLATFORM_RELEASE_READINESS_R0_1.md) · [`R0.2.md`](./OMNIA_PLATFORM_RELEASE_READINESS_R0_2.md) (preservados)

---

## 1. Executive summary

R0.3 fecha a divergência **Quality × Next build** e a regressão **auth-before-validation** no Portal BFF (`POST /api/ai/chat` e rotas AI relacionadas).

**Não executado nesta sprint (parada obrigatória):** deploy staging, cross-tenant profundo, tag RC, PR, produção, EPIC 16.

---

## 2. Causa Quality × Next

| Aspecto         | Quality (antes R0.3)                                                                               | Next `next build`                                              |
| --------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Tipos Payload   | `apps/admin/src/payload-types.ts` **gitignored**; sem `generate:types` o `tsc` não vê unions reais | Após compile, Next typecheck usa tipos gerados + `.next/types` |
| Relacionamentos | Sem Doc types → coerções frouxas passam                                                            | `number \| Doc` estrito                                        |
| Selects / JSON  | `string` / `unknown` aceitos                                                                       | Unions literais + shape JSON Payload                           |
| Seeds/CLI       | Excluídos do `tsconfig` Admin (`src/scripts`, `src/seed`) — intencional                            | Mesma exclusão; não contaminam o build Next                    |

**Decisão de parity (Quality):**

1. CI Quality roda `pnpm --filter @omnia/admin generate:types` **antes** de `pnpm typecheck`.
2. CI Build também gera tipos antes dos builds isolados.
3. Não usar `ignoreBuildErrors`.
4. Typecheck CLI opcional: `pnpm --filter @omnia/admin typecheck:cli` (`tsconfig.cli.json`) — não esconde erros de runtime Next.

Objetivo: um PR com relationship Payload incorreto falha no Quality antes do Build.

---

## 3. Erros Linux restantes (lista completa pós-`generate:types` + `tsc`)

Todos reproduzidos localmente com tipos gerados (classe idêntica ao Next Linux). Corrigidos nesta sprint:

| Arquivo                         | Problema                                        | Correção                                           |
| ------------------------------- | ----------------------------------------------- | -------------------------------------------------- |
| `services/neurofrigo/ask.ts`    | `AiSession[]` / create `data` vs Record Payload | `asUnknownRecord` / `asPayloadJson`                |
| `services/retrieval/reindex.ts` | `string\|number` em relationships               | `toPayloadRelationId` / `requirePayloadRelationId` |
| `services/retrieval/search.ts`  | create `data` / filters JSON                    | `asPayloadJson`                                    |
| `services/tutor/ask.ts`         | `course` required; steps JSON                   | `requirePayloadRelationId` + `asPayloadJson`       |
| `services/tutor/profiles.ts`    | `course` required; enrolled/completed JSON      | helpers tipados                                    |

Helpers em `apps/admin/src/lib/payload-relation-id.ts`: `toPayloadRelationId`, `requirePayloadRelationId`, `relationId`, `asUnknownRecord`, `asPayloadJson`. Sem `as any`.

---

## 4. Auth ordering

**Antes:** BFF validava `question` → `400` sem sessão.  
**Depois:** `requirePortalSession()` → `401`; só então `gateAuthenticatedAiRequest()` valida payload → `400`.

Rotas: `api/ai/chat`, `api/ai/feedback`, `api/tutor/chat`, `api/tutor/profile`, `api/sip/profile`, `api/adaptive/next`.  
Gate: `apps/web/src/lib/auth/ai-auth-gate.ts`.  
Testes: `pnpm --filter @omnia/web test:ai-auth-ordering` (sessão ausente/inválida → 401; sessão + question ausente → 400; forbidden contract 403/404).

---

## 5. Builds / CI

| Gate          | Critério                                                  | Status (preencher após CI) |
| ------------- | --------------------------------------------------------- | -------------------------- |
| Admin Linux   | `next build` isolado                                      | pendente CI                |
| Web Linux     | `apps/web` build isolado                                  | pendente CI                |
| Monorepo      | `pnpm build`                                              | pendente CI                |
| Quality       | lint + generate:types + typecheck + tests + auth ordering | pendente CI                |
| Fresh migrate | `test:pages-migration-db`                                 | pendente CI                |
| Importmap     | `generate:importmap`                                      | pendente CI                |

Reprodução local Linux (WSL/Docker): **indisponível** neste host; validação Linux = GitHub Actions `ubuntu-latest`.

CI Build steps (isolados): Admin → Web → monorepo `pnpm build`.

---

## 6. Credencial (sanitizado)

Ferramentas de sessão anterior podem ter capturado credencial GitHub em log de tool.  
**Ação:** não repetir token; não commitado em git.  
**Status:** `credential_rotated=false` — rotação/revogação manual obrigatória pelo owner no GitHub (Settings → Developer settings → tokens).

---

## 7. Critérios GO R0.3

| Critério                                         | Meta                 |
| ------------------------------------------------ | -------------------- |
| Linux Admin/Web/Monorepo build                   | GREEN                |
| Quality / migrate / importmap / tests            | GREEN                |
| Quality detecta erros Payload (`generate:types`) | sim                  |
| AI unauthenticated                               | 401                  |
| Sem `ignoreBuildErrors` / hack Windows-only      | sim                  |
| Produção / landing / Moodle                      | intactos             |
| Staging / RC tag / PR                            | **não** nesta sprint |

Veredito final: ver §18 após CI.

---

## 8–18. Preenchimento pós-CI

Atualizar após push dos fixes e conclusão dos jobs Actions:

- HEAD final / commits
- Resultados Admin / Web / monorepo / Quality / migrate / importmap
- Auth ordering confirmado no CI
- GO/NO-GO R0.3
- Parada: sem staging, tag, PR, EPIC 16, produção
