# payload

Adapter para **Payload CMS** — configuração, plugins e helpers server-side do CMS.

## Package

`@omnia/integrations/payload`

> **Importante:** este conector é usado **apenas** por `apps/admin` e workers server-side. **`apps/web` nunca importa** `@omnia/integrations/payload`, `payload` ou `@payloadcms/*` (ADR-004). O portal consome conteúdo CMS via API REST.

## Variáveis de ambiente

| Variável         | Descrição                              |
| ---------------- | -------------------------------------- |
| `PAYLOAD_SECRET` | Secret do Payload (mín. 32 caracteres) |
| `DATABASE_URL`   | PostgreSQL compartilhado com Drizzle   |
| `MINIO_*`        | Storage de mídia via adapter S3/MinIO  |

## Sprint

**Sprint 1** (setup CMS) · **Sprint 3** (portal + coleções de conteúdo).

## Princípios

- Payload mantém ORM próprio — dados CMS ≠ dados de aplicação (Drizzle)
- Mídia no bucket `media/` via `@omnia/integrations/storage`
- Auth admin integrada com `@omnia/auth`
