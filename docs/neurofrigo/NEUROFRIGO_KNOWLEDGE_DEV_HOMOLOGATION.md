# Neurofrigo Knowledge Hub — Homologação DEV/Staging

> **Macroentrega 01 — Knowledge Hub Foundation**  
> Ambiente: **staging/DEV apenas**. Produção e landing de lançamento **intactas**.

## Registro ME01.2 (2026-08-04) — deploy staging

| Item | Valor |
|------|-------|
| Branch VPS | `feature/neurofrigo-knowledge-hub` |
| Worktree local | `C:\Users\genes\omnia-kh-wt` |
| Tip remote / VPS | `0edb897` — `fix(neurofrigo): shorten knowledge settings security enum name` |
| Ancestrais | `dee769f` seed bootstrap · `648e4cc` foundation · `8c5bc78` docs |
| PREV_HEAD VPS (antes) | `d69ab50` em `feature/omnia-lms-media-authorization` |
| Postgres alvo | `omnia-postgres` / DB `omnia_staging` / user `omnia_admin` (**não** `omnia-platform-postgres-prod`) |
| Backup | `/opt/omnia/backups/staging/knowledge-hub-me01-20260804-150321/` · dump sha256 `1b9cb1cbee69616a972215ee37732a15831f5c9f17d7daac4338528437918266` |
| Build Admin DEV | ✅ `docker compose … --profile bootstrap build admin admin-migrate` |
| Migration staging | ✅ `MIGRATE_OK` (`20260803_180000_neurofrigo_knowledge_hub`) |
| Seed staging | ✅ `knowledge.hub.seed_complete` / `SEED_OK` |
| Admin DEV health | ✅ `https://admin.dev.omniafrigo.com.br/api/health` → database up |
| Web DEV | ✅ `https://dev.omniafrigo.com.br/` HTTP 200 · container healthy |
| Schema KH | ✅ 27 tabelas `knowledge*` / `neurofrigo_knowledge*` |
| Landing | ✅ `omnia-landing-lancamento` imagem `1.0.1` — **não** recriada |
| Admin prod | ✅ `omnia-platform-admin-prod` healthy — **não** tocado |
| Homologação Admin UI (CRUD/workflow) | ⏳ pendente (manual no Admin DEV) |

### Incidente resolvido no caminho

1ª tentativa de migrate falhou: enum auto `enum_neurofrigo_knowledge_settings_default_security_classification` (66 chars > 63). Corrigido com `enumName: 'enum_nk_settings_def_sec_class'` + migration alinhada (`0edb897`). DB staging intacta até o retry (falha ocorreu no init do schema, antes do SQL).

### Rollback documentado

| Artefato | Uso |
|----------|-----|
| `PREV_HEAD` | `d69ab50` / branch LMS — checkout apenas se aprovado rollback de código |
| Imagem Admin anterior | digest pré-deploy em `MANIFEST.txt` do backup |
| Backup `omnia_staging` | `/opt/omnia/backups/staging/knowledge-hub-me01-20260804-150321/omnia_staging.dump` |
| Migration down | `20260803_180000_neurofrigo_knowledge_hub` `down()` **somente** se aprovado |

## Pré-condições

| Item | Esperado |
|------|----------|
| Branch / worktree | Entrega Knowledge Hub |
| Compose | Staging (não produção) |
| Admin DEV | Acessível; produção intocada |
| Landing (`landing-lancamento` / prod landing) | Sem deploy desta entrega |
| LLM / embeddings / WhatsApp / ERP | **Não** configurados / não chamados |

## 1. Migrate

- [x] Aplicar migration `20260803_180000_neurofrigo_knowledge_hub` no Postgres **staging** (`omnia_staging`)  
- [x] Confirmar collections/tabelas Knowledge Hub criadas (27 tabelas)  
- [x] Confirmar globals `neurofrigo_knowledge_settings` e `neurofrigo_knowledge_dashboard`  
- [x] Confirmar `_knowledge_documents_v` (+ arrays/rels)  
- [x] **Não** rodar migrate contra produção

## 2. Seed

- [x] Bootstrap `knowledge-hub` via `omnia-admin-bootstrap.sh` → `seed:knowledge-hub`  
- [ ] Categorias sugeridas presentes (ex.: CO₂, SCADA, Refrigeração…) — validar no Admin UI  
- [ ] `knowledge-agent-access` com todas as `AGENT_KEYS` (incl. `command`) — validar no Admin UI  
- [ ] Settings defaults seguros — validar no Admin UI  
- [x] Seed log `knowledge.hub.seed_complete` (sem docs técnicos sensíveis no script)

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
| **Produção** | Containers/compose/DB prod **não** alterados | ✅ admin-prod healthy, sem recreate |
| **Landing** | Sem mudança de deploy; tag `1.0.1` | ✅ container Up, imagem `omnia-landing-lancamento:1.0.1` |
| **Moodle / Web** | Web DEV healthy; sem rebuild forçado do web nesta missão | ✅ web 200 / healthy |
| **Portal chat** | Sem feature Knowledge Hub ligada | ✅ |
| **WhatsApp / ERP** | Ausentes | ✅ |

## 8. Evidências

- [x] Backup path + checksum staging  
- [x] HEAD VPS = `0edb897`  
- [x] Log `knowledge.hub.seed_complete`  
- [x] Health Admin DEV + Web DEV  
- [x] Confirmação: prod + landing intactas  
- [ ] Screenshot grupo Neurofrigo AI  
- [ ] Um doc draft sensível com flags corretas  
- [ ] Um fluxo approve + audit event  

## Critério GO ME01

Migrate + seed + CRUD + workflow + ACL OK em staging, sem embeddings/LLM, produção e landing intactas → **GO documental/operacional da fundação**. Runtime chat / RAG = macroentregas posteriores.

### Status atual

**GO deploy staging (migrate + seed + health + isolamento)** — fundação aplicada em `omnia_staging` no tip `0edb897`.

**PENDENTE GO homologação UI completa** — falta validação manual CRUD / workflow / ACL no Admin DEV (itens 3–5). Sem ME02 / RAG / prod.
