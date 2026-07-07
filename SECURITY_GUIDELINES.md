# Diretrizes de Segurança — Omnia Platform

> Preparação arquitetural para segurança de nível empresarial. Implementação progressiva.

## Autenticação (JWT)

| Aspecto | Diretriz | Package |
|---------|----------|---------|
| Access token | JWT, TTL curto (15min) | `@omnia/auth` |
| Refresh token | HttpOnly cookie, rotação | `@omnia/auth` |
| Algoritmo | RS256 ou HS256 com secret forte | `@omnia/security/auth` |
| Payload | `sub`, `tenantId`, `roles`, `iat`, `exp` | `@omnia/types/auth` |

## Autorização (RBAC)

- Roles em `@omnia/constants/roles`
- Permissões granulares em `@omnia/constants/permissions`
- Verificação em `@omnia/security/permissions`
- Middleware em apps e API routes
- Princípio do menor privilégio

## Headers de segurança

Preparado em `@omnia/security/headers`:

| Header | Valor |
|--------|-------|
| `Content-Security-Policy` | Restritivo, nonce para scripts |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |

## CSRF

- Tokens CSRF para formulários state-changing
- SameSite cookies (`Strict` ou `Lax`)
- Validação em `@omnia/security/headers`

## XSS

- React escapa por padrão — nunca `dangerouslySetInnerHTML` sem sanitização
- CSP restritivo
- Sanitizar HTML de CMS (DOMPurify)

## Rate limiting

- `@omnia/security/rate-limit` — Redis-backed
- Por IP, userId, tenantId
- Endpoints sensíveis: login, reset password, API pública

## Auditoria (LGPD)

- `@omnia/security/audit` — trilha imutável
- Registrar: quem, quando, o quê, tenantId
- Acesso a dados pessoais sempre auditado
- Retenção conforme política LGPD

## Criptografia

- `@omnia/security/encryption` — campos sensíveis (CPF, CNPJ)
- Senhas: bcrypt ou argon2 (nunca plaintext)
- Secrets apenas em variáveis de ambiente

## Logs

- Nunca logar: senhas, tokens, CPF completo, cartão
- Redação de PII via `@omnia/logger/formatters`
- Correlation ID em toda requisição

## Secrets

- `.env` nunca commitado
- Rotação periódica de `JWT_SECRET`, `PAYLOAD_SECRET`
- CI: GitHub Secrets

## Referências

- OWASP Top 10
- LGPD (Lei 13.709/2018)
- [SECURITY.md](.github/SECURITY.md)
