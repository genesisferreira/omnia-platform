# Omnia LMS — Domain Model

> **Sprint 2.6.5** — Modelo de domínio oficial do produto.  
> **Status:** Aceito — fonte de verdade para entidades, estados e relacionamentos.  
> **Não contradiz:** Blueprint, Connector, Experience MVP, Session Policy, Policy Engine.  
> **Regra:** sprints futuras implementam _sobre_ este modelo; mudanças exigem RFC.

**Host de verdade acadêmica:** Moodle 4.5 LTS (engine).  
**Host de verdade de produto/identidade/sessão/policy:** Omnia Platform.  
**UI:** sempre Omnia (`/lms/*` MVP → `lms.*` alvo).

---

## 1. Princípios do modelo

1. **Ubiquitous language** em português de produto (Curso, Matrícula, Aula) com espelho técnico EN nos IDs de código/API.
2. **Moodle = System of Record acadêmico** (Course, Enrollment, Grade, Completion, Activity).
3. **Omnia = System of Record de identidade, sessão LMS, policy, UX e eventos de produto**.
4. Entidades **reservadas** (Recommendation, AiInteraction, etc.) existem no modelo mas **não** são implementadas nesta fase.
5. IDs acadêmicos expostos ao client são **Moodle IDs** via Connector; o browser nunca recebe token Moodle nem URL Moodle (scrub no proxy).

---

## 2. Catálogo de entidades

| Entidade       | Bounded Context    | SoR                    | MVP 2.6 | Notas                               |
| -------------- | ------------------ | ---------------------- | :-----: | ----------------------------------- |
| User           | Identity           | Omnia Payload          |    ●    | Conta plataforma                    |
| Student        | Learning           | Papel sobre User       |    ●    | Persona dominante MVP               |
| Teacher        | Teaching           | Papel                  |    ○    | Modelo pronto; UI futura            |
| Manager        | Governance         | Papel                  |    ○    | Idem                                |
| Administrator  | Platform Ops       | Papel                  |    ●    | Policies / identity / sessions      |
| IdentityLink   | Identity Bridge    | Omnia DB               |    ●    | Omnia user ↔ Moodle user            |
| Course         | Academic Catalog   | Moodle                 |    ●    |                                     |
| Enrollment     | Academic Access    | Moodle                 |    ●    |                                     |
| Module         | Academic Structure | Moodle section         |    ●    |                                     |
| Lesson         | Academic Structure | Moodle activity (view) |    ●    | Experiência Omnia “aula”            |
| Material       | Content            | Moodle resource / file |    ○    | Metadados; player futuro            |
| Activity       | Academic Work      | Moodle activity        |    ●    | Inclui quiz/assign/page/…           |
| Quiz           | Assessment         | Moodle quiz            |    ○    | Subtipo Activity                    |
| Assignment     | Assessment         | Moodle assign          |    ○    | Subtipo Activity                    |
| Grade          | Assessment         | Moodle gradebook       |    ●    |                                     |
| Completion     | Academic Progress  | Moodle                 |    ●    | Curso e/ou atividade                |
| Progress       | Learning Analytics | Derivado Omnia+Moodle  |    ●    | Agregação UX                        |
| Certificate    | Credentialing      | Moodle + Omnia verify  |    ○    | Reservado emissão                   |
| Session        | Session Security   | Omnia Redis            |    ●    | Session Manager                     |
| Policy         | Policy             | Omnia Global           |    ●    | Policy Engine                       |
| LearningPath   | Catalog            | Omnia (futuro)         |    —    | Trilha multi-curso                  |
| Notification   | Engagement         | Omnia (futuro)         |    —    |                                     |
| LearningEvent  | Telemetry          | Omnia + OTel           |   ●*    | *Catálogo definido; emissão parcial |
| Recommendation | Intelligence       | Neurofrigo             |    —    | Reservado                           |
| AiInteraction  | Intelligence       | Neurofrigo             |    —    | Reservado                           |

● = modelado e parcialmente/totalmente operacional · ○ = modelado, UI/API futura · — = reservado

