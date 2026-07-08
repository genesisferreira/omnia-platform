# n8n

Cliente e webhooks para **n8n** — orquestração de automações e integrações bidirecionais.

## Package

`@omnia/integrations/n8n`

Usado por `@omnia/automation` e eventos de domínio. Workflows versionados em `packages/automation/src/workflows/`.

## Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `N8N_HOST` | Host do servidor n8n |
| `N8N_PORT` | Porta (padrão `5678`) |
| `N8N_PROTOCOL` | `http` ou `https` |
| `N8N_WEBHOOK_URL` | URL base para webhooks |

## Sprint

**Sprint 8+** — Automações, triggers de eventos (`lead.created`, `order.completed`) e callbacks.

## Princípios

- Plataforma → n8n via webhooks em eventos de domínio
- n8n → plataforma via API REST com API key de serviço
- Secrets sempre nas credentials do n8n, nunca no JSON do workflow
