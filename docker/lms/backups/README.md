# Backups Omnia LMS

Artefatos **não** ficam versionados neste diretório.

## Destino na VPS

| Ambiente | Path |
| --- | --- |
| DEV | `/opt/omnia/backups/lms/dev/` |
| PROD | `/opt/omnia/backups/lms/production/` |

## Conteúdo de um backup

- Dump MariaDB (`.sql.gz`)
- Arquivo `moodledata-*.tgz`
- Cópia sanitizada de metadados (`manifest.json`: versões, timestamp, hostname)

## Retenção sugerida

- DEV: 7 diários
- PROD: 14 diários + 4 semanais

Scripts: [`../scripts/backup.sh`](../scripts/backup.sh), [`../scripts/restore.sh`](../scripts/restore.sh).

Runbook: [`../../docs/09-infrastructure/OMNIA_LMS_BACKUP_RESTORE.md`](../../docs/09-infrastructure/OMNIA_LMS_BACKUP_RESTORE.md)
