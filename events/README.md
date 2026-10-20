# Eventos de Domínio — Omnia Platform

> Catálogo de eventos para Event-Driven Architecture (futuro).

## Formato

```typescript
// Exemplo futuro — Sprint 5+
interface LeadCreated {
  event: 'LeadCreated';
  tenantId: string;
  payload: {
    leadId: string;
    source: string;
    createdAt: string;
  };
}
```

## Catálogo planejado

### CRM

| Evento          | Descrição                       | Sprint |
| --------------- | ------------------------------- | ------ |
| `LeadCreated`   | Novo lead cadastrado            | 5      |
| `LeadUpdated`   | Lead atualizado                 | 5      |
| `LeadConverted` | Lead convertido em oportunidade | 5      |

### Partner

| Evento            | Descrição                | Sprint |
| ----------------- | ------------------------ | ------ |
| `PartnerCreated`  | Novo parceiro registrado | 7      |
| `PartnerApproved` | Parceiro aprovado        | 7      |

### Identity

| Evento         | Descrição       | Sprint |
| -------------- | --------------- | ------ |
| `UserCreated`  | Novo usuário    | 2      |
| `UserLoggedIn` | Login realizado | 2      |

### Academy

| Evento            | Descrição       | Sprint |
| ----------------- | --------------- | ------ |
| `CoursePurchased` | Curso adquirido | 7+     |
| `CourseCompleted` | Curso concluído | 7+     |

### Chat

| Evento            | Descrição                | Sprint |
| ----------------- | ------------------------ | ------ |
| `MessageReceived` | Mensagem recebida        | 8+     |
| `TicketOpened`    | Ticket de suporte aberto | 8+     |

### Automation

| Evento             | Descrição              | Sprint |
| ------------------ | ---------------------- | ------ |
| `WorkflowExecuted` | Workflow n8n executado | 8+     |
| `WorkflowFailed`   | Workflow falhou        | 8+     |

## Publicação (futuro)

1. Domínio emite evento
2. Event bus (Redis Streams / n8n webhook)
3. Consumidores processam assincronamente

## Referências

- [EVENT_ARCHITECTURE.md](../EVENT_ARCHITECTURE.md)
- [N8N_GUIDELINES.md](../N8N_GUIDELINES.md)
