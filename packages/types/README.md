# @omnia/types

Tipos TypeScript de domínio organizados por **bounded context** (DDD).

## Estrutura

```
src/
├── auth/         # Autenticação, sessões, tokens
├── crm/          # CRM, leads, pipeline
├── marketplace/  # Produtos, pedidos, catálogo
├── partner/      # Parceiros, comissões
├── blog/         # Posts, categorias, tags
├── chat/         # Mensagens, conversas, agentes
├── academy/      # Cursos, matrículas, certificados
├── companies/    # Multiempresa (OFH, RR, NF, FDFA, CTE, CES)
├── shared/       # Tipos transversais (UUID, Pagination, ApiError)
└── index.ts      # Barrel export
```

## Regras

- **Sem dependências** de outros packages Omnia (exceto futuramente `@omnia/constants` para enums)
- Tipos puros — sem lógica de negócio
- Um bounded context por pasta
- Subpath exports serão adicionados na Sprint 1 (`@omnia/types/crm`)

## Status

**Sprint 0.5** — Organização preparada. Tipos reais na **Sprint 1+**.
