# EPIC17.3 — Causa raiz: lacuna de indexação no retrieval governado (P0)

Base analisada: `822f75543b2cd714548d7fc20570be68a0171e97` (snapshot local). Análise **somente de código**
(sem acesso a DEV/prod). As evidências de DEV citadas foram fornecidas pelo time e não foram
reproduzidas aqui.

## Sintoma (DEV)

- Submission 6 → KnowledgeDocument 41 → LearningResource 34 → chunk 200 (`ownerCompany=4`,
  Fred do Frio, tenant 5, `schoolKey=fred-do-frio`, `SCHOOL_APPROVED`).
- KD 41: `status=published`, `processingStatus=succeeded`, `lastIndexedAt=null`, `indexingError=null`.
- Audit `ingestion_completed` (`chunkCount=1`, `async:true`).
- `POST /api/retrieval/search`: admin (tenant 1) → 32 candidatos, sem o chunk 200; Fred (tenant 5,
  company 4) → 15 candidatos, `afterAclCount=0`; CTE → nada.

## ROOT_CAUSE

Dois defeitos no passo de **indexação** (worker de embeddings + caminho assíncrono governado),
nenhum deles na ACL:

1. **Vetor gravado com `tenant_id` no espaço de IDs errado (decisivo para "não é candidato").**
   `apps/admin/src/services/retrieval/worker.ts:276-290` grava no vetor
   `tenantId: ownerCompanyId` — o **id da empresa** (`companies`, aqui `4`). Todos os consumidores
   de busca filtram pelo **id do tenant da sessão** (`users.tenant → tenants`, aqui `5`):
   `services/neurofrigo/auth-context.ts:167-169,191-196,237-239` → `endpoints/retrieval.ts:52-76`
   → `packages/retrieval/src/retriever/retriever.ts` (`filters.tenantId`) →
   `packages/retrieval/src/adapters/vector/pgvector-store.ts:291-296`
   (`(tenant_id IS NULL OR tenant_id = $n)`). Resultado: um chunk com `ownerCompany` definido
   (o que **sempre** ocorre no caminho governado, pois `hubOverrides.ownerCompany = course.ownerCompany`
   em `services/knowledge/governance.ts:739-746` → `knowledge-intelligence/pipeline.ts:784-804`) recebe
   `tenant_id='4'` e é **excluído pelo pré-filtro SQL** de qualquer busca com `tenantId='5'` (Fred) ou
   `tenantId='1'` (admin). Nunca entra no conjunto de candidatos, mesmo com query determinística exata.
   A ACL (`default-acl-filter.ts:103`) repetiria a mesma negação. O caminho "normal" que funciona
   (seeds `seed-knowledge-hub-load.ts` / `seed-epic16-public-knowledge.ts`) só é validado com buscas
   **sem `tenantId`** (probes `portal_public`/`portal_chat` sem tenant), por isso o bug nunca apareceu.
   Efeito colateral latente: ids de empresa podem colidir com ids de tenant de outra organização
   (ex.: CTE company 5 × Fred tenant 5) — risco de isolamento em canais sem filtro de `ownerCompany`.

2. **O caminho governado não indexa o seu próprio recurso de forma determinística e declara
   `ingestion_completed` sem verificar a indexação.**
   - `governance.ts:823-833` apenas chama `processEmbeddingQueue(payload, { limit: 50 })`, que é um
     dreno **global FIFO** de `embedding-queue` (`worker.ts:343-350`, `sort: 'createdAt'`, sem filtro por
     recurso, ignora `scheduledAt`). Com backlog ≥ 50 itens pendentes mais antigos (ou itens em retry),
     os itens do LR 34 não são processados nesta rodada, e não existe scheduler/cron que rode o worker
     depois (só `pnpm retrieval:worker` manual ou `POST /api/retrieval/worker/run`).
   - O resultado do dreno é descartado e erros são engolidos (`governance.ts:824-833`; falhas por item
     ficam apenas em `embedding-queue.lastError`, `worker.ts:395-411`).
   - Em seguida `ingestion_completed` é gravado incondicionalmente quando o KI terminou
     (`governance.ts:853-872`): o audit reflete "chunks criados", não "indexado".
   - **Nenhum código grava `lastIndexedAt` nem `indexingError`** (único match no repo:
     a definição do campo em `collections/knowledge/KnowledgeDocuments.ts:371-385`, com a descrição
     "Placeholder — indexação real desabilitada nesta entrega"). Logo `lastIndexedAt=null` é esperado
     para **todos** os KDs e não diferencia caminhos — mas também significa que o estado final nunca é
     registrado.
   - Revogação/mudança de versão/`PENDING_OMNIA_REVIEW` atualizam KD/LR (`governance.ts:656-692`,
     `1087-1103`) mas **não removem vetores** já gravados (`allow_ai_use` fica `true` no vetor).

