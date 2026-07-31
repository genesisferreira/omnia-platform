# Omnia LMS — Deploy PRODUÇÃO (preparado — não executar nesta sprint)

## Domínio

`moodle.omniafrigo.com.br` (DNS A → VPS) **antes** do primeiro `up`.

## Diferenças vs DEV

| Item | PROD |
| --- | --- |
| Compose | `docker/lms/compose/production.yml` |
| Env | `docker/lms/env/.env.production` (secrets **distintos** do DEV) |
| `MOODLE_AUTO_INSTALL` | `0` (instalar explicitamente ou restaurar backup) |
| Recursos | limites maiores (ver compose) |

## Procedimento futuro

1. Backup completo se volumes já existirem.
2. `docker compose ... -f production.yml config`
3. `up -d --build`
4. Healthchecks + HTTPS
5. Admin técnico + cron
6. Backup de verificação

## Rollback

1. Retag imagem `omnia-lms-moodle:<versão-anterior>`
2. `up -d --no-deps moodle cron`
3. Se necessário: `scripts/restore.sh` do último backup PROD
4. **Não** misturar volumes DEV/PROD

## Checklist de produção

- [ ] DNS + TLS Let’s Encrypt via Traefik
- [ ] Secrets únicos e `chmod 600`
- [ ] Backup automático agendado (cron host → `backup.sh`)
- [ ] Monitoramento de health
- [ ] Plano de atualização Moodle patch (VERSIONS.md)
- [ ] Zero impacto Platform
