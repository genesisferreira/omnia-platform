# Epic 03 — Relatório de entrega (Knowledge Intelligence)

**Data:** 2026-08-05  
**Branch:** `feature/neurofrigo-knowledge-hub`  
**Worktree:** `C:\Users\genes\omnia-kh-wt`  
**Escopo:** fábrica de conhecimento apenas (sem Runtime / Chat / embeddings).

---

## 1. Entidades criadas

| Entidade | Slug | Grupo Admin |
|----------|------|-------------|
| Learning Resource | `learning-resources` | Knowledge Intelligence → Resources |
| Knowledge Chunk | `knowledge-chunks` | Chunks |
| Embedding Queue | `embedding-queue` | Queue |
| Processing Run | `ki-processing-runs` | Processing |
| Dashboard | `ki-intelligence-dashboard` | Dashboard KI |

Package: `@omnia/knowledge-intelligence` (extract / normalize / chunk).

Migration: `20260805_180000_knowledge_intelligence`.

---

## 2. Pipeline

```
Media → LearningResource → Extract → Normalize → Chunk → Metadata
→ Embedding Queue (pending, provider=none) → KnowledgeDocument → Knowledge Hub
```

Extratores ativos: PDF, TXT, Markdown.  
Stubs arquiteturais: DOCX, PPTX, HTML, video_transcript, OCR.

---

## 3. Fluxo de processamento

1. Hook `lesson-assets` → `ensureLearningResourceFromLessonAsset`
2. `processLearningResource` (serviço)
3. Persistência de texto/meta/chunks
4. Upsert `knowledge-documents` (`allowAiUse=false`, unpublished)
5. Itens de fila `pending` (um por chunk)
6. Refresh do dashboard

---

## 4. Integração com LMS

Learning Resource herda course / module / lesson / company / instructor a partir do Lesson Asset.  
IA **não** lê Media diretamente.

---

## 5. Integração com Knowledge Hub

Documento criado/atualizado em `knowledge-documents` com `processingStatus=queued`, sem chamar providers.

---

## 6. Testes

| Suite | Resultado |
|-------|-----------|
| `@omnia/knowledge-intelligence` unit (normalize/chunk/txt/pdf) | PASS (4/4) |
| `test:knowledge-intelligence` e2e (Admin + DB) | depende de migrate + DATABASE_URL (staging/local) |

Comandos:

```bash
pnpm --filter @omnia/knowledge-intelligence test
pnpm --filter @omnia/admin migrate
pnpm --filter @omnia/admin seed:lms-core
pnpm --filter @omnia/admin seed:knowledge-intelligence
pnpm --filter @omnia/admin test:knowledge-intelligence
```

---

## 7. Evidências

- Menu Admin: **Knowledge Intelligence** (Resources, Processing, Queue, Chunks, Dashboard KI)
- Seed processa PDF/TXT do LMS Core
- Filas com `provider=none` e status `pending`
- Sem SDKs OpenAI/DeepSeek; sem Runtime/Chat

*(Preencher após deploy staging: migrate status, seed log, counts.)*

---

## 8. Commits

*(Preencher SHAs após versionamento.)*

---

## 9. GO / NO-GO

| Critério | Status |
|----------|--------|
| Arquitetura extensível (tipos + fila + package) | GO |
| Pipeline PDF→chunks→doc→fila sem embeddings | GO (código + unit PDF) |
| Sem Runtime/Chat/embeddings reais | GO |
| Homologação staging migrate/seed/e2e | PENDENTE deploy |

**Veredito provisório:** **GO CONDICIONAL** — código e testes unitários prontos; aguarda homologação staging e aprovação humana.

**PARAR.** Não iniciar Runtime / Chat / embeddings.
