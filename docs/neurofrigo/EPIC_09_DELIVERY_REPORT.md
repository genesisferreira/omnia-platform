# EPIC 09 — Delivery Report

**Branch:** `feature/neurofrigo-knowledge-hub`  
**Tip deploy:** `0297d32`  
**Escopo:** DeepSeek Live + Orquestrador + 8 especialistas oficiais

## Veredito: **NO-GO** — pendência de autenticação DeepSeek em staging

Staging operacional (`DEEPSEEK_AGENTS_SEED_OK`, admin/web healthy, landing/prod intactos), **porém** `.env.staging` está sem `DEEPSEEK_API_KEY` (`HAS_DS=0`). O Runtime usou `grounded` (fallback controlado), não DeepSeek real.

### Para virar GO

1. Inserir `DEEPSEEK_API_KEY` (e opcionalmente `NEUROFRIGO_LLM_PROVIDER=deepseek`, `NEUROFRIGO_LLM_FALLBACK=grounded`) apenas no secret/env da VPS — nunca no Git.  
2. Recriar Admin com o env atualizado.  
3. Reexecutar `admin-bootstrap.sh deepseek-agents`.  
4. Confirmar seed com `providerUsed: "deepseek"` e `deepseekStatus` ≠ `key_missing`.

## Homologação staging (seed)

```json
{
  "routeAssistant": "hvac",
  "askStatus": "ok",
  "askAssistant": "hvac",
  "specialistLabel": "Refrigeração",
  "providerUsed": "grounded",
  "providerRequested": "grounded",
  "injectionBlocked": true,
  "examBlocked": true,
  "deepseekStatus": "key_missing"
}
```

## Entregáveis

| # | Item | Status |
|---|------|--------|
| 1 | Arquitetura provider desacoplada | ✅ |
| 2 | DeepSeek adapter (`DeepSeekChatProvider`) | ✅ |
| 3 | Model Registry `deepseek-chat` + `grounded-default` | ✅ |
| 4 | Assistant Registry final (8 oficiais + legado) | ✅ |
| 5 | Orquestrador Portal (`@omnia/neurofrigo-orchestrator`) | ✅ |
| 6 | Oito especialistas | ✅ |
| 7 | Prompt Registry (+ compliance) | ✅ |
| 8 | Policy Engine (student/staff/command) | ✅ |
| 9 | Purpose Guard | ✅ |
| 10 | Assessment Integrity | ✅ |
| 11 | ACL/matrícula (curso no contexto + policies) | ✅ parcial* |
| 12 | Custos (tokens + estimatedCost do registry) | ✅ |
| 13 | Orçamento interno + thresholds | ✅ |
| 14 | Dashboard Ops (DeepSeek status, custo dia/mês) | ✅ |
| 15–17 | Testes agentes/orquestrador/segurança | ✅ (unit + seed) |
| 18 | Typecheck/testes locais | ✅ |
| 19 | Deploy staging | ✅ código |
| 20 | Bugs | tipagem budget spend; build fix `0297d32` |
| 21 | Pendências | **API key DeepSeek na VPS**; autenticação live |
| 22 | Commits | `6d44cfa` → `0297d32` |
| 23 | GO / NO-GO | **NO-GO** |

\* Matrícula: páginas de curso tratam `courseId` como escopo; checagem `student-profiles` quando existir. Sem matrícula real no seed anônimo.

## Critérios bloqueantes

| Critério | Resultado |
|----------|-----------|
| 1. DeepSeek autenticando | ❌ key missing |
| 2. Runtime usando DeepSeek real | ❌ usou grounded |
| 3–22 (demais) | ✅ / parcial conforme tabela |

## Não iniciado

Tool Framework · CRM IA · ERP · WhatsApp · agentes autônomos

## PARAR

Aguardando: (a) secret DeepSeek em staging + re-seed, ou (b) aprovação humana do caminho de GO após chave.
