# Diretrizes de IA — Omnia Platform

## Arquitetura

```
@omnia/integrations/deepseek  →  HTTP/SDK raw
@omnia/integrations/openai    →  HTTP/SDK raw (fallback)
         ↓
@omnia/ai-core/providers      →  Interface unificada LLM
         ↓
@omnia/ai-core/
  agents/           → Agentes por domínio
  prompt-library/   → Prompts versionados
  memory/           → Contexto e histórico
  rag/              → Embeddings + retrieval
  tools/            → Function calling
  workflow-engine/  → Chains e orquestração
```

## Providers

| Provider | Uso | Prioridade |
|----------|-----|------------|
| DeepSeek | Primário — custo/performance | 1 |
| OpenAI | Fallback, modelos específicos | 2 |

Interface comum em `@omnia/ai-core/providers`:

```typescript
// Sprint 8+ — contrato planejado
interface LLMProvider {
  complete(params: CompletionParams): Promise<CompletionResult>;
  stream(params: CompletionParams): AsyncIterable<CompletionChunk>;
}
```

## Agents

- Um agente por domínio: `crm-agent`, `chat-agent`, `academy-agent`
- Agents compõem: provider + prompt + tools + memory
- Nunca expor API keys no client — sempre server-side

## Prompt Library

- Templates versionados em `@omnia/ai-core/prompt-library`
- Variáveis tipadas: `{{userName}}`, `{{tenantName}}`
- Versionamento semântico: `crm-greeting-v1`, `crm-greeting-v2`

## RAG

- Embeddings armazenados em PostgreSQL (pgvector) ou serviço dedicado
- Chunking configurável por tipo de conteúdo
- Retrieval com score threshold

## Memória

- Curto prazo: contexto da conversa (Redis)
- Longo prazo: fatos do usuário (PostgreSQL)
- TTL e limite de tokens configuráveis

## Tools (Function Calling)

- Tools registradas por módulo
- Validação de input com Zod
- Auditoria de execução em `@omnia/security/audit`

## Workflow Engine

- Orquestra chains: retrieve → prompt → complete → tool → respond
- Integração com n8n para workflows híbridos
- Retry e fallback entre providers

## Segurança

- Rate limit por user/tenant em chamadas LLM
- Sanitizar output antes de exibir
- Não enviar PII desnecessária aos providers
- Logs sem conteúdo de prompts sensíveis

## Custos

- Tracking de tokens por tenant/módulo
- Alertas de uso anômalo via `@omnia/monitoring`

## Referências

- [modules/ai/](modules/ai/)
- `@omnia/ai-core` · `@omnia/integrations`
