# Schema — Tenant

> Modelagem conceitual. Implementação Drizzle na Sprint 2.

## Tabela: `tenants`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | PK |
| `slug` | VARCHAR(50) | Identificador único (`ofh`, `renovacao`) |
| `name` | VARCHAR(255) | Nome exibido |
| `status` | ENUM | `active`, `suspended`, `archived` |
| `settings` | JSONB | Configurações do tenant |
| `created_at` | TIMESTAMPTZ | — |
| `updated_at` | TIMESTAMPTZ | — |

## Regras

- Todo registro de negócio referencia `tenant_id`
- Row-Level Security por `tenant_id` (Sprint 2+)
- Ver [TENANT_ARCHITECTURE.md](../../TENANT_ARCHITECTURE.md)
