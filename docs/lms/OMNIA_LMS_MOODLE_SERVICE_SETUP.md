# Omnia LMS — Moodle Web Service Setup (DEV)

## Objetivo

REST read-only com privilégio mínimo para o Connector Omnia.

## Passos (Moodle 4.5.12 DEV)

1. **Site administration → Advanced features**
   - Enable web services = Yes
   - Enable protocols → **REST** only (XML-RPC off)

2. **Usuário técnico** (não admin geral)
   - Username sugerido: `omnia_ws_readonly`
   - Auth: manual
   - Sem privilégios de site admin
   - Papel mínimo: capabilities necessárias às funções abaixo (via role dedicado `omnia_connector_readonly`)

3. **External service**
   - Short name: `omnia_lms_readonly`
   - Enabled + Authorized users only
   - Adicionar usuário técnico

4. **Funções (whitelist read-only desta entrega)**

| Função | Uso |
|--------|-----|
| `core_webservice_get_site_info` | Health / versão |
| `core_user_get_users_by_field` | Localizar usuário |
| `core_enrol_get_users_courses` | Cursos do usuário |
| `core_course_get_courses` | Catálogo |
| `core_course_get_courses_by_field` | Curso por id |
| `core_course_get_contents` | Estrutura |
| `core_completion_get_activities_completion_status` | Progresso |
| `core_completion_get_course_completion_status` | Completion |
| `gradereport_user_get_grade_items` | Notas |

5. **Token**
   - Criar token exclusivo para o usuário + serviço
   - Armazenar **somente** em secret do Admin/Platform (`MOODLE_REST_TOKEN`)
   - Nunca no browser / nunca `NEXT_PUBLIC_*` / nunca no git

## Rotação

1. Criar novo token no Moodle.
2. Atualizar secret no servidor DEV (`/opt/omnia/secrets/…` ou env do compose platform).
3. Restart Admin DEV.
4. Validar `/api/omnia/lms/health`.
5. Revogar token antigo.

## Revogação de emergência

1. Disable external service **ou** delete token.
2. Set `MOODLE_CONNECTOR_ENABLED=false` no Admin.
3. Auditar `lms-audit-events`.

## Gaps conhecidos

- Algumas agregações de notas multi-curso exigem N chamadas por curso (sem API nativa única ideal) — adapter interno já itera matrículas com limite.
- Provisionamento / write APIs: **fora** desta entrega.
