# Config — Production

Configuração do ambiente de produção da Omnia Platform.

## Arquivos

| Arquivo                                                                | Uso                                      |
| ---------------------------------------------------------------------- | ---------------------------------------- |
| [`.env.production.example`](../../.env.production.example)             | Contrato versionado (sem segredos)       |
| `/opt/omnia/platform/.env.production`                                  | Segredos reais no servidor (`chmod 600`) |
| [`docker/compose/production.yml`](../../docker/compose/production.yml) | Stack isolada                            |
| [`docker/production/DEPLOY.md`](../../docker/production/DEPLOY.md)     | Runbook                                  |

## Variáveis obrigatórias

- `NEXT_PUBLIC_APP_URL=https://omniafrigo.com.br`
- `NEXT_PUBLIC_ADMIN_URL=https://admin.omniafrigo.com.br`
- `DATABASE_URL` (PostgreSQL isolado, host Compose `postgres`)
- `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB`
- `REDIS_URL=redis://redis:6379`
- `PAYLOAD_SECRET` (≥ 32 chars, distinto de staging)
- `OMNIA_INTERNAL_API_SECRET` (≥ 32 chars, distinto de staging e de `PAYLOAD_SECRET`)
- `APP_VERSION`
- `TRAEFIK_ENTRYPOINT` / `TRAEFIK_CERT_RESOLVER`

## Ownership

- Segredos: somente no servidor, fora do Git.
- Domínios públicos: apex + www (redirect) + `admin.omniafrigo.com.br`.
- SMTP: não configurado na Release 1.0.
