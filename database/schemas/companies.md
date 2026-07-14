# Schema — Companies

> Empresas do ecossistema. Sprint 2.

## Tabela: `companies`

| Coluna       | Tipo         | Descrição                   |
| ------------ | ------------ | --------------------------- |
| `id`         | UUID         | PK                          |
| `tenant_id`  | UUID         | FK → tenants                |
| `slug`       | VARCHAR(20)  | OFH, RR, NF, FDFA, CTE, CES |
| `name`       | VARCHAR(255) | Nome legal                  |
| `trade_name` | VARCHAR(255) | Nome fantasia               |
| `cnpj`       | VARCHAR(14)  | Criptografado               |
| `logo_url`   | VARCHAR(500) | MinIO                       |
| `created_at` | TIMESTAMPTZ  | —                           |

## Constantes

`@omnia/constants/companies` — slugs e IDs fixos do ecossistema.
