# Schema — Blog

> Conteúdo editorial. Sprint 4.

## Estratégia

- **CMS (Payload):** posts, categorias, tags, autores — coleções Payload
- **Drizzle:** apenas dados complementares (analytics, SEO metrics)

## Coleções Payload (futuro)

- `posts`, `categories`, `tags`, `authors`

## Tabelas Drizzle (opcional)

### `blog_post_analytics`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `post_id` | VARCHAR | ID Payload |
| `tenant_id` | UUID | FK |
| `views` | INTEGER | — |
| `date` | DATE | — |