---

## 3. Definições

### 3.1 User

Conta Omnia (Payload). Atributos mínimos: `id`, `email`, `name`, `role` plataforma, `tenantId` (quando multiempresa).

### 3.2 Student / Teacher / Manager / Administrator

**Não** são tabelas separadas obrigatórias no MVP: são **papéis** (`LmsRole`) resolvidos em runtime (`x-omnia-lms-role` / mapping de role Payload).

| Papel LMS | Origem típica Payload | Limite sessão (default) |
| --------- | --------------------- | ----------------------- |
| student   | user / customer       | 1                       |
| teacher   | instructor            | 3 (policy)              |
| manager   | editor                | policy                  |
| admin     | admin / super_admin   | policy                  |

### 3.3 IdentityLink

Vínculo 1:1 ativo Omnia User ↔ Moodle user.

| Campo        | Obrigatório | Descrição                  |
| ------------ | :---------: | -------------------------- |
| omniaUserId  |      ●      | FK lógica User             |
| moodleUserId |      ●      | ID Moodle                  |
| status       |      ●      | active / revoked / pending |
| syncStatus   |      ●      | synced / error / pending   |
| linkedAt     |      ●      |                            |

Sem link ativo → Connector retorna `MOODLE_IDENTITY_NOT_LINKED`.

### 3.4 Course

Curso acadêmico Moodle. Omnia exibe `displayName` / `fullName` / `summary` sanitizado.

Estados de produto (alvo): `Draft` | `Published` | `Archived`.  
MVP: leitura apenas de cursos **visíveis e matriculados** (Published implícito no engine).

### 3.5 Enrollment

Matrícula do Student no Course (Moodle enrol).

Estados: `Pending` | `Active` | `Suspended` | `Cancelled` | `Completed`.

### 3.6 Module

Seção Moodle (`sectionId`, `name`, `summary`, lista de activities).

### 3.7 Lesson

**Conceito de produto** Omnia: unidade de estudo apresentada ao aluno.  
**Mapeamento técnico MVP:** Activity com experiência de “abrir aula” (metadados + estados; sem player Moodle).

Estados UX: `Locked` | `Available` | `Started` | `Completed`.

### 3.8 Material

Conteúdo consumível (PDF, vídeo, página). SoR futuro: media authorize Omnia; MVP: placeholder / metadados.

### 3.9 Activity

Atividade Moodle (`moodleActivityId`, `modName`, `name`, `visible`).  
Subtipos: Quiz, Assignment, Page, Forum, Resource, …

Estados de trabalho: `Available` | `Started` | `Submitted` | `Reviewed` | `Completed`.

### 3.10 Grade

Item de nota + valor formatado / percentual. SoR Moodle gradebook.

### 3.11 Completion

Conclusão de atividade (`state` Moodle 0/1/2) ou de curso (`completed`, `timeCompleted`).

### 3.12 Progress

Agregação Omnia: % por curso = atividades concluídas / total; progresso médio no dashboard.

Estados UX: `NotStarted` | `InProgress` | `Completed` | `Failed` (Failed reservado a avaliações futuras).

### 3.13 Certificate

Credencial. Emissão Moodle + validação pública Omnia (futuro). Placeholder na UX MVP.

### 3.14 Session

Sessão LMS Omnia (não confundir com cookie Payload).  
Campos: `sessionId`, `sessionFamilyId`, `userId`, `role`, `deviceId`, `expiresAt`, `lastSeenAt`.

### 3.15 Policy

Limites e flags efetivas por papel/curso/material/usuário. Precedência: `userException > material > course > global`.

### 3.16 LearningPath

Trilha ordenada de Courses (Omnia). **Reservado.**

### 3.17 Notification

Aviso in-app/push/email. **Reservado** (placeholder UI).

### 3.18 LearningEvent

Evento de domínio/produto (ver `OMNIA_LMS_EVENT_CATALOG.md`).

### 3.19 Recommendation / AiInteraction

