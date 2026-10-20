# Arquitetura de Segurança — Omnia Platform

> Camada transversal de segurança — `@omnia/security` + `@omnia/auth`.

## Packages

| Package           | Escopo                                             |
| ----------------- | -------------------------------------------------- |
| `@omnia/auth`     | Fluxos de autenticação (login, logout, middleware) |
| `@omnia/security` | Primitivas reutilizáveis                           |

## Módulos `@omnia/security`

```
src/
├── rbac/         # Role-Based Access Control
├── permissions/  # Permissões granulares
├── roles/        # Definição de roles
├── policies/     # Políticas de acesso
├── audit/        # Trilha de auditoria (LGPD)
├── headers/      # CSP, HSTS, security headers
├── csrf/         # CSRF tokens
├── xss/          # Sanitização
├── rate-limit/   # Rate limiting
├── logs/         # Security event logging
├── encryption/   # Hash, encrypt/decrypt
├── tokens/       # Token utilities
├── jwt/          # JWT sign/verify
├── sessions/     # Session management
└── middleware/   # Security middleware
```

## Fluxo de autenticação (Sprint 2+)

```
User → @omnia/auth/login → JWT + refresh cookie → @omnia/security/jwt
     → RBAC check → @omnia/security/permissions
```

## LGPD

- Auditoria em `audit/` — quem acessou dados pessoais
- Criptografia de campos sensíveis em `encryption/`
- Redação de PII em logs

## Headers obrigatórios (produção)

CSP, HSTS, X-Frame-Options, X-Content-Type-Options — ver [SECURITY_GUIDELINES.md](SECURITY_GUIDELINES.md)

## ADR

Futuros ADRs para JWT strategy e RBAC model.
