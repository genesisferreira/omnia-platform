# EPIC 08 — Enterprise AI Platform

**Branch:** `feature/neurofrigo-knowledge-hub`  
**Depende de:** EPIC 01–07

## Missão

Transformar o Tutor IA em um consumidor da plataforma multiassistente, com registries e políticas orientados por dados, reutilizando o mesmo Runtime / Retrieval / Knowledge Intelligence.

## Arquitetura

```
Portal (seleção de assistente)
  → BFF POST /api/ai/chat (+ GET /api/ai/assistants)
    → Admin POST /omnia/ai/chat
      → Assistant Registry + Policy Engine + Prompt/Model Registry
        → Neurofrigo Runtime.ask (único)
          → Retrieval Engine → Knowledge Intelligence → LMS
```

## Entregáveis

1. `@omnia/enterprise-ai` — compose prompts, Policy Engine, resolve runtime config
2. Collections: `ai-models`, `ai-assistants`, `ai-prompts`, `ai-policies`
3. Global: `enterprise-ai-dashboard`
4. Endpoints: `GET /omnia/enterprise/assistants`, `POST /omnia/enterprise/dashboard/refresh`
5. Chat unificado: `assistantId` em `POST /omnia/ai/chat`
6. Portal: seletor **Conversar com** (lista filtrada por política)
7. Migration `20260807_180000_enterprise_ai`
8. Bootstrap mode `enterprise-ai`

## Assistentes seed

Tutor IA · Comercial IA · Engenharia IA · Suporte IA · Command IA

## Não implementado

CRM IA · ERP IA · WhatsApp · Agentes autônomos · tools externas · automações · fine-tuning
