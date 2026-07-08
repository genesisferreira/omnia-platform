# whatsapp

Conector para a **WhatsApp Business API** (Meta Cloud API) — mensagens transacionais e notificações.

## Package

`@omnia/integrations/whatsapp`

Usado por módulos de CRM e automações via services server-side. Não exposto ao client.

## Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `WHATSAPP_API_TOKEN` | Token de acesso da Meta Cloud API |
| `WHATSAPP_PHONE_NUMBER_ID` | ID do número de telefone business |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | ID da conta business (opcional) |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Token de verificação de webhooks |

## Sprint

**Sprint 5+** — Integração com CRM (leads, follow-ups) e notificações transacionais.

## Princípios

- Templates aprovados pela Meta para mensagens proativas
- Webhooks validados com verify token
- Rate limit e fila para envios em massa
