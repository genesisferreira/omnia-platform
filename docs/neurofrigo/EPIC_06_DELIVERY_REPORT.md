# EPIC 06 — Delivery Report

**Branch:** `feature/neurofrigo-knowledge-hub`  
**Tip homologado:** `5165192`  
**Escopo:** AI Experience (qualidade UX, sem mudar Retrieval/KI)

## Veredito: **GO** — aguarda aprovação humana

Staging: `AI_EXPERIENCE_SEED_OK` · admin healthy · `admin_http=200`

## Entregáveis

| #   | Item                       | Status                   |
| --- | -------------------------- | ------------------------ |
| 1   | Runtime Experience V2      | ✅                       |
| 2   | Context Builder V2         | ✅                       |
| 3   | Prompt Builder V2 + intent | ✅                       |
| 4   | Response Formatter         | ✅                       |
| 5   | Explainability             | ✅                       |
| 6   | AI Feedback                | ✅                       |
| 7   | Follow-up (session turns)  | ✅                       |
| 8   | Grounding Score            | ✅                       |
| 9   | Dashboard atualizado       | ✅                       |
| 10  | UX Chat                    | ✅                       |
| 11  | Testes unitários (6/6)     | ✅                       |
| 12  | Benchmarks / seed staging  | ✅                       |
| 13  | Commits                    | ✅ `bdf77be` → `5165192` |
| 14  | GO / NO-GO                 | **GO**                   |

## Homologação staging (seed)

```json
{
  "first": { "status": "ok", "intent": "definition", "grounding": 0.822, "sources": 6 },
  "follow": { "sessionId": 9, "status": "ok", "intent": "procedural", "sameSession": true },
  "notFound": { "status": "not_found", "errorCode": "OFF_TOPIC" },
  "dashboard": { "questionsCount": 10, "feedbackUpCount": 4 }
}
```

## Commits principais

- `bdf77be` — feat: AI experience (follow-up, explainability, feedback, UX)
- `1921d31` / `50202cc` / `5165192` — fix: guardrail off-topic + diacríticos + seed alinhado ao material indexado

## Decisão técnica relevante

Guardrail lexical (OFF_TOPIC) evita respostas inventadas quando o retrieval devolve chunks sem overlap com a pergunta. Tokenização normaliza acentos com faixa Unicode explícita.

## Não iniciado

Tutor IA · CRM IA · Agentes · memória permanente · fine-tuning