Reservados Neurofrigo. Sem schema operacional nesta sprint.

---

## 4. Relacionamentos e cardinalidade

```text
User 1 ── 0..1 IdentityLink ── 1 MoodleUser
User 1 ── 0..* Session
User 1 ── interpreta ── Student|Teacher|Manager|Administrator

Student 1 ── 0..* Enrollment ── 1 Course
Course 1 ── 1..* Module
Module 1 ── 0..* Activity
Activity 0..1 ── é vista como ── Lesson (produto)
Activity 0..* ── Material (opcional)
Activity ── 0..* Grade (itens)
Activity / Course ── Completion
Enrollment + Completions ── Progress (derivado)

Course 0..* ── LearningPath (futuro)
User ── 0..* Notification (futuro)
User ── 0..* LearningEvent
User ── 0..* Certificate (futuro)
Policy aplica-se a Session / Course / Material / User
```

| Relação                | Card.                      |              Obrigatório              |
| ---------------------- | -------------------------- | :-----------------------------------: |
| User → IdentityLink    | 0..1 ativo                 |            Não (gate LMS)             |
| Student → Enrollment   | 0..*                       |                  Não                  |
| Enrollment → Course    | N:1                        |                  Sim                  |
| Course → Module        | 1..*                       | Sim (pode ser vazio operacionalmente) |
| Module → Activity      | 0..*                       |                  Não                  |
| Activity → Grade items | 0..*                       |                  Não                  |
| User → Session LMS     | 0..N (limitado por Policy) |            Sim ao usar LMS            |

---

## 5. Máquinas de estado

### 5.1 Course

`Draft → Published → Archived` (e `Published → Draft` só admin engine).

### 5.2 Enrollment

`Pending → Active → Completed`  
`Active → Suspended → Active|Cancelled`  
`Pending → Cancelled`

### 5.3 Lesson (UX)

`Locked → Available → Started → Completed`  
`Available` também pode ir a `Locked` se regra de sequência.

### 5.4 Progress

`NotStarted → InProgress → Completed`  
`InProgress → Failed` (avaliações — futuro)

### 5.5 Activity (trabalho)

`Available → Started → Submitted → Reviewed → Completed`  
Atalhos: `Started → Completed` (atividades sem submission).

### 5.6 Session

`Created → Active → (Heartbeat) → Revoked|Expired|LoggedOut`

### 5.7 IdentityLink

`Pending → Active → Revoked`

---

## 6. Lifecycle (visões)

### Student Journey (produto)

```text
Account Omnia → IdentityLink → Enrollment Active → Dashboard
  → Course → Module → Lesson/Activity → Progress/Grade
  → Completion → (Certificate futuro) → Logout/Session revoke
```

### Enrollment Journey

```text
Offer/Assign (futuro Marketplace/B2B) → Pending → Active
  → study → Completed | Suspended | Cancelled
```

### Course Journey (authoring — futuro UI professor)

```text
Draft → modules/activities → Published → enrollments → Archived
```

### Lesson Journey (MVP)

```text
Available → open in Omnia → TrackLastSeen → Started
  → (player futuro) → completion Moodle → Completed
```

### Completion Journey

```text
Activity completion states → Progress % → Course completion flag
  → Certificate eligibility (futuro)
```

---

## 7. Contratos Connector (resumo)

Ver detalhe em [`OMNIA_LMS_CONNECTOR_API.md`](OMNIA_LMS_CONNECTOR_API.md).  
Entidades lidas no MVP: User/me, Course, Enrollment(list), Module/content, Activity, Progress, Grade, Completion, Session, Policy (implícita).

---

## 8. Módulos futuros (reserva de domínio)

Provisioning · Media Authorization · Marketplace · Neurofrigo · Payments · Gamification · Mobile · Analytics avançado.

Não criar schemas operacionais nestas entidades até a sprint dona.

---

## 9. Referências

- Blueprint · Responsibility Matrix · Product Spec 2.6 · Session Policy · Policy Engine · Event Catalog · Business Rules · Bounded Contexts
