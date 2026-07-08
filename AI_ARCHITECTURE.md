# Arquitetura de IA — Omnia Platform

> Motor de IA transversal — DeepSeek, OpenAI, RAG, agents.

## Camadas

```
┌─────────────────────────────────────────┐
│  Apps / Domains (chat, crm, academy)   │
├─────────────────────────────────────────┤
│  @omnia/ai-core (orquestração)          │
│  agents · router · rag · memory · tools │
├─────────────────────────────────────────┤
│  @omnia/integrations (conectores)       │
│  deepseek · openai · n8n                │
└─────────────────────────────────────────┘
```

## Módulos `@omnia/ai-core`

| Módulo | Responsabilidade |
|--------|------------------|
| `providers/` | Interface LLM unificada |
| `router/` | DeepSeek primário, OpenAI fallback |
| `agents/` | Agentes por domínio |
| `assistant/` | Assistente Omnia (UX) |
| `prompts/` | Prompt library versionada |
| `knowledge/` | Base de conhecimento |
| `rag/` | Pipeline retrieval-augmented |
| `embeddings/` | Geração de vetores |
| `vector-store/` | pgvector / serviço dedicado |
| `memory/` | Memória curto/longo prazo |
| `sessions/` | Sessões de conversa |
| `context/` | Contexto dinâmico |
| `tools/` | Function calling |
| `workflow-engine/` | Chains de IA |
| `models/` | Configuração de modelos |

## Providers

| Provider | Uso | Prioridade |
|----------|-----|------------|
| DeepSeek | Chat, agents, RAG | 1 |
| OpenAI | Fallback, embeddings | 2 |

## Segurança

- API keys apenas server-side
- Auditoria de prompts/respostas
- Rate limit por tenant em `@omnia/security/rate-limit`

## ADR

[ADR-006](docs/14-adr/ADR-006-ai-architecture.md)
