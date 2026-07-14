# Core

> Primitivos compartilhados da plataforma Omnia.

**Sprint:** 1+

## Objetivo

Fornecer tipos, utilitários e contratos fundamentais reutilizáveis por todos os bounded contexts, sem acoplar regras de negócio específicas de um domínio.

## Responsabilidades

- Definir primitivos de valor: `Tenant`, `Money`, paginação e identificadores
- Padronizar erros de domínio e códigos de resposta
- Expor tipos compartilhados em `@omnia/types/shared`
- Servir como base documental para convenções cross-cutting

## Dependências

Nenhuma. O Core é a raiz da hierarquia de domínios e não depende de outros bounded contexts.

## Integrações

Nenhuma integração externa direta. Outros domínios consomem os primitivos via pacotes compartilhados (`packages/types`, `packages/constants`).

## Eventos futuros

Nenhum evento base planejado. O Core não emite eventos de domínio; apenas fornece estruturas que outros domínios utilizam em seus payloads.

## Referências

- [DOMAIN_ARCHITECTURE.md](../../DOMAIN_ARCHITECTURE.md)
- [TENANT_ARCHITECTURE.md](../../TENANT_ARCHITECTURE.md)
- [ADR-007 — Arquitetura Modular por Domínios](../../docs/14-adr/ADR-007-domain-driven-modules.md)
