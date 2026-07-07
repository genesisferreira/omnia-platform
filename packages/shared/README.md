# @omnia/shared

Utilitários **puros** compartilhados entre apps e packages (sem dependência de framework).

> **Nota Sprint 0.5:** Tipos migraram para `@omnia/types`. Constantes migraram para `@omnia/constants`. Este package mantém apenas funções utilitárias puras.

## Responsabilidades

- Formatação (datas, moeda, CPF/CNPJ)
- Helpers genéricos (debounce, groupBy, etc.)
- Validadores utilitários (não schemas de domínio)

## O que NÃO vai aqui

| Conteúdo | Package correto |
|----------|-----------------|
| Tipos de domínio | `@omnia/types` |
| Roles, permissions, routes | `@omnia/constants` |
| Lógica de negócio | Apps / use cases |

## Regra

Este package **não depende** de nenhum outro package do monorepo.

## Status

**Sprint 0.5** — Escopo refinado. Implementação na **Sprint 1**.
