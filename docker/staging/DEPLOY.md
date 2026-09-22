# Deploy Staging — Omnia Platform

> Runbook operacional canônico para `dev.omniafrigo.com.br`.
> Compose: `docker/compose/staging.yml`.
> Escopo desta versão: MISSÃO 01 — Portal Institucional Navegável.

## 1. Serviços e URLs

| Serviço         | URL                                         | Container                  |
| --------------- | ------------------------------------------- | -------------------------- |
| Portal Web      | <https://dev.omniafrigo.com.br>             | `omnia-platform-web-dev`   |
| Admin + Payload | <https://admin.dev.omniafrigo.com.br>       | `omnia-platform-admin-dev` |
| Payload CMS     | <https://admin.dev.omniafrigo.com.br/admin> | mesmo container Admin      |

O staging reutiliza Traefik, PostgreSQL, Redis e MinIO existentes. Não expõe
portas no host e não cria containers de infraestrutura.

## 2. Pré-requisitos

- Acesso SSH à VPS e ao diretório `/opt/omnia/platform`.
- Docker Engine e Docker Compose v2 operacionais.
- Redes externas `omnia_proxy` e `omnia_internal` existentes.
- `.env.staging` existente, sem placeholders e com segredos válidos.
- `NEXT_PUBLIC_APP_URL=https://dev.omniafrigo.com.br`.
- `NEXT_PUBLIC_ADMIN_URL=https://admin.dev.omniafrigo.com.br`.
- `DATABASE_URL` apontando para o PostgreSQL de staging na rede interna.
- `OMNIA_INTERNAL_API_SECRET` preenchido e igual no Admin e no Web.
- Backup/snapshot recente do banco antes de executar migrations.
- Branch aprovada: `feature/sprint-04-cms-content-foundation`.
- Working tree da VPS limpa.
- Commit aprovado em CI para build, typecheck e lint.

Para identificar os serviços internos:

```bash
docker network inspect omnia_internal --format '{{range .Containers}}{{.Name}} {{end}}'
```

## 3. Operações disponíveis

| Serviço Compose                          | Operação                                                      |
| ---------------------------------------- | ------------------------------------------------------------- |
| `admin-migrate`                          | Aplica migrations Payload pendentes                           |
| `admin-upgrade-holding-home`             | Atualiza somente a Home institucional; é idempotente          |
| `admin-seed-holding-institutional-pages` | Cria Sobre, Empresas e Contato ausentes; não sobrescreve      |
| `admin-seed-holding-blog`                | Cria autor, categorias, tags e posts do Blog; não sobrescreve |
| `admin-bootstrap`                        | Migrations + seed geral; usar apenas em banco novo            |
| `admin`                                  | Runtime do Admin/Payload                                      |
| `web`                                    | Runtime do Portal                                             |

As operações de conteúdo usam o target `bootstrap` do Dockerfile do Admin, não
dependem de Node/pnpm instalado na VPS e são executadas com `--rm`.

## 4. Checklist operacional

### Antes do deploy

- [ ] Branch `feature/sprint-04-cms-content-foundation` confirmada.
- [ ] Working tree da VPS limpa.
- [ ] HEAD anterior registrado para rollback.
- [ ] HEAD aprovado registrado.
- [ ] CI/build do Web aprovado.
- [ ] CI/build do Admin aprovado.
- [ ] Typecheck aprovado.
- [ ] Lint aprovado (warnings históricos de migrations documentados).
- [ ] `.env.staging` e Compose validados.
- [ ] Backup/snapshot do banco confirmado.

### Durante o deploy

- [ ] Imagens do Admin, Web e operações one-off construídas.
- [ ] Migrations aplicadas.
- [ ] Admin publicado e saudável.
- [ ] Seed/sincronização do catálogo de empresas (papéis e sites externos).
- [ ] Upgrade institucional da Home concluído.
- [ ] Seed das páginas institucionais concluído.
- [ ] Seed do Blog (autor, categorias, tags e posts) concluído.
- [ ] Web publicado e saudável.

### Após o deploy

- [ ] Home retorna HTTP 200.
- [ ] `/sobre` retorna HTTP 200.
- [ ] `/empresas` retorna HTTP 200.
- [ ] `/contato` retorna HTTP 200.
- [ ] Header contém Sobre, Ecossistema, Empresas e Contato.
- [ ] Menu mobile abre, fecha com Escape e navega entre páginas.
- [ ] Footer contém os links e informações institucionais.
- [ ] Title e description estão presentes nas páginas institucionais.
- [ ] Admin e Web estão `healthy`.
- [ ] Logs do Admin e Web não apresentam erro crítico novo.
- [ ] HEAD implantado registrado no relatório operacional.

## 5. Sequência definitiva de deploy

Executar na VPS, interrompendo o processo no primeiro erro:

