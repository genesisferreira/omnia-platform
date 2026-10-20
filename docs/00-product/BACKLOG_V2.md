# Omnia Platform — Backlog V2

> **Versão:** 2.0  
> **Status:** Oficial — priorização MoSCoW  
> **Data:** 2026-07-10  
> **Base:** `PRODUCT_MASTER_V2.md`, `DOMAIN_MODEL_V2.md`, `MASTER_ROADMAP_V2.md`

---

## 1. Legenda

| Prioridade      | Significado                                                               |
| --------------- | ------------------------------------------------------------------------- |
| **Must Have**   | Bloqueante para MVP do ecossistema; sem isso o produto não cumpre a visão |
| **Should Have** | Alto valor; entrega significativa mas MVP pode lançar sem                 |
| **Could Have**  | Desejável; melhora experiência ou eficiência                              |
| **Future**      | Visão de longo prazo; depende de maturidade da plataforma                 |

### Identificadores

- `[S{n}]` = Sprint alvo conforme `MASTER_ROADMAP_V2.md`
- `✅` = Entregue (Sprint 2 ou anterior)
- `🔲` = Pendente

---

## 2. Must Have

### 2.1 Core & Infraestrutura

| ID       | Item                                   | Sprint | Status |
| -------- | -------------------------------------- | ------ | ------ |
| CORE-001 | Monorepo Turborepo + pnpm              | 0      | ✅     |
| CORE-002 | Docker Compose dev (PG, Redis, MinIO)  | 1      | ✅     |
| CORE-003 | Docker staging web + admin + bootstrap | 2      | ✅     |
| CORE-004 | `@omnia/config` runtime Zod            | 2      | ✅     |
| CORE-005 | `/api/health` e `/api/status`          | 1–2    | ✅     |
| CORE-006 | ADRs 001–008 aceitos                   | 1.2    | ✅     |
| CORE-007 | JWT auth + refresh tokens              | 3      | 🔲     |
| CORE-008 | RBAC base (5 roles mínimos)            | 3      | 🔲     |
| CORE-009 | Drizzle schema: users, roles, tenants  | 3      | 🔲     |
| CORE-010 | RLS PostgreSQL por tenant_id           | 3      | 🔲     |
| CORE-011 | SMTP transacional produção             | 6      | 🔲     |
| CORE-012 | MinIO S3 adapter Payload               | 3      | 🔲     |

### 2.2 CMS & Portal

| ID         | Item                                      | Sprint | Status     |
| ---------- | ----------------------------------------- | ------ | ---------- |
| CMS-001    | Payload: users, tenants, companies, media | 2      | ✅         |
| CMS-002    | Global settings (hero, CTA, site)         | 2      | ✅         |
| CMS-003    | importMap oficial + generate:importmap CI | 2      | ✅         |
| CMS-004    | Payload CSS (`@payloadcms/next/css`)      | 2      | ✅         |
| CMS-005    | Pages collection + Page Builder blocks    | 3      | 🔲         |
| CMS-006    | Menus e footer administráveis             | 3      | 🔲         |
| CMS-007    | Remover hardcoded Ecosystem/Header/Footer | 3      | 🔲         |
| CMS-008    | Draft / publish / preview                 | 3      | 🔲         |
| CMS-009    | SEO fields por página (plugin SEO)        | 3      | 🔲         |
| CMS-010    | Versionamento de conteúdo                 | 3      | 🔲         |
| PORTAL-001 | Home com hero CMS + empresas CMS          | 2      | ✅         |
| PORTAL-002 | Consumo REST sem Payload (ADR-004)        | 2      | ✅         |
| PORTAL-003 | Páginas dinâmicas `/[slug]`               | 3      | 🔲         |
| PORTAL-004 | Landing pages `/lp/[slug]`                | 3      | 🔲         |
| PORTAL-005 | Home: 6 empresas holding explicadas       | 3      | 🔲         |
| PORTAL-006 | Responsivo mobile-first                   | 2–3    | 🔲 parcial |
| PORTAL-007 | sitemap.xml + robots.txt                  | 4      | 🔲         |

### 2.3 Holding & Multiempresa

| ID       | Item                                   | Sprint | Status |
| -------- | -------------------------------------- | ------ | ------ |
| HOLD-001 | Seed 6 empresas holding                | 2      | ✅     |
| HOLD-002 | Tenant principal omnia-holding         | 2      | ✅     |
| HOLD-003 | Company relationship em conteúdo       | 3      | 🔲     |
| HOLD-004 | Páginas por empresa `/empresas/[slug]` | 3      | 🔲     |
| HOLD-005 | Escopo conteúdo holding vs company     | 3      | 🔲     |
| HOLD-006 | Workspaces operacionais                | 5      | 🔲     |

### 2.4 Blog & Conteúdo

