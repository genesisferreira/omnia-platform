# Coleções Payload CMS — Roadmap

> Configuração mínima na Sprint 1. Coleções de negócio nas próximas sprints.

## Sprint 1

| Coleção | Status | Propósito |
|---------|--------|-----------|
| `users` | ✅ Mínima | Autenticação admin do Payload |

## Planejado

| Coleção | Sprint | Módulo |
|---------|--------|--------|
| `pages` | 3 | Portal / CMS |
| `posts` | 4 | Blog |
| `categories` | 4 | Blog |
| `tags` | 4 | Blog |
| `companies` | 3 | Multiempresa |
| `partners` | 7 | Parceiros |
| `products` | 6 | Marketplace |
| `services` | 6 | Marketplace |
| `banners` | 3 | Portal |
| `media` | 1+ | Biblioteca de mídia |

## Nota

Dados de CRM, marketplace (pedidos, leads) usam **Drizzle ORM** (`@omnia/database`), não Payload.
Payload é para **conteúdo gerenciável** (CMS).
