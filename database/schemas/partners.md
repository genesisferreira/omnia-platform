# Schema — Partners

> Área do parceiro. Sprint 7.

## Tabela: `partners`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | PK |
| `tenant_id` | UUID | FK |
| `user_id` | UUID | FK → users (opcional) |
| `company_name` | VARCHAR(255) | — |
| `cnpj_cpf` | VARCHAR(14) | Criptografado |
| `status` | ENUM | `pending`, `approved`, `rejected`, `suspended` |
| `commission_rate` | DECIMAL | % comissão |
| `approved_at` | TIMESTAMPTZ | — |
| `created_at` | TIMESTAMPTZ | — |

## Eventos

`PartnerCreated`, `PartnerApproved` — ver [events/README.md](../../events/README.md)
