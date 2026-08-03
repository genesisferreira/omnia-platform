# Neurofrigo Knowledge Hub — Admin Guide

> **Macroentrega 01.** Operação no Payload Admin, grupo **Neurofrigo AI**.

## Acesso

1. Login no Admin (`admin` / staging).  
2. Menu **Neurofrigo AI**.  
3. Roles com acesso: `super_admin`, `admin`, `neurofrigo_admin`, `technical_reviewer`, `editor`.

Sem esses papéis o grupo não deve ser utilizável.

## Telas

| Item | Uso |
|------|-----|
| **Base de Conhecimento** | CRUD de documentos, workflow, ACL |
| **Categorias** | Taxonomia (seed sugere nomes; sem conteúdo técnico automático) |
| **Fontes** | Cadastro de origens; `approvedForWebResearch` permanece false |
| **Revisões** | Registrar decisão humana |
| **Agentes e Acessos** | Allowlists por agente (inclui `command`) |
| **Processamentos** | Jobs placeholder — não disparam embed |
| **Auditoria** | Somente leitura (admins) |
| **Configurações** | Políticas globais do Hub |
| **Dashboard** | Totais placeholder (sem custo LLM) |

## Operação diária recomendada

1. Confirmar **Configurações**: Hub enabled, ingestão `manual`, aprovação humana on, web research off.  
2. Manter categorias ativas relevantes.  
3. Criar documento → preencher metadados → defaults seguros se técnico sensível.  
4. Enviar `in_review` → revisor registra `knowledge-reviews`.  
5. Publisher aprova → (opcional) publica.  
6. **Não** marcar `allowAiUse` até política explícita e classificação adequada.  
7. Consultar Auditoria após mudanças de status/ACL.

## Configurações críticas

| Setting | Valor ME01 esperado |
|---------|---------------------|
| `ingestionMode` | `manual` |
| `requireHumanApproval` | true |
| `allowWebResearch` | false |
| `allowAutomaticPromotionFromWeb` | false |
| `processingMode` | `controlled` |
| `commandAllowedRoles` | `super_admin` |
| `futureEmbeddingProvider` / `futureVectorStore` | placeholders textuais |

## O que o Admin **não** faz nesta entrega

- Gerar embeddings ou chamar DeepSeek  
- Indexar para RAG  
- Expor documentos no chat Portal  
- Integrar WhatsApp / ERP  
- Alterar landing de lançamento  

## Seeds

```text
pnpm --filter @omnia/admin seed:knowledge-hub
```

Cria categorias sugeridas + linhas `knowledge-agent-access` + defaults de settings. **Não** importa manuais técnicos.

## Homologação

Checklist: [NEUROFRIGO_KNOWLEDGE_DEV_HOMOLOGATION.md](NEUROFRIGO_KNOWLEDGE_DEV_HOMOLOGATION.md).
