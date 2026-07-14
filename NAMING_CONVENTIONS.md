# Convenções de Nomenclatura — Omnia Platform

## Pastas e arquivos

| Elemento       | Convenção                 | Exemplo                           |
| -------------- | ------------------------- | --------------------------------- |
| Pastas         | kebab-case                | `ai-core`, `feature-flags`        |
| Arquivos TS    | kebab-case                | `user-service.ts`                 |
| Arquivos React | PascalCase                | `UserCard.tsx`                    |
| Testes         | `*.test.ts` / `*.spec.ts` | `lead-service.test.ts`            |
| ADRs           | `ADR-NNN-titulo.md`       | `ADR-003-foundation-hardening.md` |

## Código

| Elemento          | Convenção                       | Exemplo               |
| ----------------- | ------------------------------- | --------------------- |
| Variáveis/funções | camelCase                       | `getUserById`         |
| Constantes        | UPPER_SNAKE_CASE                | `MAX_RETRY_COUNT`     |
| Tipos/Interfaces  | PascalCase                      | `UserProfile`         |
| Enums             | PascalCase + members PascalCase | `OrderStatus.Pending` |
| Generics          | T, K, V ou descritivo           | `TEntity`             |

## Packages npm

- Escopo: `@omnia/{name}`
- kebab-case: `@omnia/ai-core`, `@omnia/feature-flags`

## Branches (Git Flow)

| Branch      | Uso                               |
| ----------- | --------------------------------- |
| `main`      | Produção                          |
| `develop`   | Integração                        |
| `staging`   | Homologação                       |
| `feature/*` | Features (`feature/crm-pipeline`) |
| `release/*` | Preparação de release             |
| `hotfix/*`  | Correções urgentes                |

## Commits (Conventional Commits)

```
feat(crm): adicionar pipeline de vendas
fix(auth): corrigir expiração de token JWT
docs(architecture): atualizar ADR-003
chore(deps): atualizar dependências
refactor(types): extrair tipos de marketplace
```

## Banco de dados (Sprint 1+)

| Elemento | Convenção                      | Exemplo                     |
| -------- | ------------------------------ | --------------------------- |
| Tabelas  | snake_case, prefixo por módulo | `crm_leads`, `mkt_products` |
| Colunas  | snake_case                     | `created_at`, `tenant_id`   |
| Índices  | `idx_{table}_{columns}`        | `idx_crm_leads_status`      |

## API REST

| Elemento       | Convenção          | Exemplo             |
| -------------- | ------------------ | ------------------- |
| Endpoints      | plural, kebab-case | `/api/v1/crm/leads` |
| Query params   | camelCase          | `?pageSize=20`      |
| Headers custom | `X-Omnia-*`        | `X-Omnia-Tenant-Id` |

## Módulos de negócio

Pasta `modules/` — nomes curtos em inglês: `portal`, `crm`, `marketplace`, `partner`, `academy`, `chat`, `ai`, `automation`, `cms`.
