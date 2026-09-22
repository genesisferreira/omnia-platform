# Neurofrigo Knowledge Hub — Ingestão Manual

> **Macroentrega 01.** Único modo habilitado: **manual** via Admin. Sem crawlers, ERP, WhatsApp ou LLM.

## Princípios

1. Todo material entra como **rascunho** até revisão humana.
2. Material técnico sensível usa **defaults restritivos**.
3. `allowAiUse=false` até decisão explícita de publisher.
4. Upload de arquivo **não** dispara extração/embeddings.
5. Pesquisa web e promoção automática permanecem **desligadas**.

## Defaults obrigatórios — material técnico sensível

Aplicar ao criar apostilas, manuais, procedimentos, padrões, casos com risco operacional/segurança:

| Campo                    | Valor                               |
| ------------------------ | ----------------------------------- |
| `status`                 | `draft`                             |
| `securityClassification` | `INTERNAL_RESTRICTED`               |
| `technicalRiskLevel`     | `high` (ou `critical` se aplicável) |
| `humanReviewRequired`    | `true`                              |
| `allowAiUse`             | **`false`**                         |
| `publicationStatus`      | `unpublished`                       |
| `allowWebPublication`    | `false`                             |
| `allowDownload`          | `false`                             |

Constantes de domínio: `SENSITIVE_TECHNICAL_DEFAULTS` em `@omnia/neurofrigo-knowledge`.

## Passo a passo

1. **Neurofrigo AI → Base de Conhecimento → Create**.
2. Preencher `title`, `slug` único, `summary`, `content` e/ou `file` (PDF/DOCX/imagem conforme MIME permitido).
3. Escolher `sourceType` (ex.: `technical_manual`, `apostila`, `procedure`, `standard`).
4. Associar `knowledgeArea`, categoria, tags, `ownerCompany` se houver.
5. Aplicar defaults sensíveis acima (ou confirmar que o formulário já veio assim).
6. Preencher `authorName`, `sourceDate`, `versionNumber`, `checksum` se conhecido.
7. Definir `allowedRoles` / `allowedAgents` / cursos **somente** se já houver política clara; caso contrário deixar restrito.
8. Salvar como `draft`.
9. Quando pronto: `in_review` + criar registro em **Revisões**.
10. Publisher: `approved` → eventualmente `published` **somente** se classificação e `allowAiUse` forem revisados.

## Tipos de origem (`sourceType`)

```text
rich_text | markdown | txt | pdf | docx | image | external_link
| blog_post | course_ref | lesson_ref
| technical_manual | apostila | procedure | standard | case_study
```

## Uploads

- Limite e MIME: global `neurofrigo-knowledge-settings` (`maxUploadSize`, `allowedFileTypes`).
- Extração automática: **não** habilitada. Conteúdo textual deve ser colado em `content` se necessário para revisão.
- Jobs `extract`/`chunk`/`embed` em `knowledge-processing-jobs`: status `not_implemented` ou `controlled_mock` apenas.

## O que não fazer em ME01

- Marcar `allowAiUse=true` em lote sem revisão
- Publicar `INTERNAL_RESTRICTED` para uso em chat
- Ligar `allowWebResearch` ou promoção automática
- Esperar indexação RAG após upload
- Importar dados de ERP / WhatsApp / crawlers

## Pós-aprovação (futuro)

Indexação e embeddings só após: documento `approved`/`published`, `allowAiUse=true`, classificação ≠ bloqueio de chat (quando for o caso), e GO de macroentrega de RAG. Ver [NEUROFRIGO_RAG_SPEC.md](NEUROFRIGO_RAG_SPEC.md).
