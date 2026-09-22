# EPIC 12 — Comercial IA

**Branch:** `feature/neurofrigo-knowledge-hub`  
**Depende de:** EPIC 08–11 (Enterprise AI Platform)

## Missão

Assistente comercial especializado da Omnia Frigo Holding consumindo Runtime, Retrieval e Knowledge Hub existentes — **sem** nova API e **sem** CRM/ERP/WhatsApp.

## Arquitetura

```
Portal (Comercial IA)
  → POST /api/ai/chat (assistantId=commercial)
    → CommercialService (@omnia/neurofrigo-commercial)
      → CommercialProfile + SalesContextBuilder
      → NeurofrigoRuntime.ask
      → ProposalBuilder / Recommendations
```

## Entregáveis

1. Collection `commercial-profiles`
2. Package `@omnia/neurofrigo-commercial`
3. Prompts comerciais v2
4. ProposalBuilder (Markdown)
5. Portal: proposta + recomendações
6. Global `commercial-ai-dashboard`
7. Seed/homolog `commercial-ia` / `commercial-ia-epic12`

## Homologação

Tip: `cd8e9a9` · `COMMERCIAL_IA_SEED_OK` · `E12_HOMOLOG_OK` · `E12_DEPLOY_OK` · **GO**

Ver relatório: [EPIC_12_DELIVERY_REPORT.md](./EPIC_12_DELIVERY_REPORT.md)

## Fora de escopo

CRM · pipeline · orçamentos · ERP · WhatsApp · e-mail · PDF · contratos
