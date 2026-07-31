# Omnia LMS — Event Catalog

> **Sprint 2.6.5** — Catálogo oficial de eventos de domínio/produto.  
> **Status:** Aceito.  
> Eventos alimentam analytics, auditoria, observabilidade e (futuro) Neurofrigo.  
> **MVP:** subset emitido (sessões, policy audit, HTTP/OTel); demais são **contratos reservados**.

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
| `course.opened` | Abre `/lms/cursos/:id` | `{ courseId }` | ○ |
| `course.started` | Primeiro progresso > 0 | `{ courseId }` | ○ |
| `lesson.started` | Abre atividade/aula | `{ courseId, activityId }` | ○ |
| `lesson.completed` | Completion atividade | `{ courseId, activityId, state }` | ○ |
| `material.opened` | Abre material | `{ courseId, activityId, materialId? }` | — |
| `continue.resolved` | Continue Learning | `{ courseId, activityId?, source }` | ○ |

### 2.3 Avaliação e conclusão

| type | Quando | Payload mínimo | MVP |
| --- | --- | --- | :---: |
| `quiz.started` | Início quiz | `{ courseId, quizId }` | — |
| `quiz.finished` | Fim quiz | `{ courseId, quizId, attemptId? }` | — |
| `assignment.submitted` | Entrega | `{ courseId, assignmentId }` | — |
| `grade.updated` | Nota alterada | `{ courseId, itemId?, percentage? }` | ○ |
| `completion.updated` | Completion sync | `{ courseId, activityId?, completed }` | ○ |
| `certificate.generated` | Emissão | `{ courseId, certificateId }` | — |

### 2.4 Segurança e plataforma

| type | Quando | Payload mínimo | MVP |
| --- | --- | --- | :---: |
| `media.download_blocked` | Tentativa download | `{ reason: MEDIA_DOWNLOAD_FORBIDDEN }` | — |
| `connector.error` | Falha sanitizada | `{ code, endpoint }` | ● (logs/métricas) |
| `lms.http.request` | Observabilidade | métricas OTel/Prom | ● |

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
