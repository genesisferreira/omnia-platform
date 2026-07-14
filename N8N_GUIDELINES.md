# Diretrizes n8n — Omnia Platform

## Arquitetura

```
Evento da plataforma  →  Webhook  →  n8n workflow  →  Ação externa/interna
@omnia/automation     →  Definições versionadas (JSON)
@omnia/integrations/n8n  →  Client e webhooks
```

## Organização

```
packages/automation/src/
├── workflows/       # JSON exportado do n8n (versionado)
├── credentials/     # Templates sem secrets
└── workflow-docs/   # Documentação por workflow
```

## Convenções de workflow

| Aspecto        | Diretriz                                               |
| -------------- | ------------------------------------------------------ |
| Nome           | `{modulo}-{acao}-v{versao}` — ex: `crm-lead-notify-v1` |
| Tags           | `omnia`, módulo, ambiente                              |
| Secrets        | Sempre via credentials do n8n — nunca no JSON          |
| Error handling | Branch de erro com notificação                         |

## Triggers comuns

- Webhook da Omnia API (`/api/v1/webhooks/n8n`)
- Cron (relatórios, sync)
- Eventos: `lead.created`, `order.completed`, `partner.approved`

## Integração bidirecional

1. **Plataforma → n8n**: webhooks em eventos de domínio
2. **n8n → Plataforma**: API REST com API key de serviço

## Ambientes

| Ambiente    | Instância n8n     |
| ----------- | ----------------- |
| development | Docker local      |
| staging     | n8n dedicado      |
| production  | n8n HA com backup |

## Segurança

- Webhooks com assinatura HMAC
- API keys de serviço com escopo limitado
- Workflows críticos revisados em PR

## Versionamento

- Export JSON commitado no repo
- Changelog em `workflow-docs/`
- Não editar produção diretamente — deploy via CI

## Referências

- [modules/automation/](modules/automation/)
- `docs/12-n8n/`
