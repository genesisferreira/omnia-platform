# EPIC 05 — Neurofrigo AI MVP

Status: implementado (aguardando GO humano). Não inicia Tutor/CRM/Agentes.

## Objetivo

Primeira experiência pública de IA:

Curso (Portal) → Perguntar à IA → Retrieval → Runtime → Resposta + Fontes + AISession

## Componentes

| Camada | Artefato |
|--------|----------|
| Runtime | `@omnia/neurofrigo-runtime` |
| LLM | `GroundedExtractiveProvider` (default) / OpenAI-compatible |
| Prompt | `PromptBuilder` |
| Context | `ContextBuilder` |
| Admin | `ai-sessions`, `neurofrigo-ai-dashboard`, `POST /api/omnia/ai/chat` |
| Portal | `AskAiPanel` + `POST /api/ai/chat` (BFF) |

## Fluxo

```
Portal AskAiPanel
  → Web /api/ai/chat (S2S)
    → Admin /api/omnia/ai/chat
      → NeurofrigoRuntime
        → RetrievalPort (runSemanticSearch)
        → PromptBuilder
        → LLMProvider
        → AISession + dashboard
```

Runtime **não** acessa Payload/pgvector diretamente — só ports.

## Config

| Env | Default | Descrição |
|-----|---------|-----------|
| `NEUROFRIGO_LLM_PROVIDER` | `grounded` | `grounded` \| `openai` \| `deepseek` |
| `NEUROFRIGO_LLM_MODEL` | provider default | Modelo |
| `NEUROFRIGO_LLM_API_KEY` | — | Se provider HTTP |
| `NEUROFRIGO_LLM_BASE_URL` | OpenAI/DeepSeek | Base URL |

## Homologação

```bash
pnpm --filter @omnia/neurofrigo-runtime test
pnpm --filter @omnia/neurofrigo-runtime bench
pnpm --filter @omnia/admin migrate
pnpm --filter @omnia/admin seed:neurofrigo-ai
pnpm --filter @omnia/admin test:neurofrigo-ai
```

Bootstrap: `admin-bootstrap.sh neurofrigo-ai`

## Fora de escopo

Memória longa, agentes, tools, WhatsApp, CRM, Tutor adaptativo, avaliação automática.
