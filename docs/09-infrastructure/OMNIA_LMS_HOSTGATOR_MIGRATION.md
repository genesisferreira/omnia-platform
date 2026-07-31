# Plano — Migração Moodle HostGator → Omnia LMS Engine

> **Não executar nesta sprint.** Apenas planejamento.

## Objetivos

Trazer cursos/usuários/arquivos do Moodle hospedado na HostGator para a stack Docker Omnia (`moodle.*`), sem customizar o core.

## Inventário (pré-requisitos)

- Versão Moodle origem e PHP
- Tamanho DB + `moodledata`
- Plugins instalados (lista)
- Cron atual e SMTP
- Janela de manutenção

## Estratégia

1. **Compatibilidade:** origem deve ser upgradeável para 4.5.x (ou migrar em etapas).
2. **Dump DB** na origem (`mysqldump`) + checksum.
3. **Arquivos:** rsync/tar de `moodledata` (filedir prioritário).
4. **Restore** em DEV Omnia → upgrade CLI Moodle se necessário → validação.
5. **Cutover:** DNS/freeze writes origem → sync final → PROD.
6. **Rollback:** manter HostGator read-only até estabilizar.

## Riscos

- Plugins incompatíveis com 4.5
- Paths/wwwroot
- Tamanho de filedir / tempo de transferência
- Sessões Redis vs file sessions na origem

## Critérios de aceite da migração (Sprint 2.4.2)

- Login admin + amostra de alunos
- Cursos e arquivos abertos
- Cron saudável
- Backup pós-migração
