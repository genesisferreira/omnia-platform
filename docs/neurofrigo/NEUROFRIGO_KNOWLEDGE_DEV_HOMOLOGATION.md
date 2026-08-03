# Neurofrigo Knowledge Hub — Homologação DEV/Staging

> **Macroentrega 01 — Knowledge Hub Foundation**  
> Ambiente: **staging/DEV apenas**. Produção e landing de lançamento **intactas**.

## Registro ME01.2 (2026-08-03)

| Item | Valor |
|------|-------|
| Branch | `feature/neurofrigo-knowledge-hub` |
| Worktree local | `C:\Users\genes\omnia-kh-wt` |
| Commit docs | `8c5bc78` — specs Neurofrigo / Knowledge Hub |
| Commit foundation | `648e4cc` — `feat(neurofrigo): create knowledge hub foundation` |
| Remote | `origin/feature/neurofrigo-knowledge-hub` @ `648e4cc` (push OK) |
| Build Admin local | ✅ `pnpm --filter @omnia/admin build` exit 0 (com `NODE_PATH` apontando deps de `@omnia/ui`) |
| Testes package | ✅ 10/10 `test-workflow-acl` |
| Testes admin script | ✅ 4/4 `test-knowledge-hub` |
| Typecheck `@omnia/neurofrigo-knowledge` | ✅ |
| Lint escopo ME01 | ✅ |
| Deploy VPS `/opt/omnia/platform` | ❌ **bloqueado** — sem chave SSH neste agente (`Permission denied (publickey)` para `root@`/`genesis@dev.omniafrigo.com.br`; apenas `known_hosts` presente) |
| Backup staging | ❌ não executado (depende SSH) |
| Migration staging | ❌ não executada (depende SSH) |
| Seed staging | ❌ não executado (depende SSH) |
| Homologação Admin UI DEV | ❌ não executada (depende SSH) |
| Produção / Landing / Moodle / Web | ✅ **não tocados** nesta sessão |

### Pré-requisito para retomar deploy DEV

1. Disponibilizar acesso SSH autenticado à VPS (`/opt/omnia/platform`).  
2. Executar seções 5–21 do plano ME01.2 (backup → pull → build admin → migrate → seed → homologação).  
3. Atualizar este documento com evidências DEV e declarar GO/NO-GO.

### Rollback documentado (quando houver PREV_HEAD na VPS)

| Artefato | Uso |
|----------|-----|
| `PREV_HEAD` | `git checkout` / `git reset --hard` do monorepo em `/opt/omnia/platform` |
| Imagem Admin anterior | `docker compose ... up` com tag/digest registrado |
| Backup `omnia_staging` | `pg_restore` / procedimento oficial do projeto |
| Migration down | `20260803_180000_neurofrigo_knowledge_hub.down` **somente** se aplicada e aprovado rollback |

## Pré-condições

| Item | Esperado |
|------|----------|
| Branch / worktree | Entrega Knowledge Hub |
| Compose | Staging (não produção) |
| Admin DEV | Acessível; produção intocada |
| Landing (`landing-lancamento` / prod landing) | Sem deploy desta entrega |
| LLM / embeddings / WhatsApp / ERP | **Não** configurados / não chamados |

## 1. Migrate

- [ ] Aplicar migration `20260803_180000_neurofrigo_knowledge_hub` (ou equivalente) no Postgres **staging**  
- [ ] Confirmar collections/tabelas Knowledge Hub criadas  
- [ ] Confirmar globals `neurofrigo-knowledge-settings` e `neurofrigo-knowledge-dashboard`  
- [ ] Confirmar `_knowledge_documents_v`, FKs, arrays, `event_at`, locked docs rels  
- [ ] **Não** rodar migrate contra produção

## 2. Seed

