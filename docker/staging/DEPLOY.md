# Deploy Homologação — Omnia Platform

> Ambiente: VPS com infraestrutura existente (Traefik, PostgreSQL, Redis, MinIO)  
> Compose: `docker/compose/staging.yml`  
> Checklist completo: [`docs/09-infrastructure/STAGING_CHECKLIST.md`](../../docs/09-infrastructure/STAGING_CHECKLIST.md)

## URLs

| Serviço         | Domínio                                   | Container                  |
| --------------- | ----------------------------------------- | -------------------------- |
| Portal          | https://dev.omniafrigo.com.br             | `omnia-platform-web-dev`   |
| Admin + Payload | https://admin.dev.omniafrigo.com.br       | `omnia-platform-admin-dev` |
| Payload CMS     | https://admin.dev.omniafrigo.com.br/admin | (mesmo container admin)    |

## Princípios

- **Reutilizar** Traefik, PostgreSQL, Redis, MinIO, n8n, Portainer já existentes
- **Não criar** novos containers de infraestrutura
- **Não expor** portas no host — tráfego somente via Traefik (`omnia_proxy`)
- **Não assumir** nomes de serviços internos — confirmar na rede `omnia_internal`
- **Migrations/seed** via container one-off (`admin-bootstrap`) — **sem Node no host**

## Fluxo oficial de deploy (VPS)

```bash
# 1. Atualizar código
git pull origin feature/sprint-02-platform-base

# 2. Configurar variáveis (se ainda não existir)
cp .env.staging.example .env.staging
nano .env.staging

# 3. Validar compose
docker compose -f docker/compose/staging.yml --env-file .env.staging config

# 4. Build das imagens (web, admin, bootstrap)
export DOCKER_BUILDKIT=1
docker compose -f docker/compose/staging.yml --env-file .env.staging build

# 5. Bootstrap do banco (migrations + seed) — OBRIGATÓRIO em banco vazio
docker compose -f docker/compose/staging.yml --env-file .env.staging \
  --profile bootstrap run --rm admin-bootstrap

# 6. Subir aplicações
docker compose -f docker/compose/staging.yml --env-file .env.staging up -d

# 7. Validar
curl -s https://dev.omniafrigo.com.br/api/health
curl -s https://admin.dev.omniafrigo.com.br/api/health
```

### Atalhos via pnpm (na VPS, se pnpm estiver disponível)

```bash
pnpm docker:staging:config
pnpm docker:staging:build
pnpm docker:staging:bootstrap    # migrate + seed
pnpm docker:staging:up
```

### Comandos granulares

```bash
# Apenas migrations Payload
docker compose -f docker/compose/staging.yml --env-file .env.staging \
  --profile bootstrap run --rm admin-migrate

# Apenas seed (idempotente — seguro reexecutar)
docker compose -f docker/compose/staging.yml --env-file .env.staging \
  --profile bootstrap run --rm admin-seed
```

## Bootstrap — como funciona

| Serviço           | Imagem                                       | Função                     |
| ----------------- | -------------------------------------------- | -------------------------- |
| `admin-bootstrap` | stage `bootstrap` do `apps/admin/Dockerfile` | `payload migrate` + `seed` |
| `admin-migrate`   | mesma imagem                                 | somente `payload migrate`  |
| `admin-seed`      | mesma imagem                                 | somente seed idempotente   |

- Usa **profile `bootstrap`** — não sobe com `docker compose up -d`
- Conecta apenas na rede **`omnia_internal`** (sem Traefik)
- **Não expõe portas**
- Imagem **runtime** (`admin`) continua minimalista (Next.js standalone)

## 1. Identificar serviços na VPS

```bash
docker network inspect omnia_internal --format '{{range .Containers}}{{.Name}} {{end}}'
```

Preencher em `.env.staging`:

- `POSTGRES_HOST=<NOME_DO_SERVICO_POSTGRES>` (ex.: `omnia-postgres`)
- `REDIS_HOST=<NOME_DO_SERVICO_REDIS>`
- `MINIO_HOST=<NOME_DO_SERVICO_MINIO>`

## 2. Preparar banco de dados

```sql
CREATE DATABASE omnia_staging;
-- Ajustar usuário/permissões conforme política do VPS
```

`DATABASE_URL` deve apontar para o host interno, ex.:

```
postgresql://omnia:SENHA@omnia-postgres:5432/omnia_staging
```

## 3. Primeiro usuário Payload

Após bootstrap, acesse https://admin.dev.omniafrigo.com.br/admin e crie o administrador.

O seed **não** cria usuários — apenas tenant, empresas e global settings.

## 4. Rollback

```bash
docker compose -f docker/compose/staging.yml --env-file .env.staging down
```

## Arquivos de referência

| Arquivo                             | Função                                          |
| ----------------------------------- | ----------------------------------------------- |
| `docker/compose/staging.yml`        | Compose homologação + serviços bootstrap        |
| `docker/scripts/admin-bootstrap.sh` | Script migrate/seed no container                |
| `apps/admin/Dockerfile`             | Targets: `bootstrap` (CLI) e `runner` (runtime) |
| `apps/admin/src/migrations/`        | Migrations Payload versionadas                  |
| `.env.staging.example`              | Template de variáveis                           |

## Validação local (antes do deploy)

```bash
pnpm lint
pnpm typecheck
pnpm build
docker compose -f docker/compose/staging.yml --env-file .env.staging.example config
```

> **docker compose config** e **bootstrap** devem ser executados no VPS (ou máquina com Docker).
