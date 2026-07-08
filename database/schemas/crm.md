# Schema — CRM

> Pipeline de vendas. Sprint 5.

## Tabelas principais

### `crm_leads`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | PK |
| `tenant_id` | UUID | FK |
| `name` | VARCHAR(255) | — |
| `email` | VARCHAR(255) | — |
| `phone` | VARCHAR(20) | — |
| `source` | VARCHAR(50) | web, partner, referral |
| `status` | ENUM | `new`, `contacted`, `qualified`, `lost` |
| `assigned_to` | UUID | FK → users |

### `crm_opportunities`

Pipeline de vendas com estágios configuráveis.

## Eventos

`LeadCreated`, `LeadUpdated`, `LeadConverted`
