# Omnia LMS — Especificação de Integração (Connector + Políticas)

> Contratos do Connector Omnia ↔ Moodle e serviços de sessão/mídia.  
> **Macroentrega 01:** read-only + session/policy foundation — ver docs `OMNIA_LMS_CONNECTOR_*`.

Documentos relacionados:

- [`OMNIA_LMS_SESSION_POLICY.md`](OMNIA_LMS_SESSION_POLICY.md)
- [`OMNIA_LMS_CONTENT_PROTECTION_POLICY.md`](OMNIA_LMS_CONTENT_PROTECTION_POLICY.md)
- [`OMNIA_LMS_API_MAP.md`](OMNIA_LMS_API_MAP.md)
- [`OMNIA_LMS_CONNECTOR_ARCHITECTURE.md`](OMNIA_LMS_CONNECTOR_ARCHITECTURE.md)
- [`OMNIA_LMS_CONNECTOR_API.md`](OMNIA_LMS_CONNECTOR_API.md)

### Status ME01

| Contrato | Status |
|----------|--------|
| Health + site info | Implementado |
| Read: me/courses/content/progress/grades/completion | Implementado |
| Identity link storage | Implementado (manual DEV) |
| Session create/heartbeat/logout/revoke | Implementado |
| Policy engine (sessão global/perfil) | Implementado |
| Provisionamento / write Moodle | **Não** nesta entrega |
| Media signed URL | Preparado (não real CDN) |

---

## 1. Princípios

1. Browser do aluno fala só com **Omnia BFF** (`lms.*`).  
2. Moodle é SoR acadêmico; sessões de produto são Omnia-first.  
3. Toda mídia passa por **autorização Omnia** (signed/TTL).  
4. Revogação de sessão Omnia implica invalidação Moodle + media tokens.  
5. Sem custom core Moodle; WS oficiais / APIs suportadas.

---

## 2. Contratos de sessão

### 2.1 `POST /internal/sessions` — criar sessão

**Request (lógico):**

```json
{
  "userId": "omnia-user-uuid",
  "moodleUserId": 123,
  "profile": "student",
  "sessionFamilyId": "family-uuid",
  "deviceFingerprint": "hash",
  "ipAddress": "x.x.x.x",
  "userAgent": "…"
}
```

**Response:**

```json
{
  "sessionId": "…",
  "expiresAt": "…",
  "revokedSessionIds": ["…"],
  "accessToken": "…",
  "refreshToken": "…"
}
```

**Comportamento:** aplica limite do perfil; revoga excedente; sincroniza Moodle (`syncLogin` / register binding).

### 2.2 `POST /internal/sessions/validate`

Valida `sessionId` + access token → `active | revoked | expired`.

### 2.3 `GET /internal/sessions?userId=`

Lista sessões ativas (admin/support).

### 2.4 `POST /internal/sessions/{sessionId}/revoke`

Revoga uma sessão; propaga Moodle + media denylist.

### 2.5 `POST /internal/sessions/revoke-all`

Revoga todas do usuário.

### 2.6 `POST /internal/sessions/sync-logout`

Omnia → Moodle: encerra vínculo acadêmico da sessão.

### 2.7 `POST /internal/sessions/heartbeat`

Atualiza `lastActivityAt`; retorna 401 se revogada.

**Códigos de erro padrão:** `SESSION_REVOKED`, `SESSION_EXPIRED`, `SESSION_LIMIT`, `SESSION_RACE`.

---

## 3. Contratos de mídia / proteção de conteúdo

### 3.1 `POST /internal/media/authorize`

```json
{
  "sessionId": "…",
  "userId": "…",
  "courseId": "moodle-or-omnia",
  "activityId": "…",
  "assetId": "…",
  "assetType": "video|document"
}
```

**Checks:** sessão active; enrolment; política efetiva (material>curso>global); `allow*Download` se pedido for download.

**Response:**

```json
{
  "mediaToken": "…",
  "playbackUrl": "https://cdn/…?sig=…&exp=…",
  "mode": "stream|view",
  "expiresAt": "…",
  "watermark": { "enabled": true, "text": "user@… 2026-…" }
}
```

Download quando política `downloadable`: URL assinada distinta com audit flag; default **negado** (`MEDIA_DOWNLOAD_FORBIDDEN`).

### 3.2 `POST /internal/media/validate`

CDN/BFF edge valida token + session ainda active (ou CDN webhook).

### 3.3 `GET /internal/content-policy`

Resolve política efetiva para curso/material.

### 3.4 `POST /internal/media/events`

```json
{
  "type": "view_start|view_progress|view_end|download_attempt|anomaly",
  "sessionId": "…",
  "assetId": "…",
  "positionSec": 120
}
```

### 3.5 Progresso acadêmico

Após eventos de view relevantes, BFF chama Connector Moodle `completion` / progress — **sem** expor media URL ao Moodle UI.

---

## 4. Contratos Connector Moodle (complemento sessão)

| Contrato lógico | Direção | Notas |
| --- | --- | --- |
| `moodle.session.bind` | Omnia→Moodle | Associa sessionId ↔ user Moodle |
| `moodle.session.revoke` | Omnia→Moodle | Invalida sessões server-side do user/device binding |
| `moodle.session.logout` | Omnia→Moodle | Logout sincronizado |
| (já mapeados) user/course/enrol/completion/grades | — | Ver API Capabilities |

Se WS nativo não matar cookie de browser Moodle (porque não há cookie no client), o bind é **autorização Connector**: qualquer chamada Moodle em nome do aluno exige `sessionId` Omnia active.

---

## 5. Configuração (contrato de settings)

```json
{
  "maxConcurrentSessionsStudent": 1,
  "maxConcurrentSessionsTeacher": 2,
  "maxConcurrentSessionsManager": 2,
  "maxConcurrentSessionsAdmin": 2,
  "maxConcurrentSessionsSupport": 2,
  "revokePreviousSessionOnLogin": true,
  "sessionDuration": "12h",
  "mediaTokenTtl": "120s",
  "allowVideoDownload": false,
  "allowDocumentDownload": false,
  "enableWatermark": false
}
```

Curso/material: `contentAccessMode: inherit | view_only | downloadable`.

Auditoria de settings: `actorId`, `path`, `oldValue`, `newValue`, `at`, `reason?`.

---

## 6. Sequência: segundo login (aluno)

```text
Device A: sessão S1 active
Device B: login
  lock(userId)
  create S2
  revoke S1 (reason=login_superseded)
  moodle.session.revoke(S1)
  media denylist(S1)
  unlock
Device A: next heartbeat/API → SESSION_REVOKED → mensagem → login
```

---

## 7. Sequência: play sem download

```text
Player → authorize media
  validate session + enrol + policy=view_only
  return signed HLS + mediaToken
Player → segments
  each renew checks session
Admin revokes session → next segment/renew 401
```

---

## 8. Fora de escopo desta spec

- Implementação de código
- Plugins Moodle
- Escolha final de vendor CDN/VOD
- DRM Widevine/FairPlay (pode ser evolução futura documentada em RFC)
