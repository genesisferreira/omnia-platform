# EPIC 10 — Delivery Report

**Branch:** `feature/neurofrigo-knowledge-hub`  
**Tip homologado:** `930a52a`  
**Escopo:** primeira carga oficial do Knowledge Hub (DOCX/PDF/TXT/MD + RAR pendente)

## Veredito: **GO**

Staging revalidado com `KNOWLEDGE_HUB_LOAD_OK`, `E10_HOMOLOG_OK` e `E10_REVALIDATE_OK`.

## Backup

| Campo         | Valor                                                              |
| ------------- | ------------------------------------------------------------------ |
| Path          | `/opt/omnia/backups/staging/knowledge-hub-e10-20260810-135030`     |
| Dump          | `omnia_staging.dump`                                               |
| SHA256 (dump) | `f768056124eb36bf2cb167b521f95000f236cde2d579890c1e35a063497bbd2c` |
| Stamp         | `20260810-135030`                                                  |

## Seed / carga

- Bootstrap: `omnia-admin-bootstrap.sh knowledge-hub-load`
- Script: `/tmp/_e10_revalidate.sh`
- `KNOWLEDGE_HUB_LOAD_OK`
- PPTX fixture: soft-fail permitido (quando aplicável); PDF/DOCX/MD/TXT ok

## Workflow

Documentos oficiais publicados via:

`draft → in_review → approved → published`

Sem `draft → published` direto. Bypass apenas no contexto KI/official-load para papéis de publisher.

## Documentos

### Importados / publicados (AI)

| Título                                                            | Status    | allowAiUse |
| ----------------------------------------------------------------- | --------- | ---------- |
| Neuro Frigo — Controle de IA para Refrigeração (CO₂ Transcrítico) | published | true       |
| Omnia Platform — Plano de Implantação Fase 1                      | published | true       |
| checklist-epic10                                                  | published | true       |

### Pendentes

| Arquivo            | Status                                 | Job                               |
| ------------------ | -------------------------------------- | --------------------------------- |
| `nova-pasta-1.rar` | draft / unpublished / allowAiUse=false | extract **queued** (não bloqueia) |

## Categorias criadas (run)

- CO₂
- Controle com IA
- Institucional
- Plano de Implantação

## Empresas

Vinculadas (já existentes): `neurofrigo`, `omnia-frigo-holding`  
`companiesCreated`: []

## Agentes vinculados

`refrigeration`, `neurofrigo-technology`, `electrical-controls`, `tutor`, `projects-lab`, `content-production`, `evaluator`, `radar`, `concierge`, `commercial`, `support`, `command`

## Métricas

| Métrica                   | Valor                       |
| ------------------------- | --------------------------- |
| Chunks                    | **190**                     |
| Embeddings ready          | **190**                     |
| Vetores                   | **190**                     |
| Queue completed           | **205**                     |
| Queue pending             | **0**                       |
| Queue failed              | **0**                       |
| Extract jobs queued (RAR) | **1**                       |
| Chunks nesta carga (run)  | **173** (CO₂ 166 + plano 7) |

## Retrieval real

| Query                                  | Agente                | Hits | Doc origem                 |
| -------------------------------------- | --------------------- | ---- | -------------------------- |
| IA no controle de refrigeração com CO2 | refrigeration         | 5    | knowledgeDocumentId **20** |
| Papel do controle no CO2 transcrítico  | neurofrigo-technology | 5    | **20**                     |
| Etapas implantação Omnia               | commercial            | 2    | **22**                     |

ACL: `co2WithCommercial=0` no seed (agente commercial sem allowlist no material técnico).

## Smoke Runtime/Chat

| Pergunta                    | Resultado                                                           |
| --------------------------- | ------------------------------------------------------------------- |
| CO₂/IA (auto/tutor + curso) | `not_found` / `OFF_TOPIC` — tutor limitado ao material do curso LMS |
| Implantação Omnia           | `ok`, provider `deepseek`, sources>0                                |

Retrieval oficial está GO; chat tutor pode não enxergar Hub docs sem `courseId` (limitação de escopo do canal, não da carga).

## Health / isolamento

- Admin DEV: healthy
- Web DEV: healthy (HTTP 200)
- Landing: `omnia-landing-lancamento:1.0.1` intacta
- Admin PROD / Web PROD: intactos (não recriados)

## Bugs / fixes nesta revalidação

| Commit              | Fix                                                                |
| ------------------- | ------------------------------------------------------------------ |
| `47aa36c`           | workflow publish transitions                                       |
| `a4e051a`…`f5335e5` | homolog + tipagem                                                  |
| `2e9a5ba`…`930a52a` | preview-only extract text (DOCX grande) + retry incomplete imports |

## Pendências não bloqueantes

1. Extrator RAR (`nova-pasta-1.rar` queued)
2. Chat tutor/course-scoped vs docs Hub sem matrícula/curso
3. Duplicata leve de título CO₂ (ids 19/20) de tentativas anteriores

## PARAR

EPIC 10 encerrada em **GO**. Não iniciar próxima epic sem solicitação.
