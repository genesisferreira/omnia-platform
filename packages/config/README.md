# @omnia/config

Configuração centralizada da Omnia Platform. **Toda config passa por aqui.**

## Estrutura

| Pasta | Responsabilidade | Variáveis |
|-------|------------------|-----------|
| [environment](src/environment/) | Ambiente (dev/staging/prod) | `NODE_ENV` |
| [application](src/application/) | URLs e versão da app | `NEXT_PUBLIC_*`, `APP_VERSION` |
| [database](src/database/) | PostgreSQL | `DATABASE_URL` |
| [redis](src/redis/) | Cache e sessões | `REDIS_URL` |
| [payload](src/payload/) | Payload CMS | `PAYLOAD_SECRET` |
| [deepseek](src/deepseek/) | DeepSeek API | `DEEPSEEK_API_KEY` |
| [openai](src/openai/) | OpenAI API | `OPENAI_API_KEY` |
| [storage](src/storage/) | MinIO | `MINIO_*` |
| [mail](src/mail/) | SMTP / Mailpit | `SMTP_*` |
| [logging](src/logging/) | Níveis e formatos de log | `LOG_LEVEL` |
| [security](src/security/) | JWT, secrets | `JWT_SECRET` |
| [n8n](src/n8n/) | Automações | `N8N_*` |
| [features](src/features/) | Feature flags estáticas | — |
| [constants](src/constants/) | Constantes de config | — |

## Princípio

> **Convention over Configuration** — valores padrão sensatos, override via `.env`.

## Regras

1. Apps **nunca** leem `process.env` diretamente — usam `@omnia/config`
2. Secrets nunca em código
3. Validação com Zod na Sprint 2+ (`@omnia/validation`)

## Status

**Sprint 1.2** — Estrutura preparada. Implementação na **Sprint 2+**.
