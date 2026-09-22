# Docker — Production

Configurações Docker para o ambiente de **produção** da Omnia Platform.

## Status

Operacional para a Release 1.0 (Portal + Blog + Empresas Estratégicas).

## Componentes

| Item            | Valor                                                        |
| --------------- | ------------------------------------------------------------ |
| Compose         | [`docker/compose/production.yml`](../compose/production.yml) |
| Env example     | [`.env.production.example`](../../.env.production.example)   |
| Runbook         | [`DEPLOY.md`](./DEPLOY.md)                                   |
| Portal          | `https://omniafrigo.com.br`                                  |
| Admin           | `https://admin.omniafrigo.com.br`                            |
| Projeto Compose | `omnia-platform-prod`                                        |

## Isolamento

- PostgreSQL, Redis e volume de mídia exclusivos de produção.
- Rede interna `omnia_prod_internal` (sem gateway externo).
- Ingress compartilhado apenas via rede externa `omnia_proxy` (Traefik).
- Staging (`dev.*`) permanece intacto e independente.

## Considerações

- Multi-stage builds (Dockerfiles existentes de `apps/web` e `apps/admin`)
- Runtime non-root
- Health checks HTTP
- Resource limits e `no-new-privileges`
- Segredos somente em `.env.production` no servidor (fora do Git)
- SMTP não configurado nesta release (sem adapter no Payload)

## Comandos rápidos

```bash
pnpm docker:production:config
docker compose -f docker/compose/production.yml --env-file .env.production ps
docker compose -f docker/compose/production.yml --env-file .env.production logs -f admin web
```
