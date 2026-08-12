# Omnia Media Security

| Controle                               | Status      |
| -------------------------------------- | ----------- |
| S2S `x-omnia-internal-key`             | ●           |
| RBAC (role no header)                  | ●           |
| Idempotency-Key (authorize)            | ●           |
| Correlation-Id                         | ●           |
| Rate limit `lms:media`                 | ●           |
| Replay protection (interface + memory) | ○ preparado |
| Crypto signature (interface + stub)    | ○ preparado |
| Policy validation                      | ●           |
| Audit `lms-audit-events`               | ●           |

Sem exposição pública de `/internal/media/*` sem S2S. Proxy Web só via sessão Omnia + secret server-side.
