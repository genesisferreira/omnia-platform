# ADR-003: Foundation Hardening (Sprint 0.5)

## Status

**Aceito** — Sprint 0.5

## Data

2026-07-07

## Contexto

Após a Sprint 0 (fundação documental e monorepo básico), a arquitetura precisava de hardening antes do primeiro commit para suportar evolução de longo prazo (100k+ usuários, multiempresa, CRM, marketplace, IA).

Gaps identificados:

- Configs TypeScript/ESLint/Prettier duplicáveis e não centralizadas
- Tipos e constantes misturados em `@omnia/shared`
- Ausência de packages transversais (security, logger, monitoring, i18n)
- Sem mapa de módulos de negócio (bounded contexts)
- Guidelines de engenharia não formalizadas

## Decisão

### 1. Tooling compartilhado

Criar packages de configuração:

| Package | Responsabilidade |
|---------|------------------|
| `@omnia/typescript-config` | tsconfig base, nextjs, react-library, node |
| `@omnia/eslint-config` | ESLint base + next |
| `@omnia/prettier-config` | Prettier centralizado |

### 2. Separação de concerns em packages

| Package | Responsabilidade |
|---------|------------------|
| `@omnia/types` | Tipos por bounded context (DDD) |
| `@omnia/constants` | Roles, permissions, routes, status |
| `@omnia/shared` | Apenas utilitários puros (legado migrado) |
| `@omnia/sdk` | Client API pública |
| `@omnia/logger` | Logging estruturado |
| `@omnia/security` | JWT, RBAC, encryption, audit, headers |
| `@omnia/integrations` | Conectores externos (raw adapters) |
| `@omnia/monitoring` | OpenTelemetry, Sentry, Prometheus |
| `@omnia/feature-flags` | Flags dinâmicas |
| `@omnia/i18n` | Internacionalização (pt-BR inicial) |

### 3. Módulos de negócio

Pasta `modules/` na raiz — documentação de bounded contexts (portal, crm, marketplace, etc.) sem código.

### 4. Apps — divisão futura documentada

Manter `apps/web` e `apps/admin`. Documentar divisão futura em `APPS_ARCHITECTURE.md` (portal, landing, docs, status).

### 5. Guidelines

11 documentos de engenharia na raiz (CODING_STANDARDS, SECURITY_GUIDELINES, etc.).

### 6. IA — estrutura expandida

`@omnia/ai-core` ganha `prompt-library/` e `workflow-engine/`. Conectores raw em `@omnia/integrations`.

## Alternativas consideradas

### Tudo em `@omnia/shared`

**Descartado:** Viola SRP e dificulta tree-shaking e boundaries DDD.

### Criar apps agora (portal, landing, docs)

**Descartado:** Prematuro sem código; documentar divisão futura.

### ESLint 9 flat config

**Adiado:** ESLint 8 com shared config é suficiente; migrar na Sprint 1.

## Consequências

### Positivas

- Foundation pronta para anos de evolução
- Boundaries claros entre tipos, constantes, utils, integrações
- Onboarding acelerado via guidelines
- CI valida todos os workspaces
- Segurança e LGPD preparados arquiteturalmente

### Negativas

- Mais packages para manter (mitigado por placeholders)
- Curva inicial maior para novos devs (mitigado por docs)

## Referências

- [ADR-001](ADR-001-monorepo-modular-architecture.md)
- [ADR-002](ADR-002-drizzle-orm.md)
- [ARCHITECTURE_DECISIONS.md](../../ARCHITECTURE_DECISIONS.md)
