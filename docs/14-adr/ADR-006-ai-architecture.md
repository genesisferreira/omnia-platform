# ADR-006: Arquitetura de IA

## Status

**Aceito** — Sprint 1.1

## Data

2026-07-07

## Contexto

A Omnia Platform integrará IA em múltiplos módulos (chat, CRM, academy, automações) com providers DeepSeek (primário) e OpenAI (fallback), RAG, agents e workflows.

## Decisão

Arquitetura em **três camadas**:

```
@omnia/integrations     → Conectores HTTP/SDK (deepseek, openai)
@omnia/ai-core          → Orquestração (agents, RAG, router, memory)
apps / domains          → Casos de uso por módulo
```

### Estrutura `@omnia/ai-core`

| Módulo | Responsabilidade |
|--------|------------------|
| `providers/` | Interface unificada LLM |
| `router/` | Roteamento DeepSeek ↔ OpenAI |
| `agents/` | Agentes por domínio |
| `assistant/` | Assistente Omnia (UX) |
| `prompts/` | Prompt library versionada |
| `knowledge/` | Base de conhecimento |
| `rag/` | Retrieval pipeline |
| `embeddings/` | Geração de embeddings |
| `vector-store/` | Armazenamento vetorial |
| `memory/` | Memória curto/longo prazo |
| `sessions/` | Sessões de conversa |
| `context/` | Contexto dinâmico |
| `tools/` | Function calling |
| `workflow-engine/` | Chains e orquestração |
| `models/` | Configuração de modelos |

### Princípios

1. **Nunca expor API keys no client** — IA sempre server-side
2. **Router** escolhe provider por custo, latência e fallback
3. **RAG** usa pgvector ou serviço dedicado (Sprint 8+)
4. **Auditoria** de prompts e respostas via `@omnia/security/audit`

## Referências

- [AI_ARCHITECTURE.md](../../AI_ARCHITECTURE.md)
- [AI_GUIDELINES.md](../../AI_GUIDELINES.md)