## BROKEN_STEP

`approve_school → applyHubEligibility (async) → processLearningResource (OK: KD/LR/chunk/queue) →`
**`indexação` (worker `embedChunk` + dreno)** `→ lastIndexedAt → retrieval`.
O passo quebrado é a indexação: (a) metadado de isolamento `tenant_id` gravado com id de empresa;
(b) dreno não escopado/não verificado; (c) `lastIndexedAt`/`indexingError` nunca escritos;
(d) `ingestion_completed` emitido antes de haver prova de indexação.

## EXPECTED_CALL

Após o KI publicar KD/LR como elegíveis, o caminho governado deveria chamar o **indexador existente**
(worker de retrieval: `embedChunk` → `VectorStorePort.update` → `embedding-records`) **escopado ao
LR/KD aprovado**, aguardar o resultado, gravar `KD.lastIndexedAt` somente quando todos os chunks do LR
tiverem vetor + `embedding-record` `ready`, gravar `KD.indexingError` em caso de falha, e só então
emitir `ingestion_completed` (ou `indexing_failed`). O vetor deve carregar `tenant_id` = tenant da
empresa dona (`companies.tenant`), mesmo espaço de IDs usado pela sessão.

## ACTUAL_BEHAVIOR

- Vetor (quando gerado) recebe `tenant_id = ownerCompanyId` (`4`) ≠ tenant da sessão (`5`) → excluído
  pelo pré-filtro SQL; nunca vira candidato.
- Dreno global limitado a 50, resultado ignorado; possível que o vetor nem seja gerado.
- `ingestion_completed` + `retrievalEligible=true` gravados mesmo sem indexação comprovada.
- `lastIndexedAt`/`indexingError` jamais escritos.

## Classe

- **Principal: G (outra, com evidência)** — o indexador grava metadado de isolamento (`tenant_id`)
  no espaço de IDs errado (company id em vez de tenant id), o que exclui o chunk do conjunto de
  candidatos em todas as buscas com tenant. Não é ACL: a ACL e o filtro estão corretos e usam o
  tenant da sessão; o dado indexado é que está errado.
- **Contribuintes: E** (COMPLETED/`ingestion_completed` prematuro, sem verificação, sem
  `lastIndexedAt`/`indexingError`) **e A condicional** (indexador do recurso pode não ser executado:
  dreno global FIFO limitado, sem scheduler).
- Descartadas com evidência: **B** (falhas não são silenciosas no worker, mas o governado as ignora →
  parte de E); **C** (cada operação Local API sem `req` comita isoladamente; o bloco assíncrono roda
  após o commit das operações da requisição — cadeia persistida em DEV confirma); **D** (o provider
  `deterministic` não tem ramo por escopo; `createEmbeddingProvider` em
  `packages/retrieval/src/factory.ts` e `DeterministicEmbeddingProvider` são agnósticos a escopo);
  **F** (o gate de elegibilidade em `embedChunk`, `worker.ts:193-236`, deixa KD
  `published/succeeded/retrievalEligible=true` com `allowAiUse=true`).

## Respostas do trace (fase 2)

1. `retrievalEligible=true`: KD em `governance.ts:780-805` (bloco assíncrono), LR em `807-821`,
   submission em `853-857`. Na aprovação ele é explicitamente `false` (`governance.ts:966-977`,
   `707-736`). Caminho OMNIA fast-path: `535-585`.
2. `ingestion_completed`: `governance.ts:859-872` (assíncrono, `async:true`) e `586-601` (upgrade OMNIA).
3. Quem deveria indexar: o worker `services/retrieval/worker.ts` (`processEmbeddingQueue` →
   `embedChunk`), disparado por `governance.ts:823-833` (dreno global), pelo endpoint
   `POST /api/retrieval/worker/run` ou `pnpm retrieval:worker`; os hooks `services/retrieval/hooks.ts`
   são pulados por `kiPipelineActive`.
