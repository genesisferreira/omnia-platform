# Arquitetura de Domínios — Omnia Platform

> Bounded contexts DDD documentados em `domains/`.

## Camadas

```
domains/          → Documentação de bounded contexts
packages/types/   → Tipos TypeScript por domínio
packages/database/→ Persistência (Drizzle)
apps/             → Presentation (UI, API routes)
events/           → Eventos de domínio (futuro)
```

## Domínios

| Domínio     | Pasta                                       | Sprint |
| ----------- | ------------------------------------------- | ------ |
| Core        | [domains/core](domains/core/)               | 1+     |
| Portal      | [domains/portal](domains/portal/)           | 3      |
| Blog        | [domains/blog](domains/blog/)               | 4      |
| CRM         | [domains/crm](domains/crm/)                 | 5      |
| Marketplace | [domains/marketplace](domains/marketplace/) | 6      |
| Academy     | [domains/academy](domains/academy/)         | 7      |
| Partner     | [domains/partner](domains/partner/)         | 7      |
| Chat        | [domains/chat](domains/chat/)               | 8+     |
| Automation  | [domains/automation](domains/automation/)   | 8+     |
| CMS         | [domains/cms](domains/cms/)                 | 1/3    |
| Companies   | [domains/companies](domains/companies/)     | 2      |
| Identity    | [domains/identity](domains/identity/)       | 2      |

## Regras de comunicação

1. **Sem imports diretos** entre domínios
2. Comunicação via **APIs REST** ou **eventos** (`events/`)
3. Tipos compartilhados apenas em `domains/core` e `@omnia/types/shared`
4. Cada domínio documenta dependências e integrações no seu README

## ADR

[ADR-007 — Arquitetura Modular por Domínios](docs/14-adr/ADR-007-domain-driven-modules.md)
