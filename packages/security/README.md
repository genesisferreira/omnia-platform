# @omnia/security

Utilitários de segurança transversais da Omnia Platform.

## Estrutura

```
src/
├── auth/         # JWT, refresh tokens, validação de sessão
├── encryption/   # Hash (bcrypt/argon2), encrypt/decrypt
├── audit/        # Trilha de auditoria imutável (LGPD)
├── rate-limit/   # Rate limiting (Redis-backed)
├── headers/      # CSP, HSTS, X-Frame-Options, CSRF tokens
├── permissions/  # RBAC, verificação de permissões granulares
└── index.ts
```

## Relação com outros packages

| Package | Responsabilidade |
|---------|------------------|
| `@omnia/auth` | Fluxos de autenticação (login, logout, middleware) |
| `@omnia/security` | Primitivas de segurança reutilizáveis |
| `@omnia/constants` | Roles e permissions como constantes |

## Preparação LGPD

- `audit/` — registro de acesso a dados pessoais
- `encryption/` — criptografia de campos sensíveis
- Redação de PII em logs via `@omnia/logger`

## Status

**Sprint 0.5** — Estrutura preparada. Implementação na **Sprint 2+**.
