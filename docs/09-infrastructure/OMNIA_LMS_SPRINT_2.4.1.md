# Sprint 2.4.1 — Infraestrutura Omnia LMS Engine (CONCLUÍDA)

## Status

**Concluída** após validação de DNS (propagação pública) e certificado Let's Encrypt para o engine DEV.

## Entregue

- Stack Docker isolada em `docker/lms/`
- Moodle 4.5.12 LTS + PHP 8.3 + MariaDB 11.4 + Redis 7 + Cron
- Compose DEV implantado; Compose PROD preparado
- Volumes, healthchecks, backup/restore, SMTP via env
- Traefik + `omnia_proxy`
- Documentação em `docs/09-infrastructure/OMNIA_LMS_*.md`

## Domínios

| Hostname | Papel | Nesta sprint |
| --- | --- | --- |
| `moodle.dev.omniafrigo.com.br` | Engine DEV | Validar HTTPS |
| `moodle.omniafrigo.com.br` | Engine PROD | DNS reservado; stack PROD ainda não up |
| `lms.dev.omniafrigo.com.br` | UI Omnia LMS (futuro) | DNS reservado; sem backend Moodle |
| `lms.omniafrigo.com.br` | UI Omnia LMS (futuro) | DNS reservado; sem backend Moodle |

## Próximo

Sprint **2.4.2** — instalação limpa validada (sem migração HostGator).
