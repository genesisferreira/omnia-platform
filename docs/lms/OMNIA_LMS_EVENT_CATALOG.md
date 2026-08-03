# Omnia LMS — Event Catalog

> **Sprint 2.6.5 + 2.7 Épico A** — Catálogo oficial de eventos de domínio/produto.  
> **Status:** Aceito.  
> Eventos alimentam analytics, auditoria, observabilidade e (futuro) Neurofrigo.  
> **Learning Engine (2.7A):** navegação/consumo (`lesson.*`, `module.*`, `material.*`, `activity.*`, `progress.updated`, `continue.*`, `course.completed`) emitidos via `@omnia/learning-engine`.  
> **MVP Connector:** sessões, policy audit, HTTP/OTel; demais são **contratos reservados**.

---

## 1. Envelope padrão

Todo evento **deve** carregar:

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `eventId` | UUID | Idempotência / dedupe |
| `type` | string | Nome canônico (`student.login`) |
| `timestamp` | ISO-8601 UTC | Instantâneo |
| `actor` | object | `{ type, id, role? }` quem agiu |
| `origin` | enum | `omnia.web` \| `omnia.admin` \| `omnia.connector` \| `moodle` \| `neurofrigo` \| `system` |
| `correlationId` | string | Trace/W3C `traceparent` ou request id |
| `payload` | object | Dados específicos (sem secrets) |
| `tenantId` | string? | Multiempresa |
| `schemaVersion` | number | Default `1` |

**Proibido no payload:** tokens Moodle, `wstoken`, senhas, cookies, URLs Moodle permanentes, PII excessiva (preferir IDs).

---

## 2. Catálogo

### 2.1 Identidade e sessão

| type | Quando | Payload mínimo | MVP |
| --- | --- | --- | :---: |
| `student.login` | Sessão portal/LMS iniciada | `{ omniaUserId, deviceId? }` | ○ |
| `student.logout` | Logout portal ou LMS | `{ omniaUserId, sessionId? }` | ○ |
| `session.created` | `POST /sessions` | `{ sessionId, sessionFamilyId, role }` | ● |
| `session.heartbeat` | Heartbeat | `{ sessionId }` | ● |
| `session.revoked` | Limite / admin / logout | `{ sessionId, reason }` | ● |
| `identity.linked` | IdentityLink ativo | `{ omniaUserId, moodleUserId }` | ○ |
| `identity.revoked` | Link revogado | `{ omniaUserId }` | ○ |
| `policy.changed` | Update lms-settings | `{ changedKeys, actorId }` | ● |

### 2.2 Navegação e consumo

| type | Quando | Payload mínimo | MVP |
| --- | --- | --- | :---: |
| `lesson.opened` | Abre aula/atividade | `{ courseId, activityId }` | ● |
| `lesson.closed` | Sai da aula | `{ courseId, activityId }` | ● |
| `lesson.completed` | Conclusão de aula | `{ courseId, activityId, state }` | ● |
| `module.opened` | Abre módulo | `{ courseId, sectionId }` | ● |
| `module.completed` | Módulo concluído | `{ courseId, sectionId }` | ● |
| `material.opened` | Abre material | `{ courseId, activityId, materialId? }` | ● |
| `material.closed` | Fecha material | `{ courseId, activityId, materialId? }` | ● |
| `material.viewed` | Material visualizado | `{ courseId, activityId, materialId? }` | ● |
| `material.completed` | Material concluído (Experience) | `{ courseId, activityId, materialId? }` | ● |
| `activity.started` | Início atividade | `{ courseId, activityId }` | ● |
| `activity.completed` | Fim atividade | `{ courseId, activityId, state? }` | ● |
| `progress.updated` | Sync progresso | `{ courseId, percent }` | ● |
| `continue.updated` | Pointer continue | `{ courseId, activityId?, source }` | ● |
| `continue.resolved` | Resolve Continuar | `{ courseId, activityId?, source }` | ● |
| `course.opened` | Abre curso | `{ courseId }` | ● |
| `course.completed` | Curso concluído | `{ courseId, timeCompleted? }` | ● |
| `lesson.started` | *(alias legado → use `lesson.opened`)* | `{ courseId, activityId }` | ○ |

### 2.3 Avaliação e conclusão

