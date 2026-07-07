# Omnia Platform

> Plataforma SaaS modular do ecossistema Omnia Frigo Holding

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-22+-green.svg)](.nvmrc)
[![pnpm](https://img.shields.io/badge/pnpm-9+-orange.svg)](pnpm-workspace.yaml)

---

## Visão Geral

A **Omnia Platform** é uma infraestrutura tecnológica de longo prazo que integra todo o ecossistema da Omnia Frigo Holding. A plataforma unifica portal institucional, marketplace, CRM, área do parceiro, painel administrativo, blog, CMS, chat inteligente, assistente de IA e automações — tudo em uma arquitetura modular, escalável e de nível empresarial.

### Empresas do Ecossistema

- **Omnia Frigo Holding** — Holding e gestão central
- **Renovação Refrigeração** — Serviços de refrigeração
- **Neurofrigo** — Soluções neurotecnológicas
- **Fred do Frio Academy** — Educação e capacitação
- **CTE** — Centro Técnico Especializado
- **Centro Educacional Sapientia** — Educação formal

---

## Arquitetura

Monorepo com **Turborepo** e **pnpm Workspaces**, seguindo **DDD**, **Clean Architecture** e **Modular Architecture**.

```
omnia-platform/
├── apps/                 # Aplicações (web, admin)
├── packages/             # 21 packages (tooling, domínio, infra)
├── modules/              # Bounded contexts DDD (documentação)
├── docs/                 # Documentação técnica
├── docker/               # Containerização
├── scripts/              # Scripts operacionais
├── config/               # Configurações por ambiente
└── assets/               # Branding e recursos estáticos
```

**Guidelines:** [CODING_STANDARDS.md](CODING_STANDARDS.md) · [MODULES.md](MODULES.md) · [ARCHITECTURE_DECISIONS.md](ARCHITECTURE_DECISIONS.md)

Consulte [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) e [docs/08-architecture](docs/08-architecture/) para detalhes.

---

## Tecnologias

| Categoria | Stack |
|-----------|-------|
| Framework | Next.js 15, React, TypeScript |
| UI | Tailwind CSS, shadcn/ui |
| CMS | Payload CMS |
| Banco | PostgreSQL + Drizzle ORM |
| Cache | Redis |
| Storage | MinIO |
| IA | DeepSeek API, Omnia AI Core |
| Automação | n8n |
| Infra | Docker, Docker Compose |
| CI/CD | GitHub Actions |
| Qualidade | ESLint, Prettier, EditorConfig |

---

## Estrutura de Documentação

| Pasta | Conteúdo |
|-------|----------|
| `docs/00-product-vision` | Visão de produto |
| `docs/01-blueprint` | Blueprint técnico |
| `docs/02-prd` | Product Requirements Document |
| `docs/08-architecture` | Arquitetura e ADRs |
| `docs/13-roadmap` | Roadmap de sprints |
| `docs/14-adr` | Architecture Decision Records |

Veja a pasta [docs/](docs/) para a documentação completa.

---

## Roadmap

| Sprint | Status | Foco |
|--------|--------|------|
| Sprint 0 | ✅ Concluída | Fundação — estrutura, docs, monorepo |
| Sprint 0.5 | ✅ Concluída | Foundation Hardening — tooling, packages infra |
| Sprint 1 | ⬜ Planejado | Setup Next.js, Payload, Docker Compose |
| Sprint 2 | ⬜ Planejado | Auth, database, design system |
| Sprint 3 | ⬜ Planejado | Portal institucional e CMS |
| Sprint 4+ | ⬜ Planejado | Blog, CRM, marketplace, IA |

---

## Como Executar

> ✅ **Foundation concluída (Sprint 0 + 0.5)**: Arquitetura enterprise preparada. Aplicações na **Sprint 1**.

### Pré-requisitos

- Node.js 22+ ([.nvmrc](.nvmrc))
- pnpm 9+
- Docker e Docker Compose (Sprint 1+)
- PostgreSQL 16+ (Sprint 1+)
- Redis 7+ (Sprint 1+)

### Setup (Sprint 1+)

```bash
# Clonar o repositório
git clone https://github.com/genesisferreira/omnia-platform.git
cd omnia-platform

# Instalar dependências
pnpm install

# Verificar qualidade do código
pnpm lint
pnpm typecheck
pnpm format:check

# Configurar variáveis de ambiente
cp .env.example .env

# Iniciar infraestrutura (Sprint 1+)
# docker compose -f docker/compose/development.yml up -d

# Iniciar desenvolvimento (Sprint 1+)
# pnpm dev
```

### Variáveis de Ambiente

Copie `.env.example` para `.env` e preencha os valores. Consulte [docs/09-infrastructure](docs/09-infrastructure/) para detalhes.

---

## Contribuição

Consulte [CONTRIBUTING.md](.github/CONTRIBUTING.md) para diretrizes de contribuição, Git Flow e estratégia de Pull Requests.

---

## Licença

Este projeto está licenciado sob a [MIT License](LICENSE).

---

## Equipe

**Omnia Frigo Holding** — Engenharia de Software

| Papel | Responsabilidade |
|-------|------------------|
| Arquiteto de Software | Arquitetura, ADRs, revisão técnica |
| Engenheiro Full Stack | Desenvolvimento de módulos |
| DevOps | Infraestrutura, CI/CD, Docker |
| Product Owner | Requisitos, priorização |

---

## Status do Projeto

| Aspecto | Status |
|---------|--------|
| Fundação (Sprint 0 + 0.5) | ✅ Concluída |
| Aplicações | ⬜ Sprint 1 |
| Banco de Dados | ⬜ Sprint 1 |
| Autenticação | ⬜ Sprint 2 |
| CMS | ⬜ Sprint 1 |
| IA / Chat | ⬜ Sprint 8+ |
| Automações n8n | ⬜ Sprint 8+ |

---

*Omnia Platform — Construindo o futuro do ecossistema Omnia Frigo Holding.*
