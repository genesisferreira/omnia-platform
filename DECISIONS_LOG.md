# Log de Decisões — Omnia Platform

> Registro cronológico de decisões arquiteturais e de produto. ADRs formais em [`docs/14-adr/`](docs/14-adr/).

---

## 2026-07-07 — Monorepo modular com pnpm + Turborepo

| Campo            | Valor                                                               |
| ---------------- | ------------------------------------------------------------------- |
| **Motivo**       | Escalabilidade de equipe, builds incrementais, código compartilhado |
| **Alternativas** | Multi-repo, Nx, Lerna                                               |
| **Impacto**      | Estrutura `apps/` + `packages/`, CI com cache                       |
| **ADR**          | [ADR-001](docs/14-adr/ADR-001-monorepo-modular-architecture.md)     |

---

## 2026-07-07 — Drizzle ORM para dados de aplicação

| Campo            | Valor                                         |
| ---------------- | --------------------------------------------- |
| **Motivo**       | Type-safety, SQL explícito, leveza vs Prisma  |
| **Alternativas** | Prisma, TypeORM, Kysely                       |
| **Impacto**      | `packages/database`, migrations futuras       |
| **ADR**          | [ADR-002](docs/14-adr/ADR-002-drizzle-orm.md) |

---

## 2026-07-07 — Foundation Hardening (Sprint 0.5)

| Campo            | Valor                                                  |
| ---------------- | ------------------------------------------------------ |
| **Motivo**       | Packages transversais antes de features                |
| **Alternativas** | Implementar infra junto com features                   |
| **Impacto**      | 18 packages base, guidelines, `modules/`               |
| **ADR**          | [ADR-003](docs/14-adr/ADR-003-foundation-hardening.md) |

---

## 2026-07-07 — Separação Portal / CMS (Payload só no admin)

| Campo            | Valor                                                   |
| ---------------- | ------------------------------------------------------- |
| **Motivo**       | Desacoplamento, performance do portal, segurança        |
| **Alternativas** | Payload em ambos apps, headless CMS externo             |
| **Impacto**      | `apps/web` sem Payload; conteúdo via API                |
| **ADR**          | [ADR-004](docs/14-adr/ADR-004-portal-cms-separation.md) |

---

## 2026-07-07 — Arquitetura multi-tenant (Tenant → Company → Workspace)

| Campo            | Valor                                                       |
| ---------------- | ----------------------------------------------------------- |
| **Motivo**       | Suporte a múltiplas empresas e parceiros                    |
| **Alternativas** | Single-tenant, schema por tenant                            |
| **Impacto**      | Modelagem em `database/schemas/`, isolamento por `tenantId` |
| **ADR**          | [ADR-005](docs/14-adr/ADR-005-multi-tenant-architecture.md) |

---

## 2026-07-07 — Arquitetura de IA centralizada

| Campo            | Valor                                             |
| ---------------- | ------------------------------------------------- |
| **Motivo**       | Guardrails, custos, troca de provider             |
| **Alternativas** | LLM direto em cada feature                        |
| **Impacto**      | `@omnia/ai-core` com 15 módulos preparados        |
| **ADR**          | [ADR-006](docs/14-adr/ADR-006-ai-architecture.md) |

---

## 2026-07-07 — Domínios modulares (`domains/`)

| Campo            | Valor                                                   |
| ---------------- | ------------------------------------------------------- |
| **Motivo**       | DDD explícito, bounded contexts documentados            |
| **Alternativas** | Apenas `modules/`, feature folders em apps              |
| **Impacto**      | 12 domínios com README, regras de dependência           |
| **ADR**          | [ADR-007](docs/14-adr/ADR-007-domain-driven-modules.md) |

---

## 2026-07-07 — Congelamento de arquitetura e governança (Sprint 1.2)

| Campo            | Valor                                                            |
| ---------------- | ---------------------------------------------------------------- |
| **Motivo**       | Eliminar refatorações futuras; base estável para 10+ anos        |
| **Alternativas** | Continuar evoluindo estrutura organicamente                      |
| **Impacto**      | 9 novos packages, docs de governança, quality gates              |
| **ADR**          | [ADR-008](docs/14-adr/ADR-008-architecture-freeze-governance.md) |

---

## 2026-07-07 — Packages transversais Sprint 1.2

| Campo            | Valor                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------- |
| **Motivo**       | Padronizar config, erros, cache, filas, busca, testes                                     |
| **Alternativas** | Implementar ad-hoc em cada sprint                                                         |
| **Impacto**      | `config`, `errors`, `events`, `cache`, `mail`, `queue`, `validation`, `search`, `testing` |
| **ADR**          | [ADR-008](docs/14-adr/ADR-008-architecture-freeze-governance.md)                          |

---

_Novas decisões devem ser adicionadas aqui e, quando estruturais, documentadas em ADR._
