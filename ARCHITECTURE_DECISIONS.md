# Decisões Arquiteturais — Omnia Platform

> Índice central de decisões. ADRs formais em `docs/14-adr/`.

## ADRs aceitos

| ADR | Título | Data | Resumo |
|-----|--------|------|--------|
| [ADR-001](docs/14-adr/ADR-001-monorepo-modular-architecture.md) | Monorepo Modular | 2026-07-07 | Turborepo + pnpm |
| [ADR-002](docs/14-adr/ADR-002-drizzle-orm.md) | Drizzle ORM | 2026-07-07 | Drizzle para dados app |
| [ADR-003](docs/14-adr/ADR-003-foundation-hardening.md) | Foundation Hardening | 2026-07-07 | Tooling, packages infra |
| [ADR-004](docs/14-adr/ADR-004-portal-cms-separation.md) | Separação Portal/CMS | 2026-07-07 | Payload só no admin |
| [ADR-005](docs/14-adr/ADR-005-multi-tenant-architecture.md) | Multiempresa | 2026-07-07 | tenantId obrigatório |
| [ADR-006](docs/14-adr/ADR-006-ai-architecture.md) | Arquitetura IA | 2026-07-07 | ai-core + integrations |
| [ADR-007](docs/14-adr/ADR-007-domain-driven-modules.md) | Domínios modulares | 2026-07-07 | pasta domains/ |
| [ADR-008](docs/14-adr/ADR-008-architecture-freeze-governance.md) | Congelamento de Arquitetura | 2026-07-07 | Governança Sprint 1.2 |

## Documentos de arquitetura

| Documento | Conteúdo |
|-----------|----------|
| [SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md) | Visão geral e fluxos |
| [PROJECT_PRINCIPLES.md](PROJECT_PRINCIPLES.md) | Princípios oficiais |
| [GOVERNANCE.md](GOVERNANCE.md) | Processos de desenvolvimento |
| [DEPENDENCY_RULES.md](DEPENDENCY_RULES.md) | Regras de dependência |
| [IMPORT_RULES.md](IMPORT_RULES.md) | Aliases e imports |
| [OBSERVABILITY.md](OBSERVABILITY.md) | Logs, métricas, tracing |
| [SECURITY_REVIEW.md](SECURITY_REVIEW.md) | Revisão de segurança |
| [TENANT_ARCHITECTURE.md](TENANT_ARCHITECTURE.md) | Multiempresa |
| [DOMAIN_ARCHITECTURE.md](DOMAIN_ARCHITECTURE.md) | Bounded contexts |
| [EVENT_ARCHITECTURE.md](EVENT_ARCHITECTURE.md) | Event-Driven |
| [STORAGE_ARCHITECTURE.md](STORAGE_ARCHITECTURE.md) | MinIO |
| [AI_ARCHITECTURE.md](AI_ARCHITECTURE.md) | Motor IA |
| [SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md) | Segurança |
| [DEPLOYMENT_ARCHITECTURE.md](DEPLOYMENT_ARCHITECTURE.md) | Deploy |

## Como propor nova decisão

1. Criar `docs/14-adr/ADR-NNN-titulo.md`
2. PR com label `architecture`
3. Atualizar este índice

## Referências

- [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md)
- [docs/14-adr/](docs/14-adr/)
