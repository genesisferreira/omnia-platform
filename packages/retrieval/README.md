# @omnia/retrieval

Camada de recuperação semântica da Omnia Platform (EPIC 04).

## Contratos públicos

| Port | Responsabilidade |
|------|------------------|
| `EmbeddingProviderPort` | `generate`, `generateBatch`, `health`, `metadata` |
| `VectorStorePort` | `insert`, `update`, `delete`, `search`, `deleteDocument`, `deleteResource`, `health` |
| `AclFilterPort` | Filtrar hits antes da resposta final |
| `RankerPort` | Reordenar hits (similaridade + contexto) |
| `CitationBuilderPort` | Montar citações obrigatórias |
| `SqlExecutor` | Abstração SQL (sem acoplar ao driver) |

## Fluxo

```
Query → Embed → VectorSearch → ACL → Rank → Citations → SearchSession JSON
```

Sem LLM, Chat ou Runtime nesta entrega.

## Adapters inclusos

- `DeterministicEmbeddingProvider` — default configurável (dev/homologação)
- `OpenAiCompatibleEmbeddingProvider` — HTTP OpenAI-compatible (opcional)
- `InMemoryVectorStore` — testes
- `PgVectorStore` — PostgreSQL + pgvector (substituível)

## Uso

Injete ports; o `Retriever` não importa Payload nem pgvector.
