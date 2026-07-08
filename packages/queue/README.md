# @omnia/queue

Filas de processamento assíncrono (BullMQ + Redis).

## Estrutura

```
src/
├── workers/   # Workers por domínio
├── jobs/      # Definições de jobs
├── retry/     # Políticas de retry e DLQ
└── events/    # Eventos de job (completed, failed)
```

## Casos de uso

- Envio de e-mail (`@omnia/mail`)
- Indexação de busca (`@omnia/search`)
- Sincronização CRM
- Webhooks n8n

## Status

**Sprint 1.2** — Estrutura preparada. Implementação na **Sprint 2+**.
