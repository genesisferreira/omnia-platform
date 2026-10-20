# Omnia LMS — Session Manager

## Persistência

Redis da **Omnia Platform** (`REDIS_URL`), namespace:

```
omnia:lms:sessions:{appEnv}:s:{sessionId}
omnia:lms:sessions:{appEnv}:u:{userId}
```

Não usa Redis do Moodle.

## Campos

`sessionId`, `sessionFamilyId`, `userId`, `role`, `deviceId`, `userAgent` (sanitizado), `ip`, `createdAt`, `lastSeenAt`, `expiresAt`, `revokedAt`, `revokeReason`, `replacementSessionId`.

## Regras

| Perfil  | Default |
| ------- | ------- |
| student | 1       |
| teacher | 2       |
| manager | 2       |
| admin   | 2       |

- Mesma `sessionFamilyId` (abas) → reutiliza sessão ativa.
- Novo login acima do limite → revoga a mais antiga (`SESSION_LIMIT`) se `revokeOldestOnExceed`.
- Logout / admin revoke / revoke-all auditados.
- Heartbeat atualiza `lastSeenAt`.
- Sessão expirada ou revogada não conta como ativa.
- Corrida de logins: script Lua atômico no Redis (memory fallback só DEV/test).

## APIs

Ver `OMNIA_LMS_CONNECTOR_API.md` (`/sessions*`).
