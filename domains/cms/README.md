# CMS

> Gestão de conteúdo via Payload CMS.

**Sprint:** 1 / 3

## Objetivo

Centralizar a criação, edição e publicação de conteúdo estruturado — páginas, posts, mídia — exclusivamente na aplicação administrativa.

## Responsabilidades

- Configurar collections e globals no Payload CMS
- Gerenciar upload de mídia via MinIO
- Expor API REST para consumo por portal e blog
- Restringir instância Payload a `apps/admin` (sem CMS no `apps/web`)

## Dependências

| Domínio  | Uso                       |
| -------- | ------------------------- |
| **core** | Primitivos compartilhados |

## Integrações

- **Payload CMS** — headless CMS em `apps/admin`
- **MinIO** — armazenamento de mídia e assets

## Eventos futuros

Nenhum evento de domínio planejado nesta fase. O CMS atua como provedor de conteúdo; eventos editoriais (ex.: `PostPublished`) pertencem ao domínio blog.

## Referências

- [DOMAIN_ARCHITECTURE.md](../../DOMAIN_ARCHITECTURE.md)
- [ADR-004 — Separação Portal/CMS](../../docs/14-adr/ADR-004-portal-cms-separation.md)
- [apps/admin/README.md](../../apps/admin/README.md)
