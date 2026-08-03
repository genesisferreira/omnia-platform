# Neurofrigo Knowledge Hub — Homologação DEV/Staging

> **Macroentrega 01 — Knowledge Hub Foundation**  
> Ambiente: **staging/DEV apenas**. Produção e landing de lançamento **intactas**.

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
- [ ] **Não** rodar migrate contra produção

## 2. Seed

- [ ] `pnpm --filter @omnia/admin seed:knowledge-hub` (ou script documentado no Admin)  
- [ ] Categorias sugeridas presentes (ex.: CO₂, SCADA, Refrigeração…)  
- [ ] `knowledge-agent-access` com todas as `AGENT_KEYS` (incl. `command`)  
- [ ] Settings: `ingestionMode=manual`, `requireHumanApproval=true`, web research **false**, `commandAllowedRoles` ⊇ `super_admin`  
- [ ] Seed **não** criou documentos técnicos sensíveis com `allowAiUse=true`

## 3. CRUD Admin

- [ ] Login com publisher (`super_admin` / `admin` / `neurofrigo_admin`)  
- [ ] Criar documento draft (rich text e/ou upload)  
- [ ] Editar metadados, categoria, tags, ACL  
- [ ] Criar categoria e fonte  
- [ ] Editor consegue criar e editar **somente** `draft`  
- [ ] Student/partner **sem** acesso ao grupo Neurofrigo AI  
- [ ] Soft checks: slug único, defaults `INTERNAL_RESTRICTED` / `allowAiUse=false` / risco `high` em material sensível

## 4. Workflow

- [ ] `draft` → `in_review`  
- [ ] Revisor registra `knowledge-reviews` (`approved` / `rejected` / `needs_changes`)  
- [ ] `in_review` → `approved` (publisher)  
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
- [ ] (Unit/package) `evaluateKnowledgeAcl`: `INTERNAL_RESTRICTED` negado em `portal_chat`; `allowAiUse=false` nega; `command` exige `super_admin`

## 6. Processamento / não-regressão IA

- [ ] Job criado permanece `not_implemented` ou `controlled_mock`  
- [ ] Nenhum SDK DeepSeek / chamada HTTP de embedding  
- [ ] `lastIndexedAt` permanece vazio / não indica índice real  
- [ ] Dashboard sem custo/token real de provider

## 7. Isolamento

| Superfície | Critério |
|------------|----------|
| **Produção** | Containers/compose/DB prod **não** alterados |
| **Landing** | Sem mudança de deploy; smoke URL landing OK |
| **Portal chat** | Sem feature Knowledge Hub ligada |
| **WhatsApp / ERP** | Ausentes |

## 8. Evidências sugeridas

- Screenshot grupo Neurofrigo AI  
- Log `knowledge.hub.seed_complete`  
- Um doc draft sensível com flags corretas  
- Um fluxo approve + audit event  
- Confirmação explícita: prod + landing intactas  

## Critério GO ME01

Migrate + seed + CRUD + workflow + ACL OK em staging, sem embeddings/LLM, produção e landing intactas → **GO documental/operacional da fundação**. Runtime chat / RAG = macroentregas posteriores.
