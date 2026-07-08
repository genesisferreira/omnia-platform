# @omnia/mail

Arquitetura de e-mail e notificações.

## Estrutura

```
src/
├── providers/       # SMTP, Mailpit (dev), SendGrid (futuro)
├── templates/       # Templates HTML/texto
├── notifications/   # Tipos de notificação (welcome, reset, etc.)
└── queue/           # Envio assíncrono via @omnia/queue
```

## Ambientes

| Ambiente | Provider |
|----------|----------|
| Development | Mailpit (porta 1025/8025) |
| Staging/Prod | SMTP configurável |

## Status

**Sprint 1.2** — Estrutura preparada. Implementação na **Sprint 2+**.
