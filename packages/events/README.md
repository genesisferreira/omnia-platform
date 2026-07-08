# @omnia/events

Event Bus da plataforma — arquitetura Event Driven.

> Catálogo de eventos de domínio: [`/events/`](../../events/)

## Estrutura

```
src/
├── publish/      # Publicação de eventos
├── subscribe/    # Assinaturas e handlers
├── contracts/    # Tipos e schemas de payload
├── topics/       # Nomes de tópicos padronizados
├── handlers/     # Handlers registrados
├── events/       # Definições de eventos
└── dispatcher/   # Orquestração publish → handlers
```

## Princípios

1. Domínios publicam eventos — não chamam outros domínios diretamente
2. Handlers são idempotentes
3. Contratos versionados em `contracts/`
4. Transporte futuro: Redis Streams / BullMQ (`@omnia/queue`)

## Status

**Sprint 1.2** — Estrutura preparada. Implementação na **Sprint 2+**.
