# EPIC 10 — Knowledge Hub Official Load

**Branch:** `feature/neurofrigo-knowledge-hub`  
**Escopo:** primeira carga oficial do Knowledge Hub (documentos reais → chunks → embeddings → Retrieval com ACL por agente)

## Objetivo

Importar e indexar a base oficial inicial:

- DOCX / PDF / TXT / Markdown / PPTX → extract → normalize → chunk → Knowledge Document publicado (`allowAiUse=true`) → embedding-queue → `retrieval_vectors`
- RAR / arquivos sem extrator → **pendente** (job `extract` queued) **sem** interromper a epic
- Classificação automática: empresa, categoria, subcategoria, agentes autorizados

## Bootstrap

```bash
omnia-admin-bootstrap.sh knowledge-hub-load
# ou
pnpm --filter @omnia/admin seed:knowledge-hub-load
```

Diretório padrão: `apps/admin/src/seed/assets/knowledge-hub-official`  
Override: `KNOWLEDGE_HUB_LOAD_DIR=/path`

## Critérios GO

1. Documentos suportados importados e publicados para AI
2. RAR registrado como pendente
3. Categorias / empresas / agentes vinculados
4. Chunks > 0 e embeddings ready > 0
5. Retrieval encontra conteúdo oficial (ex.: CO₂ / Neuro Frigo)
6. Admin/web healthy; landing/prod intactos

## Fora de escopo

Tool Framework · CRM IA · WhatsApp · ERP · agentes autônomos · extrator RAR