| ID       | Item                              | Sprint | Status |
| -------- | --------------------------------- | ------ | ------ |
| BLOG-001 | Posts, categories, tags, authors  | 4      | 🔲     |
| BLOG-002 | Listagem e detalhe `/blog/[slug]` | 4      | 🔲     |
| BLOG-003 | Posts por empresa (company scope) | 4      | 🔲     |
| BLOG-004 | Imagem destaque + alt obrigatório | 4      | 🔲     |
| BLOG-005 | RSS feed                          | 4      | 🔲     |

### 2.5 CRM & Leads

| ID      | Item                           | Sprint | Status |
| ------- | ------------------------------ | ------ | ------ |
| CRM-001 | Captura lead formulário portal | 5      | 🔲     |
| CRM-002 | Pipeline vendas configurável   | 5      | 🔲     |
| CRM-003 | Atribuição lead a comercial    | 5      | 🔲     |
| CRM-004 | Dashboard CRM admin            | 5      | 🔲     |
| CRM-005 | Evento LeadCreated → n8n       | 5      | 🔲     |
| CRM-006 | Consentimento LGPD em forms    | 5      | 🔲     |

### 2.6 Parceiros & Geo

| ID       | Item                                    | Sprint | Status |
| -------- | --------------------------------------- | ------ | ------ |
| PART-001 | Cadastro parceiro (pending)             | 7      | 🔲     |
| PART-002 | Aprovação admin workflow                | 7      | 🔲     |
| PART-003 | Perfil público `/parceiros/[slug]`      | 7      | 🔲     |
| PART-004 | Logo, capa, galeria, contatos           | 7      | 🔲     |
| GEO-001  | Lat/long + raio atendimento             | 7      | 🔲     |
| GEO-002  | Mapa `/mapa` com busca proximidade      | 7      | 🔲     |
| GEO-003  | Ordenação distância+especialidade+plano | 7      | 🔲     |
| GEO-004  | Filtro cidade/estado manual             | 7      | 🔲     |

### 2.7 LMS

| ID      | Item                      | Sprint | Status |
| ------- | ------------------------- | ------ | ------ |
| LMS-001 | Catálogo cursos `/cursos` | 8      | 🔲     |
| LMS-002 | Matrícula aluno           | 8      | 🔲     |
| LMS-003 | Player aula (vídeo/texto) | 8      | 🔲     |
| LMS-004 | Progresso por aula        | 8      | 🔲     |
| LMS-005 | Materiais download (PDF)  | 8      | 🔲     |
| LMS-006 | Turmas com agenda         | 9      | 🔲     |
| LMS-007 | Provas online             | 9      | 🔲     |
| LMS-008 | Certificado PDF           | 9      | 🔲     |
| LMS-009 | Perfil professor / aluno  | 8–9    | 🔲     |

### 2.8 Identidade & RBAC

| ID     | Item                                                        | Sprint | Status |
| ------ | ----------------------------------------------------------- | ------ | ------ |
| ID-001 | Separar Payload users vs app users                          | 3      | 🔲     |
| ID-002 | Roles: super_admin, company_admin, editor, marketing, sales | 3      | 🔲     |
| ID-003 | Roles: partner, student, instructor                         | 7–8    | 🔲     |
| ID-004 | Roles: agent, supervisor, support                           | 11     | 🔲     |
| ID-005 | Permissões por company workspace                            | 3      | 🔲     |

---

## 3. Should Have

### 3.1 CMS & Portal

| ID         | Item                          | Sprint |
| ---------- | ----------------------------- | ------ |
| CMS-S01    | Banners rotativos por período | 3      |
| CMS-S02    | Depoimentos collection        | 3      |
| CMS-S03    | FAQ accordion blocks          | 4      |
| CMS-S04    | Workflow revisor → publicador | 4      |
| CMS-S05    | Agendamento publicação        | 4      |
| CMS-S06    | i18n PT-BR + EN preparação    | 6      |
| PORTAL-S01 | Busca site `/busca`           | 4      |
| PORTAL-S02 | Páginas eventos `/eventos`    | 4      |
| PORTAL-S03 | Cases `/cases`                | 4      |
| PORTAL-S04 | Downloads `/materiais`        | 4      |
| PORTAL-S05 | Schema.org por tipo página    | 4      |

### 3.2 CRM & Parceiros

| ID       | Item                               | Sprint |
| -------- | ---------------------------------- | ------ |
| CRM-S01  | Lead scoring automático            | 5      |
| CRM-S02  | Oportunidades com valor            | 5      |
| CRM-S03  | Atividades (call, meeting)         | 5      |
| CRM-S04  | Integração lead parceiro           | 7      |
| PART-S01 | Planos parceiro (free/pro/premium) | 7      |
| PART-S02 | Avaliações e moderação             | 7      |
| PART-S03 | Comissões parceiro                 | 7      |
| PART-S04 | Área logada parceiro v1            | 7      |
| PART-S05 | Certificações parceiro             | 7      |

