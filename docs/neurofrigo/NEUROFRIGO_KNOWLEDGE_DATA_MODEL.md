# Neurofrigo Knowledge Hub — Data Model

> **Macroentrega 01.** Modelo Payload + pacote `@omnia/neurofrigo-knowledge`. Sem embeddings.

## Collections

### `knowledge-documents`

Documento principal (versions/drafts Payload habilitados).

| Campo | Tipo | Notas |
|-------|------|-------|
| `title`, `slug` | text | `slug` único |
| `summary` | textarea | |
| `content` | richText | |
| `sourceType` | select | ver `SOURCE_TYPES` |
| `file` | upload → `media` | PDF/DOCX/imagem; sem extração automática |
| `externalSourceUrl` | text | |
| `language` | text | default `pt-BR` |
| `ownerCompany` | → `companies` | |
| `knowledgeArea` | select | ver `KNOWLEDGE_AREAS` |
| `category` / `subcategories` | → `knowledge-categories` | |
| `tags[]` | array `{ tag }` | |
| `authorName` | text | |
| `reviewedBy` / `approvedBy` | → `users` | update só publishers |
| `status` | select | editorial — ver abaixo |
| `processingStatus` | select | default `idle` |
| `publicationStatus` | select | `unpublished` \| `published` \| `archived` |
| `securityClassification` | select | default `INTERNAL_RESTRICTED` |
| `allowedRoles[]` | `{ role }` | |
| `allowedAgents` | select hasMany | `AGENT_KEYS` |
| `allowedCompanies` | → `companies` hasMany | |
| `allowedCourses[]` | `{ courseId: number }` | IDs Moodle |
| `allowAiUse` | checkbox | default **false** |
| `allowWebPublication` / `allowDownload` | checkbox | default false |
| `requiresEnrollment` | checkbox | |
| `technicalRiskLevel` | select | default **high** |
| `humanReviewRequired` | checkbox | default **true** |
| `versionNumber` | text | default `1.0.0` |
| `revisionNotes` | textarea | |
| `supersedesDocument` | → self | |
| `checksum` | text | manual / futuro pipeline |
| `sourceDate`, `validFrom`, `validUntil` | date | |
| `publishedAt`, `archivedAt` | date | read-only / hook |
| `lastIndexedAt`, `indexingError` | placeholder | indexação real desligada |
| `createdBy`, `updatedBy` | → `users` | sidebar |

### Status editorial (`status`)

```text
draft | in_review | approved | processing | indexed | published
| rejected | archived | expired | processing_failed | suspended
```

### Classificações (`securityClassification`)

```text
PUBLIC | CLIENT_PARTNER | STUDENT | TEACHER_MANAGER | INTERNAL_RESTRICTED
```

### Outras collections (resumo)

| Slug | Campos-chave |
|------|----------------|
| `knowledge-categories` | `name`, `slug`, `parent`, `knowledgeArea`, `active`, `sortOrder` |
| `knowledge-sources` | `name`, `sourceType`, `reliabilityLevel`, `approvedForWebResearch` (default false), `allowedAgents`, `active` |
| `knowledge-reviews` | `document`, `version`, `reviewer`, `decision` (`approved` \| `rejected` \| `needs_changes`), flags de validação |
| `knowledge-agent-access` | `agentKey` único, allowlists, `canUseWebResearch` false, `canUseUnpublished` |
| `knowledge-processing-jobs` | `document`, `operation`, `status` (`not_implemented` / `controlled_mock`…), `provider` placeholder |
| `knowledge-audit-events` | `actor`, `action`, `entityType`, `entityId`, estados sanitizados, `correlationId` — create só via sistema |

## Globals

| Slug | Defaults relevantes |
|------|---------------------|
| `neurofrigo-knowledge-settings` | `ingestionMode=manual`, `requireHumanApproval=true`, `allowWebResearch=false`, `processingMode=controlled`, `commandAllowedRoles=[super_admin]`, placeholders DeepSeek/vector |
| `neurofrigo-knowledge-dashboard` | Contadores / textos placeholder — sem custo/token real |

## Enums de domínio (`@omnia/neurofrigo-knowledge`)

- **Áreas:** `refrigeracao`, `automacao`, `eletrica`, `eficiencia`, `seguranca`, `neurofrigo`, `cursos`, `institucional`, `comercial`, `engenharia`, `marketing`  
- **Risco técnico:** `low` \| `medium` \| `high` \| `critical`  
- **Operações de job:** `extract` · `clean` · `classify` · `chunk` · `embed` · `index` · `deindex` · `reindex` · `archive`  
- **Agent keys:** `concierge`, `tutor`, `refrigeration`, `neurofrigo-technology`, `electrical-controls`, `evaluator`, `radar`, `projects-lab`, `content-production`, `commercial`, `support`, `command`

## Relação com namespaces (visão antiga)

Namespaces documentados em [NEUROFRIGO_KNOWLEDGE_ARCHITECTURE.md](NEUROFRIGO_KNOWLEDGE_ARCHITECTURE.md) mapeiam-se conceptualmente a `knowledgeArea` + `securityClassification` + ACL — não há pasta física no storage nesta entrega.