4. `lastIndexedAt`: **ninguém** escreve (campo em `KnowledgeDocuments.ts:371-379`, placeholder).
5. Embedding/vetor: `worker.ts:155-322` → `VectorStorePort.update` → `PgVectorStore.upsertSql`
   (tabela `retrieval_vectors`, `pgvector-store.ts`), e `embedding-records` via `upsertEmbeddingRecord`
   (`worker.ts:91-153`).
6. Job/fila/hook/evento: fila `embedding-queue` (itens criados em `pipeline.ts:817-831`), worker sob
   demanda; **sem** scheduler/cron; hooks de retrieval desativados no pipeline (`hooks.ts:14,49`).
7. SCHOOL_APPROVED × OMNIA_APPROVED: mesmo caminho assíncrono (`governance.ts:647-898`), só muda
   `allowedAgents`. OMNIA tem fast-path quando o LR já está `completed` na mesma versão
   (`511-643`), que re-enfileira chunks e faz o mesmo dreno global.
8. Provider determinístico: sem comportamento especial por escopo; apenas default de nome/modelo/
   dimensões (`factory.ts`, `deterministic-provider.ts`). Query exata tem similaridade ~1, portanto a
   ausência entre candidatos só se explica por exclusão no pré-filtro/ausência do vetor.
9. Transação/race: bloco `void (async () => …)()` sem `req` (`governance.ts:763-897`); cada operação
   comita isoladamente. Não há race de visibilidade relevante (cadeia persistida em DEV). A ordem KD
   `succeeded/retrievalEligible` → dreno está correta para o gate do `embedChunk`.
10. COMPLETED antes da indexação: **sim**. LR `processingStatus=completed` e `ingestion_completed`
    são gravados sem verificar vetor/`embedding-records` (`governance.ts:807-872`).

## Comparação com o caminho que funciona

| Aspecto                   | Carga "normal" (seeds Hub / epic16)                          | Governado SCHOOL_APPROVED (KD 41)                     |
| ------------------------- | ------------------------------------------------------------ | ----------------------------------------------------- |
| Entrada                   | `processLearningResource` com `hubOverrides.allowAiUse=true` | idem (`governance.ts:765-775`)                        |
| status / processingStatus | published / succeeded                                        | published / succeeded                                 |
| scope / schoolKey         | OMNIA_APPROVED default / null                                | SCHOOL_APPROVED / fred-do-frio                        |
| ownerCompany              | às vezes null (catálogo compartilhado) ou holding            | sempre `course.ownerCompany` (4)                      |
| tenant do vetor           | null ou company id                                           | company id `4` (≠ tenant 5)                           |
| Embeddings                | dreno em **loop até fila vazia**                             | **uma** chamada global `limit:50`, resultado ignorado |
| lastIndexedAt             | null (ninguém escreve)                                       | null (ninguém escreve)                                |
| Validação de busca        | **sem `tenantId`** (probes)                                  | com `tenantId` da sessão (5 / 1)                      |
| Audit                     | n/a                                                          | `ingestion_completed` incondicional                   |

**Divergência:** o caminho governado sempre define `ownerCompany`, e o worker o copia para
`tenant_id`; as buscas reais do Fred/admin filtram por tenant da sessão → exclusão SQL. Além disso,
o governado não garante nem verifica a indexação do seu LR.

## Como a busca escolhe candidatos

`runSemanticSearch` (`services/retrieval/search.ts`) → `Retriever.retrieve` gera o embedding da query e
chama `VectorStorePort.search(embedding, filters, topK*4)`; no runtime é `PgVectorStore` sobre a tabela
**`retrieval_vectors`** (não `knowledge_chunks`). O `WHERE` aplica filtros "soft"
`(col IS NULL OR col = $x)` para `tenant_id`, `owner_company_id`, `course_id`, `lesson_id`,
`module_id`, `language` e ordena por `embedding <=> query`. Só depois a ACL filtra (`afterAclCount`).
Um chunk que existe em `knowledge_chunks` mas não tem linha em `retrieval_vectors`, ou tem linha com
`tenant_id` diferente do tenant da busca, **nunca é candidato**.

Observação adicional (fora do escopo, exige schema): `retrieval_vectors` não possui colunas para
`knowledge_scope`, `school_key`, `retrieval_eligible`, `assessment_secret` (`pgvector-store.ts`,
migração `20260805_200000_retrieval_engine.ts`); no Postgres o gate Epic 17 do
`DefaultAclFilter` só roda com `InMemoryVectorStore`. Hoje o isolamento em PG depende de
`allow_ai_use`, `tenant_id`, `owner_company_id` e `visibility`. Persistir essas colunas exigiria
migração — não feito nesta correção.

