# Neurofrigo Knowledge Architecture

## Namespaces (exemplos)

```text
public/
institutional/
commercial/
partners/
courses/{courseId}/
lessons/{lessonId}/
teachers/
engineering/
neurofrigo/
internal-restricted/
```

Nenhum agente acessa a base inteira — só namespaces na allowlist do agente + ACL do documento.

## Metadados obrigatórios do documento

| Campo                  | Descrição                                |
| ---------------------- | ---------------------------------------- |
| sourceId               | ID estável                               |
| title                  | Título                                   |
| owner                  | Dono                                     |
| tenant                 | Tenant                                   |
| classification         | Nível 1–5                                |
| allowedRoles           | Roles                                    |
| allowedCourses         | courseIds                                |
| allowedAgents          | agent IDs                                |
| version                | Semver / rev                             |
| validFrom / validUntil | Vigência                                 |
| reviewedBy             | Revisor                                  |
| approvalStatus         | draft \| approved \| rejected \| expired |
| checksum               | Integridade                              |
| citation metadata      | Para RAG                                 |

## Regras

- Só `approvalStatus=approved` e dentro da vigência entram no índice recuperável.
- `internal-restricted/` = Nível 5 — fora do chat.
- Remoção / direito ao esquecimento invalida índice + auditoria.

---

## Adendo — Knowledge Hub Foundation (Macroentrega 01 / D022)

A implementação operacional da base de conhecimento começa no **Admin Payload** (grupo Neurofrigo AI), **sem** embeddings/RAG nesta macroentrega.

Documentação canônica do Hub:

| Doc                                                                                  | Conteúdo                     |
| ------------------------------------------------------------------------------------ | ---------------------------- |
| [NEUROFRIGO_KNOWLEDGE_HUB_ARCHITECTURE.md](NEUROFRIGO_KNOWLEDGE_HUB_ARCHITECTURE.md) | Arquitetura ME01             |
| [NEUROFRIGO_KNOWLEDGE_DATA_MODEL.md](NEUROFRIGO_KNOWLEDGE_DATA_MODEL.md)             | Collections / campos         |
| [NEUROFRIGO_KNOWLEDGE_WORKFLOW.md](NEUROFRIGO_KNOWLEDGE_WORKFLOW.md)                 | Estados editoriais           |
| [NEUROFRIGO_KNOWLEDGE_ACL.md](NEUROFRIGO_KNOWLEDGE_ACL.md)                           | ACL Admin + retrieval futuro |
| [NEUROFRIGO_KNOWLEDGE_ADMIN.md](NEUROFRIGO_KNOWLEDGE_ADMIN.md)                       | Operação Admin               |
| [NEUROFRIGO_KNOWLEDGE_INGESTION.md](NEUROFRIGO_KNOWLEDGE_INGESTION.md)               | Ingestão manual              |
| [NEUROFRIGO_KNOWLEDGE_SECURITY.md](NEUROFRIGO_KNOWLEDGE_SECURITY.md)                 | Segurança Hub                |
| [NEUROFRIGO_KNOWLEDGE_DEV_HOMOLOGATION.md](NEUROFRIGO_KNOWLEDGE_DEV_HOMOLOGATION.md) | Checklist staging            |

Mapeamento: namespaces acima ↔ `knowledgeArea` + `securityClassification` (`INTERNAL_RESTRICTED` = Nível 5). Indexação recuperável permanece regra futura — ver adendo no [RAG Spec](NEUROFRIGO_RAG_SPEC.md).
