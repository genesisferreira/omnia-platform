# Sprint 1 — Arquitetura Executável

> Transição da fundação documental para base executável.

## Visão geral

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation                          │
│  apps/web (3000)          apps/admin (3001)             │
│  Next.js 15               Next.js 15 + Payload CMS      │
├─────────────────────────────────────────────────────────┤
│                    Shared Packages                       │
│  @omnia/ui (shadcn)   @omnia/database (Drizzle)        │
├─────────────────────────────────────────────────────────┤
│                    Infrastructure (Docker)               │
│  PostgreSQL │ Redis │ MinIO │ n8n                        │
└─────────────────────────────────────────────────────────┘
```

## Apps

| App | Porta | Responsabilidade Sprint 1 |
|-----|-------|---------------------------|
| `@omnia/web` | 3000 | Portal placeholder + healthcheck |
| `@omnia/admin` | 3001 | Admin placeholder + Payload CMS |

## Payload vs Drizzle

| Camada | Tecnologia | Dados |
|--------|------------|-------|
| CMS | Payload CMS | Conteúdo, usuários admin |
| Aplicação | Drizzle ORM | CRM, marketplace (Sprint 2+) |

## Fluxo de desenvolvimento

```bash
pnpm docker:dev    # 1. Infra
pnpm dev           # 2. Apps (web + admin)
```

## ADRs relacionados

- [ADR-001](../14-adr/ADR-001-monorepo-modular-architecture.md)
- [ADR-002](../14-adr/ADR-002-drizzle-orm.md)
- [ADR-003](../14-adr/ADR-003-foundation-hardening.md)

## Não implementado (proposital)

Login, RBAC, CRM, marketplace, blog, IA, chat, automações reais.
