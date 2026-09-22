# LMS Product Completion — Arquitetura

## Princípio

Um único produto escolar operacional no **LMS Core (Payload)**.  
Moodle permanece engine legado **read-only**.  
Não há segundo LMS. Não há banco paralelo de notas. Não há dual-write.

## Superfícies

| Superfície                              | Papel                                                 |
| --------------------------------------- | ----------------------------------------------------- |
| `/aluno/*`                              | Escola do aluno (Portal Web)                          |
| `/professor/*`                          | Operação pedagógica diária                            |
| `/cursos`                               | Catálogo público/autenticado existente                |
| `/lms/*`                                | Shell Moodle (legado, RO)                             |
| `/ia` + Dock                            | Tutor / Professor IA (EPIC 16 R6, validação contínua) |
| Admin Payload grupo LMS + LMS Acadêmico | Autoria avançada, publicação, auditoria               |
| `/certificados/[code]`                  | Validação pública (código + status; sem PII extra)    |

Admin `/area/student` e `/area/instructor` redirecionam ao Portal.

## Ownership (fonte de verdade)

### OMNIA OWNS

- Catálogo: `courses`, `course-modules`, `lessons`, `lesson-assets`
- Turmas: `lms-classes`
- Matrículas nativas: `lms-enrollments`
- Banco: `lms-question-banks`, `lms-questions`
- Avaliações nativas: `lms-assessments`, `lms-attempts`
- Progresso nativo: `lms-lesson-progress` + `%` na matrícula
- Notas/feedback nativos (status `published`)
- Certificados: `lms-certificates`
- Calendário: `lms-academic-events`
- Notificações in-app: `lms-notifications`
- Media Payload + Media Authorization
- SIP evidence (auxiliar) e Adaptive (recomendação; **não altera nota**)
- Identidade Omnia, RBAC, tenant/company

### MOODLE OWNS

- Cursos/matrículas/notas/conclusão **já existentes no Moodle**
- Quiz Moodle legado
- Gradebook Moodle legado

### SYNC

- Identity link Omnia ↔ Moodle (já existente)
- Leitura Moodle via connector (me, courses, content, progress, grades, completion)
- **Write Moodle:** dry-run / locked — não completar dual-write nesta entrega

Aluno Moodle-only continua em `/lms`. Aluno LMS Core opera em `/aluno`.  
Não misturar gradebooks.

## Assessment Engine

Package `@omnia/assessment-engine`:

- MCQ / verdadeiro-falso / resposta curta → correção automática
- Dissertativa → correção manual
- `studentSafeQuestion` remove `correct` / gabarito
- Tentativa, limite, tempo (campo), randomização (flag)
- Nota só visível ao aluno quando `status = published`
- Tutor **não** entrega gabarito de avaliação ativa (guard EPIC 16)

## ACL

Camada de produto (S2S `x-omnia-internal-key` + `x-omnia-user-id` + `x-omnia-lms-role`) **não** tem `req.user`.  
O serviço `services/academic/engine.ts` aplica ACL com `overrideAccess: true`:

- STUDENT: próprio perfil, matrículas, notas publicadas, tentativas próprias; sem gabarito
- PROFESSOR: cursos/turmas com `instructor` ou admin; roster só da turma; correção autorizada
- ADMIN: escopo administrativo
- Cross-tenant: `ownerCompany` + `assertCanTeachCourse` + matrícula obrigatória para aula/avaliação

Payload Admin: `academicAdminReadAccess` / write staff / delete publisher.

## Progresso

Eventos reais: aula iniciada (primeiro GET), aula concluída (POST complete), `%` = aulas concluídas / aulas do curso, última aula, conclusão da matrícula. Sem métrica fake.

## SIP / Adaptive / Tutor

- SIP: evidências `lms` e `attempt` (best-effort; falha não quebra fluxo)
- Adaptive: consumo via Tutor/IA existente; **não** escreve nota
- Tutor na aula recebe curso/módulo/aula; EPIC 16 permanece em validação humana

## Media

Cadeia existente: upload Payload → storage → URL → player.  
Authorization package já existe; player nativo usa URL autorizada da aula matriculada.  
Usuário sem matrícula recebe 403 no academic engine. Sem DRM novo.

## Fora de escopo

CRM, ERP, WhatsApp, n8n, marketplace, live streaming próprio, produção.
