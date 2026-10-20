# Módulos de Negócio — Omnia Platform

> Bounded contexts de domínio (DDD). Cada módulo representa um contexto de negócio independente.

## Finalidade

A pasta `modules/` documenta os **módulos de negócio** da plataforma. Não contém código — serve como mapa arquitetural entre domínio, packages e apps.

## Módulos

| Módulo                      | Bounded Context          | Packages relacionados                     | App principal              |
| --------------------------- | ------------------------ | ----------------------------------------- | -------------------------- |
| [portal](portal/)           | Portal institucional     | `types`, `ui`, `i18n`                     | `apps/web` → `apps/portal` |
| [blog](blog/)               | Conteúdo editorial       | `types`, `integrations/payload`           | `apps/web`                 |
| [crm](crm/)                 | Gestão de relacionamento | `types`, `database`, `sdk`                | `apps/admin`               |
| [marketplace](marketplace/) | E-commerce B2B/B2C       | `types`, `database`, `integrations/minio` | `apps/web`                 |
| [partner](partner/)         | Área do parceiro         | `types`, `auth`, `security`               | `apps/web`                 |
| [academy](academy/)         | Educação e cursos        | `types`, `database`                       | `apps/web`                 |
| [chat](chat/)               | Chat inteligente         | `ai-core`, `integrations/deepseek`        | `apps/web`                 |
| [ai](ai/)                   | Motor de IA              | `ai-core`, `integrations`                 | Transversal                |
| [automation](automation/)   | Workflows n8n            | `automation`, `integrations/n8n`          | Transversal                |
| [cms](cms/)                 | Gestão de conteúdo       | `integrations/payload`                    | `apps/admin`               |

## Camadas por módulo (Clean Architecture)

```
modules/{modulo}/          ← Documentação de domínio (esta pasta)
packages/types/{modulo}/   ← Tipos de domínio
packages/constants/        ← Constantes do módulo
modules/ → apps/           ← Presentation (UI, API routes)
packages/database/         ← Infrastructure (persistência)
```

## Regras

1. Cada módulo é um **bounded context** — sem imports cruzados diretos
2. Comunicação entre módulos via **APIs**, **eventos** ou **packages/shared**
3. Decisões de domínio documentadas em `docs/03-domain/` e `docs/15-business-rules/`

## Status

**Sprint 0.5** — Mapa de módulos documentado. Implementação por sprint no roadmap.
