# @omnia/feature-flags

Feature flags dinâmicas para rollout gradual e A/B testing.

## Estrutura

```
src/
├── providers/  # Redis, env vars, remote config
└── index.ts
```

## Estratégia

| Tipo | Package | Uso |
|------|---------|-----|
| Estáticas | `@omnia/constants/features` | Flags de build/deploy |
| Dinâmicas | `@omnia/feature-flags` | Rollout por tenant/user |

## Uso previsto

```typescript
// Sprint 2+ — exemplo futuro
import { isEnabled } from '@omnia/feature-flags';

if (await isEnabled('marketplace-v2', { tenantId: 'ofh' })) {
  // ...
}
```

## Status

**Sprint 0.5** — Estrutura preparada. Implementação na **Sprint 2+**.
