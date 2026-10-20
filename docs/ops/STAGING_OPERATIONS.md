# Staging operations — official commands (R0)

Server path: `/opt/omnia/platform`  
Compose: `docker/compose/staging.yml`  
Env file: `.env.staging` (never commit)

## Health

```bash
curl -fsS https://admin.dev.omniafrigo.com.br/api/health
curl -fsS -o /dev/null -w "%{http_code}\n" https://dev.omniafrigo.com.br/
docker ps --filter name=omnia-platform-admin-dev --filter name=omnia-platform-web-dev
```

## Deploy staging (Admin + Web only)

From the VPS checkout of the integration/feature branch:

```bash
cd /opt/omnia/platform
git fetch origin
git checkout <branch>
git pull --ff-only origin <branch>
docker compose -f docker/compose/staging.yml --env-file .env.staging up -d --build admin web
```

Do **not** recreate production, landing, or Moodle containers as part of this procedure.

## Migrations

```bash
docker compose -f docker/compose/staging.yml --env-file .env.staging --profile bootstrap run --rm admin-migrate
# or via project bootstrap helper when configured:
# ./scripts/omnia-admin-bootstrap.sh migrate
```

## Seed (idempotent / named only)

Prefer named seeds already wired in Admin package scripts, e.g.:

```bash
# examples — run only when required for homologation
docker compose -f docker/compose/staging.yml --env-file .env.staging --profile bootstrap run --rm admin-seed
```

Avoid ad-hoc `/tmp/_eXX_*.sh` as the long-term procedure. Keep temporary scripts out of git.

## Observability stack

```bash
docker compose -f docker/observability/compose.yml --env-file .env.staging up -d
docker ps --filter name=omnia-otel-collector-dev --filter name=omnia-prometheus-dev --filter name=omnia-grafana-dev
```

## Rollback staging

1. Restore DB dump from `/opt/omnia/backups/staging/<stamp>/`
2. `git checkout <previous-sha>`
3. Rebuild admin/web as in Deploy

## Production

**Not covered here.** Production deploy is a separate approved runbook and must not be executed from R0.
