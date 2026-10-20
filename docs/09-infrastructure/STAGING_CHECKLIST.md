# Checklist — Homologação (Staging)

> Ambiente VPS reutilizando infraestrutura existente.  
> Compose: `docker/compose/staging.yml`  
> Guia de deploy: [`docker/staging/DEPLOY.md`](../../docker/staging/DEPLOY.md)

---

## DNS

- [ ] `dev.omniafrigo.com.br` aponta para o IP do VPS
- [ ] `admin.dev.omniafrigo.com.br` aponta para o IP do VPS
- [ ] Propagação DNS confirmada (`dig` / `nslookup`)
- [ ] Não usar `admin-dev.omniafrigo.com.br` (domínio descontinuado)

---

## Traefik

- [ ] Traefik ativo na rede `omnia_proxy`
- [ ] Entrypoint `websecure` configurado (ou ajustar `TRAEFIK_ENTRYPOINT`)
- [ ] Cert resolver `letsencrypt` configurado (ou ajustar `TRAEFIK_CERT_RESOLVER`)
- [ ] Router `omnia-platform-web-dev` registrado
- [ ] Router `omnia-platform-admin-dev` registrado
- [ ] TLS válido em ambos os domínios
- [ ] Nenhuma porta 3000/3001 exposta diretamente no host
- [ ] Middlewares opcionais revisados (compress, security-headers) se existirem

---

## Compose

- [ ] Arquivo `docker/compose/staging.yml` presente
- [ ] **Não** existe `docker-compose.staging.yml` na raiz
- [ ] Redes externas `omnia_proxy` e `omnia_internal` existem
- [ ] `docker compose -f docker/compose/staging.yml --env-file .env.staging config` sem erros
- [ ] Containers nomeados: `omnia-platform-web-dev`, `omnia-platform-admin-dev`
- [ ] Sem serviços duplicados de Postgres, Redis, MinIO, Traefik

---

## Env

- [ ] `.env.staging` criado a partir de `.env.staging.example`
- [ ] Todos os placeholders `<...>` substituídos
- [ ] `NEXT_PUBLIC_APP_URL=https://dev.omniafrigo.com.br`
- [ ] `NEXT_PUBLIC_ADMIN_URL=https://admin.dev.omniafrigo.com.br`
- [ ] `PAYLOAD_SECRET` com mínimo 32 caracteres
- [ ] Nenhum segredo real commitado no repositório
- [ ] `DATABASE_URL` montada com host real do PostgreSQL

---

## Volumes

- [ ] Volume `omnia_platform_admin_media_dev` criado para uploads Payload
- [ ] Permissões de escrita no volume confirmadas
- [ ] Backup do volume planejado (se necessário)

---

## Banco (PostgreSQL)

- [ ] Host confirmado: `POSTGRES_HOST=<NOME_DO_SERVICO_POSTGRES>` (ex.: `omnia-postgres`)
- [ ] Database de homologação criada (`omnia_staging`)
- [ ] Usuário com permissões adequadas
- [ ] `DATABASE_URL` aponta para host interno na rede `omnia_internal`
- [ ] **Bootstrap executado** antes do primeiro acesso ao Payload Admin

### Bootstrap (migrations + seed)

- [ ] Imagem bootstrap construída (`docker compose ... build`)
- [ ] `admin-bootstrap` executado com sucesso:
  ```bash
  docker compose -f docker/compose/staging.yml --env-file .env.staging \
    --profile bootstrap run --rm admin-bootstrap
  ```
- [ ] Tabelas Payload criadas (`users`, `tenants`, `companies`, `media`, `global_settings`)
- [ ] Seed idempotente executado (6 empresas da Holding)
- [ ] Sem erro `relation "global_settings" does not exist`
- [ ] **Não** depende de Node/pnpm instalado no host Ubuntu

---

## Redis

- [ ] Host confirmado: `REDIS_HOST=<NOME_DO_SERVICO_REDIS>`
- [ ] `REDIS_URL` aponta para serviço real na rede interna
- [ ] Conectividade testada (quando aplicável)

---

## MinIO

- [ ] Host confirmado: `MINIO_HOST=<NOME_DO_SERVICO_MINIO>`
- [ ] Credenciais preenchidas
- [ ] Bucket de homologação existe ou será criado
- [ ] Integração S3 Payload documentada como sprint futura (upload local via volume por ora)

---

## Health

- [ ] Healthcheck HTTP do container `web` passando
- [ ] Healthcheck HTTP do container `admin` passando
- [ ] `GET https://dev.omniafrigo.com.br/api/health` retorna sucesso ou degraded esperado
- [ ] `GET https://admin.dev.omniafrigo.com.br/api/health` retorna sucesso ou degraded esperado

---

## Deploy

- [ ] Branch correta no VPS (`feature/sprint-02-platform-base` ou branch aprovada)
- [ ] `git pull` executado
- [ ] `.env.staging` validado
- [ ] `docker compose ... config` sem erros
- [ ] `docker compose ... build` executado
- [ ] **`admin-bootstrap` executado** (banco vazio ou após novas migrations)
- [ ] `docker compose ... up -d` executado
- [ ] Containers `healthy` em `docker compose ps`
- [ ] Portal acessível em https://dev.omniafrigo.com.br
- [ ] Admin acessível em https://admin.dev.omniafrigo.com.br
- [ ] Payload acessível em https://admin.dev.omniafrigo.com.br/admin
- [ ] Primeiro usuário Payload criado
- [ ] Seed de empresas executado (se aplicável)

---

## Rollback

- [ ] Procedimento documentado: `docker compose -f docker/compose/staging.yml --env-file .env.staging down`
- [ ] Tag/imagem anterior identificada para restauração
- [ ] Backup de banco antes de migrations destrutivas (quando aplicável)

---

## Logs

- [ ] `docker compose -f docker/compose/staging.yml logs web` sem erros críticos
- [ ] `docker compose -f docker/compose/staging.yml logs admin` sem erros de Postgres
- [ ] Logs Traefik revisados para erros de certificado ou roteamento
- [ ] Monitoramento básico configurado (Portainer ou equivalente)

---

## Validação final

- [ ] Companies cadastráveis no Payload CMS
- [ ] Media Library funcional (upload local)
- [ ] Portal consome API REST do admin (cards de empresas)
- [ ] CORS Payload alinhado com `NEXT_PUBLIC_APP_URL`
- [ ] Nenhuma alteração em produção
- [ ] Revisão humana concluída antes de commit

---

## Comandos de referência

```bash
# Validar compose
docker compose -f docker/compose/staging.yml --env-file .env.staging config

# Build
docker compose -f docker/compose/staging.yml --env-file .env.staging build

# Bootstrap (migrations + seed) — obrigatório em banco vazio
docker compose -f docker/compose/staging.yml --env-file .env.staging \
  --profile bootstrap run --rm admin-bootstrap

# Apenas migrations
docker compose -f docker/compose/staging.yml --env-file .env.staging \
  --profile bootstrap run --rm admin-migrate

# Apenas seed (idempotente)
docker compose -f docker/compose/staging.yml --env-file .env.staging \
  --profile bootstrap run --rm admin-seed

# Deploy
docker compose -f docker/compose/staging.yml --env-file .env.staging up -d

# Status
docker compose -f docker/compose/staging.yml --env-file .env.staging ps

# Logs
docker compose -f docker/compose/staging.yml --env-file .env.staging logs -f web admin

# Rollback
docker compose -f docker/compose/staging.yml --env-file .env.staging down
```
