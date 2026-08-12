# Epic 03 — Relatório de entrega (Knowledge Intelligence)

**Data:** 2026-08-05  
**Branch:** `feature/neurofrigo-knowledge-hub`  
**Tip:** `bf00497`  
**Worktree:** `C:\Users\genes\omnia-kh-wt`  
**Escopo:** fábrica de conhecimento apenas (sem Runtime / Chat / embeddings).

---

## 1. Entidades criadas

| Entidade          | Slug                        | Grupo Admin                        |
| ----------------- | --------------------------- | ---------------------------------- |
| Learning Resource | `learning-resources`        | Knowledge Intelligence → Resources |
| Knowledge Chunk   | `knowledge-chunks`          | Chunks                             |
| Embedding Queue   | `embedding-queue`           | Queue                              |
| Processing Run    | `ki-processing-runs`        | Processing                         |
| Dashboard         | `ki-intelligence-dashboard` | Dashboard KI                       |

Package: `@omnia/knowledge-intelligence` (extract / normalize / chunk).  
Migration: `20260805_180000_knowledge_intelligence` (aplicada em staging).

---

## 2. Pipeline

```
Media → LearningResource → Extract → Normalize → Chunk → Metadata
→ Embedding Queue (pending, provider=none) → KnowledgeDocument → Knowledge Hub
```

Extratores ativos: PDF, TXT, Markdown.  
Stubs: DOCX, PPTX, HTML, video_transcript, OCR.

**Nota operacional:** `pdf-parse` conflita com o boot do Payload no mesmo processo. Seed/e2e fazem pre-extract (ou `preExtracted`) antes de `getPayload`. Hooks Admin em runtime usam disco/Media; PDF em processo limpo funciona (unit + seed).

---

## 3. Fluxo de processamento

1. Hook `lesson-assets` → `ensureLearningResourceFromLessonAsset`
2. `processLearningResource` (extract/normalize/chunk/hub/queue)
3. Knowledge Document com `allowAiUse=false`, unpublished
4. Fila `embedding-queue` pending (sem provider)
5. Refresh dashboard KI

---

## 4–5. Integrações LMS / Knowledge Hub

- Learning Resource é a única porta de leitura para IA (não Media direta).
- Proveniência: course / module / lesson / company / instructor.
- Hub: `knowledge-documents` draft, `processingStatus=queued`.

---

## 6. Testes (staging)

| Suite                                | Resultado                           |
| ------------------------------------ | ----------------------------------- |
| `@omnia/knowledge-intelligence` unit | PASS (4/4)                          |
| `seed:knowledge-intelligence`        | PASS — `pdfOk: true`, `txtOk: true` |
| e2e Admin PDF+TXT                    | PASS (2/2)                          |

Evidência seed: `completedResources≥8`, `chunks≥8`, `queuePending≥8`, Knowledge Documents criados.

---

## 7. Evidências staging

- Migration `20260805_180000_knowledge_intelligence` OK
- Menu Admin: **Knowledge Intelligence**
- Landing `omnia-landing-lancamento:1.0.1` intacta
- Admin health OK; prod admin não alterado neste fluxo
- Sem embeddings / Runtime / Chat

---

## 8. Commits (principais)

| SHA                 | Mensagem                                                  |
| ------------------- | --------------------------------------------------------- |
| `7197cdc`           | feat(ki): deliver Knowledge Intelligence factory pipeline |
| `14e2717`           | fix(ki): drop .js extensions                              |
| `c23a247`           | fix(ki): cast Payload user ACL                            |
| `dfed5bf`…`bf00497` | fixes PDF/preExtract/e2e isolation                        |

Remote: `origin/feature/neurofrigo-knowledge-hub` @ **`bf00497`**

---

## 9. GO / NO-GO

| Critério                           | Status                           |
| ---------------------------------- | -------------------------------- |
| Arquitetura extensível             | GO                               |
| PDF→chunks→doc→fila sem embeddings | GO (seed staging)                |
| TXT path                           | GO                               |
| Sem Runtime/Chat/embeddings reais  | GO                               |
| Homologação staging                | GO (migrate + seed + unit + e2e) |

**Veredito: GO** — aguardar aprovação humana.

**PARAR.** Não iniciar Runtime / Chat / embeddings.
