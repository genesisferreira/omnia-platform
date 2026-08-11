# OMNIA PLATFORM — Release Readiness Audit (pós-EPIC 15)

**Data da auditoria:** 2026-08-11  
**Worktree local:** `C:\Users\genes\omnia-kh-wt`  
**Branch local / remote tip:** `feature/neurofrigo-knowledge-hub` @ `e9fd8f2`  
**Staging deploy tip observado:** `3421a86` (1 commit de docs atrás do tip)  
**Escopo:** auditoria somente — sem implementação, sem EPIC 16, sem correções de produto, sem deploy/migrations em produção.

**Prioridade de evidência usada:** runtime → banco → código → Git → CI → documentação.

---

## 1. Executive Summary

A linha Neurofrigo/LMS (EPICs 03–15) **existe, está commitada na feature branch, homologada em staging com evidência de runtime e banco**, e **não está em `main`/`develop` nem em produção**.

Produção atual: Admin/Web **`2.3.0`** (imagem de 2026-07-25). Landing isolada **`omnia-landing-lancamento:1.0.1`**. Staging Admin/Web healthy com HEAD de código EPIC 15 (`3421a86`).

**Decisão:** 🔴 **RELEASE NO-GO** para release integrada em produção.

Bloqueadores principais: (1) linha não integrada em trunk/`main`; (2) delta produção vs staging (~125 commits sobre `release/2.3.0`); (3) CI Lint vermelho contínuo na feature; (4) OTel collector em restart loop; (5) auth anônima em endpoints AI/SIP/Adaptive.

---

## 2. Git State

### Inventário

