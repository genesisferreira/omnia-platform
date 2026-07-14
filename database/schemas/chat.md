# Schema — Chat

> Chat inteligente. Sprint 8+.

## Tabelas principais

### `chat_conversations`

| Coluna      | Tipo        | Descrição                   |
| ----------- | ----------- | --------------------------- |
| `id`        | UUID        | PK                          |
| `tenant_id` | UUID        | FK                          |
| `user_id`   | UUID        | FK (opcional)               |
| `agent_id`  | VARCHAR(50) | Agente IA                   |
| `status`    | ENUM        | `open`, `closed`, `handoff` |

### `chat_messages`

| Coluna            | Tipo    | Descrição                     |
| ----------------- | ------- | ----------------------------- |
| `id`              | UUID    | PK                            |
| `conversation_id` | UUID    | FK                            |
| `role`            | ENUM    | `user`, `assistant`, `system` |
| `content`         | TEXT    | —                             |
| `tokens_used`     | INTEGER | —                             |

## IA

Integração com `@omnia/ai-core` — memória em Redis, histórico em PostgreSQL.

## Eventos

`MessageReceived`, `TicketOpened`
