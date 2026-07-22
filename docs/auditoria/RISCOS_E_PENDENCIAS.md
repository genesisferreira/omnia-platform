# Riscos e Pendências — Auditoria Omnia Frigo

Data: 2026-07-22 · Base auditada: `68863ed` · Hotfix SEO: branch `fix/release-2.1.1-seo-feeds`

---

## Riscos altos

| ID | Risco | Evidência | Impacto | Recomendação |
| --- | --- | --- | --- | --- |
| R1 | ~~Sitemap produção 500~~ **corrigido em código (2.1.1)** | Causa: fetch CMS sem timeout → hang. Solução: `CMS_FETCH_TIMEOUT_MS` + fallback estático + logs | SEO | Deploy/homologar 2.1.1 em DEV/staging/prod; smoke `GET /sitemap.xml` → 200 |
| R2 | ~~RSS blog produção 500~~ **corrigido em código (2.1.1)** | Mesma causa; RSS sempre 200 + XML (canal vazio no fallback) | Distribuição | Deploy/homologar; smoke `GET /blog/rss.xml` → 200 |
| R3 | Conta administrativa única em produção | `admin@omniafrigo.com.br` único operacional conhecido | SPOF acesso | Autorizar segundo `super_admin`/`admin` (ex.: e-mail institucional) sem copiar hash DEV |
| R4 | Reset de senha sem SMTP | Payload sem e-mail adapter | Recuperação depende de operação manual | Documentar runbook OU integrar SMTP |
| R5 | Confusão roadmap × produto | Backlog/docs listam LMS/IA/Kanban; código só fundação | Expectativa comercial errada | Comunicar escopo R2.1 real |

## Riscos médios

| ID | Risco | Evidência | Recomendação |
| --- | --- | --- | --- |
| R6 | Neurofrigo Carga **404** em prod | Hub DEV lista; prod `/empresas/neurofrigo-carga` 404 | Publicar company/page seed em prod |
| R7 | Organizations prod incompletas vs DEV | 5 vs 7 (`neurofrigo-carga`, `sapientia`) | Decisão de produto + seed idempotente |
| R8 | Drift de versão | `package.json` 0.3.0; tag/release 2.1.0; CHANGELOG agora documenta 2.1.1 | Alinhar versionamento npm/tag quando publicar |
| R9 | Mídia em volume local | `Media` staticDir; MinIO só docs | Backup volume; plano object storage |
| R10 | Staff CRM global | Doc RBAC R2.1 | Não vender como multi-tenant |
| R11 | Build local Windows × TLS Node | `next/font` falhou sem `NODE_USE_SYSTEM_CA=1` (CA Windows vs trust store Node) | Documentar para devs Windows; **não** é requisito de runtime da app |

## Riscos baixos

| ID | Risco | Nota |
| --- | --- | --- |
| R12 | Página `/contato` placeholder | Sem formulário dedicado |
| R13 | Packages scaffold (queue, ai-core, automation) | Não são bugs; evitar status “pronto” |
| R14 | Analytics/GTM | Sem evidência objetiva |

---

## Release 2.1.1 — SEO feeds (resumo)

| Item | Detalhe |
| --- | --- |
| Causa raiz | `fetch` CMS sem timeout → hang → 500 em Sitemap/RSS |
| Timeout | `CMS_FETCH_TIMEOUT_MS` (default 5000 ms) |
| Fallback Sitemap | Lista válida; ao menos rotas estáticas absolutas |
| Fallback RSS | HTTP 200 + XML canal vazio |
| Logs | `cms_feed_fallback` (sem secrets/stack ao cliente) |
| Escopo | Sem alterações em Collections, migrations, auth, RBAC, CRM |
| Build local | Validado com `NODE_USE_SYSTEM_CA=1` (ambiente Windows) |

---

## Pendências por prioridade sugerida

### P0 — produção (pós-código 2.1.1)

1. **Deploy/homologação** da branch `fix/release-2.1.1-seo-feeds` (DEV → staging → prod).
2. Smoke: `GET /sitemap.xml` e `GET /blog/rss.xml` → HTTP 200 (prod ainda pode estar 500 até o deploy).

### P1 — operação e acesso

1. Autorizar criação/promoção de segundo administrador.
2. Completar Organizations/empresas faltantes em prod se desejado (Sapientia, Neurofrigo Carga).
3. Alinhar tag/npm com changelog quando publicar 2.1.1.

### P2 — produto (não confundir com R2.1)

1. LMS / área do aluno.
2. Kanban / opportunities / tasks CRM.
3. IA/RAG/Neurofrigo IoT.
4. SMTP + forgot password.
5. MinIO / CDN mídia.

---

## Itens frequentemente confundidos com roadmap

| Item | Realidade no código |
| --- | --- |
| “CRM completo” | Fundação Collections + lead capture **sim**; Kanban/relatórios **não** |
| “Neurofrigo IA” | Marca/página CMS **sim**; motor IA **não** |
| “Fred/CTE educação” | Vitrine institucional **sim**; LMS **não** |
| “Multitenancy Organizations” | Modelo + UI **parcial**; tenancy enforced **não** (R2.1) |
| “Filas/automações” | Docker/docs/packages **scaffold** |

---

## Conclusão executiva (atualizada pós-2.1.1 código)

1. **Comprovadamente pronto:** portal institucional core, blog básico, auth Users/RBAC/blocked, CMS Sites/Domains/Pages/Companies, CRM foundation + lead capture + Organizations, Redis RL, deploy R2.1 prod no SHA `68863ed`.
2. **Corrigido em código (2.1.1, pendente deploy):** Sitemap e RSS resilientes com timeout CMS, fallback e logs estruturados.
3. **Só estrutura:** packages ai-core/queue/automation/mail/integrations LLM; stubs área student/instructor; n8n.
4. **Validado (local 2.1.1):** lint, typecheck, testes SEO/feeds, build `@omnia/web` (com `NODE_USE_SYSTEM_CA=1` no Windows local).
5. **Homologado:** R2.1 staging + smoke prod (sessão deploy); Organizations landing prod; health prod.
6. **Incompleto em prod até deploy 2.1.1:** sitemap/RSS ainda podem retornar 500 no ambiente publicado; Neurofrigo Carga prod; Organizations gap; contato form; SMTP.
7. **Não existe:** LMS, Kanban, opportunities, tasks, calendar, reports CRM, RAG/agents, IoT Neurofrigo.
8. **Próxima prioridade real:** **homologar e publicar 2.1.1** (smoke feeds), depois acesso admin redundante e alinhamento de conteúdo (Carga/Sapientia) se negócio exigir.
