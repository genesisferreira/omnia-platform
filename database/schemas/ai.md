# Schema — AI

> Dados de IA — embeddings, sessões, custos. Sprint 8+.

## Tabelas principais

### `ai_sessions`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | PK |
| `tenant_id` | UUID | FK |
| `user_id` | UUID | FK |
| `agent_id` | VARCHAR(50) | — |
| `provider` | ENUM | `deepseek`, `openai` |
| `tokens_input` | INTEGER | — |
| `tokens_output` | INTEGER | — |
| `cost_usd` | DECIMAL | — |

### `ai_embeddings`

Vetores para RAG (pgvector — Sprint 8+).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | PK |
| `tenant_id` | UUID | FK |
| `content_hash` | VARCHAR(64) | — |
| `embedding` | VECTOR(1536) | pgvector |
| `metadata` | JSONB | — |

## Packages

`@omnia/ai-core` — orquestração  
`@omnia/integrations/deepseek` — provider
