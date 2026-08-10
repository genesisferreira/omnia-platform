# EPIC 13 — Engenharia IA

**Branch:** `feature/neurofrigo-knowledge-hub`  
**Depende de:** EPIC 08–12 (Enterprise AI + Comercial IA)

## Missão

Assistente técnico de engenharia da Omnia Frigo Holding consumindo Runtime, Retrieval e Knowledge Hub existentes — **sem** nova API e **sem** CAD/BIM/SCADA/ERP.

## Arquitetura

```
Portal (Engenharia IA)
  → POST /api/ai/chat (assistantId=engineering)
    → EngineeringService (@omnia/neurofrigo-engineering)
      → EngineeringProfile + TechnicalContextBuilder
      → NeurofrigoRuntime.ask
      → Troubleshooting / Comparison / Recommendations
```

## Entregáveis

1. Collection `engineering-profiles`
2. Package `@omnia/neurofrigo-engineering`
3. Prompts de engenharia v2
4. Troubleshooting Mode (Markdown)
5. Comparador técnico (Markdown)
6. Recomendações grounded
7. Portal: troubleshooting + comparação + recomendações
8. Global `engineering-ai-dashboard`
9. Seed/homolog `engineering-ia` / `engineering-ia-epic13`

## API

Somente `POST /api/ai/chat` com `assistantId: "engineering"`.

## Fora de escopo

CAD · BIM · simulações · dimensionamento · CLP · SCADA · ERP · WhatsApp · agentes
