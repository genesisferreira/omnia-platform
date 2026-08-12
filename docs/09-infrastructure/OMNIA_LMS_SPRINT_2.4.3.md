# Sprint 2.4.3 — Integração Omnia Platform ↔ Moodle Engine

## Objetivo

Expor o Moodle como **serviço interno** consumido pela Omnia Platform (Área do Aluno/Professor/Gestor), **sem** usar a UI Moodle para o usuário final.

## Abordagem

1. Habilitar **Moodle Web Services** (REST) com token de serviço dedicado.
2. Connector Omnia (`apps/admin` ou pacote `@omnia/lms-connector`) — autenticação service-to-service.
3. Mapear entidades: usuário, curso, matrícula, progresso, certificado.
4. Domínios `lms.*` servem a UI Omnia; `moodle.*` permanece engine/admin técnico.
5. Sem modificar o core; plugins oficiais apenas se imprescindíveis.

## Não fazer ainda

- SSO completo (pode ser fase seguinte)
- Neurofrigo IA / Jitsi / Player
- Multiempresa avançada (desenhar contratos de API)

## Critérios de aceite

- API Omnia consegue listar cursos e progresso via connector
- Secrets em env; auditoria de chamadas
- DEV validado; PROD com feature flag
