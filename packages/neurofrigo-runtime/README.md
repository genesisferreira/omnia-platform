# @omnia/neurofrigo-runtime

Runtime Neurofrigo MVP (EPIC 05).

Orquestra: Identity → Context → Retrieval → Prompt → LLM → Guardrails → Citations → AISession JSON.

**Não** acessa Payload, pgvector ou Learning Resources diretamente — injeta ports.

## Ports

| Port | Uso |
|------|-----|
| `RetrievalPort` | Busca semântica (adapter Admin → `@omnia/retrieval`) |
| `LLMProviderPort` | Geração de resposta |

## Providers LLM

- `GroundedExtractiveProvider` — default (resposta ancorada nos chunks, sem API externa)
- `OpenAiCompatibleChatProvider` — HTTP OpenAI-compatible (opcional)

## Fora de escopo

Memória longa, agentes, tools, WhatsApp, Tutor adaptativo.
