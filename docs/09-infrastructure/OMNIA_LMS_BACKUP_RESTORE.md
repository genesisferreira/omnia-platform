# Omnia LMS — Backup e Restore

## Destino

| Env  | Path                                         |
| ---- | -------------------------------------------- |
| DEV  | `/opt/omnia/backups/lms/dev/<stamp>/`        |
| PROD | `/opt/omnia/backups/lms/production/<stamp>/` |

Conteúdo: `mariadb.sql.gz`, `moodledata.tgz`, `manifest.json`.

## Backup

```bash
cd /opt/omnia/platform
export COMPOSE_FILE=docker/lms/compose/development.yml
export ENV_FILE=docker/lms/env/.env.dev
export OMNIA_LMS_ENV=dev
bash docker/lms/scripts/backup.sh
```

Validar: `manifest.json` e tamanhos > thresholds do script.

## Restore

```bash
bash docker/lms/scripts/restore.sh /opt/omnia/backups/lms/dev/<stamp>
```

Sobrescreve DB + moodledata. Reinicia `moodle` e `cron`.

## Retenção

- DEV: 7 diários
- PROD: 14 diários + 4 semanais (agendar no host)

## Teste

1. Backup
2. Alteração trivial no site
3. Restore
4. Confirmar estado anterior + HTTPS 200
