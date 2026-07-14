# Automation

> Workflows e automações via n8n da Omnia Platform.

**Sprint:** 8+

## Objetivo

Orquestrar processos automatizados — notificações, sincronizações e reações a eventos de domínio — utilizando n8n como motor de workflows.

## Responsabilidades

- Definir e documentar workflows de automação
- Receber webhooks e eventos de outros domínios
- Integrar com n8n para execução de fluxos
- Monitorar execuções, falhas e retries

## Dependências

| Domínio  | Uso                                              |
| -------- | ------------------------------------------------ |
| **core** | Primitivos compartilhados e contratos de eventos |

## Integrações

- **n8n** — motor de workflows (`packages/automation`, `packages/integrations`)

## Eventos futuros

| Evento             | Descrição                          | Sprint |
| ------------------ | ---------------------------------- | ------ |
| `WorkflowExecuted` | Workflow n8n executado com sucesso | 8+     |

## Referências

- [DOMAIN_ARCHITECTURE.md](../../DOMAIN_ARCHITECTURE.md)
- [EVENT_ARCHITECTURE.md](../../EVENT_ARCHITECTURE.md)
- [database/schemas/automation.md](../../database/schemas/automation.md)
