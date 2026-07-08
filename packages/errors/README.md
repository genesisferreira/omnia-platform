# @omnia/errors

Hierarquia de erros tipados para toda a plataforma.

## Classes

| Classe | HTTP | Uso |
|--------|------|-----|
| `AppError` | 500 | Base |
| `AuthenticationError` | 401 | Não autenticado |
| `AuthorizationError` | 403 | Sem permissão |
| `ValidationError` | 400 | Input inválido |
| `BusinessError` | 422 | Regra de negócio |
| `ExternalServiceError` | 502 | Integração externa |
| `ConflictError` | 409 | Duplicidade |
| `NotFoundError` | 404 | Recurso ausente |
| `RateLimitError` | 429 | Rate limit |

## Uso (Sprint 2+)

```typescript
import { NotFoundError } from '@omnia/errors';
throw new NotFoundError('Lead não encontrado');
```

## Formato API

```json
{ "error": { "code": "NOT_FOUND_ERROR", "message": "..." } }
```

## Status

**Sprint 1.2** — Estrutura de classes criada. Handler global na Sprint 2+.
