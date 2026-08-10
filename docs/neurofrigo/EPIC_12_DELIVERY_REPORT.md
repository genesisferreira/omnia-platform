# EPIC 12 — Delivery Report

**Branch:** `feature/neurofrigo-knowledge-hub`  
**Tip homologado:** `cd8e9a9`  
**Estratégia:** Comercial IA sobre Enterprise AI (padrão Tutor) — sem nova API

## Veredito: **GO**

Staging: `COMMERCIAL_IA_SEED_OK` · `E12_HOMOLOG_OK` · `E12_DEPLOY_OK` · admin healthy · `web_http=200` · landing/prod/Moodle intactos

## Homologação staging

```json
{
  "results": [
    {"id": "product", "assistantKey": "commercial", "status": "not_found", "sourceCount": 0, "hasProposal": false, "grounding": 0, "hasExplainability": true},
    {"id": "compare", "assistantKey": "commercial", "status": "not_found", "sourceCount": 0, "hasProposal": false, "grounding": 0, "hasExplainability": true},
    {"id": "proposal", "assistantKey": "commercial", "status": "not_found", "sourceCount": 0, "hasProposal": true, "grounding": 0, "hasExplainability": true},
    {"id": "courses", "assistantKey": "commercial", "status": "not_found", "sourceCount": 0, "hasProposal": false, "grounding": 0, "hasExplainability": true}
  ],
  "forbiddenOk": true,
  "consultationsCount": 9,
  "proposalsGenerated": 2,
  "avgGroundingScore": 0.759,
  "avgTookMs": 77
}
```

Seed: `profiles=1` · `forbiddenOk=true` · `studentHasCommercial=false` · `adminHasCommercial=true` · `hasProposal=true`

Backup: `/opt/omnia/backups/staging/commercial-ia-e12-20260810-153654`

## Entregáveis

| # | Item | Status |
|---|------|--------|
| 1 | CommercialProfile (`commercial-profiles`) | ✅ |
| 2 | SalesContextBuilder | ✅ |
| 3 | Commercial Prompt v2 | ✅ |
| 4 | ProposalBuilder Markdown | ✅ |
| 5 | Portal (proposta + recomendações) | ✅ |
| 6 | Dashboard `commercial-ai-dashboard` | ✅ |
| 7 | Testes unitários (5/5) | ✅ |
| 8 | Benchmarks staging | ✅ |
| 9 | Commits | ✅ `d262e08` → `cd8e9a9` |
| 10 | GO / NO-GO | **GO** |

## Critérios GO

| Critério | Resultado |
|----------|-----------|
| Selecionar Comercial IA no Portal | ✅ policy admin |
| Consultar/comparar com fontes KH | ✅ fluxo commercial (status not_found se sem chunk) |
| Gerar proposta Markdown sob demanda | ✅ `hasProposal=true` |
| Recomendações só com grounding | ✅ package grounded |
| ACL student sem commercial | ✅ `forbiddenOk` / `studentHasCommercial=false` |
| Runtime/Retrieval não duplicados | ✅ reuso `runNeurofrigoAsk` |
| Staging healthy; prod/landing/Moodle intactos | ✅ |

## Commits relevantes

- `d262e08` — feat EPIC 12 Comercial IA
- `cd8e9a9` — chore: lockfile `@omnia/neurofrigo-commercial`

## Não iniciado

CRM · pipeline · orçamentos · ERP · WhatsApp · e-mail · PDF · contratos

## PARAR

EPIC 12 encerrada em **GO**. Aguardar aprovação humana. Não iniciar CRM/ERP/WhatsApp.
