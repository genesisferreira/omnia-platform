# EPIC 10 — Delivery Report

**Branch:** `feature/neurofrigo-knowledge-hub`  
**Tip código:** `47aa36c`  
**Escopo:** primeira carga oficial do Knowledge Hub (DOCX/PDF/TXT/MD/PPTX + RAR pendente)

## Veredito: **NO-GO** — homologação staging incompleta (VPS inacessível no momento da revalidação)

### O que já está no código (commitado)

- Extractors DOCX (mammoth/JSZip) e PPTX (JSZip)
- Classificador oficial (empresa / categoria / subcategoria / agentes)
- Seed `seed:knowledge-hub-load` + bootstrap `knowledge-hub-load`
- Assets oficiais em `apps/admin/src/seed/assets/knowledge-hub-official/`
- Publicação via workflow `draft → in_review → approved → published` (bypass KI/official-load)
- Worker Retrieval propaga ACL do Hub; filtro `agent:*` no ACL de busca
- RAR registrado como pendente (job extract queued)

### Último estado conhecido no staging (antes da queda de SSH)

1. Build `admin-migrate` OK em `c8189f1`
2. Seed falhou com `Invalid knowledge workflow transition: draft → published` (corrigido em `47aa36c`)
3. PPTX sintético: soft-fail (`E10_PPTX_FIXTURE_SKIP`); DOCXs/MD/TXT/PDF seguem
4. Revalidação com `47aa36c` **não concluída**: `plink` → Connection timed out para `191.101.234.156`

### Para virar GO

1. Restaurar acesso SSH à VPS staging  
2. `bash /tmp/_e10_seed_retry.sh` (ou redeploy `_e10_knowledge_hub_load.sh`) em `47aa36c+`  
3. Confirmar `KNOWLEDGE_HUB_LOAD_OK` + `E10_SEED_RETRY_OK`  
4. Preencher métricas abaixo com o JSON do seed  

### Métricas (aguardar seed OK)

| Item | Valor |
|------|-------|
| Documentos importados | _pendente_ |
| Documentos pendentes (RAR) | _pendente_ |
| Categorias criadas | _pendente_ |
| Empresas criadas/vinculadas | _pendente_ |
| Agentes vinculados | _pendente_ |
| Chunks | _pendente_ |
| Embeddings ready | _pendente_ |
| Retrieval smoke | _pendente_ |

## Commits

- `d1995df` feat EPIC 10 carga oficial
- `e180e0b` / `4048d78` / `2e46d53` / `c8189f1` fixes extract/PPTX/lockfile
- `47aa36c` workflow publish transitions

## PARAR

Não iniciar EPIC 11. Aguardando VPS + re-seed para promover a GO.
