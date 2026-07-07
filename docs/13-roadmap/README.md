# Roadmap

> Roadmap de desenvolvimento da Omnia Platform.

## Finalidade

Planejamento de **sprints e releases**, priorização de features e marcos do projeto.

## Conteúdo Esperado

- Roadmap por sprint (Sprint 0 a Sprint 8+)
- Milestones do GitHub
- Dependências entre entregas
- Critérios de "done" por sprint
- Changelog de planejamento

## Responsável

Product Owner / Arquiteto de Software

## Milestones

| Sprint | Foco Principal | Status |
|--------|----------------|--------|
| Sprint 0 | Fundação (monorepo, docs, CI, TypeScript) | ✅ Concluída |
| Sprint 0.5 | Foundation Hardening (tooling, packages infra, guidelines) | ✅ Concluída |
| Sprint 1 | Setup técnico (Next.js, Payload, Docker, Drizzle) | ⬜ Planejada |
| Sprint 2 | Auth, database, design system | ⬜ Planejada |
| Sprint 3 | Portal e CMS | ⬜ Planejada |
| Sprint 4 | Blog | ⬜ Planejada |
| Sprint 5 | CRM | ⬜ Planejada |
| Sprint 6 | Marketplace | ⬜ Planejada |
| Sprint 7 | Parceiros e admin | ⬜ Planejada |
| Sprint 8+ | IA, chat, n8n | ⬜ Planejada |

## Critérios de Done — Sprint 0.5

- [x] Tooling compartilhado (`typescript-config`, `eslint-config`, `prettier-config`)
- [x] 9 packages de infraestrutura (types, constants, sdk, logger, security, integrations, monitoring, feature-flags, i18n)
- [x] Pasta `modules/` com 10 bounded contexts
- [x] 11 guidelines de engenharia
- [x] ADR-003 (Foundation Hardening)
- [x] `APPS_ARCHITECTURE.md` — divisão futura de apps documentada
- [x] Estrutura `src/` padronizada em todos os packages
- [x] `@omnia/shared` refinado (apenas utils puros)

## Critérios de Done — Sprint 0

- [x] Estrutura de pastas (apps, packages, docs, docker, config, assets, scripts)
- [x] Monorepo funcional (pnpm workspaces + Turborepo)
- [x] `package.json` em todos os workspaces (8 workspaces)
- [x] TypeScript configurado (`@omnia/typescript-config` + configs por workspace)
- [x] ESLint + Prettier + EditorConfig operacionais
- [x] CI funcional (lint, typecheck, format, build)
- [x] ADR-001 (monorepo) e ADR-002 (Drizzle ORM)
- [x] Documentação estruturada (21 seções + templates GitHub)
- [x] `.env.example` e `.vscode` configurados
