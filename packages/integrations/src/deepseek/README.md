# deepseek

Conector HTTP/SDK para a **DeepSeek API** — provider primário de LLM da Omnia Platform.

## Package

`@omnia/integrations/deepseek`

Consumido por `@omnia/ai-core` (router, agents, RAG). Apps nunca importam este conector diretamente.

## Variáveis de ambiente

| Variável           | Descrição             |
| ------------------ | --------------------- |
| `DEEPSEEK_API_KEY` | Chave de API DeepSeek |

## Sprint

**Sprint 8+** — Implementação junto com `@omnia/ai-core` (chat, CRM assistido, academy).

## Princípios

- Chamadas sempre **server-side** — nunca expor API key no client
- Retry com backoff e circuit breaker em falhas transitórias
- Interface compatível com o contrato unificado de providers em `ai-core`
