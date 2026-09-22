# EPIC 11 — Enterprise AI Platform

**Branch:** `feature/neurofrigo-knowledge-hub`  
**Depende de:** EPIC 01–10 (especialmente EPIC 08)  
**Estratégia:** gap-close + hardening sobre a plataforma multiassistente da EPIC 08 — **sem** reimplementar Runtime/Retrieval.

## Relação com EPIC 08

A EPIC 08 entregou o núcleo (registries, Policy Engine, API unificada, portal seletor, dashboard).  
A EPIC 11 fecha o delta de governança e catálogo:

- campos Assistant (`slug`, `avatar`, `color`, `visibility`, `promptVersion`, `modelProfile`)
- Prompt Registry com `author`/`status` + helper de rollback
- Policy flags `requireGrounding` / `requireExplainability` / `maxTokensPerDay` + auditoria
- `AssistantRouter` explícito em `@omnia/enterprise-ai`
- Concierge IA + Evaluator IA no seed
- Dashboard: assistentes ativos, uso por provider, satisfação
- Homolog `enterprise-ai-epic11`

## Arquitetura

```
Portal (Conversar com)
  → BFF POST /api/ai/chat
    → Admin POST /omnia/ai/chat
      → AssistantRouter (policy + prompt + model)
        → NeurofrigoRuntime.ask (único, agnóstico)
          → Retrieval → Knowledge Hub
```

## Assistentes seed (7)

Tutor · Comercial · Engenharia · Suporte · Command · Concierge · Evaluator

## Fora de escopo

CRM IA · ERP IA · WhatsApp · agentes autônomos · tools externas · fine-tuning · MCP
