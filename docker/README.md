# Docker — Omnia Platform

> Estrutura de containerização da Omnia Platform.

## Finalidade

Esta pasta contém todas as configurações Docker para os ambientes da plataforma.

## Estrutura

```
docker/
├── development/    # Configurações para desenvolvimento local
├── production/     # Configurações para produção
├── compose/        # Arquivos Docker Compose
└── scripts/        # Scripts auxiliares Docker
```

## Status

**Sprint 0** — Estrutura preparada. Containers serão criados na **Sprint 1**.

## Serviços Planejados (Sprint 1+)

| Serviço | Imagem | Porta |
|---------|--------|-------|
| PostgreSQL | postgres:16-alpine | 5432 |
| Redis | redis:7-alpine | 6379 |
| MinIO | minio/minio | 9000, 9001 |
| n8n | n8nio/n8n | 5678 |

## Uso (Sprint 1+)

```bash
# Desenvolvimento
docker compose -f docker/compose/development.yml up -d

# Produção
docker compose -f docker/compose/production.yml up -d
```