- [ ] `pnpm --filter @omnia/admin seed:knowledge-hub` (ou script documentado no Admin / target compose)  
- [ ] Categorias sugeridas presentes (ex.: CO₂, SCADA, Refrigeração…)  
- [ ] `knowledge-agent-access` com todas as `AGENT_KEYS` (incl. `command`)  
- [ ] Settings: `ingestionMode=manual`, `requireHumanApproval=true`, web research **false**, `commandAllowedRoles` ⊇ `super_admin`, `futureVectorStore=placeholder`  
- [ ] Seed **não** criou documentos técnicos sensíveis com `allowAiUse=true`

## 3. CRUD Admin

- [ ] Login com publisher (`super_admin` / `admin` / `neurofrigo_admin`)  
- [ ] Grupo **Neurofrigo AI** visível  
- [ ] Criar documento draft (rich text e/ou upload)  
- [ ] Defaults: `INTERNAL_RESTRICTED`, `technicalRiskLevel=high`, `allowAiUse=false`, `publicationStatus=unpublished`, `processingStatus=idle`, `versionNumber=1.0.0`  
- [ ] Editar metadados, categoria, tags, ACL  
- [ ] Criar categoria e fonte  
- [ ] Editor consegue criar e editar **somente** `draft`  
- [ ] Student/partner **sem** acesso ao grupo Neurofrigo AI  
- [ ] Drafts / autosave / histórico de versões

## 4. Workflow

- [ ] `draft` → `in_review`  
- [ ] Revisor registra `knowledge-reviews` (`approved` / `rejected` / `needs_changes`)  
- [ ] `in_review` → `approved` (publisher)  
- [ ] Com `requiresHumanReview`: **bloquear** `approved` fora de `in_review`; **bloquear** `published` fora de `approved`/`indexed`  
- [ ] Transição inválida rejeitada  
- [ ] Publicação preenche `publicationStatus=published` + `publishedAt`  
- [ ] Editor **não** aprova/publica  
- [ ] Arquivar / rejeitar conforme matriz  
- [ ] Evento de auditoria gerado em mudança de status  

## 5. ACL

- [ ] Publishers deletam; editor não  
- [ ] Campos `approvedBy` / `publicationStatus` só publishers  
- [ ] Settings só platform admin / `neurofrigo_admin`  
- [ ] Audit: UI não cria/edita/apaga eventos  
- [x] (Unit/package) `evaluateKnowledgeAcl`: `INTERNAL_RESTRICTED` negado em `portal_chat`; `allowAiUse=false` nega; `command` exige `super_admin`

## 6. Processamento / não-regressão IA

- [ ] Job criado permanece `not_implemented` ou `controlled_mock`  
- [ ] Nenhum SDK DeepSeek / chamada HTTP de embedding  
- [ ] `lastIndexedAt` permanece vazio / não indica índice real  
- [ ] Dashboard sem custo/token real de provider (placeholders explícitos)  
- [x] Ports tipados retornam `NOT_IMPLEMENTED` / `CONTROLLED_MOCK` (testes locais)

## 7. Isolamento

| Superfície | Critério | Status sessão ME01.2 |
|------------|----------|----------------------|
| **Produção** | Containers/compose/DB prod **não** alterados | ✅ não tocado |
| **Landing** | Sem mudança de deploy; smoke URL landing OK | ✅ não tocado |
| **Moodle / Web** | Containers DEV/prod LMS/web sem rebuild desta missão | ✅ não tocado |
| **Portal chat** | Sem feature Knowledge Hub ligada | ✅ |
| **WhatsApp / ERP** | Ausentes | ✅ |

## 8. Evidências sugeridas

- Screenshot grupo Neurofrigo AI  
- Log `knowledge.hub.seed_complete`  
- Um doc draft sensível com flags corretas  
- Um fluxo approve + audit event  
- Confirmação explícita: prod + landing intactas  
- Backup path + checksum staging  
- HEAD VPS = `648e4cc`

## Critério GO ME01

Migrate + seed + CRUD + workflow + ACL OK em staging, sem embeddings/LLM, produção e landing intactas → **GO documental/operacional da fundação**. Runtime chat / RAG = macroentregas posteriores.

### Status atual

**NO-GO homologação DEV completa** — código versionado e no remote; falta execução na VPS (SSH).