### 3.3 LMS

| ID      | Item                            | Sprint |
| ------- | ------------------------------- | ------ |
| LMS-S01 | Múltiplos instrutores por curso | 8      |
| LMS-S02 | Turmas com limite vagas         | 9      |
| LMS-S03 | Banco de questões reutilizável  | 9      |
| LMS-S04 | Nota mínima configurável        | 9      |
| LMS-S05 | Trilhas FDFA vs CES             | 8      |
| LMS-S06 | Integração pagamento matrícula  | 10     |

### 3.4 Marketplace & Pagamentos

| ID      | Item                          | Sprint |
| ------- | ----------------------------- | ------ |
| MKT-S01 | Catálogo produtos             | 10     |
| MKT-S02 | Carrinho persistente          | 10     |
| MKT-S03 | Checkout                      | 10     |
| PAY-S01 | PIX + cartão (gateway)        | 10     |
| PAY-S02 | Webhook confirmação pagamento | 10     |
| PAY-S03 | Fatura PDF                    | 10     |

### 3.5 Suporte & Notificações

| ID      | Item                          | Sprint |
| ------- | ----------------------------- | ------ |
| NOT-S01 | E-mail transacional templates | 6      |
| NOT-S02 | In-app notifications          | 6      |
| SUP-S01 | Chat widget portal            | 11     |
| SUP-S02 | Tickets com filas             | 11     |
| SUP-S03 | SLA e escalação supervisor    | 11     |
| SUP-S04 | CSAT pós-atendimento          | 11     |

### 3.6 IA

| ID     | Item                | Sprint |
| ------ | ------------------- | ------ |
| AI-S01 | Agente orquestrador | 12     |
| AI-S02 | Agente comercial    | 12     |
| AI-S03 | Agente técnico      | 12     |
| AI-S04 | Agente educacional  | 12     |
| AI-S05 | Knowledge base RAG  | 12     |
| AI-S06 | Sync CMS → KB       | 12     |
| AI-S07 | Agente atendimento  | 12     |

### 3.7 Analytics

| ID      | Item                             | Sprint |
| ------- | -------------------------------- | ------ |
| ANA-S01 | Page views                       | 15     |
| ANA-S02 | Conversões (lead, enroll, order) | 15     |
| ANA-S03 | Dashboard por company            | 15     |

---

## 4. Could Have

| ID        | Item                                 | Sprint | Domínio       |
| --------- | ------------------------------------ | ------ | ------------- |
| COULD-001 | Vídeos `/videos` com transcrição SEO | 4      | Content       |
| COULD-002 | Newsletter integração                | 6      | Marketing     |
| COULD-003 | A/B test banners                     | 6      | CMS           |
| COULD-004 | Lead round-robin inteligente         | 5      | CRM           |
| COULD-005 | Mapa heatmap densidade parceiros     | 7      | Geo           |
| COULD-006 | Parceiro badge verificado            | 7      | Partners      |
| COULD-007 | Gamificação progresso curso          | 9      | LMS           |
| COULD-008 | Live classes (streaming)             | 9      | LMS           |
| COULD-009 | Wishlist marketplace                 | 10     | Marketplace   |
| COULD-010 | Cupons desconto                      | 10     | Marketplace   |
| COULD-011 | Assinatura recorrente                | 10     | Payments      |
| COULD-012 | Chatbot proativo (exit intent)       | 12     | AI            |
| COULD-013 | Agente professor copilot             | 12     | AI            |
| COULD-014 | Agente supervisor analytics          | 12     | AI            |
| COULD-015 | Push notifications PWA               | 6      | Notifications |
| COULD-016 | Export CRM CSV                       | 5      | CRM           |
| COULD-017 | Relatórios PDF admin                 | 15     | Analytics     |
| COULD-018 | API webhooks públicos parceiros      | 15     | API           |
| COULD-019 | Dark mode portal                     | 3      | Portal        |
| COULD-020 | Subdomínio por empresa               | 6      | Portal        |

---

## 5. Future

