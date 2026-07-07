# Decisões Arquiteturais — Omnia Platform

> Índice central de decisões. ADRs formais em `docs/14-adr/`.

## ADRs aceitos

| ADR | Título | Data | Resumo |
|-----|--------|------|--------|
| [ADR-001](docs/14-adr/ADR-001-monorepo-modular-architecture.md) | Monorepo Modular | 2026-07-07 | Turborepo + pnpm, apps + packages |
| [ADR-002](docs/14-adr/ADR-002-drizzle-orm.md) | Drizzle ORM | 2026-07-07 | Drizzle para dados app; Payload para CMS |
| [ADR-003](docs/14-adr/ADR-003-foundation-hardening.md) | Foundation Hardening | 2026-07-07 | Tooling shared, packages infra, modules/ |

## Decisões por categoria

### Monorepo

- **Turborepo** sobre Nx — simplicidade + Next.js
- **pnpm** sobre npm/yarn — performance e strict deps
- **pnpm catalog** — versões centralizadas

### Packages

| Decisão | Alternativa descartada | Motivo |
|---------|----------------------|--------|
| `@omnia/types` separado de `shared` | Tudo em shared | Separação DDD, tree-shaking |
| `@omnia/constants` separado | Enums em types | Constantes imutáveis isoladas |
| `@omnia/integrations` vs `ai-core` | Tudo em ai-core | Adapter pattern, reuso não-AI |
| `@omnia/security` vs `auth` | Tudo em auth | Primitivas vs fluxos |

### Apps

- Manter `web` + `admin` agora; dividir na Sprint 3+ ([APPS_ARCHITECTURE.md](APPS_ARCHITECTURE.md))

### IA

- DeepSeek primário, OpenAI fallback
- `integrations` = conectores; `ai-core` = orquestração

### Segurança

- JWT + refresh token rotation
- RBAC com permissions granulares
- Audit trail para LGPD

### Observabilidade

- OpenTelemetry como padrão de traces
- Sentry para errors
- Prometheus + Grafana para métricas

## Como propor nova decisão

1. Criar `docs/14-adr/ADR-NNN-titulo.md` com template
2. PR com label `architecture`
3. Review do arquiteto
4. Atualizar este índice

## Referências

- [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md)
- [docs/14-adr/](docs/14-adr/)
