# Sprint 1 — Banco de Dados

> Drizzle ORM preparado. Sem tabelas de negócio.

## Package

`@omnia/database`

## Estrutura

```
packages/database/
├── drizzle.config.ts
└── src/
    ├── client/       # Conexão PostgreSQL (postgres.js + Drizzle)
    ├── schema/       # Schemas Drizzle (vazio — Sprint 2+)
    ├── migrations/   # Migrations drizzle-kit
    └── seed/         # Seeds (placeholder)
```

## Conexão

```typescript
import { getDatabase, checkDatabaseConnection } from '@omnia/database';

const isUp = await checkDatabaseConnection();
const db = getDatabase();
```

## Variável de ambiente

```
DATABASE_URL=postgresql://omnia:omnia_dev_password@localhost:5432/omnia_platform
```

## Comandos (Sprint 2+)

```bash
pnpm --filter @omnia/database db:generate
pnpm --filter @omnia/database db:migrate
pnpm --filter @omnia/database db:studio
```

## Payload CMS

Payload usa o **mesmo PostgreSQL** com schema próprio para coleções CMS.
Não conflita com tabelas Drizzle quando prefixadas corretamente (ADR-002).

## Próximas tabelas (planejado)

| Módulo | Prefixo | Sprint |
|--------|---------|--------|
| CRM | `crm_` | 5 |
| Marketplace | `mkt_` | 6 |
| Partner | `ptr_` | 7 |
| Academy | `acad_` | 7+ |
