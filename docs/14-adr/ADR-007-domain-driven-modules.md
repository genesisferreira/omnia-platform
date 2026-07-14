# ADR-007: Arquitetura Modular por Domínios

## Status

**Aceito** — Sprint 1.1

## Data

2026-07-07

## Contexto

O monorepo crescerá com múltiplos módulos de negócio. Pastas `modules/` (documentação) e `packages/` (código) precisam de uma camada explícita de **domínio** alinhada a DDD.

## Decisão

Criar pasta `domains/` na raiz como **mapa de bounded contexts** com documentação rica, complementando:

| Pasta                | Papel                                                   |
| -------------------- | ------------------------------------------------------- |
| `domains/`           | Bounded contexts — objetivo, responsabilidades, eventos |
| `modules/`           | Visão de produto e módulos de negócio                   |
| `packages/types/`    | Tipos TypeScript por domínio                            |
| `packages/database/` | Persistência por domínio                                |

### Domínios

`core`, `portal`, `blog`, `crm`, `academy`, `marketplace`, `partner`, `chat`, `automation`, `cms`, `companies`, `identity`

### Regras

1. Domínio **não importa** outro domínio diretamente — comunicação via eventos ou APIs
2. `domains/core` contém primitivos compartilhados (Tenant, User, Money)
3. Cada domínio documenta eventos futuros em `events/`
4. Código de use cases vive nos apps; domínio puro em `packages/types` + `domains/`

## Consequências

- Onboarding claro por bounded context
- Evolução independente por domínio
- Base para Event-Driven Architecture

## Referências

- [DOMAIN_ARCHITECTURE.md](../../DOMAIN_ARCHITECTURE.md)
- [events/README.md](../../events/README.md)
