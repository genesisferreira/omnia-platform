# Epic 03 — Knowledge Intelligence

## Objetivo

Fábrica de conhecimento entre LMS Core e Neurofrigo Knowledge Hub.

**Fora de escopo:** embeddings, DeepSeek/OpenAI, Runtime, RAG, Portal Chat, Tutor, agentes.

## Entidades

| Slug                               | Admin        | Papel                                                       |
| ---------------------------------- | ------------ | ----------------------------------------------------------- |
| `learning-resources`               | Resources    | Ponte canônica Media → IA (nunca Media direta)              |
| `knowledge-chunks`                 | Chunks       | Fragmentos + proveniência LMS                               |
| `embedding-queue`                  | Queue        | Fila status-only (`pending`…`failed`, provider=`none`)      |
| `ki-processing-runs`               | Processing   | Histórico extract→…→queue                                   |
| Global `ki-intelligence-dashboard` | Dashboard KI | Arquivos / processados / pendentes / falhas / chunks / fila |

Grupo admin: **Knowledge Intelligence**.

## Pipeline

```
Media → LearningResource → Extract → Normalize → Chunk → Metadata
  → Embedding Queue (pending) → KnowledgeDocument → Knowledge Hub
```

Package: `@omnia/knowledge-intelligence` (extract PDF/TXT/MD, normalize, chunk).

Extratores preparados (não implementados): DOCX, PPTX, HTML, vídeo/OCR.

## Fluxo de processamento

1. `lesson-assets` afterChange → `ensureLearningResourceFromLessonAsset`
2. `processLearningResource`:
   - lê bytes via Learning Resource → Media
   - extract + meta (pages, size, language, checksum, encoding)
   - normalize (headers/footers/espaços/duplicações)
   - chunk (index, text, tokenEstimate, offsets)
   - upsert KnowledgeDocument (`allowAiUse=false`, draft/unpublished)
   - persiste chunks + itens `embedding-queue` (pending, sem provider)
3. Atualiza dashboard KI

## Integração LMS

- Lesson Asset (PDF/TXT/MD) cria/atualiza Learning Resource com course/module/lesson/instructor/company.
- Tipos não suportados são ignorados (log `ki.ingest.skip_unsupported`).

## Integração Knowledge Hub

- Cria/atualiza `knowledge-documents` com `sourceType` pdf|txt|markdown, `processingStatus=queued`, sem embeddings.

## Comandos

```bash
pnpm install
pnpm --filter @omnia/knowledge-intelligence test
pnpm --filter @omnia/admin migrate
pnpm --filter @omnia/admin seed:lms-core
pnpm --filter @omnia/admin seed:knowledge-intelligence
pnpm --filter @omnia/admin test:knowledge-intelligence
```

## Critério de aceite

Curso → Aula → PDF → Learning Resource → texto → chunks → Knowledge Document → fila embedding — sem intervenção manual e **sem** gerar embeddings.
