# OMNIA PLATFORM — Release Readiness R0.3

**Date:** 2026-08-12  
**Mission:** Sprint R0.3 — Linux Build Parity + Auth Ordering Closure  
**Release branch:** `release/omnia-platform-ai-v3`  
**HEAD inicial:** `b1d76db` (docs R0.2 NO-GO)  
**HEAD final:** `882d5c0`  
**CI final:** [run 31612056952](https://github.com/genesisferreira/omnia-platform/actions/runs/31612056952) — **success**  
**Histórico:** [`R0.md`](./OMNIA_PLATFORM_RELEASE_READINESS_R0.md) · [`R0.1.md`](./OMNIA_PLATFORM_RELEASE_READINESS_R0_1.md) · [`R0.2.md`](./OMNIA_PLATFORM_RELEASE_READINESS_R0_2.md) (preservados)

---

## 1. Executive summary

R0.3 **fechou** a divergência Quality × Next build e a regressão auth-before-validation no Portal BFF.

| Gate                                                                       | Resultado    |
| -------------------------------------------------------------------------- | ------------ |
| Quality (lint, generate:types, typecheck, format, tests, AI auth ordering) | GREEN        |
| Fresh migrate + Pages schema                                               | GREEN (~15s) |
| Importmap                                                                  | GREEN (~4s)  |
| Admin build isolado (Linux)                                                | GREEN (~81s) |
| Web build isolado (Linux)                                                  | GREEN (~45s) |
| Monorepo `pnpm build`                                                      | GREEN (~85s) |

**Não executado (parada obrigatória):** deploy staging, cross-tenant profundo, tag RC, PR, produção, EPIC 16.

**Veredito:** `🟢 R0.3 BUILD PARITY CLOSED — GO PARA RC FINALIZATION`

---

## 2. Causa Quality × Next

| Aspecto         | Quality (antes R0.3)                                                                                                                       | Next `next build`                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| Tipos Payload   | `apps/admin/src/payload-types.ts` **gitignored**; sem `generate:types` o `tsc` não via unions reais                                        | Após compile, typecheck usa tipos gerados + `.next/types` |
| Relacionamentos | Sem Doc types → coerções frouxas passavam                                                                                                  | `number \| Doc` estrito                                   |
| Selects / JSON  | `string` / `unknown` aceitos                                                                                                               | Unions literais + shape JSON Payload                      |
| Seeds/CLI       | Excluídos do `tsconfig` Admin (`src/scripts`, `src/seed`) — **intencional** (não são runtime Next); typecheck opcional via `typecheck:cli` | Mesma exclusão                                            |

**Por que `pnpm typecheck` passava e `next build` falhava:** Quality rodava `tsc` sem `payload generate:types`, então os erros de relacionamento/select/json só apareciam no typecheck do Next.

**Decisão de parity:**

1. CI Quality: `generate:types` **antes** de `typecheck`.
2. CI Build: `generate:types` antes dos builds isolados Admin → Web → monorepo.
3. Sem `ignoreBuildErrors`.
4. CLI: `pnpm --filter @omnia/admin typecheck:cli` (`tsconfig.cli.json`) — não esconde erros de runtime.

---

## 3. Erros Linux restantes (lista completa pós-`generate:types`)

Reproduzidos com tipos gerados + `tsc` (classe idêntica ao Next Linux). Todos corrigidos:

| Arquivo                | Esperado / recebido                        | Origem           | Gerado Payload?   | Só Next?           | Por que Quality não via |
| ---------------------- | ------------------------------------------ | ---------------- | ----------------- | ------------------ | ----------------------- |
| `neurofrigo/ask.ts`    | Record / AiSession[] + create data         | runtime services | sim (collections) | não (tsc c/ types) | sem `payload-types.ts`  |
| `retrieval/reindex.ts` | `number` relation / `string\|number`       | relationships    | sim               | não                | idem                    |
| `retrieval/search.ts`  | Payload create data / filters JSON         | json + relation  | sim               | não                | idem                    |
| `tutor/ask.ts`         | `course: number` required; steps JSON      | relation + json  | sim               | não                | idem                    |
| `tutor/profiles.ts`    | `course` required; enrolled/completed JSON | relation + json  | sim               | não                | idem                    |

Helpers: `apps/admin/src/lib/payload-relation-id.ts` — `toPayloadRelationId`, `requirePayloadRelationId`, `relationId`, `asUnknownRecord`, `asPayloadJson`. Sem `as any`.

---

## 4. Auth ordering

**Antes:** BFF validava `question` → `400` sem sessão.  
**Depois:** `requirePortalSession()` → `401`; só então valida payload → `400`.

Rotas: `api/ai/chat`, `api/ai/feedback`, `api/tutor/chat`, `api/tutor/profile`, `api/sip/profile`, `api/adaptive/next`.  
Gate: `apps/web/src/lib/auth/ai-auth-gate.ts`.  
Testes CI: `AI auth ordering (Portal BFF)` = success.

Contrato: sem sessão / sessão inválida → **401**; sessão + payload inválido → **400**; forbidden upstream → **403/404**.

---

## 5. Builds

| Superfície         | Ambiente      | Resultado                                                   | Notas                                                          |
| ------------------ | ------------- | ----------------------------------------------------------- | -------------------------------------------------------------- |
| Admin `next build` | Windows local | typecheck + static OK; exit 1 em standalone symlink `EPERM` | hack Windows-only **não** usado; CI Linux é a fonte de verdade |
| Admin isolado      | GHA Linux     | GREEN ~81s                                                  | compile + types + static + standalone                          |
| Web isolado        | GHA Linux     | GREEN ~45s                                                  |                                                                |
| Monorepo           | GHA Linux     | GREEN ~85s                                                  | sem task failed                                                |
| WSL/Docker local   | —             | indisponível neste host                                     | parity = Actions `ubuntu-latest`                               |

---

## 6. Credencial (sanitizado)

Sessões/tooling anteriores podem ter capturado credencial GitHub em log.  
Token **não** repetido aqui; **não** entrou em git.  
**Status:** `credential_rotated=false` — owner deve revogar/rotacionar no GitHub (Settings → Developer settings → Personal access tokens).

---

## 7. Commits R0.3

| SHA       | Mensagem                                                                               |
| --------- | -------------------------------------------------------------------------------------- |
| `885b964` | `fix(r0.3): Linux typecheck parity, Quality generate:types, AI auth-before-validation` |
| `882d5c0` | `style: prettier-format apps/admin/tsconfig.cli.json`                                  |

---

## 8. Critérios GO R0.3

| Critério                                          | Status               |
| ------------------------------------------------- | -------------------- |
| Linux Admin / Web / Monorepo build                | GREEN                |
| Quality / migrate / importmap / tests / typecheck | GREEN                |
| Quality detecta erros Payload (`generate:types`)  | sim                  |
| AI unauthenticated = 401                          | sim (+ testes)       |
| Sem `ignoreBuildErrors` / hack Windows-only       | sim                  |
| Produção / landing / Moodle                       | intactos             |
| Staging / RC tag / PR                             | **não** nesta sprint |

---

## 9. Riscos residuais

- Staging ainda ≠ RC SHA (alinhamento só após aprovação humana).
- Cross-tenant HTTP real ainda pendente.
- Credencial potencialmente exposta em logs de tooling: rotação manual pendente.
- `payload-types.ts` continua gitignored (correto); Quality depende do step `generate:types`.

---

## 10. Parada

Não alinhar staging. Não criar RC tag. Não abrir PR. Não iniciar EPIC 16. Não tocar produção.  
**Aguardar aprovação humana para RC finalization.**