```bash
set -euo pipefail

cd /opt/omnia/platform

export DEPLOY_BRANCH=feature/sprint-04-cms-content-foundation
export PREVIOUS_HEAD="$(git rev-parse HEAD)"

test -z "$(git status --porcelain)" || {
  echo "ERRO: working tree da VPS não está limpa"
  exit 1
}

git fetch --prune origin
git checkout "$DEPLOY_BRANCH"
git pull --ff-only origin "$DEPLOY_BRANCH"

export DEPLOY_HEAD="$(git rev-parse HEAD)"
printf 'export PREVIOUS_HEAD=%q\nexport DEPLOY_HEAD=%q\nexport DEPLOY_BRANCH=%q\n' \
  "$PREVIOUS_HEAD" "$DEPLOY_HEAD" "$DEPLOY_BRANCH" \
  | tee /var/tmp/omnia-platform-last-deploy.env
git status -sb

test -f .env.staging
! grep -Eq '<[^>]+>' .env.staging

docker compose -f docker/compose/staging.yml --env-file .env.staging config --quiet

export DOCKER_BUILDKIT=1
docker compose -f docker/compose/staging.yml --env-file .env.staging \
  --profile bootstrap build \
  admin web admin-migrate admin-upgrade-holding-home \
  admin-seed-holding-institutional-pages \
  admin-seed-holding-blog

docker compose -f docker/compose/staging.yml --env-file .env.staging \
  --profile bootstrap run --rm admin-migrate

wait_healthy() {
  container="$1"
  attempt=0
  while [ "$attempt" -lt 36 ]; do
    status="$(docker inspect --format '{{.State.Health.Status}}' "$container" 2>/dev/null || true)"
    [ "$status" = "healthy" ] && return 0
    [ "$status" = "unhealthy" ] && return 1
    attempt=$((attempt + 1))
    sleep 5
  done
  echo "ERRO: timeout aguardando health de $container"
  return 1
}

docker compose -f docker/compose/staging.yml --env-file .env.staging \
  up -d --no-build admin

wait_healthy omnia-platform-admin-dev

docker compose -f docker/compose/staging.yml --env-file .env.staging \
  --profile bootstrap run --rm admin-upgrade-holding-home

docker compose -f docker/compose/staging.yml --env-file .env.staging \
  --profile bootstrap run --rm admin-seed

docker compose -f docker/compose/staging.yml --env-file .env.staging \
  --profile bootstrap run --rm admin-seed-holding-institutional-pages

docker compose -f docker/compose/staging.yml --env-file .env.staging \
  --profile bootstrap run --rm admin-seed-holding-blog

docker compose -f docker/compose/staging.yml --env-file .env.staging \
  up -d --no-build web

wait_healthy omnia-platform-web-dev

docker compose -f docker/compose/staging.yml --env-file .env.staging ps
```

Resultados esperados das operações:

- Migration: comando finaliza com exit code `0`.
- Home: `holding-home-upgrade: created`, `holding-home-upgrade: upgraded` ou
  `holding-home-upgrade: skipped: already_current`.
- Páginas: cada slug termina em `created` ou `skipped:slug_exists`.
- Containers `omnia-platform-admin-dev` e `omnia-platform-web-dev`: `healthy`.

## 6. Smoke tests

```bash
set -euo pipefail

for path in / /sobre /empresas /contato; do
  code="$(curl -sS -o /dev/null -w '%{http_code}' "https://dev.omniafrigo.com.br${path}")"
  printf '%-10s %s\n' "$path" "$code"
  test "$code" = "200"
done

curl -fsS https://admin.dev.omniafrigo.com.br/api/health
curl -fsS https://dev.omniafrigo.com.br/api/health

curl -fsS \
  'https://admin.dev.omniafrigo.com.br/api/omnia/public-page?site=omnia-hub&slug=sobre' \
  | grep -q '"ok":true'

curl -fsS https://dev.omniafrigo.com.br/sobre | grep -q '<title>Sobre | Omnia Frigo Holding</title>'
curl -fsS https://dev.omniafrigo.com.br/sobre | grep -q 'name="description"'
curl -fsS https://dev.omniafrigo.com.br/sobre | grep -q 'href="/contato"'

docker compose -f docker/compose/staging.yml --env-file .env.staging \
  logs --since=15m admin web
```

A abertura, fechamento e navegação do menu mobile devem ser validados
manualmente em viewport menor que 768 px.

## 7. Reexecução segura

- `admin-migrate` ignora migrations já aplicadas.
- `admin-upgrade-holding-home` não altera uma Home já atualizada e aborta quando
  encontra conteúdo que exige revisão manual.
- `admin-seed-holding-institutional-pages` ignora slugs existentes. Se uma
  execução falhar após criar parte das páginas, a reexecução continua pelas
  páginas ausentes.
- `admin-seed-holding-blog` ignora slugs existentes de autor, categorias, tags
  e posts. Reexecução segura após falha parcial.

Não executar seed geral, `migrate:down`, reset ou force para este deploy.

## 8. Rollback manual

Não existe rollback transacional automático para a MISSÃO 01.

### Aplicação

Use o `PREVIOUS_HEAD` registrado antes do deploy:

```bash
set -euo pipefail

cd /opt/omnia/platform
source /var/tmp/omnia-platform-last-deploy.env
git checkout "$PREVIOUS_HEAD"

docker compose -f docker/compose/staging.yml --env-file .env.staging \
  build admin web
docker compose -f docker/compose/staging.yml --env-file .env.staging \
  up -d --no-build admin web

docker compose -f docker/compose/staging.yml --env-file .env.staging ps
```

### Banco e conteúdo

- Não executar `payload migrate:down`: o rollback de batch possui dívida técnica
  conhecida em migration anterior.
- As migrations institucionais são aditivas; o rollback da aplicação não exige
  remover as tabelas.
- Se for necessário desfazer conteúdo, restaurar o snapshot do banco ou excluir
  manualmente no Payload as páginas `sobre`, `empresas` e `contato` criadas
  nesta execução e restaurar uma versão anterior da Home.
- Registrar qualquer rollback editorial no relatório da operação.

## 9. Referências

- `docker/compose/staging.yml`: serviços runtime e one-off.
- `docker/scripts/admin-bootstrap.sh`: dispatcher das operações do Admin.
- `apps/admin/Dockerfile`: imagens bootstrap e runtime.
- `.env.staging.example`: contrato de configuração.
- `docs/09-infrastructure/STAGING_CHECKLIST.md`: checklist de infraestrutura
  inicial; este documento prevalece para deploy da MISSÃO 01.
