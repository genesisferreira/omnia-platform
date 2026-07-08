# Docker — Omnia Platform

Configurações de containerização da Omnia Platform.

## Desenvolvimento

```bash
cp .env.example .env
pnpm docker:dev      # Subir todos os serviços
pnpm docker:logs     # Acompanhar logs
pnpm docker:down     # Parar serviços
```

Arquivo: [`compose/development.yml`](compose/development.yml)

## Serviços

| Serviço | Porta | Descrição |
|---------|-------|-----------|
| PostgreSQL 16 | 5432 | Banco principal (Payload + Drizzle) |
| Redis 7 | 6379 | Cache e sessões |
| MinIO | 9000/9001 | Object storage |
| n8n | 5678 | Automações |

## Documentação

- [SPRINT-01-INFRASTRUCTURE](../docs/09-infrastructure/SPRINT-01-INFRASTRUCTURE.md)

## Status

**Sprint 1** — Docker Compose funcional para desenvolvimento.
