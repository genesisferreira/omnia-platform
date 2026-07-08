# Arquitetura de Eventos — Omnia Platform

> Event-Driven Architecture (EDA) — preparação futura.

## Princípios

1. Eventos representam **fatos** que já aconteceram (passado)
2. Nomenclatura: `{Entity}{Action}` em PascalCase — ex: `LeadCreated`
3. Payload tipado em `@omnia/types` (futuro)
4. Publicação via message broker ou webhooks n8n

## Fluxo

```
Domínio (CRM)  →  Evento  →  Broker/n8n  →  Consumidores (email, IA, analytics)
```

## Eventos planejados

Ver [events/README.md](events/README.md) para catálogo completo.

## Implementação futura

| Sprint | Entrega |
|--------|---------|
| 5 | Eventos CRM (`LeadCreated`, `LeadUpdated`) |
| 6 | Eventos marketplace (`OrderPlaced`) |
| 7 | Eventos partner (`PartnerApproved`) |
| 8+ | Eventos IA (`MessageReceived`, `WorkflowExecuted`) |

## Tecnologias candidatas

- **n8n** — orquestração e webhooks (Sprint 8+)
- **Redis Streams** — event bus leve (avaliar Sprint 5+)
- **PostgreSQL NOTIFY** — protótipo dev

## ADR

Futuro ADR quando broker for escolhido.
