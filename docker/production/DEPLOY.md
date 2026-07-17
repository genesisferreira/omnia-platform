# Deploy Produção — Omnia Platform

> Runbook operacional canônico para a Release 1.0.
> Compose: `docker/compose/production.yml`.
> Commit de aplicação homologado: `5241ac8cb3db77606a2a01c18ca001f941a73086`.

## 1. Serviços e URLs

| Serviço         | URL                                                      | Container                      |
| --------------- | -------------------------------------------------------- | ------------------------------ |
| Portal Web      | <https://omniafrigo.com.br>                              | `omnia-platform-web-prod`      |
| Portal (www)    | <https://www.omniafrigo.com.br> → redirect 301 para apex | mesmo Web                      |
| Admin + Payload | <https://admin.omniafrigo.com.br>                        | `omnia-platform-admin-prod`    |
| Payload CMS     | <https://admin.omniafrigo.com.br/admin>                  | mesmo Admin                    |
| PostgreSQL      | interno (`postgres:5432`)                                | `omnia-platform-postgres-prod` |
| Redis           | interno (`redis:6379`)                                   | `omnia-platform-redis-prod`    |

Staging permanece em `dev.omniafrigo.com.br` / `admin.dev.omniafrigo.com.br` e **não** deve ser alterado por este runbook.

## 2. Pré-requisitos

- Acesso SSH à VPS e ao diretório `/opt/omnia/platform`.
- Docker Engine e Docker Compose v2.
- Rede externa `omnia_proxy` existente (Traefik).
- DNS A de `omniafrigo.com.br`, `www.omniafrigo.com.br` e `admin.omniafrigo.com.br` apontando para a VPS.
- Arquivo `/opt/omnia/platform/.env.production` criado a partir de `.env.production.example`, sem placeholders, `chmod 600`.
- Segredos distintos dos de staging (`PAYLOAD_SECRET`, `OMNIA_INTERNAL_API_SECRET`, `POSTGRES_PASSWORD`).
- Working tree limpa (exceto `.env.*` locais e backups não versionados).
- Commit operacional de infraestrutura publicado; código de aplicação = `5241ac8`.
- Espaço em disco suficiente para build e backups.
- Diretório de backups: `/opt/omnia/backups/production`.

### SMTP

O Payload desta release **não** possui adapter de e-mail. Reset de senha por SMTP não está disponível. Não inventar provider nesta missão.

### Domínios CMS

Após o primeiro administrador, cadastrar no Payload (collection Domains):

| Hostname            | Site        | Ambiente   | Primário | Ativo |
| ------------------- | ----------- | ---------- | -------- | ----- |
| `omniafrigo.com.br` | `omnia-hub` | production | sim      | sim   |

Opcional: `www.omniafrigo.com.br` como secundário com `redirectToPrimary` (o redirect HTTP já é feito pelo Traefik).

## 3. Validação de DNS

```bash
set -euo pipefail
for host in omniafrigo.com.br www.omniafrigo.com.br admin.omniafrigo.com.br; do
  getent hosts "$host"
done
```

Todos devem resolver para o IP público da VPS.

## 4. Backup

### 4.1 Antes de qualquer alteração destrutiva

Se o volume `omnia_platform_postgres_prod` **já existir** e contiver dados:

```bash
set -euo pipefail
mkdir -p /opt/omnia/backups/production
BACKUP_FILE="/opt/omnia/backups/production/pre-$(date +%Y%m%d-%H%M%S).dump"

docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" omnia-platform-postgres-prod \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-acl \
  > "$BACKUP_FILE"

BYTES=$(wc -c < "$BACKUP_FILE")
test "$BYTES" -gt 10000
docker exec -i omnia-platform-postgres-prod pg_restore -l < "$BACKUP_FILE" >/tmp/omnia-prod-dump-list.txt
test "$(grep -c ' TABLE ' /tmp/omnia-prod-dump-list.txt || true)" -gt 0
echo "BACKUP_OK=$BACKUP_FILE bytes=$BYTES"
```

- Persistir uploads no volume exclusivo `omnia_platform_admin_media_prod` montado em
  `/app/apps/admin/media` (caminho esperado pelo Payload).
- Backup de mídia:

```bash
MEDIA_BACKUP="/opt/omnia/backups/production/media-$(date +%Y%m%d-%H%M%S).tgz"
docker run --rm \
  -v omnia_platform_admin_media_prod:/media:ro \
  -v /opt/omnia/backups/production:/out \
  alpine:3.20 tar -czf "/out/$(basename "$MEDIA_BACKUP")" -C /media .
echo "MEDIA_BACKUP_OK=$MEDIA_BACKUP"
```

