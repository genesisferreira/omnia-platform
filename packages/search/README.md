# @omnia/search

Busca full-text para múltiplos domínios.

## Estrutura

```
src/
├── providers/   # Meilisearch, Elasticsearch (futuro)
├── indexers/    # Indexação por domínio
└── documents/   # Tipos de documento indexável
```

## Domínios cobertos (futuro)

| Domínio | Índice |
|---------|--------|
| Blog | `blog_posts` |
| Marketplace | `products` |
| Parceiros | `partners` |
| Cursos | `courses` |
| CRM | `leads`, `contacts` |

## Status

**Sprint 1.2** — Estrutura preparada. Implementação na **Sprint 4+**.
