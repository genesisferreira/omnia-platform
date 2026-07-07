# @omnia/ai-core

Motor de inteligência artificial da Omnia Platform.

## Estrutura

```
ai-core/
└── src/
    ├── providers/        # Abstração unificada de LLM (via @omnia/integrations)
    ├── agents/           # Agentes especializados por domínio
    ├── prompt-library/   # Templates de prompts versionados
    ├── memory/           # Gestão de memória e contexto
    ├── rag/              # Retrieval-Augmented Generation
    ├── tools/            # Function calling para agents
    ├── workflow-engine/  # Orquestração de chains de IA
    └── index.ts
```

## Relação com `@omnia/integrations`

| Camada | Package |
|--------|---------|
| Conectores HTTP/SDK | `@omnia/integrations/deepseek`, `openai` |
| Orquestração de IA | `@omnia/ai-core` |

## Status

**Sprint 0.5** — Estrutura expandida. Implementação na **Sprint 8+**.
