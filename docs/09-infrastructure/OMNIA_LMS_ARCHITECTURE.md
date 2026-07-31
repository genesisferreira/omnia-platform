# Omnia LMS — Arquitetura (Engine Moodle)

## Papel

O Moodle 4.5 LTS é o **engine** do Omnia LMS (cursos, matrículas, progresso, avaliações, certificados).  
A experiência do usuário será construída na Omnia Platform (`lms.*`). A UI padrão do Moodle serve apenas administração técnica nesta fase.

## Diagrama

```
Internet → Traefik (omnia_proxy)
              → moodle (Apache/PHP 8.3)
                    → mariadb (dedicado)
                    → redis (sessões + cache)
              cron → mesmo código/imagem, loop admin/cli/cron.php
```

## Isolamento vs Platform

| Recurso | Platform | LMS |
| --- | --- | --- |
| Projeto Compose | `omnia-platform-*` | `omnia-lms-dev` / `omnia-lms-prod` |
| Banco | PostgreSQL | MariaDB 11.4 |
| Redis | próprio | próprio |
| Volumes | `omnia_platform_*` | `omnia_lms_*` |
| Traefik | compartilhado (`omnia_proxy`) | compartilhado |

## Domínios

| Hostname | Uso |
| --- | --- |
| `moodle.dev.omniafrigo.com.br` | Engine DEV |
| `moodle.omniafrigo.com.br` | Engine PROD (preparado) |
| `lms.dev.omniafrigo.com.br` | Reservado UI Omnia LMS |
| `lms.omniafrigo.com.br` | Reservado UI Omnia LMS |

## Componentes

Ver [`docker/lms/VERSIONS.md`](../../docker/lms/VERSIONS.md) e [`docker/lms/README.md`](../../docker/lms/README.md).

## Logs

| Origem | Onde |
| --- | --- |
| Apache/PHP/Moodle | `docker logs omnia-lms-moodle-*` + volume `omnia_lms_logs_*` |
| Cron | `/var/log/omnia-lms/cron.log` (volume logs) |
| MariaDB / Redis | `docker logs` dos containers (json-file rotativo) |

## Segurança

- Secrets só em `.env.*` (chmod 600), nunca no Git
- `no-new-privileges`, limites de CPU/memória
- Rede interna `internal: true` para DB/Redis
- Sem portas publicadas no host
- Core Moodle sem patches

## Evolução

Preparada para Web Services, connector Omnia, multiempresa, escala — sem reestruturar a stack. Ver sprints 2.4.2 (instalação limpa) e 2.4.3 (integração).

**Nota:** a HostGator **não** será migrada; serve apenas como referência. Ver `OMNIA_LMS_HOSTGATOR_MIGRATION.md`.
