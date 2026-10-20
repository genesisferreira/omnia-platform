# Sprint 2.4.2 — Instalação limpa do Moodle Engine

## Estratégia (atualizada)

**Não** migrar a instalação HostGator.  
HostGator permanece apenas como **referência visual/funcional** durante o desenvolvimento e será descontinuada depois.

Esta sprint realiza uma **instalação totalmente nova** na VPS, sobre a infra Docker da Sprint 2.4.1.

## Escopo

- Validar/completar Moodle 4.5 LTS limpo em DEV (`moodle.dev.omniafrigo.com.br`)
- Confirmar HTTPS (Let's Encrypt) + login admin técnico + cron + backup
- Documentar baseline limpa (sem dados da HostGator)
- Preparar PROD (`moodle.omniafrigo.com.br`) para instalação limpa futura (compose já existe; deploy sob critério)

## Não fazer

- Importar banco HostGator
- Importar moodledata
- Migrar usuários ou cursos
- Temas, plugins extras, SSO, integração Omnia (Sprint 2.4.3)

## Critérios de aceite

- [x] DNS `moodle.dev` resolve para a VPS (8.8.8.8 / 1.1.1.1)
- [x] Certificado Let's Encrypt (CN=`moodle.dev.omniafrigo.com.br`, issuer YR2)
- [x] `https://moodle.dev.omniafrigo.com.br/login/index.php` → 200
- [x] Instalação limpa (users=2 admin+guest, courses=1 site — sem dados HostGator)
- [x] Cron healthy
- [x] Backup limpo gerado
- [x] `$CFG->sslproxy=true`, `$CFG->reverseproxy=false` (mesmo hostname via Traefik)

## Evidência (2026-07-31)

- HTTPS 200 + Let's Encrypt validado na VPS e via `curl --resolve`
- Backup: `/opt/omnia/backups/lms/dev/20260731-132554`
- Admin: `/opt/omnia/secrets/omnia-lms-dev-admin.env`

## Domínios reservados (UI futura)

`lms.dev.omniafrigo.com.br` e `lms.omniafrigo.com.br` — **não** apontam para o Moodle engine; certificados/serviço Omnia LMS UI virão depois. Enquanto não houver backend, o Traefik pode servir certificado default / 404.
