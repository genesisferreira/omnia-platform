# @omnia/database

Camada de acesso a dados da Omnia Platform.

## Estrutura

```
database/
├── src/
│   ├── schema/    # Definições Drizzle ORM (ADR-002)
│   ├── client.ts  # Conexão PostgreSQL
│   └── index.ts   # Exports públicos
├── migrations/    # Migrations versionadas (drizzle-kit)
└── seed/          # Dados iniciais e de referência
```

## Banco

PostgreSQL 16 + **Drizzle ORM** (ver [ADR-002](../../docs/14-adr/ADR-002-drizzle-orm.md))

> Payload CMS mantém seu próprio ORM para coleções CMS. Drizzle é usado para dados de aplicação customizados.

## Status

**Sprint 0** — Workspace configurado. Implementação na **Sprint 1**.