| type | Quando | Payload mínimo | MVP |
| --- | --- | --- | :---: |
| `assessment.opened` | Abre avaliação | `{ courseId, activityId, assessmentId?, type? }` | ● |
| `assessment.closed` | Fecha avaliação | `{ courseId, activityId }` | ● |
| `assessment.viewed` | Visualiza avaliação | `{ courseId, activityId }` | ● |
| `assessment.completed` | Conclusão local (RO) | `{ courseId, activityId }` | ● |
| `quiz.viewed` | Visualiza quiz | `{ courseId, quizId }` | ● |
| `assignment.viewed` | Visualiza tarefa | `{ courseId, assignmentId }` | ● |
| `grade.viewed` | Visualiza nota | `{ courseId, activityId?, percentage? }` | ● |
| `feedback.viewed` | Visualiza feedback | `{ courseId, activityId }` | ● |
| `quiz.started` | Início quiz (submit futuro) | `{ courseId, quizId }` | — |
| `quiz.finished` | Fim quiz | `{ courseId, quizId, attemptId? }` | — |
| `assignment.submitted` | Entrega | `{ courseId, assignmentId }` | — |
| `grade.updated` | Nota alterada | `{ courseId, itemId?, percentage? }` | ○ |
| `completion.updated` | Completion sync | `{ courseId, activityId?, completed }` | ○ |
| `certificate.generated` | Emissão | `{ courseId, certificateId }` | — |

### 2.3b Academic Provisioning (Sprint 3.0 — audit/domain)

| type | Quando | Payload mínimo | MVP |
| --- | --- | --- | :---: |
| `provision.user.requested` | Comando user (dry-run) | `{ action, omniaUserId, mode }` | ● (audit) |
| `provision.user.completed` | Resultado user | `{ action, mode, code? }` | ● (audit) |
| `enrollment.requested` | Comando matrícula | `{ action, courseId, mode }` | ● (audit) |
| `enrollment.completed` | Resultado matrícula | `{ action, mode, code? }` | ● (audit) |
| `media.authorized` | Grant controlado | `{ assetId, purpose, reason }` | ● (audit) |
| `media.denied` | Deny | `{ assetId, purpose, reason }` | ● (audit) |
| `media.signed` | Token mock | `{ tokenId, mode }` | ● (audit) |
| `media.revoked` | Revogação | `{ tokenId?, grantId? }` | ● (audit) |

### 2.4 Segurança e plataforma

| type | Quando | Payload mínimo | MVP |
| --- | --- | --- | :---: |
| `media.download_blocked` | Tentativa download | `{ reason: MEDIA_DOWNLOAD_FORBIDDEN }` | — |
| `connector.error` | Falha sanitizada | `{ code, endpoint }` | ● (logs/métricas) |
| `lms.http.request` | Observabilidade | métricas OTel/Prom | ● |

### 2.5 Neurofrigo Runtime (Sprint 3.1 — spec; emissão na Fase 1+)

| type | Quando | Payload mínimo | MVP |
| --- | --- | --- | :---: |
| `ai.request.received` | Mensagem recebida | `{ channel, profile? }` | — |
| `ai.intent.classified` | Intent | `{ intent, confidence }` | — |
| `ai.agent.routed` | Especialista | `{ agentId }` | — |
| `ai.context.authorized` / `denied` | Context Builder | `{ slot? }` | — |
| `ai.tool.requested` / `executed` / `denied` | Tool Router | `{ tool, risk }` | — |
| `ai.security_guard.triggered` | Security | `{ decision }` | — |
| `ai.assessment_guard.triggered` | Integridade | `{ reason }` | — |
| `ai.compliance_guard.triggered` | Compliance | `{ action }` | — |
| `ai.response.blocked` | Bloqueio final | `{ reason }` | — |
| `ai.handoff.created` | Humano/CRM | `{ intent, urgency? }` | — |
| `ai.feedback.received` | Feedback | `{ score? }` | — |

● emitido · ○ planejado curto prazo · — futuro

---

## 3. Exemplos

### session.created

```json
{
  "eventId": "9c2e…",
  "type": "session.created",
  "timestamp": "2026-07-31T21:00:00.000Z",
  "actor": { "type": "user", "id": "1", "role": "student" },
  "origin": "omnia.connector",
  "correlationId": "00-abc…-01",
  "payload": {
    "sessionId": "sess_…",
    "sessionFamilyId": "fam_…",
    "role": "student",
    "deviceId": "dev-…"
  },
  "schemaVersion": 1
}
```

### lesson.started

```json
{
  "eventId": "a11e…",
  "type": "lesson.started",
  "timestamp": "2026-07-31T21:05:00.000Z",
  "actor": { "type": "user", "id": "1", "role": "student" },
  "origin": "omnia.web",
  "correlationId": "00-def…-01",
  "payload": { "courseId": 2, "activityId": 5 },
  "schemaVersion": 1
}
```

---

## 4. Correlação com observabilidade

| Camada | Uso |
| --- | --- |
| OTel traces | `correlationId` / `traceparent` |
| Prometheus | contadores por `type` / endpoint |
| `lms_audit_events` | subset segurança (session/policy) |
| Logs JSON | `@omnia/logger` com redaction |

---

## 5. Referências

Domain Model · Session Manager · Observability · Connector Security
