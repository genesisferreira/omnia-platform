# Neurofrigo Knowledge Hub — Architecture

> **Macroentrega 01 — Knowledge Hub Foundation**  
> Fundação editorial + ACL no Admin Payload. **Sem** embeddings, LLM, WhatsApp, ERP ou pesquisa web real.

## Propósito

O **Knowledge Hub** é a base governada de documentos técnicos, institucionais e pedagógicos do ecossistema Omnia/Neurofrigo. Nesta macroentrega ele cobre:

- Cadastro manual e classificação de documentos  
- Workflow editorial (rascunho → revisão → aprovação → publicação)  
- ACL por papel, agente, empresa, curso e classificação  
- Auditoria imutável de mudanças sensíveis  
- Placeholders tipados para jobs de processamento futuro  

**Não** inclui: indexação vetorial, embeddings, chat Portal, Command runtime, ingestão automática, DeepSeek wired.

## Posição no ecossistema

| Camada | Papel nesta entrega |
|--------|---------------------|
| **Admin Payload** (`apps/admin`) | UI + collections + hooks + seed |
| **`@omnia/neurofrigo-knowledge`** | Constantes, workflow, ACL pura (sem I/O) |
| **Runtime Neurofrigo** | Fora do escopo ME01 — consome KB só em macroentregas futuras |
| **Portal / Landing** | Intactos — sem superfície pública do Hub |

## Grupo Admin: Neurofrigo AI

| Artefato | Slug | Função |
|----------|------|--------|
| Documentos | `knowledge-documents` | Conteúdo + metadados + ACL |
| Categorias | `knowledge-categories` | Taxonomia (seed sugerido) |
| Fontes | `knowledge-sources` | Origens / confiabilidade |
| Revisões | `knowledge-reviews` | Decisões humanas |
| Agentes e acessos | `knowledge-agent-access` | Allowlists por `agentKey` |
| Processamentos | `knowledge-processing-jobs` | Fila preparatória (`not_implemented` / `controlled_mock`) |
| Auditoria | `knowledge-audit-events` | Eventos imutáveis |
| Configurações | `neurofrigo-knowledge-settings` | Global de políticas |
| Dashboard | `neurofrigo-knowledge-dashboard` | Totais placeholder |

## Fluxo lógico (ME01)

```text
Ingestão manual (Admin)
  → Documento draft + defaults seguros
  → Revisão humana (obrigatória se risco alto / INTERNAL_RESTRICTED)
  → Aprovação / publicação (publishers)
  → [Futuro] Job extract → chunk → embed → index
  → [Futuro] Retrieval ACL-first no Runtime
```

Jobs de processamento existem como **registro**, não como pipeline real. Provider/embeddings = placeholders nas settings.

## Defaults seguros (material técnico)

| Campo | Default ME01 |
|-------|----------------|
| `status` | `draft` |
| `securityClassification` | `INTERNAL_RESTRICTED` |
| `technicalRiskLevel` | `high` |
| `allowAiUse` | `false` |
| `humanReviewRequired` | `true` |
| `publicationStatus` | `unpublished` |

## Relação com docs anteriores

- Visão ACL/namespaces de alto nível: [NEUROFRIGO_KNOWLEDGE_ARCHITECTURE.md](NEUROFRIGO_KNOWLEDGE_ARCHITECTURE.md)  
- RAG futuro: [NEUROFRIGO_RAG_SPEC.md](NEUROFRIGO_RAG_SPEC.md)  
- Decisão: **D022** — [NEUROFRIGO_DECISION_LOG.md](NEUROFRIGO_DECISION_LOG.md)

## Fora de escopo ME01

Embeddings · LLM · WhatsApp · ERP · pesquisa web · promoção automática · chat Portal · Command UI · alteração de produção / landing.
