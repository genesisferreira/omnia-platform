# Schema — Users

> Identity domain. Implementação Sprint 2.

## Tabela: `users`

| Coluna       | Tipo         | Descrição                       |
| ------------ | ------------ | ------------------------------- |
| `id`         | UUID         | PK                              |
| `tenant_id`  | UUID         | FK → tenants                    |
| `email`      | VARCHAR(255) | Unique por tenant               |
| `name`       | VARCHAR(255) | —                               |
| `avatar_url` | VARCHAR(500) | MinIO `avatars/`                |
| `status`     | ENUM         | `active`, `inactive`, `blocked` |
| `created_at` | TIMESTAMPTZ  | —                               |
| `updated_at` | TIMESTAMPTZ  | —                               |

## Relacionamentos

- N:M com `workspaces` via `workspace_users`
- N:M com `roles` via `user_roles`
- Payload `users` é separado (admin CMS)
