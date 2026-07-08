# Security Review — Omnia Platform

> Revisão de segurança arquitetural (Sprint 1.2). Implementação na Sprint 2+.

Package principal: [`@omnia/security`](packages/security/) + [`@omnia/auth`](packages/auth/)

---

## Resumo executivo

| Área | Status atual | Sprint implementação |
|------|--------------|---------------------|
| JWT | Estrutura preparada | 2 |
| RBAC | Módulos documentados | 2 |
| Headers | Guidelines definidos | 2 |
| CSP | Módulo `headers/` | 2 |
| XSS | Módulo `xss/` | 2 |
| CSRF | Módulo `csrf/` | 2 |
| Rate Limit | Módulo `rate-limit/` | 2 |
| Audit | Módulo `audit/` | 2 |
| LGPD | Arquitetura definida | 2–3 |
| Cookies | Pendente | 2 |
| Sessões | Módulo `sessions/` | 2 |

---

## JWT

### Decisões planejadas (Sprint 2)

| Aspecto | Recomendação |
|---------|--------------|
| Algoritmo | RS256 (prod) / HS256 (dev) |
| Access token | 15 min, header `Authorization: Bearer` |
| Refresh token | 7 dias, httpOnly cookie |
| Rotação | Refresh token rotation a cada uso |
| Revogação | Blacklist em Redis |

### Riscos mitigados

- Token theft → cookies httpOnly + SameSite
- Replay → rotação + blacklist
- XSS exfiltration → não armazenar JWT em localStorage

---

## RBAC

### Modelo

```
User → Roles → Permissions → Resources
```

### Roles iniciais (Sprint 2)

| Role | Escopo |
|------|--------|
| `super_admin` | Plataforma inteira |
| `tenant_admin` | Tenant específico |
| `editor` | CMS conteúdo |
| `user` | Portal autenticado |
| `partner` | Área parceiro |

### Recomendações

- Permissões granulares em `@omnia/security/permissions`
- Verificação em middleware + service layer (defense in depth)
- Tenant isolation em **toda** query

---

## Security Headers

### Produção (obrigatórios)

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### CSP (recomendado Sprint 2)

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{random}';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://api.deepseek.com;
  frame-ancestors 'none';
```

---

## XSS

| Vetor | Mitigação |
|-------|-----------|
| User input | Sanitização (`@omnia/security/xss`) |
| Rich text CMS | Payload sanitization + CSP |
| React | JSX auto-escape (default) |
| dangerouslySetInnerHTML | Proibido sem sanitização |

---

## CSRF

| Contexto | Estratégia |
|----------|------------|
| Cookie-based auth | CSRF token double-submit |
| Bearer token API | Não aplicável |
| Webhooks | Signature verification (HMAC) |

---

## Rate Limit

| Endpoint | Limite sugerido |
|----------|-----------------|
| Login | 5/min por IP |
| API geral | 100/min por user |
| Chat IA | 20/min por user |
| Webhooks | 1000/min por tenant |

Implementação: `@omnia/security/rate-limit` + Redis.

---

## Audit & LGPD

### Trilha de auditoria

- Quem, quando, o quê, de onde (IP)
- Armazenamento imutável (append-only)
- Exportação para DPO

### LGPD

| Direito | Implementação |
|---------|---------------|
| Acesso | Export API |
| Retificação | Update com audit |
| Exclusão | Soft delete + anonymization job |
| Portabilidade | JSON/CSV export |
| Consentimento | Registro com timestamp |

### Dados sensíveis

- Criptografia em repouso (campos PII)
- Mascaramento em logs
- Retenção documentada

---

## Cookies & Sessões

### Recomendações

```
Set-Cookie:
  HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800
```

| Cookie | Uso |
|--------|-----|
| `refresh_token` | Auth refresh |
| `session_id` | Sessão server-side (Redis) |
| `csrf_token` | Proteção CSRF |

**Nunca** armazenar access token em cookie sem criptografia adicional.

---

## Recomendações futuras

| Prioridade | Item | Sprint |
|------------|------|--------|
| Alta | Implementar JWT + refresh rotation | 2 |
| Alta | RBAC middleware | 2 |
| Alta | Rate limit em login e IA | 2 |
| Média | CSP com nonces | 2 |
| Média | Sentry para erros de segurança | 2 |
| Média | Penetration test pré-produção | 10 |
| Baixa | WAF (Cloudflare/AWS) | Deploy |
| Baixa | mTLS entre serviços | Microserviços |

---

## Documentos relacionados

- [SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md)
- [SECURITY_GUIDELINES.md](SECURITY_GUIDELINES.md)
- [packages/security/](packages/security/)
