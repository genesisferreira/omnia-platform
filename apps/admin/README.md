# @omnia/admin

Painel administrativo e CMS da Omnia Platform.

## Stack

Next.js 15 | Payload CMS 3 | React 19 | TypeScript | Tailwind CSS

## Desenvolvimento

```bash
pnpm docker:dev                  # PostgreSQL necessário para Payload
pnpm --filter @omnia/admin dev   # http://localhost:3001
```

## URLs

| Rota          | Descrição                    |
| ------------- | ---------------------------- |
| `/`           | Página inicial (placeholder) |
| `/admin`      | Payload CMS admin panel      |
| `/api/health` | Healthcheck                  |

## Payload CMS

Configuração em `payload.config.ts`. Coleções futuras documentadas em `src/collections/README.md`.

## Status

**Sprint 1** — Next.js 15 + Payload CMS configurados. Coleções de negócio na Sprint 3+.
