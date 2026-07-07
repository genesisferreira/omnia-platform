# @omnia/sdk

SDK TypeScript para consumo das APIs da Omnia Platform.

## Estrutura

```
src/
├── client/     # HTTP client, autenticação, retry, interceptors
├── resources/  # Recursos tipados por domínio (crm, marketplace, etc.)
└── index.ts
```

## Uso previsto

```typescript
// Sprint 3+ — exemplo futuro
import { OmniaClient } from '@omnia/sdk';

const client = new OmniaClient({ apiKey: '...' });
const leads = await client.crm.leads.list();
```

## Dependências futuras

- `@omnia/types` — tipos de request/response
- `@omnia/constants` — rotas e status

## Status

**Sprint 0.5** — Estrutura preparada. Implementação na **Sprint 3+** (após API v1).
