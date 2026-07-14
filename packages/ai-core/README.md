# @omnia/ai-core

Motor de inteligência artificial da Omnia Platform.

## Estrutura (Sprint 1.1)

```
src/
├── providers/        # Interface unificada LLM
├── router/           # Roteamento DeepSeek ↔ OpenAI
├── agents/           # Agentes especializados por domínio
├── assistant/        # Assistente Omnia (UX conversacional)
├── prompts/          # Prompt library versionada
├── knowledge/        # Base de conhecimento
├── rag/              # Retrieval-Augmented Generation
├── embeddings/       # Geração de embeddings
├── vector-store/     # Armazenamento vetorial (pgvector)
├── memory/           # Memória curto/longo prazo
├── sessions/         # Sessões de conversa
├── context/          # Contexto dinâmico por request
├── tools/            # Function calling
├── workflow-engine/  # Orquestração de chains
└── models/           # Configuração de modelos
```

## Camadas

| Camada          | Package                                  |
| --------------- | ---------------------------------------- |
| Conectores HTTP | `@omnia/integrations/deepseek`, `openai` |
| Orquestração    | `@omnia/ai-core` (este package)          |

## Documentação

- [AI_ARCHITECTURE.md](../../AI_ARCHITECTURE.md)
- [ADR-006](../../docs/14-adr/ADR-006-ai-architecture.md)

## Status

**Sprint 1.1** — Arquitetura definitiva. Implementação na **Sprint 8+**.