### 4.2 Backup-base pós-bootstrap

Após migrations e seeds bem-sucedidos, repetir o dump PostgreSQL e marcar como `post-bootstrap-*.dump`.

## 5. Deploy inicial

Executar na VPS, interrompendo no primeiro erro.

```bash
set -euo pipefail
cd /opt/omnia/platform

export EXPECTED_APP_COMMIT=5241ac8cb3db77606a2a01c18ca001f941a73086
export DEPLOY_BRANCH=ops/release-1.0-production

git fetch --prune origin
git checkout "$DEPLOY_BRANCH"
git pull --ff-only origin "$DEPLOY_BRANCH"

# Confirma que o código de apps/packages no ancestral homologado não mudou
git merge-base --is-ancestor "$EXPECTED_APP_COMMIT" HEAD
test -f .env.production
! grep -Eq '<[^>]+>' .env.production
chmod 600 .env.production

# Staging deve permanecer saudável
curl -fsS https://dev.omniafrigo.com.br/api/health >/dev/null
curl -fsS https://admin.dev.omniafrigo.com.br/api/health >/dev/null

docker compose -f docker/compose/production.yml --env-file .env.production config --quiet

export DOCKER_BUILDKIT=1
docker compose -f docker/compose/production.yml --env-file .env.production \
  --profile bootstrap build \
  postgres redis admin web admin-migrate

# Infra de dados isolada
docker compose -f docker/compose/production.yml --env-file .env.production \
  up -d postgres redis

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

wait_healthy omnia-platform-postgres-prod
wait_healthy omnia-platform-redis-prod

# Migrations
docker compose -f docker/compose/production.yml --env-file .env.production \
  --profile bootstrap run --rm --interactive=false -T admin-migrate

# Seeds idempotentes (mídia montada nos jobs que escrevem arquivos)
docker compose -f docker/compose/production.yml --env-file .env.production \
  --profile bootstrap run --rm --interactive=false -T admin-seed

docker compose -f docker/compose/production.yml --env-file .env.production \
  --profile bootstrap run --rm --interactive=false -T admin-upgrade-holding-home

docker compose -f docker/compose/production.yml --env-file .env.production \
  --profile bootstrap run --rm --interactive=false -T admin-seed-holding-institutional-pages

docker compose -f docker/compose/production.yml --env-file .env.production \
  --profile bootstrap run --rm --interactive=false -T admin-seed-holding-blog

docker compose -f docker/compose/production.yml --env-file .env.production \
  --profile bootstrap run --rm --interactive=false -T admin-seed-holding-strategic-companies

# Admin + TLS
docker compose -f docker/compose/production.yml --env-file .env.production \
  up -d --no-build admin
wait_healthy omnia-platform-admin-prod

echo "CHECKPOINT: criar o primeiro usuário administrador em"
echo "  https://admin.omniafrigo.com.br/admin"
echo "Depois cadastrar Domain omniafrigo.com.br → site omnia-hub."
```

Após o checkpoint do primeiro administrador e do Domain:

```bash
set -euo pipefail
cd /opt/omnia/platform

docker compose -f docker/compose/production.yml --env-file .env.production \
  up -d --no-build web
wait_healthy() {
  container="$1"
  for attempt in $(seq 1 36); do
    status=$(docker inspect --format '{{.State.Health.Status}}' "$container" 2>/dev/null || true)
    [ "$status" = healthy ] && return 0
    [ "$status" = unhealthy ] && return 1
    sleep 5
  done
  return 1
}
wait_healthy omnia-platform-web-prod

docker compose -f docker/compose/production.yml --env-file .env.production ps
curl -fsS https://admin.omniafrigo.com.br/api/health
curl -fsS https://omniafrigo.com.br/api/health
```

## 6. Smoke test

