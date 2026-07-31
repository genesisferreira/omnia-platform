# Omnia LMS — Connector API (BFF)

> Contratos oficiais do Connector. **Não criar endpoints novos nesta sprint (2.6.5).**  
> Base DEV: `https://admin.dev.omniafrigo.com.br/api/omnia/lms`  
> Web proxy: `https://dev.omniafrigo.com.br/api/lms/*` (S2S + scrub Moodle URLs).

Autenticação:

- Sessão Payload (`req.user`), ou
- S2S: `x-omnia-internal-key` + `x-omnia-user-id` (+ opcional `x-omnia-lms-role`)

Nunca enviar `moodleUserId` pelo browser para impersonação.  
Nunca devolver `wstoken` / URL Moodle ao browser (scrub no proxy Web).

---

## 1. Endpoints

| Método | Path | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/health` | público (sem secrets) | Health agregado |
| GET | `/me` | sim | Usuário acadêmico vinculado |
| GET | `/courses` | sim | Matrículas + cursos (`page`, `pageSize≤50`) |
| GET | `/courses/:courseId` | sim | Detalhe (exige matrícula) |
| GET | `/courses/:courseId/content` | sim | Seções/atividades |
| GET | `/courses/:courseId/progress` | sim | Completion de atividades |
| GET | `/grades?courseId=` | sim | Notas |
| GET | `/completion?courseId=` | sim | Completion do curso |
| POST | `/sessions` | sim | Cria sessão (aplica limite) |
| POST | `/sessions/heartbeat` | sim | Atualiza `lastSeenAt` |
| POST | `/sessions/logout` | sim | Revoga sessão |
| GET | `/sessions?userId=` | admin | Lista sessões ativas |
| POST | `/sessions/:sessionId/revoke` | admin | Revoga uma |
| POST | `/sessions/revoke-all` | admin | Revoga todas de um usuário |

---

## 2. Contratos por endpoint

### GET `/health`

| | |
| --- | --- |
| **Permissão** | Público |
| **Cache** | Curto / no-store operacional |
| **Rate limit** | Padrão edge |
| **DTO resposta** | `{ ok, status, moodle, sessionStore, cacheStore, mode, … }` |
| **Erros** | 5xx se dependências críticas (sanitizado) |

### GET `/me`

| | |
| --- | --- |
| **Permissão** | Usuário autenticado |
| **Cache** | no-store / curto |
| **Rate limit** | por user |
| **DTO ok vinculado** | `{ ok: true, connected: true, user: { … } }` |
| **DTO sem vínculo** | `{ ok: true, connected: false, reason: "MOODLE_IDENTITY_NOT_LINKED" }` |
| **Erros** | 401 unauthorized |

### GET `/courses`

| | |
| --- | --- |
| **Permissão** | Student+ com IdentityLink |
| **Query** | `page`, `pageSize` (≤50) |
| **Cache** | Connector cache RO |
| **Rate limit** | por user |
| **DTO** | `{ ok, connected, items: [{ moodleCourseId, course: { displayName, fullName, summary } }] }` |
| **Erros** | 401; sem link → connected false |

### GET `/courses/:courseId`

| | |
| --- | --- |
| **Permissão** | Matrícula ativa |
| **Cache** | Connector |
| **DTO** | `{ ok, connected, course: { … } }` |
| **Erros** | 403/404 se não matriculado |

### GET `/courses/:courseId/content`

| | |
| --- | --- |
| **Permissão** | Matrícula |
| **DTO** | `{ sections: [{ sectionId, name, summary, activities: [{ moodleActivityId, name, modName, visible }] }] }` |
| **Erros** | 403/404 |
| **Nota** | Pode conter URLs Moodle no BFF; **proxy Web deve scrubbar** antes do browser |

### GET `/courses/:courseId/progress`

| | |
| --- | --- |
| **Permissão** | Matrícula |
| **DTO** | `{ progress: { activities: [{ moodleActivityId, state }] } }` |
| **Erros** | 403/404 |

### GET `/grades?courseId=`

| | |
| --- | --- |
| **Permissão** | Matrícula |
| **DTO** | `{ grades: [{ itemName, gradeFormatted, percentage }] }` |
| **Erros** | 400 sem courseId; 403 |

### GET `/completion?courseId=`

| | |
| --- | --- |
| **Permissão** | Matrícula |
| **DTO** | `{ completion: { completed, timeCompleted } }` |
| **Erros** | 400/403 |

### POST `/sessions`

| | |
| --- | --- |
| **Permissão** | Usuário autenticado |
| **Body** | `{ deviceId?, sessionFamilyId? }` |
| **DTO** | `{ ok, session: { sessionId, sessionFamilyId, expiresAt, role }, revokedSessionIds }` |
| **Rate limit** | `sessions-create` |
| **Erros** | 401; policy |

### POST `/sessions/heartbeat`

| | |
| --- | --- |
| **Body** | `{ sessionId }` |
| **DTO** | `{ ok, sessionId, lastSeenAt, expiresAt }` |
| **Erros** | 400; sessão inválida/revogada |

### POST `/sessions/logout`

| | |
| --- | --- |
| **Body** | `{ sessionId }` |
| **DTO** | `{ ok: true }` |

### Admin session APIs

| | |
| --- | --- |
| **Permissão** | admin |
| **Rate limit** | admin |
| **Erros** | 403 |

---

## 3. Sem vínculo

```json
{ "ok": true, "connected": false, "reason": "MOODLE_IDENTITY_NOT_LINKED" }
```

## 4. Health (exemplo)

```json
{
  "ok": true,
  "status": "healthy",
  "moodle": { "reachable": true, "authenticated": true, "version": "4.5.12", "latencyMs": 120 },
  "sessionStore": { "reachable": true },
  "cacheStore": { "reachable": true },
  "mode": "read_only"
}
```

---

## 5. Permissões (matriz resumida)

| Endpoint | student | teacher | manager | admin |
| --- | :---: | :---: | :---: | :---: |
| me/courses/content/progress/grades/completion | ● | ● | ● | ● |
| sessions create/hb/logout (próprio) | ● | ● | ● | ● |
| sessions list/revoke | — | — | — | ● |

---

## 6. Referências

Connector Architecture · Domain Model · Business Rules · Connector Security · Frontend Architecture
