# EPIC 09 — DeepSeek Live + Neurofrigo Agent Library

**Branch:** `feature/neurofrigo-knowledge-hub`  
**Depende de:** EPIC 01–08

## Missão

Conectar DeepSeek real (desacoplado via `LLMProviderPort`) e preparar a biblioteca oficial de 8 especialistas + Orquestrador Portal, sem autonomia de tools.

## Arquitetura provider

```
Portal (Automático)
  → BFF /api/ai/chat
    → planPortalTurn (Purpose → Intent → Security → Router → Integrity)
      → resolveAssistant + Model Registry
        → createLLMProviderWithMeta (DeepSeek | fallback auditado)
          → NeurofrigoRuntime.ask → Retrieval ACL-first
```

## Especialistas oficiais

hvac · neurofrigo-tech · electrical · assessor · tutor · radar · lab · content

Legado mantido: commercial · support · engineering · command (só super_admin)

## Bootstrap

`admin-bootstrap.sh deepseek-agents`

## Não implementado

Tool Framework · CRM IA · ERP · WhatsApp · agentes autônomos · web research real
