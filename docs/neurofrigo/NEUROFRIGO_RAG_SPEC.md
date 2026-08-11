# Neurofrigo RAG Spec

## Pipeline

1. Ingestão (origem autenticada)
2. Sanitização anti-injection
3. Chunking
4. Embeddings (provider abstraction)
5. Indexação com metadata ACL
6. **Filtro ACL antes da busca** (não só pós-geração)
7. Retrieval
8. Reranking
9. Validação / quota
10. Geração com citações
11. Versionamento / expiração / remoção

## Autorização pré-retrieval

Security Guard + filtros: role, tenant, courseId, agentId, classification ≤ nível do usuário.

Sem match ACL → zero hits (sem vazar existência de docs).

## Citações obrigatórias (técnico/acadêmico)

Quando aplicável: curso · módulo · aula · material · documento · versão.

## Proteções

- Conteúdo malicioso em docs → quarantine
- Data poisoning → reviewedBy + checksum
- Exfiltração → ACL + Compliance

## Fora desta Sprint

Implementação de índice/embeddings em produção.

---

## Adendo — Macroentrega 01 (Knowledge Hub Foundation / D022)

- **Indexação / embeddings:** somente **após** aprovação editorial (`approved` / fluxo publicado) e GO de macroentrega de RAG — **não** na ME01.
- ME01 entrega cadastro, workflow, ACL e jobs **placeholder** (`not_implemented` / `controlled_mock`).
- Documento com `allowAiUse=false` ou `INTERNAL_RESTRICTED` **não** entra em retrieval de chat.
- Pipeline completo deste spec permanece válido como alvo futuro; provider de embeddings continua abstração (placeholder DeepSeek nas settings do Hub).