| ID      | Item                           | Sprint | Domínio       |
| ------- | ------------------------------ | ------ | ------------- |
| FUT-001 | App mobile React Native        | 16     | Core          |
| FUT-002 | PWA offline cursos             | 16     | LMS           |
| FUT-003 | Neurofrigo telemetria IoT full | 13     | Neurofrigo    |
| FUT-004 | Evolution WhatsApp omnichannel | 13     | Evolution     |
| FUT-005 | Agente Neurofrigo autônomo     | 13     | AI            |
| FUT-006 | Marketplace B2B licitações     | 16+    | Marketplace   |
| FUT-007 | White-label tenant             | 16+    | Tenancy       |
| FUT-008 | Multi-região deploy            | 16+    | Infra         |
| FUT-009 | GraphQL API                    | 16+    | API           |
| FUT-010 | BI embedded (Metabase)         | 16+    | Analytics     |
| FUT-011 | Certificação blockchain        | 16+    | LMS           |
| FUT-012 | VR/AR treinamento FDFA         | 16+    | Academy       |
| FUT-013 | Federated SSO (SAML/OIDC)      | 16+    | Identity      |
| FUT-014 | Data lake analytics            | 16+    | Analytics     |
| FUT-015 | Auto-translation i18n IA       | 16+    | i18n          |
| FUT-016 | Voice assistant                | 16+    | AI            |
| FUT-017 | Partner API marketplace        | 16+    | Partners      |
| FUT-018 | Compliance SOC2 audit          | 16+    | Security      |
| FUT-019 | Edge CDN global                | 16+    | Infra         |
| FUT-020 | Chaos engineering programa     | 16+    | Observability |

---

## 6. Backlog técnico (enabler)

| ID       | Item                                     | Prioridade | Sprint |
| -------- | ---------------------------------------- | ---------- | ------ |
| TECH-001 | `payload-generated-schema.ts` versionado | Must       | 3      |
| TECH-002 | Testes E2E Playwright portal+admin       | Must       | 3      |
| TECH-003 | CI GitHub Actions (lint, build, test)    | Must       | 3      |
| TECH-004 | `@omnia/types` populado                  | Must       | 3      |
| TECH-005 | `@omnia/constants` empresas OFH–CES      | Must       | 3      |
| TECH-006 | PostGIS extension PostgreSQL             | Must       | 7      |
| TECH-007 | pgvector extension                       | Should     | 12     |
| TECH-008 | Redis Streams event bus                  | Should     | 14     |
| TECH-009 | OpenTelemetry instrumentation            | Should     | 16     |
| TECH-010 | Sentry error tracking                    | Should     | 16     |
| TECH-011 | Prometheus + Grafana                     | Should     | 16     |
| TECH-012 | Contract tests OpenAPI                   | Should     | 15     |
| TECH-013 | Load testing k6                          | Could      | 16     |
| TECH-014 | Dependabot / Renovate                    | Could      | 3      |
| TECH-015 | Storybook `@omnia/ui`                    | Could      | 3      |

---

## 7. Dívida técnica conhecida (Sprint 2)

| ID       | Item                                     | Prioridade | Sprint fix |
| -------- | ---------------------------------------- | ---------- | ---------- |
| DEBT-001 | EcosystemSection hardcoded               | Must       | 3          |
| DEBT-002 | Header nav hardcoded                     | Must       | 3          |
| DEBT-003 | Footer hardcoded                         | Must       | 3          |
| DEBT-004 | Drizzle schema vazio                     | Must       | 3          |
| DEBT-005 | `@omnia/types` export {}                 | Must       | 3          |
| DEBT-006 | Zero testes automatizados                | Must       | 3          |
| DEBT-007 | docs/13-roadmap README conflito Sprint 2 | Should     | 3          |
| DEBT-008 | PROJECT_CONTEXT desatualizado            | Should     | 3          |
| DEBT-009 | Upload Payload local (não MinIO)         | Should     | 3          |
| DEBT-010 | og:image localhost em staging            | Could      | 3          |

---

## 8. Matriz backlog × domínio

| Domínio         | Must | Should | Could | Future |
| --------------- | ---- | ------ | ----- | ------ |
| Core/Infra      | 12   | 0      | 0     | 4      |
| CMS/Portal      | 17   | 11     | 3     | 1      |
| Holding         | 6    | 0      | 0     | 1      |
| Blog/Content    | 5    | 5      | 1     | 0      |
| CRM/Leads       | 6    | 4      | 2     | 0      |
| Partners/Geo    | 8    | 5      | 2     | 1      |
| LMS             | 9    | 6      | 2     | 3      |
| Identity/RBAC   | 5    | 0      | 0     | 1      |
| Marketplace/Pay | 0    | 6      | 3     | 1      |
| Support/Notif   | 0    | 6      | 1     | 0      |
| AI/KB           | 0    | 7      | 3     | 3      |
| Analytics       | 0    | 3      | 1     | 2      |
| Neurofrigo/Evo  | 0    | 0      | 0     | 2      |
| Automation      | 0    | 0      | 0     | 0      |
| Tech debt       | 6    | 4      | 2     | 0      |

---

## 9. Referências

- `PRODUCT_MASTER_V2.md`
- `DOMAIN_MODEL_V2.md`
- `MASTER_ROADMAP_V2.md`

---

_Backlog vivo — atualizar ao fechar cada Sprint._
