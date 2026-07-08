# Schemas de Banco — Omnia Platform

> Modelagem conceitual. **Sem migrations nesta sprint.**

## Convenções

- Prefixo por módulo: `crm_`, `mkt_`, `acad_`, `ptr_`, `chat_`
- Toda tabela possui: `id`, `tenant_id`, `created_at`, `updated_at`
- Payload CMS mantém schema próprio

## Schemas

| Arquivo | Domínio | Sprint |
|---------|---------|--------|
| [tenant.md](tenant.md) | Multi-tenant | 2 |
| [users.md](users.md) | Identity | 2 |
| [companies.md](companies.md) | Companies | 2 |
| [partners.md](partners.md) | Partner | 7 |
| [crm.md](crm.md) | CRM | 5 |
| [blog.md](blog.md) | Blog | 4 |
| [courses.md](courses.md) | Academy | 7 |
| [marketplace.md](marketplace.md) | Marketplace | 6 |
| [chat.md](chat.md) | Chat | 8+ |
| [automation.md](automation.md) | Automation | 8+ |
| [ai.md](ai.md) | IA | 8+ |

## ORM

- **Drizzle** para dados de aplicação — [ADR-002](../../docs/14-adr/ADR-002-drizzle-orm.md)
- **Payload** para CMS — [ADR-004](../../docs/14-adr/ADR-004-portal-cms-separation.md)
