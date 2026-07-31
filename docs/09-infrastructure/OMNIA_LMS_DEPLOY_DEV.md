# Omnia LMS — Deploy DEV

## Pré-requisitos

- DNS A: `moodle.dev.omniafrigo.com.br` → IP da VPS
- Rede Docker `omnia_proxy` (Traefik) existente
- Disco livre para imagem + volumes
- Monorepo em `/opt/omnia/platform` **ou** checkout dedicado `/opt/omnia/lms`

## Passos

```bash
set -euo pipefail
cd /opt/omnia/platform   # ajuste se usar /opt/omnia/lms

git fetch origin
git checkout <branch-com-docker-lms>
git pull --ff-only

mkdir -p /opt/omnia/backups/lms/dev
cp docker/lms/env/.env.dev.example docker/lms/env/.env.dev
# editar secrets fortes; SMTP corporativo
chmod 600 docker/lms/env/.env.dev

# LF nos scripts (se editados no Windows)
find docker/lms/scripts -type f -name '*.sh' -exec sed -i 's/\r$//' {} \;

docker compose -f docker/lms/compose/development.yml --env-file docker/lms/env/.env.dev config
docker compose -f docker/lms/compose/development.yml --env-file docker/lms/env/.env.dev up -d --build

# Aguardar healthy (install pode levar alguns minutos)
docker compose -f docker/lms/compose/development.yml --env-file docker/lms/env/.env.dev ps

bash docker/lms/scripts/validate-dev.sh
```

## Checklist

- [ ] DNS resolve
- [ ] `mariadb`, `redis`, `moodle`, `cron` healthy
- [ ] HTTPS `https://moodle.dev.omniafrigo.com.br/login/index.php` → 200
- [ ] Login admin técnico
- [ ] Cron: `docker exec omnia-lms-cron-dev cat /var/www/moodledata/.omnia-cron-heartbeat`
- [ ] Backup: `COMPOSE_FILE=... ENV_FILE=... bash docker/lms/scripts/backup.sh`
- [ ] Containers `omnia-platform-*` intactos

## Rollback DEV

```bash
docker compose -f docker/lms/compose/development.yml --env-file docker/lms/env/.env.dev down
# volumes preservados por padrão; para destruir dados: down -v (destrutivo)
# restaurar imagem anterior: retag omnia-lms-moodle:<tag-anterior> e up -d
```
