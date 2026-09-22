# Omnia LMS — Docker

Stack isolada do **Moodle 4.5 LTS** como engine do Omnia LMS.

- **DEV:** `https://moodle.dev.omniafrigo.com.br`
- **PROD (preparado):** `https://moodle.omniafrigo.com.br`
- UI futura Omnia LMS: `lms.dev` / `lms.omniafrigo.com.br` (não apontar para este stack)

## Layout

```
docker/lms/
  compose/          # development.yml | production.yml
  dockerfiles/      # Moodle image
  configs/          # PHP, Apache, MariaDB, Redis, config.php template
  scripts/          # entrypoint, cron, backup, restore, validate
  env/              # .env*.example (sem secrets)
  backups/          # política (artefatos em /opt/omnia/backups/lms/)
  VERSIONS.md       # pins + digests
```

## Quick start (DEV na VPS)

```bash
cd /opt/omnia/lms   # ou monorepo: docker/lms via /opt/omnia/platform
cp docker/lms/env/.env.dev.example docker/lms/env/.env.dev
# editar secrets; chmod 600 docker/lms/env/.env.dev

docker compose -f docker/lms/compose/development.yml --env-file docker/lms/env/.env.dev config
docker compose -f docker/lms/compose/development.yml --env-file docker/lms/env/.env.dev up -d --build
docker compose -f docker/lms/compose/development.yml --env-file docker/lms/env/.env.dev ps
```

Documentação: [`docs/09-infrastructure/OMNIA_LMS_ARCHITECTURE.md`](../../docs/09-infrastructure/OMNIA_LMS_ARCHITECTURE.md)

## Isolamento

Não reutiliza Postgres/Redis/volumes da Omnia Platform. Compartilha apenas a rede externa `omnia_proxy` (Traefik).
