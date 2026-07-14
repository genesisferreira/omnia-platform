# Serviços Docker — Desenvolvimento

> Documentação dos serviços em `docker/compose/development.yml`.

## Visão geral

| Serviço                   | Imagem             | Porta(s)   | Propósito             |
| ------------------------- | ------------------ | ---------- | --------------------- |
| [PostgreSQL](#postgresql) | postgres:16-alpine | 5432       | Banco principal       |
| [pgAdmin](#pgadmin)       | dpage/pgadmin4     | 5050       | GUI do PostgreSQL     |
| [Redis](#redis)           | redis:7-alpine     | 6379       | Cache e sessões       |
| [MinIO](#minio)           | minio/minio        | 9000, 9001 | Object storage        |
| [Mailpit](#mailpit)       | axllent/mailpit    | 1025, 8025 | Email dev (SMTP)      |
| [n8n](#n8n)               | n8nio/n8n          | 5678       | Automações            |
| [Payload](#payload-cms)   | — (app)            | 3001/admin | CMS (não é container) |

## PostgreSQL

- **Uso:** Drizzle ORM + Payload CMS + n8n
- **Volume:** `omnia_postgres_data`
- **Healthcheck:** `pg_isready`
- **Conexão:** `DATABASE_URL` no `.env`

## pgAdmin

- **URL:** http://localhost:5050
- **Login:** `PGADMIN_DEFAULT_EMAIL` / `PGADMIN_DEFAULT_PASSWORD`
- **Uso:** Administração visual do PostgreSQL
- **Depende de:** postgres (healthy)

## Redis

- **Uso:** Cache, sessões, rate limit, feature flags
- **Volume:** `omnia_redis_data`
- **Conexão:** `REDIS_URL=redis://localhost:6379`

## MinIO

- **API:** http://localhost:9000
- **Console:** http://localhost:9001
- **Uso:** Uploads, mídia CMS, avatars, documentos
- **Volume:** `omnia_minio_data`
- Ver [STORAGE_ARCHITECTURE.md](../../STORAGE_ARCHITECTURE.md)

## Mailpit

- **SMTP:** localhost:1025
- **Web UI:** http://localhost:8025
- **Uso:** Captura emails em desenvolvimento (sem envio real)
- **Volume:** `omnia_mailpit_data`

## n8n

- **URL:** http://localhost:5678
- **Uso:** Workflows de automação
- **Banco:** PostgreSQL (mesmo container, schema separado)
- **Depende de:** postgres, redis
- **Volume:** `omnia_n8n_data`

## Payload CMS

- **Não roda em container** — integrado em `apps/admin`
- **URL:** http://localhost:3001/admin
- **Banco:** PostgreSQL via `@payloadcms/db-postgres`
- **Storage:** MinIO para mídia (Sprint 3+)
- **Regra:** Nunca no `apps/web` — [ADR-004](../../docs/14-adr/ADR-004-portal-cms-separation.md)

## Rede

Todos os serviços na rede `omnia-network` (bridge).

## Comandos

```bash
pnpm docker:dev
pnpm docker:logs
pnpm docker:down
```
