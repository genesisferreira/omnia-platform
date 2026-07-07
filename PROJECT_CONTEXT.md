# Omnia Platform — Contexto do Projeto

> Documento central de referência para toda a equipe de engenharia, produto e design.

---

## Visão da Plataforma

A **Omnia Platform** é uma plataforma SaaS modular que integra todo o ecossistema da **Omnia Frigo Holding**. Não é um site institucional isolado — é uma infraestrutura tecnológica de longo prazo, projetada para escalar ao longo de muitos anos, suportando múltiplos módulos de negócio com integração profunda entre eles.

A plataforma unifica portal institucional, marketplace, CRM, área do parceiro, painel administrativo, blog, CMS, chat inteligente, assistente de IA e automações — tudo em uma arquitetura coesa e extensível.

---

## Objetivos

1. **Unificar** o ecossistema digital da Omnia Frigo Holding em uma única plataforma.
2. **Modularizar** funcionalidades para evolução independente sem quebrar o todo.
3. **Escalar** horizontal e verticalmente conforme o crescimento do negócio.
4. **Automatizar** processos operacionais via n8n e IA.
5. **Garantir** segurança, observabilidade e manutenibilidade de nível empresarial.

---

## Empresas do Ecossistema

| Empresa | Sigla | Domínio |
|---------|-------|---------|
| Omnia Frigo Holding | OFH | Holding e gestão central |
| Renovação Refrigeração | RR | Serviços de refrigeração |
| Neurofrigo | NF | Soluções neurotecnológicas |
| Fred do Frio Academy | FDFA | Educação e capacitação |
| CTE | CTE | Centro Técnico Especializado |
| Centro Educacional Sapientia | CES | Educação formal |

---

## Arquitetura

### Padrões Adotados

- **Monorepo** com Turborepo e pnpm Workspaces
- **Domain-Driven Design (DDD)**
- **Clean Architecture**
- **Modular Architecture**
- **Repository Pattern**
- **Service Layer**
- **Dependency Injection** (quando aplicável)
- **SOLID**

### Camadas

```
┌─────────────────────────────────────────────┐
│              Presentation Layer             │
│         (apps/web, apps/admin)              │
├─────────────────────────────────────────────┤
│              Application Layer              │
│         (use cases, services)               │
├─────────────────────────────────────────────┤
│                Domain Layer                 │
│         (entities, value objects)           │
├─────────────────────────────────────────────┤
│             Infrastructure Layer            │
│    (database, redis, minio, ai, n8n)        │
└─────────────────────────────────────────────┘
```

### Estrutura do Monorepo

```
omnia-platform/
├── apps/           # Aplicações (web, admin → portal, landing, docs)
├── packages/       # Bibliotecas compartilhadas (18 packages)
├── modules/        # Bounded contexts de negócio (documentação DDD)
├── docs/           # Documentação técnica e de produto
├── docker/         # Configurações Docker
├── scripts/        # Scripts operacionais
├── config/         # Configurações por ambiente
└── assets/         # Recursos estáticos e branding
```

### Packages principais

| Camada | Packages |
|--------|----------|
| Tooling | `typescript-config`, `eslint-config`, `prettier-config` |
| Domínio | `types`, `constants` |
| Infra | `database`, `integrations`, `logger`, `monitoring` |
| Cross-cutting | `auth`, `security`, `feature-flags`, `i18n`, `sdk` |
| UI/IA | `ui`, `ai-core`, `automation`, `shared` |

---

## Stack Tecnológica

| Categoria | Tecnologia |
|-----------|------------|
| Framework | Next.js 15 |
| UI | React, TypeScript, Tailwind CSS, shadcn/ui |
| CMS | Payload CMS |
| Banco de Dados | PostgreSQL + Drizzle ORM |
| Cache | Redis |
| Object Storage | MinIO |
| IA | DeepSeek API, Omnia AI Core |
| Automação | n8n |
| Monorepo | Turborepo, pnpm Workspaces |
| Containerização | Docker, Docker Compose |
| CI/CD | GitHub Actions |
| Qualidade | ESLint, Prettier, EditorConfig |

---

## Hierarquia de Documentação

| Documento | Papel |
|-----------|-------|
| `PROJECT_CONTEXT.md` | **Fonte única de verdade** — visão, arquitetura, convenções |
| `README.md` | Visão geral e instruções de execução (referencia este documento) |
| `.cursor/omnia-context.md` | Resumo para Cursor AI (referencia este documento) |
| `docs/` | Documentação técnica detalhada por domínio |
| `docs/14-adr/` | Decisões arquiteturais formais (ADRs) |

---

## Roadmap

| Sprint | Foco |
|--------|------|
| **Sprint 0** | ✅ Fundação — estrutura, docs, monorepo |
| **Sprint 0.5** | ✅ Foundation Hardening — tooling, packages infra, guidelines |
| **Sprint 1** | Setup Next.js, Payload CMS, Docker Compose |
| **Sprint 2** | Autenticação, banco de dados, design system |
| **Sprint 3** | Portal institucional e CMS |
| **Sprint 4** | Blog e conteúdo |
| **Sprint 5** | CRM base |
| **Sprint 6** | Marketplace |
| **Sprint 7** | Área do parceiro e painel admin |
| **Sprint 8+** | IA, chat, automações n8n |

---

## Escopo do MVP

- Portal Institucional
- Marketplace
- CRM
- Área do Parceiro
- Painel Administrativo
- Blog
- CMS (Payload)
- Chat Inteligente
- Omnia AI Assistant
- Omnia AI Core
- Automações com n8n
- Integração entre todos os módulos

---

## Convenções

### Nomenclatura

- **Pastas**: kebab-case (`ai-core`, `business-rules`)
- **Arquivos TypeScript**: kebab-case (`user-service.ts`)
- **Componentes React**: PascalCase (`UserCard.tsx`)
- **Variáveis/funções**: camelCase (`getUserById`)
- **Constantes**: UPPER_SNAKE_CASE (`MAX_RETRY_COUNT`)
- **Tipos/Interfaces**: PascalCase (`UserProfile`)

### Branches (Git Flow)

- `main` — produção
- `develop` — integração
- `staging` — homologação
- `feature/*` — novas funcionalidades
- `release/*` — preparação de releases
- `hotfix/*` — correções urgentes em produção

### Commits

Seguir [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(crm): adicionar pipeline de vendas
fix(auth): corrigir expiração de token JWT
docs(architecture): atualizar ADR-001
chore(deps): atualizar dependências
```

---

## Padrões

- **Testes**: unitários para domínio, integração para APIs, E2E para fluxos críticos
- **API**: REST com versionamento (`/api/v1/`)
- **Erros**: formato padronizado com código, mensagem e detalhes
- **Logs**: estruturados (JSON) com correlation ID
- **Segurança**: OWASP Top 10, princípio do menor privilégio
- **Acessibilidade**: WCAG 2.1 AA

---

## Princípios

1. **Baixo acoplamento, alta coesão** — módulos independentes, responsabilidades claras
2. **Código como documentação** — nomes expressivos, funções pequenas
3. **Segurança por design** — não como afterthought
4. **Observabilidade** — métricas, logs e traces desde o início
5. **Evolução incremental** — entregar valor contínuo, refatorar com segurança
6. **Preservação** — nunca apagar arquivos sem justificativa documentada

---

*Última atualização: Sprint 0.5 — Foundation Hardening v1.2 (concluída)*
