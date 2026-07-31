# Omnia LMS — Connector API (BFF)

Base: `https://admin.dev.omniafrigo.com.br/api/omnia/lms` (DEV).

Autenticação:

- Sessão Payload (`req.user`), ou
- S2S: `x-omnia-internal-key` + `x-omnia-user-id` (+ opcional `x-omnia-lms-role`)

Nunca enviar `moodleUserId` pelo browser para impersonação.

## Endpoints

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

## Sem vínculo

```json
{ "ok": true, "connected": false, "reason": "MOODLE_IDENTITY_NOT_LINKED" }
```

## Health (exemplo)

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
