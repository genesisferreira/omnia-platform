# Omnia LMS — Homologação DEV (Connector)

## Pré-requisitos

1. Moodle DEV healthy (`moodle.dev.omniafrigo.com.br`)
2. WS REST + serviço `omnia_lms_readonly` + token no Admin
3. Admin DEV com `MOODLE_CONNECTOR_ENABLED=true`
4. Redis Platform acessível
5. Usuário Omnia + vínculo manual em `lms-identity-links` (DEV)

## Roteiro

1. `GET /api/omnia/lms/health` → `healthy` / `read_only`
2. Site info via health (versão ~4.5.12)
3. Criar vínculo manual admin → aluno Moodle de teste
4. `GET /me` → `connected: true`
5. `GET /courses` → lista
6. `GET /courses/:id/content`
7. `GET /courses/:id/progress`
8. `GET /grades?courseId=`
9. `GET /completion?courseId=`
10. Segunda chamada de content → cache hit (métricas/logs)
11. `POST /sessions` duas vezes (aluno) → segunda revoga primeira
12. Duas abas com mesmo `sessionFamilyId` → mesmo `sessionId`

## Não fazer

- Deploy produção
- Escrita acadêmica Moodle
- Usar dados reais de alunos
