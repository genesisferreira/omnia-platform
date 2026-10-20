# @omnia/feature-flags

Feature flags dinâmicas para rollout gradual.

## Estrutura (Sprint 1.1)

```
src/
├── flags/       # Definições de feature flags
├── providers/   # Redis, env vars, remote config
├── rules/       # Regras de avaliação
├── segments/    # Segmentação (tenant, user, role)
└── experiments/ # A/B testing
```

## Estratégia

| Tipo      | Package                     | Uso          |
| --------- | --------------------------- | ------------ |
| Estáticas | `@omnia/constants/features` | Build/deploy |
| Dinâmicas | `@omnia/feature-flags`      | Runtime      |

## Status

**Sprint 1.1** — Estrutura expandida. Implementação na **Sprint 2+**.
