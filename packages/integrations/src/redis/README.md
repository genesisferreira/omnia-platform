# redis

Conector **Redis** — cache, sessões, rate limiting e filas leves.

## Package

`@omnia/integrations/redis`

Usado por `@omnia/auth` (sessões), `@omnia/security` (rate limit) e `@omnia/monitoring` (health checks).

## Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `REDIS_URL` | URL de conexão (ex.: `redis://localhost:6379`) |

## Sprint

**Sprint 1** (Docker Compose) · **Sprint 2** (sessões e rate limit em produção).

## Princípios

- Connection pooling e reconnect automático
- Prefixo de keys por tenant (`tenant:{id}:…`)
- TTL explícito em sessões e cache — sem keys eternas
