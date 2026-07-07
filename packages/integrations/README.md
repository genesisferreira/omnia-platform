# @omnia/integrations

Conectores tipados para serviços externos da Omnia Platform.

## Estrutura

```
src/
├── deepseek/  # DeepSeek API — provider primário de IA
├── openai/    # OpenAI API — fallback
├── n8n/       # Webhooks, triggers e callbacks
├── redis/     # Cache, sessões, rate limit
├── minio/     # Object storage (S3-compatible)
├── email/     # SMTP, Resend, SendGrid
├── whatsapp/  # WhatsApp Business API
├── payload/   # Payload CMS adapter
└── index.ts
```

## Princípios

- **Adapter pattern** — cada conector isola a lib/SDK externa
- **Interface comum** — providers de IA implementam mesma interface
- **Config via env** — nunca hardcode de credentials
- **Retry + circuit breaker** — resiliência em integrações

## Relação com `@omnia/ai-core`

| Package | Responsabilidade |
|---------|------------------|
| `@omnia/integrations` | Conectores raw (HTTP, SDK) |
| `@omnia/ai-core` | Orquestração (agents, RAG, prompts, memory) |

## Status

**Sprint 0.5** — Estrutura preparada. Conectores na **Sprint 1+**.
