# @omnia/integrations

Conectores tipados para serviços externos da Omnia Platform.

## Estrutura

```
src/
├── deepseek/  # DeepSeek API — provider primário de IA
├── openai/    # OpenAI API — fallback
├── n8n/       # Webhooks, triggers e callbacks
├── redis/     # Cache, sessões, rate limit
├── minio/     # Client S3-compatible (baixo nível)
├── storage/   # Facade de object storage (MinIO/S3)
├── smtp/      # SMTP, Resend, SendGrid
├── oauth/     # OAuth 2.0 / OIDC (Google, GitHub, …)
├── whatsapp/  # WhatsApp Business API
├── payload/   # Payload CMS adapter (somente apps/admin)
└── index.ts
```

## Princípios

- **Adapter pattern** — cada conector isola a lib/SDK externa
- **Interface comum** — providers de IA implementam mesma interface
- **Config via env** — nunca hardcode de credentials
- **Retry + circuit breaker** — resiliência em integrações

## Relação com outros packages

| Package | Responsabilidade |
|---------|------------------|
| `@omnia/integrations` | Conectores raw (HTTP, SDK) |
| `@omnia/ai-core` | Orquestração (agents, RAG, prompts, memory) |
| `@omnia/auth` | Fluxos de autenticação (consome `oauth/`, `redis/`) |
| `@omnia/automation` | Workflows n8n versionados (consome `n8n/`) |

## Notas

- **`payload/`** — usado exclusivamente por `apps/admin` e workers server-side. `apps/web` nunca importa este conector (ADR-004).
- **`storage/`** — facade de alto nível; `minio/` é o adapter de baixo nível.
- Apps não importam `@omnia/integrations` diretamente — usar services/use cases.

## Status

**Sprint 0.5** — Estrutura preparada. Conectores na **Sprint 1+** (ver README de cada pasta).
