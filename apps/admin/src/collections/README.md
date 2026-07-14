# Coleções Payload CMS — Sprint 2

| Coleção   | Slug        | Descrição                                           |
| --------- | ----------- | --------------------------------------------------- |
| Users     | `users`     | Usuários admin com autenticação                     |
| Tenants   | `tenants`   | Multiempresa — tenant principal                     |
| Companies | `companies` | Empresas do ecossistema Holding                     |
| Media     | `media`     | Biblioteca de mídia (upload local; MinIO preparado) |

## Global

| Global         | Slug              | Descrição                      |
| -------------- | ----------------- | ------------------------------ |
| GlobalSettings | `global-settings` | Configurações do site e portal |

## Seed

```bash
pnpm --filter @omnia/admin seed
```

Cadastra tenant Omnia Holding + 6 empresas do ecossistema.

## Regras

- Portal (`apps/web`) consome via REST API — nunca importa Payload
- Blog, CRM, Marketplace → sprints futuras
