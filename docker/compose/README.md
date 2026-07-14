# Docker Compose

Arquivos Docker Compose por ambiente.

## Arquivos

| Arquivo           | Ambiente              | Descrição                            |
| ----------------- | --------------------- | ------------------------------------ |
| `development.yml` | Desenvolvimento local | Postgres, Redis, MinIO, n8n, Mailpit |
| `staging.yml`     | Homologação (VPS)     | Apenas web + admin via Traefik       |
| `production.yml`  | Produção              | Placeholder — sprint futura          |

## Desenvolvimento local

```bash
cp .env.example .env
docker compose -f docker/compose/development.yml --env-file .env up -d
docker compose -f docker/compose/development.yml --env-file .env down
```

## Homologação (VPS)

```bash
cp .env.staging.example .env.staging
# Preencher placeholders com nomes reais dos serviços na VPS

docker compose -f docker/compose/staging.yml --env-file .env.staging config
docker compose -f docker/compose/staging.yml --env-file .env.staging up -d --build
```

Ou via pnpm:

```bash
pnpm docker:staging:config
pnpm docker:staging:up
pnpm docker:staging:down
```

Documentação:

- [Deploy staging](../staging/DEPLOY.md)
- [Checklist homologação](../../docs/09-infrastructure/STAGING_CHECKLIST.md)

## Produção

Não utilizar nesta fase. Arquivo reservado para sprint futura.
