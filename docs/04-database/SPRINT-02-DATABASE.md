# Sprint 2 — Database

## Camadas de dados

| Camada | Tecnologia | Sprint 2 |
|--------|------------|----------|
| CMS | Payload + PostgreSQL | ✅ Coleções ativas |
| App | Drizzle ORM | ⬜ Schema vazio (Sprint 3+) |

## Tabelas Payload (auto-geradas)

Payload cria tabelas automaticamente para:

- `users`, `tenants`, `companies`, `media`
- `global_settings` (global)
- Tabelas de autenticação Payload

## Multiempresa

```
Tenant (omnia-holding)
  └── Companies (6 empresas da Holding)
```

Campo `tenant` em `companies` é relationship opcional no CMS.

## Migrations Drizzle

Não criadas nesta sprint — dados de negócio app (CRM, etc.) na Sprint 3+.

## Seed

```bash
pnpm --filter @omnia/admin seed
```

Cria tenant + 6 empresas + global settings padrão.
