# @omnia/testing

Plataforma de testes compartilhada do monorepo.

## Estrutura

```
src/
├── vitest/       # Config Vitest (unit, integration)
├── playwright/   # Config Playwright (E2E)
├── fixtures/     # Dados de teste reutilizáveis
├── mocks/        # Mocks de serviços externos
├── factories/    # Factories de entidades (faker)
├── builders/     # Test builders (fluent API)
└── helpers/      # Utilitários de teste
```

## Estratégia (Sprint 2+)

| Tipo | Ferramenta | Escopo |
|------|------------|--------|
| Unitário | Vitest | packages, domains |
| Integração | Vitest | APIs, database |
| E2E | Playwright | fluxos críticos web/admin |

## Status

**Sprint 1.2** — Estrutura preparada. Implementação na **Sprint 2+**.
