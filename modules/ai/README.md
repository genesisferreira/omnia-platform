# Módulo — AI (Inteligência Artificial)

Bounded context transversal do **motor de IA** — agents, RAG, prompts, memória.

## Escopo

- Providers (DeepSeek, OpenAI)
- Agentes especializados por módulo
- RAG (Retrieval-Augmented Generation)
- Prompt library versionada
- Memória de contexto
- Workflow engine para chains de IA

## Packages

`@omnia/ai-core` · `@omnia/integrations/deepseek` · `@omnia/integrations/openai`

## Arquitetura

```
integrations/     → Conectores raw (HTTP)
ai-core/
  providers/        → Abstração unificada de LLM
  agents/           → Agentes por domínio (crm-agent, chat-agent)
  prompt-library/   → Templates versionados
  memory/           → Contexto e histórico
  rag/              → Embeddings e retrieval
  tools/            → Function calling
  workflow-engine/  → Orquestração de chains
```

## Sprint

Sprint 8+