## Correção planejada (mínima, sem migração)

1. Worker: `tenant_id` do vetor = `companies.tenant` da empresa dona (fail-closed quando a empresa
   ou o tenant não resolve — ver "Correção final" abaixo; a sentinela inicial foi removida).
2. Worker: novo `indexLearningResource` (reusa `embedChunk`/`embedding-records`/estado da fila) escopado
   ao LR, idempotente (remove vetores antigos do LR antes de regravar), verifica
   `embedding-records ready` = nº de chunks e grava `KD.lastIndexedAt`/`indexingError`.
   `deindexLearningResource` para revogação/versão/estados não elegíveis.
3. Governança: aguarda `indexLearningResource`; `ingestion_completed` só com indexação comprovada,
   senão `indexing_failed` + `indexingError` + `retrievalEligible=false` na submission.
   Nenhuma mudança de ACL/filtros, sem promoção automática, sem migração.

## Verificação (pós-diagnóstico)

- Reprodução automatizada no código base (`test:epic17-governed-indexing` rodando contra `worker.ts` e
  `governance.ts` originais, com Payload em memória e store fiel às colunas de `retrieval_vectors`):
  o vetor `chunk:1` **existe** com `tenant_id='4'`, `allow_ai_use=true`, e a busca do aluno Fred
  (`tenantId=5`, `ownerCompanyId=4`) retorna **0 candidatos**; `lastIndexedAt` indefinido. Mesmo
  sintoma do DEV, confirmando a classe G como decisiva.
- Com a correção: vetor com `tenant_id='5'`, marcador recuperável pelo Fred, CTE isolado,
  `lastIndexedAt` preenchido somente após verificação, `indexing_failed` + `indexingError` quando o
  provider falha, retries sem duplicar chunks/vetores, revogação remove vetores.

## Correção final (arquitetura aprovada)

Modelo canônico (`TENANT_ARCHITECTURE.md`, ADR-005): Tenant ⊃ Company ⊃ User. Omnia = tenant 1;
Fred = company 4 (tenant 1, `fred-do-frio`); CTE = company 5 (tenant 1, `cte`). `users.tenant` deve
ser igual ao tenant da company do usuário. O `users.tenant=5` dos usuários E2E Fred/CTE no DEV é bug
de fixture: `seed-ils-v11-fixtures.ts` usava `find({ collection: 'tenants', limit: 1 })` sem sort
(Payload ordena por `-createdAt`, logo pegava o tenant mais recente, `e16-tenant-b`).

- Worker (`services/retrieval/worker.ts`): sem sentinela. Empresa inexistente →
  `INDEX_SCOPE_COMPANY_NOT_FOUND`; empresa sem tenant → `INDEX_SCOPE_TENANT_UNRESOLVED`; conteúdo
  escolar sem `ownerCompany` → `INDEX_SCOPE_OWNER_COMPANY_REQUIRED`. O escopo de todos os chunks é
  resolvido **antes** de qualquer escrita; qualquer falha remove os vetores do recurso, marca os
  `embedding-records` como `failed`, grava `indexingError`, `lastIndexedAt=null`, e a governança
  audita `indexing_failed` (nunca `ingestion_completed`).
- Conteúdo escolar = `isSchoolKey(schoolKey)` **ou** `knowledgeScope === 'SCHOOL_APPROVED'`
  (metadados do KD, ou do LR sem KD). Catálogo OMNIA/global sem dono mantém o comportamento anterior.
- Isolamento Fred × CTE no mesmo tenant 1 = pré-filtro SQL `owner_company_id` (+ tenant); ACL
  pós-query não checa company para `visibility=enrolled`. Colunas de governança em
  `retrieval_vectors` continuam fora de escopo (exigem migração).
- Seed ILS: tenant do usuário = `companies.tenant` da company (`seed/fixture-tenant.ts`), erro
  explícito se a company não tiver tenant. Dados DEV existentes precisam de correção operacional
  (usuários 27/28/29 e o professor CTE: tenant 5 → 1); isso é dado, não código.
- Pendência anotada (não alterada): `seed-epic16-e2e-users.ts` atribui tenant A/B a usuários cuja
  company é a holding (tenant 1) — mesma classe de divergência user.tenant ≠ company.tenant.
