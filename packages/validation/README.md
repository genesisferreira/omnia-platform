# @omnia/validation

Padronização de validação com Zod.

## Estrutura

```
src/
├── zod/         # Config e helpers Zod
├── schemas/     # Schemas compartilhados (email, CPF, tenant)
└── validators/  # Validadores compostos
```

## Regras

1. Input de API validado com schemas deste package
2. Domínios podem ter schemas locais — compartilhados vão aqui
3. Erros mapeados para `ValidationError` (`@omnia/errors`)

## Status

**Sprint 1.2** — Estrutura preparada. Implementação na **Sprint 2+**.
