# @omnia/security

Utilitários de segurança transversais.

## Estrutura (Sprint 1.1)

```
src/
├── rbac/         # Role-Based Access Control
├── permissions/  # Permissões granulares
├── roles/        # Definição de roles
├── policies/     # Políticas de acesso
├── audit/        # Trilha de auditoria (LGPD)
├── headers/      # CSP, HSTS, security headers
├── csrf/         # CSRF protection
├── xss/          # Sanitização XSS
├── rate-limit/   # Rate limiting (Redis)
├── logs/         # Security event logging
├── encryption/   # Hash, encrypt/decrypt
├── tokens/       # Token utilities
├── jwt/          # JWT sign/verify
├── sessions/     # Session management
└── middleware/   # Security middleware
```

## Relação com `@omnia/auth`

| Package           | Escopo                   |
| ----------------- | ------------------------ |
| `@omnia/auth`     | Login, logout, fluxos    |
| `@omnia/security` | Primitivas reutilizáveis |

Ver [SECURITY_ARCHITECTURE.md](../../SECURITY_ARCHITECTURE.md).

## Status

**Sprint 1.1** — Estrutura expandida. Implementação na **Sprint 2+**.
