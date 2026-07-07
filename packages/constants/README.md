# @omnia/constants

Constantes globais da Omnia Platform — valores imutáveis compartilhados entre apps e packages.

## Estrutura

```
src/
├── roles/        # RBAC — admin, manager, partner, customer, guest
├── permissions/  # Permissões granulares (crm:read, marketplace:write)
├── plans/        # Planos de assinatura (free, pro, enterprise)
├── modules/      # Módulos habilitáveis (portal, crm, marketplace, etc.)
├── companies/    # IDs e slugs das empresas do ecossistema
├── routes/       # Rotas nomeadas (evita strings mágicas)
├── status/       # Status padronizados (active, pending, archived)
├── features/     # Flags estáticas (complementa feature-flags dinâmicas)
└── index.ts
```

## Regras

- **Sem dependências** de outros packages Omnia
- Apenas valores constantes (`as const`) — sem lógica
- Nunca incluir secrets ou URLs de ambiente

## Status

**Sprint 0.5** — Organização preparada. Constantes reais na **Sprint 1+**.
