# Chat

> Chat com inteligência artificial da Omnia Platform.

**Sprint:** 8+

## Objetivo

Oferecer atendimento conversacional com IA — suporte, FAQ inteligente e assistência contextual — integrado à identidade do usuário e ao núcleo de IA da plataforma.

## Responsabilidades

- Gerenciar sessões de chat e histórico de mensagens
- Orquestrar chamadas ao modelo de IA via `ai-core`
- Controlar contexto, limites e moderação de conversas
- Expor interface de chat em `apps/web` e APIs para integrações

## Dependências

| Domínio      | Uso                                |
| ------------ | ---------------------------------- |
| **core**     | Primitivos compartilhados          |
| **identity** | Autenticação e contexto do usuário |
| **ai-core**  | Abstração de modelos e prompts     |

## Integrações

- **DeepSeek** — provedor de modelo de linguagem (via `packages/ai-core`)

## Eventos futuros

| Evento            | Descrição                           | Sprint |
| ----------------- | ----------------------------------- | ------ |
| `MessageReceived` | Mensagem recebida em sessão de chat | 8+     |

## Referências

- [DOMAIN_ARCHITECTURE.md](../../DOMAIN_ARCHITECTURE.md)
- [AI_ARCHITECTURE.md](../../AI_ARCHITECTURE.md)
- [database/schemas/chat.md](../../database/schemas/chat.md)