| Item                    | Evidência                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| Branch atual (WT audit) | `feature/neurofrigo-knowledge-hub`                                                                |
| HEAD local              | `e9fd8f2` — `docs(neurofrigo): EPIC 15 delivery report GO on staging`                             |
| Tracking                | `origin/feature/neurofrigo-knowledge-hub` (synced tip)                                            |
| Remote                  | `https://github.com/genesisferreira/omnia-platform.git`                                           |
| `main`                  | `454d21e` — sprint-01 foundation (PR #1)                                                          |
| `develop`               | `dc069e9` — CMS foundation (PR #3)                                                                |
| Ahead of `main`         | **203** commits                                                                                   |
| Ahead of `develop`      | **172** commits                                                                                   |
| Ancestral de prod line  | `origin/release/2.3.0` @ `e45c119` **é** ancestral desta linha; tip está **125** commits à frente |
| Tags                    | `landing-v1.0`, `landing-v1.0.1`, `v1.0.0-portal-blog`, `v2.1.0`                                  |
| Stash                   | vazio                                                                                             |
| Untracked (WT)          | dezenas de `scripts/deploy/_e*.sh` / `_s01*` leftovers (não versionados)                          |

### Worktrees

| Path                              | Branch                                  | HEAD      |
| --------------------------------- | --------------------------------------- | --------- |
| `C:/Users/genes/omnia-kh-wt`      | `feature/neurofrigo-knowledge-hub`      | `e9fd8f2` |
| `C:/Users/genes/omnia-platform`   | `feature/omnia-lms-media-authorization` | `d69ab50` |
| `C:/Users/genes/omnia-landing-wt` | `release/landing-v1.0`                  | `c5a6a2f` |

`feature/omnia-lms-media-authorization` é ancestral desta linha Neurofrigo (`merge-base --is-ancestor` exit 0). Landing permanece em branch dedicada.

### EPIC → Commit → Branch → Remote → Integrated? → Staging? → Production?

| EPIC                      | Commit feat / tip docs                                                                            | Branch        | Remote | Integrated (`main`/`develop`)? | Staging?                  | Production? |
| ------------------------- | ------------------------------------------------------------------------------------------------- | ------------- | ------ | ------------------------------ | ------------------------- | ----------- |
| 01–02 (LMS naming formal) | **UNKNOWN** como “EPIC 01/02” — trabalho LMS em branches `feature/omnia-lms-*` e commits LMS core | várias LMS    | sim    | ❌ não em `main`               | parcial / paralelo        | ❌          |
| 03 KI                     | `508b442` / docs `6f99582`                                                                        | neurofrigo-kh | sim    | ❌                             | ✅ (migrations + runtime) | ❌          |
| 04 Retrieval              | `e77a6c8` / `88f025c`                                                                             | neurofrigo-kh | sim    | ❌                             | ✅                        | ❌          |
| 05 AI MVP                 | `3d83f34` / `5c7f10e`                                                                             | neurofrigo-kh | sim    | ❌                             | ✅                        | ❌          |
| 06 AI Experience          | docs `3482c5e`                                                                                    | neurofrigo-kh | sim    | ❌                             | ✅                        | ❌          |
| 07 Tutor                  | docs `614b4dd`                                                                                    | neurofrigo-kh | sim    | ❌                             | ✅                        | ❌          |
| 08 Enterprise AI          | docs `35b0236`                                                                                    | neurofrigo-kh | sim    | ❌                             | ✅                        | ❌          |
| 09 DeepSeek Agents        | docs `33e8a52`                                                                                    | neurofrigo-kh | sim    | ❌                             | ✅                        | ❌          |
| 10 Knowledge load         | feat `d1995df` / tip reval `930a52a` / report GO                                                  | neurofrigo-kh | sim    | ❌                             | ✅ **GO REAL** (DB)       | ❌          |
| 11 Enterprise gap-close   | `e45b0ab` / `cca4de1`                                                                             | neurofrigo-kh | sim    | ❌                             | ✅                        | ❌          |
| 12 Comercial              | `d262e08`                                                                                         | neurofrigo-kh | sim    | ❌                             | ✅                        | ❌          |
| 13 Engenharia             | `0e338ad` / `e8b922a`                                                                             | neurofrigo-kh | sim    | ❌                             | ✅                        | ❌          |
| 14 SIP                    | `2fcfb32` / `f0ecacd`                                                                             | neurofrigo-kh | sim    | ❌                             | ✅                        | ❌          |
| 15 Adaptive               | `3421a86` / `e9fd8f2`                                                                             | neurofrigo-kh | sim    | ❌                             | ✅ (código `3421a86`)     | ❌          |

**Nota:** “GO documental” ≠ merge em trunk. Evidência de staging = containers + `payload_migrations` + counts.

---

## 3. CI/CD

| Item                                    | Evidência                                                                                                                               |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Workflow                                | `.github/workflows/ci.yml` — jobs `quality` (lint/typecheck/format/contract tests) → `build`                                            |
| Triggers                                | push `main`/`develop`/`staging`/`feature/**`; PR → `main`/`develop`                                                                     |
| `gh` CLI                                | **não instalado** nesta máquina                                                                                                         |
| API pública Actions                     | runs da feature: **completed/failure** em tip `e9fd8f2`, `3421a86`, e histórico recente E11–E15                                         |
| Último run tip                          | [31502608468](https://github.com/genesisferreira/omnia-platform/actions/runs/31502608468) — Quality **Lint failure**; Build **skipped** |
| `develop`                               | último sucesso conhecido `dc069e9` (2026-07-14)                                                                                         |
| `main`                                  | runs recentes **failure** (histórico antigo)                                                                                            |
| Deploy workflows                        | **ausentes** no workflow inventariado (só CI quality/build)                                                                             |
| Branch protection / checks obrigatórios | **UNKNOWN** (API sem auth; `gh` indisponível)                                                                                           |

### Classificação da falha CI

| Falha                                               | Classificação                              | Nota                                                                                  |
| --------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------- |
| Lint na feature Neurofrigo (série contínua E11–E15) | **INTRODUCED_BY_CURRENT_LINE** / acumulado | Padrão vermelho sustentado; delivery reports admitem CI GitHub não executado/completo |
| Build skipped                                       | dependência do quality                     | esperado quando quality falha                                                         |
| Histórico vermelho pré-Neurofrigo em `main`         | **PRE-EXISTING** / **STALE**               | não mascara o vermelho atual da feature                                               |

Local: `pnpm` não está no PATH desta sessão → lint local **UNKNOWN** além da API.

---

## 4. Architecture

### Apps

| App          | EXISTS | REGISTERED  | BUILDS (staging image) | TESTED                      | USED_BY_RUNTIME | STAGING | PRODUCTION                    |
| ------------ | ------ | ----------- | ---------------------- | --------------------------- | --------------- | ------- | ----------------------------- |
| `apps/admin` | ✅     | Payload     | ✅ healthy image       | parcial (scripts/unit pkgs) | ✅              | ✅      | ✅ `2.3.0` (sem linha E03–15) |
| `apps/web`   | ✅     | Next portal | ✅ healthy             | parcial                     | ✅              | ✅      | ✅ `2.3.0`                    |

### Packages (síntese)

**Consumidos por admin:** neurofrigo-knowledge, knowledge-intelligence, retrieval, neurofrigo-runtime, neurofrigo-tutor, neurofrigo-commercial, neurofrigo-engineering, student-intelligence, adaptive-learning, enterprise-ai, neurofrigo-orchestrator, lms-connector, academic-provisioning, media-authorization, shared, ui, config, …

**Consumidos por web:** learning-engine, assessment-engine, shared, ui, monitoring, …

**Órfãos (sem dep admin/web):** `ai-core`, `auth`, `automation`, `cache`, `errors`, `events`, `feature-flags` (stub `export {}`), `i18n`, `integrations`, `mail`, `queue`, `sdk`, `search`, `security`, `testing`, `types`, `validation`.

### Achados arquiteturais

| Achado                                                                    | Severidade    | Evidência                           |
| ------------------------------------------------------------------------- | ------------- | ----------------------------------- |
| SIP write centralizado em `services/sip/profile.ts`                       | OK            | grep create/update `sip-profiles`   |
| Adaptive lê SIP; write SIP só via `recalculateSipProfile` / `ensureFresh` | OK / indireto | `decide.ts`, `profile.ts`           |
| Assessment engine read-only / security stubs                              | P1 produto    | `packages/assessment-engine`        |
| LLM default `grounded` sem key; DeepSeek via env                          | OK            | `neurofrigo-runtime` factory        |
| Feature flags package stub                                                | P3            | `packages/feature-flags`            |
| Auth anonymous allow em AI/SIP/Adaptive endpoints                         | **P0**        | `authorize()` → `role: 'anonymous'` |

Payload: **55 collections** + **14 globals** registrados em `apps/admin/payload.config.ts` (inclui LMS, KH, KI, Retrieval, AI, Tutor, Enterprise, Commercial, Engineering, SIP, Adaptive).

---

## 5. Database / Migrations

**Ambiente:** staging DB `omnia_staging` em container `omnia-postgres` (read-only).

| Métrica                           | Valor                               | Evidência                            |
| --------------------------------- | ----------------------------------- | ------------------------------------ |
| Migrations no código (`index.ts`) | **31**                              | `apps/admin/src/migrations/index.ts` |
| `payload_migrations` applied      | **31**                              | SSH query 2026-08-11                 |
| Última applied                    | `20260811_120000_adaptive_learning` | batch 30 / id 31                     |
| Drift nomes code↔DB               | **nenhum** na lista completa        | listas idênticas                     |

### Contagens runtime (staging)

| Tabela              | Count |
| ------------------- | ----: |
| sip_profiles        |     7 |
| sip_evidence        |   203 |
| sip_audit_events    |    26 |
| adaptive_decisions  |    15 |
| adaptive_policies   |     1 |
| knowledge_documents |    20 |
| knowledge_chunks    |   190 |
| embedding_records   |   190 |
| embedding_queue     |   205 |
| ai_sessions         |    84 |
| courses             |     1 |
| lessons             |     4 |

Queue: **completed=205**, pending/failed=0. Docs: published=4, draft=16.

**Produção DB:** não inspecionada (fora do escopo destrutivo; produção usa `omnia-platform-postgres-prod` separado). Schema Neurofrigo E03–15 em prod = **UNKNOWN** / presumido **ausente** pelo delta de imagem `2.3.0` (jul/2025-07-25) sem deploys Neurofrigo.

---

## 6. Admin

| Check                               | Resultado                                                                  | Evidência                                        |
| ----------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------ |
| Health                              | HTTP **200** `{"status":"healthy","database":"up","payload":"configured"}` | `https://admin.dev.omniafrigo.com.br/api/health` |
| Container                           | `omnia-platform-admin-dev` healthy, recriado ~2026-08-11T14:36Z            | docker inspect                                   |
| Prod Admin                          | `omnia-platform-admin-prod:2.3.0` healthy; HTTP 200/307                    | docker + curl                                    |
| Collections Neurofrigo/SIP/Adaptive | registradas no config da feature                                           | payload.config                                   |
| Dashboards globals                  | 14 globals incl. sip/adaptive/knowledge/retrieval/ai                       | payload.config                                   |

Smoke Admin UI autenticado (menus) nesta auditoria: **não executado** (sem login interativo). Schema drift Admin↔DB: migrations alinhadas → **baixo risco** de collection sem migration para E14/E15.

---

## 7. Portal

| Rota                      | HTTP staging                                                       | Nota                                                             |
| ------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `/`                       | 200                                                                |                                                                  |
| `/cursos`                 | 200                                                                |                                                                  |
| `/meu-perfil`             | 307                                                                | redirect auth (esperado)                                         |
| `/meu-perfil-inteligente` | 307                                                                | redirect auth (`requirePortalSession`)                           |
| `/login`                  | **404**                                                            | login via Admin URL (`getAdminLoginUrl`), não página `/login`    |
| APIs BFF                  | `/api/ai/chat`, `/api/tutor/*`, `/api/adaptive/next`, `/api/sip/*` | existem; auth sessão **não** obrigatória no BFF (secret interno) |

Desktop only smoke técnico — OK para home/cursos; superfícies autenticadas não renderizadas sem sessão.

---

## 8. LMS

| Capacidade                           | Classificação                                     | Evidência                           |
| ------------------------------------ | ------------------------------------------------- | ----------------------------------- |
| Courses / Modules / Lessons / Assets | **CONTROLLED** / staging com 1 course / 4 lessons | DB counts + collections             |
| Progress                             | parcial                                           | LMS portal routes + learning-engine |
| Assessment write                     | **READ-ONLY / STUB**                              | assessment-engine                   |
| Provisioning Moodle                  | **DRY-RUN / CONTROLLED** (histórico LMS branches) | `academic-provisioning`             |
| Media signed access                  | **CONTROLLED** (branch media-auth ancestral)      | package media-authorization         |
| Certificados                         | **NOT IMPLEMENTED**                               | docs EPIC 15 “não iniciado”         |
| Moodle DEV                           | containers healthy `omnia-lms-moodle:2.4.1-dev`   | docker ps                           |

---

## 9. Knowledge

Pipeline observado em staging:

Media / Learning Resource → Knowledge Document → Chunk → Embedding Queue → Embedding → Retrieval

| Check      | Resultado                                                      |
| ---------- | -------------------------------------------------------------- |
| Documentos | 20 total; **4 published**                                      |
| Chunks     | **190**                                                        |
| Embeddings | **190**                                                        |
| Queue      | **205 completed**, 0 failed                                    |
| EPIC 10    | **GO REAL** — métricas batem com delivery report (190/190/205) |

Pendência conhecida (docs): RAR extract queued — não bloqueia counts atuais.

---

## 10. Retrieval

| Check                                      | Resultado                | Evidência                          |
| ------------------------------------------ | ------------------------ | ---------------------------------- |
| Package `@omnia/retrieval`                 | EXISTS + usado admin     | package.json                       |
| Migration retrieval                        | applied                  | `20260805_200000_*`                |
| Runtime hits                               | documentados E10 homolog | delivery report + embeddings ready |
| Revalidação HTTP retrieval nesta auditoria | não reexecutada          | counts DB sustentam indexação      |

---

## 11. Neurofrigo Runtime

| Item                      | Staging                                                  |
| ------------------------- | -------------------------------------------------------- |
| `NEUROFRIGO_LLM_PROVIDER` | presente em `.env.staging` (valor não revelado)          |
| `DEEPSEEK_API_KEY`        | presente (não revelado) → **REAL PROVIDER** configurável |
| Default código sem key    | **DETERMINISTIC / grounded extractive**                  |
| Mock package separado     | não; grounded = fallback determinístico                  |
| AI sessions               | 84 em staging                                            |

Providers: **REAL (DeepSeek env)** + **DETERMINISTIC (grounded fallback)**. Sem print de secrets.

---

## 12. Tutor

| Item                           | Status                        | Evidência                                       |
| ------------------------------ | ----------------------------- | ----------------------------------------------- |
| Package + endpoints            | EXISTS                        | neurofrigo-tutor, endpoints                     |
| Portal UI                      | embutido em curso/aula        | `TutorPanel`                                    |
| Pós-ask SIP refresh            | chama `recalculateSipProfile` | `services/tutor/ask.ts`                         |
| Smoke script oficial           | existe (homolog E07/E15 path) | scripts admin                                   |
| Execução smoke nesta auditoria | **não reexecutada**           | evita escrita; evidencia-se via DB SIP/adaptive |

---

## 13. SIP

**Regra:** SIP = única via autorizada de atualização do perfil inteligente.

| Writer                                                     | Tipo                                             | Severidade               |
| ---------------------------------------------------------- | ------------------------------------------------ | ------------------------ |
| `services/sip/profile.ts` (`recalculateSipProfile`)        | único create/update `sip-profiles`               | OK                       |
| Tutor ask / endpoints / seeds / homolog                    | via `recalculateSipProfile`                      | OK                       |
| Adaptive `decide.ts`                                       | **read** + `getSipAssistantContext(ensureFresh)` | OK (indireto autorizado) |
| Escrita direta Tutor/Engenharia/Adaptive em `sip-profiles` | **não encontrada**                               | OK                       |

Runtime: 7 profiles, 203 evidence, 26 audit events.

---

## 14. Adaptive Learning

Ciclo PROFILE → DECISION → ACTION → EVIDENCE → SIP → PROFILE: implementado com motor **determinístico** (sem LLM de progressão).

| Item                            | Evidência                                   |
| ------------------------------- | ------------------------------------------- |
| Package                         | `@omnia/adaptive-learning`                  |
| Migration                       | applied `20260811_120000_adaptive_learning` |
| Decisions / policies            | 15 / 1                                      |
| Portal “Seu próximo passo”      | `SipProfilePanel`                           |
| Unit tests (report E15)         | 7/7; homolog avg decideMs ~47ms             |
| Reexecução testes nesta máquina | **UNKNOWN** (`pnpm` ausente no PATH)        |

---

## 15. Observability

| Componente                        | Estado                                                | Classificação                                                       |
| --------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------- |
| Prometheus `omnia-prometheus-dev` | Up; `/-/healthy` **200**                              | **LIVE DATA** (infra)                                               |
| Grafana `omnia-grafana-dev`       | Up; porta host `3005`                                 | **PARTIAL** (up; dashboards LMS/AI não revalidados nesta auditoria) |
| OTel `omnia-otel-collector-dev`   | **Restarting** — config `logging` exporter deprecated | **BROKEN**                                                          |
| Stack vs `staging.yml`            | observability em compose separado                     | documentado                                                         |

Histórico de OTel reiniciando: **confirmado atual**.

---

## 16. Security

| Check                                         | Resultado                                                         |
| --------------------------------------------- | ----------------------------------------------------------------- |
| `.env` versionado                             | **Não** (gitignore; só `*.example`)                               |
| Secrets em commit (grep seguro)               | sem passwords reais em apps/packages; teste logger com `'secret'` |
| Payload fallback secret                       | default string de development se env ausente                      |
| RBAC Admin                                    | migrations/users RBAC presentes                                   |
| AI/SIP/Adaptive `authorize` anonymous allow   | **HIGH** — endpoints não forçam 401                               |
| Portal BFF injeta `OMNIA_INTERNAL_API_SECRET` | anônimo browser → backend com secret                              |
| Tenant isolation                              | collections com ownerCompany/ACL — não retestado E2E aqui         |

Nenhum secret impresso neste relatório.

---

## 17. Staging

| Container                                     | Image/tag                         | Health / uptime nota                |
| --------------------------------------------- | --------------------------------- | ----------------------------------- |
| admin-dev                                     | `omnia-platform-dev-admin`        | healthy; created 2026-08-11T14:36Z  |
| web-dev                                       | `omnia-platform-dev-web`          | healthy; same recreate              |
| postgres                                      | `postgres:16`                     | Up ~23h                             |
| redis                                         | `redis:7-alpine`                  | Up                                  |
| moodle-dev + mariadb + redis + cron           | `omnia-lms-moodle:2.4.1-dev` etc. | healthy                             |
| grafana / prometheus                          | 11.3.1 / v2.55.1                  | Up                                  |
| otel-collector                                | 0.114.0                           | **Restarting**                      |
| landing                                       | `omnia-landing-lancamento:1.0.1`  | Up (isolada)                        |
| admin-prod / web-prod                         | `:2.3.0`                          | Up (não tocados pela linha staging) |
| evolution / n8n / minio / traefik / portainer | presentes                         | fora do escopo Neurofrigo core      |

**Git no VPS `/opt/omnia/platform`:** branch `feature/neurofrigo-knowledge-hub`, HEAD **`3421a86`** (feat E15). Tip docs `e9fd8f2` ainda não refletido no checkout de deploy (irrelevante para runtime — só docs).

Untracked no VPS: backups `.env.staging.*`, SQL backup, script homolog CRM — **dívida operacional** (não secrets no relatório).

---

## 18. Production

| Componente                         | Staging                                        | Production                                            | Delta                   |
| ---------------------------------- | ---------------------------------------------- | ----------------------------------------------------- | ----------------------- |
| Admin                              | tip Neurofrigo `3421a86` / image dev           | `omnia-platform-admin-prod:2.3.0` (2026-07-25)        | **grande** — sem E03–15 |
| Web/Portal                         | tip Neurofrigo                                 | `omnia-platform-web-prod:2.3.0`                       | **grande**              |
| Landing                            | 1.0.1                                          | 1.0.1                                                 | alinhada                |
| Moodle                             | DEV stack                                      | não mapeado como prod Moodle dedicado nesta auditoria | UNKNOWN                 |
| Git commit embutido na imagem prod | labels revision **não** lidas com valor útil   | UNKNOWN exato; tag produto **2.3.0**                  |                         |
| HTTP                               | admin.dev 200; prod admin 200/307; landing 200 |                                                       |                         |

`app.omniafrigo.com.br` / `portal.omniafrigo.com.br`: DNS **não resolve** (evidência HTTP local).

---

## 19. Landing

| Check       | Resultado                                                          |
| ----------- | ------------------------------------------------------------------ |
| Container   | `omnia-landing-lancamento:1.0.1`                                   |
| HTTP        | `https://omniafrigo.com.br/` **200**                               |
| Git lineage | worktree `release/landing-v1.0` @ `c5a6a2f`; tags `landing-v1.0.1` |
| Isolamento  | não faz parte do WT Neurofrigo; não modificada nesta auditoria     |

---

## 20. Documentation Drift

| Documento                                    | Classificação                                                                                                    |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `EPIC_03`…`EPIC_15_DELIVERY_REPORT.md`       | **CURRENT** para a feature (GO docs); secundários vs runtime                                                     |
| `docs/neurofrigo/README.md`                  | **STALE / CONFLICTING** — ainda descreve “sem embeddings/LLM” / ME01-only no rodapé enquanto índice lista E03–15 |
| Roadmaps LMS / Neurofrigo genéricos          | mistos CURRENT + STALE                                                                                           |
| Release 2.2 / backlog em outros WTs          | **fora** desta branch; **UNKNOWN** sync                                                                          |
| Specs runtime iniciais (DeepSeek “sem wire”) | **SUPERSEDED** pelo código E05–E09                                                                               |

---

## 21. Technical Debt

| ID    | SEV | COMPONENT      | PROBLEM                                                             | EVIDENCE                     | IMPACT                               | ACTION                                |
| ----- | --- | -------------- | ------------------------------------------------------------------- | ---------------------------- | ------------------------------------ | ------------------------------------- |
| P0-01 | P0  | Git/Release    | Linha E03–15 não em `main`/`develop`                                | ahead 203/172                | sem release integrada possível       | merge/release train planejado         |
| P0-02 | P0  | Production     | Prod `2.3.0` sem Neurofrigo/SIP/Adaptive/KH                         | images 2026-07-25 vs staging | produto “integrado” não está em prod | release cut + migrate prod controlado |
| P0-03 | P0  | Security       | Anonymous allow AI/SIP/Adaptive + BFF secret                        | endpoints authorize          | abuso/quota/dados                    | exigir sessão/auth real               |
| P0-04 | P0  | CI             | Lint failure contínuo; Build skipped                                | Actions run tip              | qualidade não gateada                | corrigir lint; tornar CI verde        |
| P1-01 | P1  | Observability  | OTel restart loop (`logging` exporter)                              | docker logs                  | tracing quebrado                     | fix config → `debug` exporter         |
| P1-02 | P1  | LMS Assessment | write path stub/read-only                                           | assessment-engine            | sem avaliação real                   | roadmap pós-release ou flag explícita |
| P1-03 | P1  | Staging ops    | HEAD deploy `3421a86` vs tip docs; untracked backups/scripts no VPS | git status VPS               | higiene / confusão operacional       | limpar untracked; sync docs opcional  |
| P1-04 | P1  | Portal auth UX | `/login` 404; login via Admin                                       | HTTP + require-session       | fricção UX                           | documentar URL canônica / rota portal |
| P2-01 | P2  | Packages       | 17 packages órfãos / feature-flags stub                             | package.json deps            | manutenção                           | arquivar ou wire                      |
| P2-02 | P2  | Knowledge      | drafts + RAR pendente                                               | DB 16 draft; E10 report      | carga incompleta residual            | limpar/extrator RAR                   |
| P2-03 | P2  | Adaptive UX    | CTA sem deep-link aula; outcome UI incompleta                       | E15 report                   | UX                                   | hardening R1                          |
| P2-04 | P2  | Docs           | README Neurofrigo contradiz realidade                               | README                       | onboarding errado                    | atualizar índice/status               |
| P3-01 | P3  | CI tooling     | `gh`/pnpm PATH local ausente                                        | ambiente audit               | auditoria local limitada             | instalar toolchain                    |
| P3-02 | P3  | DNS            | app/portal hostnames                                                | resolve fail                 | confusão de URLs                     | DNS cleanup                           |

---

## 22. Epic Reconciliation

### O que existe na numeração Neurofrigo desta branch

EPICs **03 → 15** documentadas com delivery reports GO na pasta `docs/neurofrigo/`.

### Intervalo 08 → 14

Não há “salto vazio” de produto: sequência contínua **08 Enterprise → 09 DeepSeek → 10 Knowledge load → 11 Enterprise gap-close → 12 Comercial → 13 Engenharia → 14 SIP**. O “gap” percebido vs numeração LMS antiga é **mudança de trilha**: branches `feature/omnia-lms-*` (infra, connector, experience, assessment, observability, media-auth, provisioning) evoluíram **em paralelo** e parte foi absorvida/ancestral desta linha; **não** há pastas `EPIC_01`/`EPIC_02` Neurofrigo nesta branch.

### Ausentes / superseded

| Item                                 | Status                               |
| ------------------------------------ | ------------------------------------ |
| EPIC 01 / 02 como reports Neurofrigo | **AUSENTES** (não inventar)          |
| ME01 Knowledge Hub foundation        | **SUPERSEDED** por E03–E10 runtime   |
| Spec “sem LLM wired”                 | **SUPERSEDED**                       |
| CRM/ERP/WhatsApp/agentes avançados   | **não iniciados** (explícito nos GO) |

### Homologação vs integração

Homologadas em **staging** (runtime+DB): E03–E15.  
Integradas em **trunk/produção**: **nenhuma** desta série.

---

## 23. Readiness Matrix

| COMPONENT               |  IMPLEMENTED  | TESTED |        STAGING         |       INTEGRATED       |  PROD READY  |
| ----------------------- | :-----------: | :----: | :--------------------: | :--------------------: | :----------: |
| Foundation              |      ✅       |   🟡   |           ✅           | 🟡 (`develop` parcial) |      🟡      |
| CMS                     |      ✅       |   🟡   |           ✅           |           🟡           | 🟡 (`2.3.0`) |
| CRM existente           |      ✅       |   🟡   |           ✅           |           🟡           |      🟡      |
| Partner Network         |      ✅       |   🟡   |           ✅           |           🟡           |      🟡      |
| LMS Core                |      ✅       |   🟡   |           ✅           |        ❌ trunk        |      ❌      |
| Assessment              | 🟡 read-only  |   🟡   |           🟡           |           ❌           |      ❌      |
| Moodle Integration      | 🟡 controlled |   🟡   |         ✅ DEV         |           ❌           |      ❌      |
| Knowledge Hub           |      ✅       |   🟡   |           ✅           |           ❌           |      ❌      |
| Knowledge Intelligence  |      ✅       |   🟡   |           ✅           |           ❌           |      ❌      |
| Official Knowledge Load |      ✅       |   🟡   |     ✅ **GO REAL**     |           ❌           |      ❌      |
| Retrieval               |      ✅       |   🟡   |           ✅           |           ❌           |      ❌      |
| AI Runtime              |      ✅       |   🟡   |           ✅           |           ❌           |      ❌      |
| AI Experience           |      ✅       |   🟡   |           ✅           |           ❌           |      ❌      |
| Tutor                   |      ✅       |   🟡   |           ✅           |           ❌           |      ❌      |
| SIP                     |      ✅       |   🟡   |           ✅           |           ❌           |      ❌      |
| Adaptive Learning       |      ✅       |   🟡   |           ✅           |           ❌           |      ❌      |
| Observability           |      🟡       |   ❓   | 🟡 Prometheus; ❌ OTel |           ❌           |      ❌      |
| Portal                  |      ✅       |   🟡   |           ✅           |     ❌ (prod old)      |      ❌      |
| Admin                   |      ✅       |   🟡   |           ✅           |     ❌ (prod old)      |      ❌      |
| Landing                 |      ✅       |   ✅   |           ✅           |       ✅ isolada       |  ✅ `1.0.1`  |

Legenda: ✅ sim · 🟡 parcial · ❌ não · ❓ unknown

---

## 24. Release Decision

### 🔴 RELEASE NO-GO

A plataforma **integrada** (CMS + Partners + LMS + Knowledge + AI + Tutor + SIP + Adaptive) **não está pronta para produção**.

#### Bloqueadores reais

1. **Sem integração trunk:** E03–15 só em `feature/neurofrigo-knowledge-hub` (não em `main`/`develop`).
2. **Produção em `2.3.0`:** delta ~125 commits vs tip; sem SIP/Adaptive/KH/AI line em prod.
3. **CI vermelho (Lint)** na linha candidata; build não valida.
4. **Auth anônima** em superfícies AI/SIP/Adaptive (risco alto pré-prod).
5. **OTel quebrado** (observabilidade incompleta para release controlada).

Staging permanece **útil e homologado** para continuidade — isso **não** equivale a GO de produção integrada.

---

## 25. Recommended Recovery / Release Plan

### SPRINT R0 — blockers (antes de qualquer cut de prod)

1. Corrigir **Lint/CI** até quality+build verdes na feature.
2. Fechar **auth** (eliminar anonymous allow; BFF exigir sessão).
3. Corrigir **OTel** config (`logging` → `debug`/exporter suportado).
4. Definir **estratégia de merge** (feature → `develop`/`release/*`) sem misturar landing.
5. Inventário prod DB read-only + plano de migrations (ainda sem executar).

### SPRINT R1 — hardening

1. Assessment: declarar CONTROLLED explicitamente ou habilitar write mínimo.
2. Portal auth URL canônica; deep-links Adaptive.
3. Limpeza VPS untracked / docs README Neurofrigo.
4. Dashboards Grafana validados LIVE para LMS/KH/AI/SIP/Adaptive.
5. Reduzir packages órfãos ou marcar deprecated.

### SPRINT R2 — production release

1. Tag release integrada (ex. `2.4.0-neurofrigo`) a partir de tip verde.
2. Backup prod → migrate → deploy Admin/Web (landing intacta).
3. Smoke prod: health, portal, 1 ask Tutor, 1 SIP view, 1 adaptive next.
4. Rollback runbook testado.

### EPIC 16

**Não definir / não iniciar** enquanto P0 (e P1 relevantes de segurança/CI) permanecerem abertos.

---

## Evidências-chave (índice)

- Git: `e9fd8f2`, ahead counts, worktrees, tags
- Staging SSH 2026-08-11: HEAD `3421a86`, docker ps, health 200, migrations 31/31, counts KH/SIP/Adaptive
- CI: Actions run `31502608468` Lint failure
- Código: `payload.config.ts`, `migrations/index.ts`, SIP/Adaptive/Tutor services, assessment-engine stubs
- Prod images: `*:2.3.0`; Landing `1.0.1`
- OTel logs: exporter `logging` deprecated

---

## Auditoria — controles

- Nenhum deploy prod, migration prod, reset DB, force push, merge, ou alteração Landing/Moodle/ERP/CRM.
- Nenhum secret impresso.
- Relatório criado apenas como artefato de auditoria; **commit/push não realizados** nesta missão (aguardar aprovação humana se versionar).

**PARAR.** Não iniciar EPIC 16.
