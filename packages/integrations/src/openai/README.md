# openai

Conector HTTP/SDK para a **OpenAI API** — provider de fallback quando DeepSeek está indisponível ou inadequado.

## Package

`@omnia/integrations/openai`

Consumido por `@omnia/ai-core` via router de providers. Apps nunca importam este conector diretamente.

## Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `OPENAI_API_KEY` | Chave de API OpenAI |

## Sprint

**Sprint 8+** — Implementação junto com `@omnia/ai-core` (fallback automático no router).

## Princípios

- Ativado apenas quando o router decide fallback (custo, latência, indisponibilidade)
- Mesma interface de provider que `deepseek/` para troca transparente
- Chamadas sempre server-side