```bash
set -euo pipefail
BASE=https://omniafrigo.com.br
ADMIN=https://admin.omniafrigo.com.br

for path in / /sobre /empresas /empresas/renovacao /empresas/fred-do-frio \
  /empresas/cte /empresas/neurofrigo /contato /blog \
  /blog/bem-vindo-ao-blog-omnia /blog/categoria/institucional /blog/tag/holding \
  /robots.txt /sitemap.xml /blog/rss.xml; do
  code="$(curl -sS -o /dev/null -w '%{http_code}' "${BASE}${path}")"
  printf '%-45s %s\n' "$path" "$code"
  test "$code" = "200"
done

code404="$(curl -sS -o /dev/null -w '%{http_code}' "${BASE}/pagina-inexistente-r1")"
test "$code404" = "404"

curl -fsS "$ADMIN/api/health"
curl -fsS "$BASE/api/health"
curl -fsS "$ADMIN/api/omnia/public-companies" | grep -q '"ok":true'
curl -sS -o /dev/null -w '%{http_code}\n' "$ADMIN/admin" | grep -E '200|302'

# www → apex
curl -sSI https://www.omniafrigo.com.br/ | grep -Ei 'HTTP/|location:'

# Sem referências a staging no HTML da Home
! curl -fsS "$BASE/" | grep -E 'dev\.omniafrigo\.com\.br|admin\.dev\.omniafrigo'
```

Validações manuais adicionais: canonical, OpenGraph, Twitter, JSON-LD, imagens do blog e login Admin.

## 7. Atualização futura

1. Backup PostgreSQL + mídia.
2. `git fetch` e checkout do commit operacional aprovado.
3. Confirmar ancestral `5241ac8` (ou novo commit de app homologado).
4. `docker compose ... build` das imagens versionadas (`APP_VERSION`).
5. Migrations (`admin-migrate`).
6. Seeds **somente** se houver conteúdo novo aprovado (são idempotentes, mas evitam reexecução desnecessária).
7. `up -d --no-build admin` → health → `up -d --no-build web` → health.
8. Smoke test completo.
9. Confirmar staging intacto.

## 8. Rollback

### 8.1 Aplicação (imagens)

Registrar `PREVIOUS_APP_VERSION` / tags de imagem antes do deploy.

```bash
set -euo pipefail
cd /opt/omnia/platform
# Exemplo: export APP_VERSION=<versão_anterior>
docker compose -f docker/compose/production.yml --env-file .env.production \
  up -d --no-build admin web
```

Se a imagem anterior não existir localmente, rebuildar a partir do commit operacional anterior **sem** `migrate:down`.

### 8.2 Banco (destrutivo — exige confirmação explícita)

```bash
# CONFIRMAÇÃO OBRIGATÓRIA: digite RESTORE-PRODUCTION para continuar
read -r CONFIRM
test "$CONFIRM" = "RESTORE-PRODUCTION"

docker compose -f docker/compose/production.yml --env-file .env.production stop admin web
docker exec -i omnia-platform-postgres-prod \
  pg_restore --clean --if-exists -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$BACKUP_FILE"
docker compose -f docker/compose/production.yml --env-file .env.production up -d admin web
```

**Nunca** executar `payload migrate:down` como rollback operacional.

### 8.3 Mídia

```bash
docker run --rm \
  -v omnia_platform_admin_media_prod:/media \
  -v /opt/omnia/backups/production:/backup:ro \
  alpine:3.20 sh -c 'rm -rf /media/* && tar -xzf /backup/<media-backup>.tgz -C /media'
```

## 9. Restauração e verificação de logs

```bash
docker compose -f docker/compose/production.yml --env-file .env.production \
  logs --since=30m admin web postgres

docker inspect omnia-platform-admin-prod omnia-platform-web-prod \
  --format '{{.Name}} {{.State.Health.Status}}'
```

## 10. Rotação de segredos

1. Gerar novos valores para `PAYLOAD_SECRET`, `OMNIA_INTERNAL_API_SECRET` e/ou `POSTGRES_PASSWORD`.
2. Backup completo.
3. Atualizar `.env.production` (`chmod 600`).
4. Se `POSTGRES_PASSWORD` mudar: alterar role no PostgreSQL **antes** de reiniciar apps, ou recriar o volume (destrutivo).
5. `docker compose ... up -d --force-recreate admin web`.
6. Validar login Admin e smoke do Portal.
7. Invalidar sessões antigas do Payload (novo `PAYLOAD_SECRET` desconecta usuários).

## 11. Segurança

- `.env.production` fora do Git; permissão `600`.
- Banco e volumes isolados (`omnia_platform_*_prod`).
- Containers de app sem portas publicadas no host.
- Rede de dados `internal: true`.
- `/api/users` deve responder 403 sem autenticação.
- Staging e produção não compartilham `DATABASE_URL` nem volumes.

## 12. Referências

- `docker/compose/production.yml`
- `.env.production.example`
- `docker/scripts/admin-bootstrap.sh`
- `docker/staging/DEPLOY.md` (somente para staging; não misturar procedimentos)
