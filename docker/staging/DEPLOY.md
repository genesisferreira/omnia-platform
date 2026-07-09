# Deploy Homologação — Omnia Platform

> Ambiente: VPS com infraestrutura existente (Traefik, PostgreSQL, Redis, MinIO)  
> Compose: `docker/compose/staging.yml`  
> Checklist completo: [`docs/09-infrastructure/STAGING_CHECKLIST.md`](../../docs/09-infrastructure/STAGING_CHECKLIST.md)

## URLs

| Serviço | Domínio | Container |
|---------|---------|-----------|
| Portal | https://dev.omniafrigo.com.br | `omnia-platform-web-dev` |
| Admin + Payload | https://admin.dev.omniafrigo.com.br | `omnia-platform-admin-dev` |
| Payload CMS | https://admin.dev.omniafrigo.com.br/admin | (mesmo container admin) |

## Princípios

- **Reutilizar** Traefik, PostgreSQL, Redis, MinIO, n8n, Portainer já existentes
- **Não criar** novos containers de infraestrutura
- **Não expor** portas no host — tráfego somente via Traefik (`omnia_proxy`)
- **Não assumir** nomes de serviços internos — confirmar na rede `omnia_internal`

## 1. Identificar serviços na VPS

```bash
docker network inspect omnia_internal --format '{{range .Containers}}{{.Name}} {{end}}'
```

Preencher em `.env.staging`:

- `POSTGRES_HOST=<NOME_DO_SERVICO_POSTGRES>`
- `REDIS_HOST=<NOME_DO_SERVICO_REDIS>`
- `MINIO_HOST=<NOME_DO_SERVICO_MINIO>`

## 2. Preparar banco de dados

```sql
CREATE DATABASE <POSTGRES_DATABASE>;
-- Ajustar usuário/permissões conforme política do VPS
```

## 3. Configurar variáveis

```bash
cp .env.staging.example .env.staging
nano .env.staging
```

Substituir **todos** os placeholders `<...>` por valores reais.

## 4. Validar compose (sem subir)

```bash
docker compose -f docker/compose/staging.yml --env-file .env.staging config
```

## 5. Build e deploy

```bash
export DOCKER_BUILDKIT=1
docker compose -f docker/compose/staging.yml --env-file .env.staging up -d --build
```

## 6. Verificação pós-deploy

```bash
docker compose -f docker/compose/staging.yml --env-file .env.staging ps
docker compose -f docker/compose/staging.yml --env-file .env.staging logs -f web admin

curl -s https://dev.omniafrigo.com.br/api/health
curl -s https://admin.dev.omniafrigo.com.br/api/health
```

## 7. Rollback

```bash
docker compose -f docker/compose/staging.yml --env-file .env.staging down
```

## Arquivos de referência

| Arquivo | Função |
|---------|--------|
| `docker/compose/staging.yml` | Compose homologação |
| `docker/compose/development.yml` | Compose desenvolvimento local |
| `docker/compose/production.yml` | Placeholder produção |
| `.env.staging.example` | Template de variáveis |
| `apps/web/Dockerfile` | Build portal |
| `apps/admin/Dockerfile` | Build admin + Payload |
| `.dockerignore` | Contexto de build |

## Validação local (antes do deploy)

```bash
pnpm lint
pnpm typecheck
pnpm build
docker compose -f docker/compose/staging.yml --env-file .env.staging.example config
```

> **Windows:** `pnpm build` local não usa `standalone` (evita EPERM de symlinks).  
> O build Docker define `DOCKER_BUILD=true` e gera standalone no Linux.

> **docker compose config** deve ser executado no VPS se Docker não estiver disponível localmente.
