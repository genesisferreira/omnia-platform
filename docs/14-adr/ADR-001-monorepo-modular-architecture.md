# ADR-001: Arquitetura Monorepo Modular

## Status

**Aceito** — Sprint 0

## Data

2026-07-07

## Contexto

A Omnia Platform precisa integrar múltiplos módulos de negócio (portal, marketplace, CRM, blog, CMS, IA, automações) para seis empresas do ecossistema Omnia Frigo Holding. A plataforma deve:

- Escalar ao longo de muitos anos
- Permitir evolução independente de módulos
- Compartilhar código (UI, auth, database, IA) sem duplicação
- Suportar múltiplas aplicações (web pública, admin)
- Manter baixo acoplamento e alta coesão
- Facilitar onboarding de novos desenvolvedores

## Decisão

Adotar uma **arquitetura monorepo modular** com as seguintes tecnologias e padrões:

### Monorepo

- **Turborepo** para orquestração de builds e cache
- **pnpm Workspaces** para gestão de dependências
- Estrutura `apps/` (aplicações) + `packages/` (bibliotecas compartilhadas)

### Aplicações (`apps/`)

| App     | Propósito                                           |
| ------- | --------------------------------------------------- |
| `web`   | Portal público, marketplace, blog, área do parceiro |
| `admin` | Painel administrativo, CRM, CMS                     |

### Pacotes (`packages/`)

| Pacote       | Responsabilidade                         |
| ------------ | ---------------------------------------- |
| `ui`         | Design system (shadcn/ui, tokens, hooks) |
| `database`   | Schema, migrations, seeds (PostgreSQL)   |
| `auth`       | Autenticação e autorização               |
| `ai-core`    | Motor de IA (providers, agents, RAG)     |
| `shared`     | Utilitários e tipos compartilhados       |
| `automation` | Workflows n8n                            |

### Padrões Arquiteturais

- **Domain-Driven Design (DDD)** — bounded contexts por módulo de negócio
- **Clean Architecture** — camadas: presentation → application → domain → infrastructure
- **Repository Pattern** — abstração de acesso a dados
- **Service Layer** — lógica de aplicação desacoplada
- **Dependency Injection** — quando aplicável para testabilidade

### Stack

- **Next.js 15** (App Router) para aplicações frontend
- **Payload CMS** para gestão de conteúdo
- **PostgreSQL** como banco principal
- **Redis** para cache e sessões
- **MinIO** para object storage
- **DeepSeek API** como provider primário de IA
- **n8n** para automações
- **Docker Compose** para ambientes locais e deploy

## Alternativas Consideradas

### 1. Multi-repo (microsserviços desde o início)

**Prós:** Isolamento total, deploy independente.
**Contras:** Overhead operacional prematuro, duplicação de código, complexidade de versionamento entre repos, dificulta refatorações cross-module.
**Descartado:** Complexidade desproporcional para o estágio atual do projeto.

### 2. Monolito simples (single Next.js app)

**Prós:** Simplicidade inicial.
**Contras:** Acoplamento alto, dificulta separação admin/web, escala limitada, mistura de concerns.
**Descartado:** Não atende requisitos de modularidade e escalabilidade de longo prazo.

### 3. Nx Monorepo

**Prós:** Ecossistema maduro, generators, affected commands.
**Contras:** Curva de aprendizado maior, overhead de configuração, menos alinhado com ecossistema Next.js/Vercel.
**Descartado:** Turborepo oferece melhor integração com Next.js e simplicidade adequada.

## Consequências

### Positivas

- Código compartilhado sem publicação de pacotes npm
- Refatorações cross-module em um único PR
- Cache de build com Turborepo acelera CI/CD
- Estrutura clara facilita onboarding
- Evolução incremental: monorepo hoje, extração para microsserviços amanhã se necessário
- TypeScript end-to-end com tipos compartilhados

### Negativas

- Repositório cresce em tamanho ao longo do tempo
- CI/CD precisa de estratégia de affected builds (Turborepo resolve)
- Requer disciplina para manter boundaries entre packages
- Clone inicial pode ser mais lento (mitigável com sparse checkout)

### Riscos Mitigados

| Risco                      | Mitigação                               |
| -------------------------- | --------------------------------------- |
| Acoplamento entre packages | ESLint boundaries, code review, ADRs    |
| Build lento                | Turborepo remote cache, affected builds |
| Conflitos de merge         | Feature branches curtas, CODEOWNERS     |

## Referências

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Clean Architecture — Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Domain-Driven Design — Eric Evans](https://domainlanguage.com/ddd/)
