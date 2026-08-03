# Neurofrigo Knowledge Hub — Workflow Editorial

> **Macroentrega 01.** Transições validadas em `@omnia/neurofrigo-knowledge` + hooks Payload.

## Máquina de estados

```text
draft ──────────────► in_review ──────► approved ──► processing ──► indexed
  │                      │                 │              │
  │                      ▼                 │              ▼
  │                   rejected             │           published
  │                      │                 │              │
  ▼                      ▼                 ▼              ▼
archived ◄───────────────┴─────────────────┴── suspended / expired
```

### Transições permitidas

| De | Para |
|----|------|
| `draft` | `in_review`, `archived` |
| `in_review` | `approved`, `rejected`, `draft` |
| `approved` | `processing`, `published`, `archived`, `draft` |
| `processing` | `indexed`, `processing_failed`, `approved` |
| `indexed` | `published`, `archived`, `processing` |
| `published` | `archived`, `suspended`, `expired` |
| `rejected` | `draft`, `archived` |
| `archived` | `draft` |
| `expired` | `archived`, `draft` |
| `processing_failed` | `approved`, `draft`, `archived` |
| `suspended` | `published`, `archived`, `draft` |

Transição inválida → erro (`Invalid knowledge workflow transition`).

## Regras de negócio (ME01)

1. **Novo documento** inicia em `draft` (se omitido).  
2. **Publicar** (`status=published` ou transição para published) só a partir de `approved` ou `indexed` (`canPublish`).  
3. **Aprovar / publicar** restrito a publishers: `super_admin`, `admin`, `neurofrigo_admin`.  
4. Ao publicar: `publicationStatus=published` e `publishedAt` preenchido se vazio.  
5. **Revisão humana obrigatória** se:
   - `humanReviewRequired=true`, ou  
   - `technicalRiskLevel` ∈ {`high`, `critical`}, ou  
   - `securityClassification=INTERNAL_RESTRICTED`  
6. Em ME01, `processing` / `indexed` são estados **preparados**; jobs reais de embed/index **não** executam (permanecem `not_implemented` / `controlled_mock`).

## Papéis no fluxo

| Papel | Pode |
|-------|------|
| `editor` | Criar; editar somente documentos em `draft` |
| `technical_reviewer` | Revisar; mover `in_review` → approved/rejected/draft |
| `neurofrigo_admin` / `admin` / `super_admin` | Aprovar, publicar, arquivar, deletar |
| student / partner / client / instructor | **Sem** acesso ao Admin Knowledge Hub |

## Revisões (`knowledge-reviews`)

Registro explícito da decisão humana:

- `decision`: `approved` \| `rejected` \| `needs_changes`  
- Flags: `technicalValidation`, `securityValidation`, `pedagogicalValidation`

## Auditoria

Mudanças de status / ACL / classificação geram eventos em `knowledge-audit-events` (payload sanitizado — sem corpo completo do documento nem secrets).

## Defaults para material técnico sensível

```text
status: draft
technicalRiskLevel: high
humanReviewRequired: true
allowAiUse: false
publicationStatus: unpublished
securityClassification: INTERNAL_RESTRICTED
```

Ver guia de ingestão: [NEUROFRIGO_KNOWLEDGE_INGESTION.md](NEUROFRIGO_KNOWLEDGE_INGESTION.md).
