# Docker Compose

Arquivos Docker Compose por ambiente.

## Status

Será populado na Sprint 1.

## Arquivos Planejados

| Arquivo | Ambiente |
|---------|----------|
| `development.yml` | Desenvolvimento local |
| `staging.yml` | Homologação |
| `production.yml` | Produção |

## Uso

```bash
docker compose -f docker/compose/development.yml up -d
docker compose -f docker/compose/development.yml down
```
