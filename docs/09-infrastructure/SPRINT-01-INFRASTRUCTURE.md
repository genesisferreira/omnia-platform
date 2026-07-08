# Sprint 1 — Infraestrutura

> Documentação da infraestrutura executável da Sprint 1.

## Docker Compose

Arquivo: `docker/compose/development.yml`

### Serviços

| Serviço | Imagem | Porta | Volume |
|---------|--------|-------|--------|
| PostgreSQL 16 | `postgres:16-alpine` | 5432 | `omnia_postgres_data` |
| Redis 7 | `redis:7-alpine` | 6379 | `omnia_redis_data` |
| MinIO | `minio/minio:latest` | 9000, 9001 | `omnia_minio_data` |
| n8n | `n8nio/n8n:latest` | 5678 | `omnia_n8n_data` |

### Rede

- Nome: `omnia-network` (bridge)

### Comandos

```bash
cp .env.example .env
pnpm docker:dev      # Subir serviços
pnpm docker:logs     # Ver logs
pnpm docker:down     # Parar serviços
```

## Acessos locais

| Serviço | URL | Credenciais |
|---------|-----|-------------|
| PostgreSQL | `localhost:5432` | Ver `.env` |
| Redis | `localhost:6379` | — |
| MinIO API | http://localhost:9000 | `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` |
| MinIO Console | http://localhost:9001 | Mesmas credenciais |
| n8n | http://localhost:5678 | Criar conta no primeiro acesso |

## Healthchecks

Todos os serviços Docker possuem healthcheck configurado.

Apps expõem `/api/health`:
- Web: http://localhost:3000/api/health
- Admin: http://localhost:3001/api/health

## Variáveis de ambiente

Ver `.env.example` para lista completa.

## Próximos passos (Sprint 2+)

- Docker Compose para staging/produção
- Backup automatizado (`scripts/backup/`)
- Observabilidade (`@omnia/monitoring`)
