# Omnia Platform — Contexto para Cursor AI

> Resumo operacional. **Fonte completa:** [PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md)

## Projeto

Plataforma SaaS modular — portal, marketplace, CRM, CMS, IA, automações. Monorepo enterprise.

## Estrutura

```
apps/          web, admin (→ portal, landing, docs, status)
packages/      18 packages (tooling, domínio, infra, cross-cutting)
modules/       10 bounded contexts (portal, crm, marketplace, etc.)
```

## Packages-chave

| Package | Escopo |
|---------|--------|
| `typescript-config`, `eslint-config`, `prettier-config` | Tooling |
| `types`, `constants` | Domínio DDD |
| `shared` | Utils puros apenas |
| `database` | Drizzle ORM (ADR-002) |
| `integrations` | Conectores raw |
| `ai-core` | Orquestração IA |
| `security`, `auth`, `logger`, `monitoring` | Cross-cutting |

## Guidelines

[CODING_STANDARDS.md](../CODING_STANDARDS.md) · [SECURITY_GUIDELINES.md](../SECURITY_GUIDELINES.md) · [ARCHITECTURE_DECISIONS.md](../ARCHITECTURE_DECISIONS.md)

## Sprint

**Foundation concluída (Sprint 0 + 0.5).** Próxima: **Sprint 1** — Next.js, Payload, Docker, Drizzle.

## Regras

1. ADRs em `docs/14-adr/` antes de mudanças arquiteturais
2. `types` e `constants` separados de `shared`
3. `integrations` = adapters; `ai-core` = orquestração
4. Módulos documentados em `modules/`
