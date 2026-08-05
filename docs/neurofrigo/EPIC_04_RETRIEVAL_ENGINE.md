# EPIC 04 — Retrieval Engine

Status: implementado (aguardando GO humano). Não inicia EPIC 05.

## Objetivo

Transformar Knowledge Chunks em conhecimento recuperável semanticamente, sem Chat/Runtime/LLM de resposta.

```
Learning Resource → Chunks → Embeddings → Vector Index
→ Semantic Search → Ranking → ACL → Citation Builder → JSON + SearchSession
```

## Arquitetura (Ports & Adapters)

Package: `@omnia/retrieval`

| Componente | Contrato | Adapter inicial |
|------------|----------|-----------------|
| Embeddings | `EmbeddingProviderPort` | `DeterministicEmbeddingProvider` (default) / OpenAI-compatible (opcional) |
| Vector Store | `VectorStorePort` | `PgVectorStore` (`pgvector` ou `float_array`) / `InMemoryVectorStore` |
| ACL | `AclFilterPort` | `DefaultAclFilter` |
| Ranking | `RankerPort` | `WeightedRanker` |
| Citations | `CitationBuilderPort` | `CitationBuilder` |
| Orquestração | `Retriever` | Admin service `runSemanticSearch` |

Nenhum serviço de domínio importa Payload, pgvector ou SDK de provider.

## Admin (orquestração)

- Collections: `embedding-records`, `search-sessions`
- Global: `retrieval-dashboard`
- Worker: `processEmbeddingQueue`
- Reindex: `full` | `partial` | `document`
- Endpoints:
  - `POST /api/retrieval/search`
  - `POST /api/retrieval/worker/run`
  - `POST /api/retrieval/reindex`
  - `POST /api/retrieval/dashboard/refresh`

Auth: staff KI ou header `x-omnia-internal-secret`.

## Config

| Env | Default | Descrição |
|-----|---------|-----------|
| `RETRIEVAL_EMBEDDING_PROVIDER` | `deterministic` | `deterministic` \| `openai` \| `openai-compatible` |
| `RETRIEVAL_EMBEDDING_MODEL` | provider default | Modelo |
| `RETRIEVAL_EMBEDDING_DIMENSIONS` | `384` | Dimensões |
| `RETRIEVAL_EMBEDDING_API_KEY` | — | Se provider HTTP |
| `RETRIEVAL_EMBEDDING_BASE_URL` | OpenAI | Base URL |
| `RETRIEVAL_VECTOR_MODE` | `auto` | `auto` \| `pgvector` \| `float_array` |
| `RETRIEVAL_EMBEDDING_MAX_ATTEMPTS` | `3` | Retry da fila |

## Homologação

```bash
pnpm --filter @omnia/retrieval test
pnpm --filter @omnia/retrieval bench
pnpm --filter @omnia/admin migrate
pnpm --filter @omnia/admin seed:retrieval
pnpm --filter @omnia/admin test:retrieval
```

Bootstrap: `admin-bootstrap.sh retrieval`

## Fora de escopo

Chat, Runtime, Prompt Builder, Agentes, Tutor, Streaming, memória conversacional, resposta em linguagem natural.
