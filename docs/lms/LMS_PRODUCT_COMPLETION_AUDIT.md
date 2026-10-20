# LMS Product Completion — Auditoria

Data: 2026-08-13  
Branch: `feature/lms-product-completion`  
Regra: AUDITAR → REUTILIZAR → COMPLETAR GAPS → HOMOLOGAR  
Não reconstruir LMS. Não duplicar Moodle. Não dual-write.

Legenda: **EXISTE** · **PARCIAL** · **FALTA** (após esta macroentrega: gap residual)

## ALUNO

| Capacidade          | Antes                        | Depois                                                | Notas                                  |
| ------------------- | ---------------------------- | ----------------------------------------------------- | -------------------------------------- |
| dashboard           | PARCIAL (`/lms`, `/cursos`)  | EXISTE `/aluno`                                       | LMS Core + matrículas nativas          |
| meus cursos         | PARCIAL                      | EXISTE `/aluno/cursos`                                | Só matrículas do aluno                 |
| catálogo            | EXISTE `/cursos`             | EXISTE                                                | Reutilizado                            |
| matrícula           | PARCIAL (Admin/Moodle)       | EXISTE                                                | Manual professor/admin; sem CRM        |
| progresso           | PARCIAL (Moodle RO)          | EXISTE                                                | `lms-lesson-progress` + % matrícula    |
| continuar curso     | PARCIAL                      | EXISTE                                                | `continueHref` no dashboard            |
| aula                | PARCIAL `/cursos` + `/lms`   | EXISTE `/aluno/cursos/[slug]/aula`                    | Player nativo                          |
| vídeo               | PARCIAL (placeholder Moodle) | EXISTE                                                | URL de media existente; sem infra nova |
| PDF                 | PARCIAL                      | EXISTE                                                | iframe + download                      |
| download            | PARCIAL                      | EXISTE                                                | asset attachment                       |
| materiais           | PARCIAL                      | EXISTE                                                | `lesson-assets`                        |
| atividades          | PARCIAL                      | EXISTE                                                | avaliações nativas                     |
| exercícios          | PARCIAL                      | EXISTE                                                | banco de questões                      |
| avaliações          | PARCIAL (Moodle RO / stub)   | EXISTE `/aluno/avaliacoes`                            | engine nativo                          |
| envio de respostas  | FALTA                        | EXISTE                                                | submit + limite de tentativas          |
| notas               | PARCIAL (Moodle RO)          | EXISTE `/aluno/notas`                                 | só `published`                         |
| feedback            | PARCIAL                      | EXISTE                                                | após publicação                        |
| calendário          | FALTA                        | EXISTE `/aluno/calendario`                            | eventos acadêmicos                     |
| notificações        | FALTA                        | EXISTE                                                | in-app apenas                          |
| histórico           | PARCIAL                      | EXISTE                                                | tentativas/notas publicadas            |
| certificados        | FALTA                        | EXISTE `/aluno/certificados` + `/certificados/[code]` |
| perfil              | PARCIAL                      | EXISTE `/aluno/perfil`                                | sessão portal                          |
| Tutor IA contextual | EXISTE (EPIC 16)             | EXISTE                                                | contexto aula; sem gabarito            |

## PROFESSOR

| Capacidade              | Antes                   | Depois                        | Notas                                     |
| ----------------------- | ----------------------- | ----------------------------- | ----------------------------------------- |
| dashboard               | FALTA                   | EXISTE `/professor`           | indicadores operacionais                  |
| meus cursos             | PARCIAL (Admin Payload) | EXISTE                        | cursos autorizados                        |
| turmas                  | FALTA                   | EXISTE                        | `lms-classes`                             |
| alunos                  | FALTA                   | EXISTE                        | roster da turma                           |
| progresso da turma      | FALTA                   | EXISTE `/professor/progresso` |                                           |
| progresso individual    | FALTA                   | EXISTE                        | via roster                                |
| criação de conteúdo     | PARCIAL (Admin)         | EXISTE `/professor/conteudo`  | aula draft; publish no ACL                |
| módulos                 | EXISTE                  | EXISTE                        | collection `course-modules`               |
| aulas                   | EXISTE                  | EXISTE                        | create via API pedagógica                 |
| materiais               | EXISTE                  | EXISTE                        | LessonAssets (Admin + aula)               |
| vídeo                   | PARCIAL                 | EXISTE                        | anexar media existente                    |
| atividades / avaliações | PARCIAL                 | EXISTE                        | criar + publicar                          |
| banco de questões       | FALTA                   | EXISTE                        |                                           |
| correção                | FALTA                   | EXISTE `/professor/notas`     |                                           |
| notas / feedback        | FALTA                   | EXISTE                        | publish controlado                        |
| calendário              | FALTA                   | EXISTE                        |                                           |
| relatórios              | FALTA                   | EXISTE                        | operacional, sem clínico                  |
| alertas                 | FALTA                   | PARCIAL                       | in-app ao aluno; professor vê pendências  |
| IA pedagógica           | EXISTE `/ia`            | EXISTE                        | capacidades já existentes; humano publica |

## ADMIN ACADÊMICO

| Capacidade                                 | Antes   | Depois  | Notas                               |
| ------------------------------------------ | ------- | ------- | ----------------------------------- |
| cursos / módulos / aulas / materiais       | EXISTE  | EXISTE  | Payload LMS Core                    |
| professores / alunos                       | EXISTE  | EXISTE  | users + RBAC                        |
| turmas / matrículas                        | FALTA   | EXISTE  | collections + UI professor          |
| avaliações / questões / tentativas / notas | PARCIAL | EXISTE  | grupo Admin «LMS Acadêmico»         |
| certificados / calendário                  | FALTA   | EXISTE  |                                     |
| relatórios                                 | PARCIAL | PARCIAL | dashboards + collections            |
| regras acadêmicas                          | PARCIAL | EXISTE  | passingScore + certificateEnabled   |
| auditoria                                  | PARCIAL | PARCIAL | LMS audit events + Payload; sem CRM |

## LMS / MOODLE

| Capacidade                   | Estado               | Ownership                            |
| ---------------------------- | -------------------- | ------------------------------------ |
| connector                    | EXISTE               | Omnia BFF read-only                  |
| identity link                | EXISTE               | Omnia                                |
| provisioning                 | PARCIAL dry-run      | Omnia; write Moodle locked           |
| sync                         | PARCIAL              | identidade; não dual-write acadêmico |
| enrolment Moodle             | EXISTE RO            | **Moodle owns** matrícula Moodle     |
| grade read                   | EXISTE RO            | Moodle gradebook legado              |
| grade write                  | CONTROLLED / dry-run | **não habilitado** nesta entrega     |
| assessment submission Moodle | CONTROLLED           | **não** — submissão nativa Omnia     |
| certificates Moodle          | N/A                  | certificados Omnia LMS Core          |
| media authorization          | EXISTE               | Omnia package                        |
| SSO/session                  | PARCIAL              | Portal session + LMS session manager |

## Gaps residuais (não bloqueiam operação básica)

- Upload de vídeo/PDF na UI professor ainda usa media Payload existente (sem CDN/VOD novo).
- Catálogo público não auto-matricula (sem CRM).
- Alertas professor são dashboards, não inbox própria.
- Relatórios Admin são collections + indicadores, sem BI export.
- Moodle write permanece locked — intencional.
