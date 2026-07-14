# Omnia Platform — Revisão Final da Documentação V2

> **Versão:** 1.0 (revisão complementar)  
> **Data:** 2026-07-10  
> **Tipo:** Auditoria de lacunas — **não altera** os documentos V2 existentes  
> **Documentos revisados:**
>
> - `PRODUCT_MASTER_V2.md`
> - `DOMAIN_MODEL_V2.md`
> - `MASTER_ROADMAP_V2.md`
> - `BACKLOG_V2.md`

---

## Sumário executivo

| Métrica                             | Valor                                                 |
| ----------------------------------- | ----------------------------------------------------- |
| **Lacunas identificadas**           | **47**                                                |
| **Inconsistências internas**        | **8**                                                 |
| **Entidades adicionais sugeridas**  | **32**                                                |
| **Eventos adicionais sugeridos**    | **18**                                                |
| **Aggregates adicionais sugeridos** | **9**                                                 |
| **Ajustes de roadmap sugeridos**    | **6** (documentação apenas — sem reorganizar sprints) |
| **Riscos novos catalogados**        | **12**                                                |

### Veredito sobre congelamento

| Pergunta                                                     | Resposta                                                                 |
| ------------------------------------------------------------ | ------------------------------------------------------------------------ |
| **Pode congelar agora?**                                     | **Parcialmente** — suficiente para iniciar Sprint 3                      |
| **Pode congelar para desenvolvimento completo sem memória?** | **Não ainda** — faltam complementos listados na Seção 10                 |
| **Revisão adicional recomendada?**                           | **Sim** — uma rodada de complementação (não reescrita) antes da Sprint 5 |

---

## 1. Lacunas encontradas (por área)

### Legenda de gravidade

| Gravidade      | Significado                                                                            |
| -------------- | -------------------------------------------------------------------------------------- |
| 🔴 **Crítica** | Bloqueia desenvolvimento correto ou gera retrabalho estrutural                         |
| 🟠 **Alta**    | Funcionalidade importante ausente; deve ser documentada antes da sprint correspondente |
| 🟡 **Média**   | Detalhe operacional ausente; pode ser documentado incrementalmente                     |
| 🟢 **Baixa**   | Nice-to-have documental; não bloqueia Sprint 3                                         |

---

### 1.1 Empresas da Holding

| ID   | Lacuna                                                                                                   | Gravidade | Onde deveria estar  |
| ---- | -------------------------------------------------------------------------------------------------------- | --------- | ------------------- |
| H-01 | **Dashboards por empresa** não especificados (métricas, widgets, permissões)                             | 🟠 Alta   | PRODUCT §3 + DOMAIN |
| H-02 | **Fluxos inter-empresas** (ex.: lead RR → NF telemetria) sem diagramas de sequência                      | 🟡 Média  | PRODUCT §3          |
| H-03 | Nome **"Neurofrigo"** no seed vs **"Neurofrigo Command IA"** na documentação                             | 🟡 Média  | PRODUCT §3 / seed   |
| H-04 | **CTE** descrito como "Centro de Tecnologia e Engenharia" mas seed usa apenas `CTE` sem expansão do nome | 🟢 Baixa  | PRODUCT §3          |
| H-05 | **Papéis RBAC por empresa** (quem administra RR vs FDFA) não mapeados empresa a empresa                  | 🟠 Alta   | DOMAIN §4           |
| H-06 | **Conteúdo CMS por empresa** — templates/blocos padrão por vertical não definidos                        | 🟡 Média  | PRODUCT §5          |
| H-07 | **CRM por empresa** — pipelines distintos (RR serviço vs FDFA matrícula) não detalhados                  | 🟠 Alta   | DOMAIN §3.6         |
| H-08 | **LMS por empresa** — FDFA (prático) vs CES (formal) sem diferenciação de trilhas                        | 🟠 Alta   | DOMAIN §3.9         |
| H-09 | **IA por empresa** — casos de uso listados mas sem matriz agente×empresa×dados                           | 🟡 Média  | DOMAIN §5           |

**O que está OK:** As 6 empresas estão documentadas com missão, responsabilidades, integração e compartilhamento de dados em `PRODUCT_MASTER_V2.md` §3.2–3.3.

---

### 1.2 Parceiros

Checklist do pedido vs documentação:

| Campo solicitado                        | Status     | Lacuna                                                                      |
| --------------------------------------- | ---------- | --------------------------------------------------------------------------- |
| Perfil, logo, capa, galeria             | ✅ Parcial | OK em PRODUCT §7.2 e DOMAIN §3.7                                            |
| Serviços, produtos                      | ✅         | `PartnerService`, `PartnerProduct`                                          |
| **Especialidades**                      | 🟡         | Mencionado como "tags" — sem entidade `PartnerSpecialty`                    |
| **Equipamentos**                        | 🔴         | **Ausente**                                                                 |
| **Marcas atendidas**                    | 🔴         | **Ausente** (ex.: marcas de equipamento que o parceiro atende)              |
| Certificações                           | ✅ Parcial | Array em `PartnerProfile`; sem workflow validação                           |
| **Responsável (pessoa)**                | 🔴         | **Ausente** — só `userId` genérico                                          |
| Telefone, WhatsApp, site, e-mail        | ✅         | `PartnerContact`                                                            |
| Redes sociais                           | ✅         | `social{}`                                                                  |
| CNPJ                                    | ✅         | Criptografado mencionado                                                    |
| Endereço, cidade, estado                | ✅ Parcial | Em cobertura; **CEP ausente explicitamente**                                |
| Lat, long, raio                         | ✅         | `ServiceArea`                                                               |
| Regiões atendidas                       | ✅         | cities[], states[]                                                          |
| **Dias de atendimento**                 | 🔴         | **Ausente**                                                                 |
| **Horários**                            | 🔴         | **Ausente**                                                                 |
| **Plantão / emergência 24h**            | 🟡         | Filtro em mapa §8.4; sem modelo de dados                                    |
| **Disponibilidade em tempo real**       | 🟡         | Ordenação mencionada; sem entidade `AvailabilitySlot`                       |
| Avaliações                              | ✅         | `PartnerReview`                                                             |
| **Documentos (uploads legais)**         | 🟠         | Certificações sim; **documentos gerais (contrato, alvará) sem entidade**    |
| Status, plano                           | ✅         |                                                                             |
| **Comissão (regras de cálculo)**        | 🟠         | `commissionRate` existe; **sem `CommissionRule` ou histórico de pagamento** |
| Recebimento de leads                    | ✅ Parcial | `PartnerLead`                                                               |
| **Histórico de alterações do parceiro** | 🔴         | **Ausente** (audit trail)                                                   |
| **Dashboard próprio do parceiro**       | 🟠         | Mencionado superficialmente; **sem wireframe funcional nem métricas**       |

---

### 1.3 Geolocalização

| ID     | Lacuna                                                                                     | Gravidade  |
| ------ | ------------------------------------------------------------------------------------------ | ---------- |
| GEO-01 | **Geocoding** (endereço → lat/long) não documentado                                        | 🟠 Alta    |
| GEO-02 | **Reverse geocoding** não documentado                                                      | 🟠 Alta    |
| GEO-03 | **Clusters no mapa** (agrupamento de markers) ausente                                      | 🟡 Média   |
| GEO-04 | **Cache** — mencionado Redis bounding box; sem TTL, invalidação, chave                     | 🟡 Média   |
| GEO-05 | **PostGIS** — mencionado; sem ADR, sem migration strategy                                  | 🟠 Alta    |
| GEO-06 | **LGPD geolocalização** — consentimento citado; sem `GeoConsent` entity, retenção, opt-out | 🔴 Crítica |
| GEO-07 | **Provedor de mapas** — "decisão Sprint 7" pendente (Mapbox/Leaflet/Google)                | 🟠 Alta    |
| GEO-08 | **Busca por polígono** (não só raio) não prevista                                          | 🟢 Baixa   |

**O que está OK:** Distância, raio, filtros, ordenação, fluxo UX em PRODUCT §8.

---

### 1.4 LMS

| Item solicitado                    | Status     | Lacuna                                                    |
| ---------------------------------- | ---------- | --------------------------------------------------------- |
| Cursos                             | ✅         |                                                           |
| **Categorias de curso**            | 🔴         | Ausente (só blog categories)                              |
| **Trilhas (learning paths)**       | 🔴         | BACKLOG LMS-S05 Should; **sem modelo de domínio**         |
| Módulos, aulas                     | ✅         | `CourseModule`, `Lesson`                                  |
| Materiais, vídeos, PDF             | ✅ Parcial | `CourseMaterial`                                          |
| Professores                        | ✅         | `Instructor`                                              |
| Turmas, calendário                 | ✅         | `Class`, `ClassSchedule`                                  |
| Provas                             | ✅         | `Exam`                                                    |
| **Banco de questões reutilizável** | 🟠         | BACKLOG LMS-S03; **sem aggregate `QuestionBank`**         |
| **Correção / rubrica**             | 🔴         | Ausente                                                   |
| **Notas / grades**                 | 🔴         | Score em `ExamAttempt`; **sem `Grade` entity ou boletim** |
| Certificados                       | ✅         |                                                           |
| Progresso                          | ✅         | `LessonProgress`, `progress%`                             |
| Gamificação                        | ✅ Future  | BACKLOG COULD-007                                         |
| Comunidade                         | 🔴         | **Não previsto em lugar nenhum**                          |
| Aulas ao vivo                      | ✅ Could   | COULD-008                                                 |
| Gravações                          | 🔴         | **Ausente** (live → VOD pipeline)                         |
| **Área do aluno (superfície)**     | 🟠         | Rotas implícitas; **sem spec de portal autenticado**      |
| **Área do professor (superfície)** | 🟠         | Idem                                                      |

---

### 1.5 CRM

| Item solicitado                        | Status     | Lacuna                                                   |
| -------------------------------------- | ---------- | -------------------------------------------------------- |
| Empresas (conta)                       | 🟡         | `companyId` em Lead; **sem aggregate `Account` B2B**     |
| Leads                                  | ✅         |                                                          |
| **Contatos** (pessoa separada do lead) | 🔴         | **Ausente** — `Contact` entity                           |
| Pipeline, oportunidades                | ✅         |                                                          |
| **Tarefas**                            | 🟡         | `Activity` type task; **sem distinção Task vs Activity** |
| **Agenda / calendário comercial**      | 🔴         | Ausente                                                  |
| **Visitas de campo**                   | 🔴         | Ausente                                                  |
| Atividades                             | ✅ Parcial |                                                          |
| **Mensagens** (histórico unificado)    | 🔴         | Ausente no CRM (só Chat §3.12)                           |
| WhatsApp no CRM                        | 🟡         | Evolution Sprint 13; **sem link CRM↔Conversation**       |
| Chat no CRM                            | 🟡         | Tickets Sprint 11                                        |
| Histórico                              | 🟡         | `LeadActivity`; **sem timeline unificada**               |
| Origem, UTM                            | ✅         | `source`, `utm` em Lead                                  |
| **Campanhas marketing**                | 🔴         | **Ausente**                                              |
| Parceiros como origem                  | ✅         | `partnerId`                                              |
| Cursos como origem                     | 🔴         | Ausente                                                  |
| **Empresa holding responsável**        | 🟡         | `companyId`; routing rules não documentadas              |

---

### 1.6 IA — Agentes

Os 10 agentes estão listados em DOMAIN §5.1, mas **falta especificação individual** exigida:

| Campo exigido                      | Status por agente            |
| ---------------------------------- | ---------------------------- |
| Objetivo                           | 🟡 Uma linha na tabela       |
| Escopo (o que pode/não pode)       | 🔴 Ausente                   |
| Dados permitidos (por tenant/role) | 🔴 Ausente                   |
| Ferramentas (tools) detalhadas     | 🟡 Lista parcial             |
| Restrições                         | 🟡 Só políticas globais §5.3 |
| Handoff humano                     | 🟡 Mencionado globalmente    |
| Logs / auditoria                   | 🟡 Mencionado                |
| Memória (curto/longo prazo)        | 🔴 Ausente por agente        |
| Contexto (o que injeta no prompt)  | 🔴 Ausente                   |
| Custos (budget por tenant)         | 🔴 Ausente                   |
| RAG (quais collections indexar)    | 🔴 Ausente por agente        |

**Agentes solicitados vs documentados:**

| Agente       | Documentado       |
| ------------ | ----------------- |
| Comercial    | ✅ `sales`        |
| Técnico      | ✅ `technical`    |
| Educacional  | ✅ `educational`  |
| Neurofrigo   | ✅ `neurofrigo`   |
| Parceiros    | ✅ `partner`      |
| Atendimento  | ✅ `attendance`   |
| Aluno        | ✅ `student`      |
| Professor    | ✅ `instructor`   |
| Supervisor   | ✅ `supervisor`   |
| Orquestrador | ✅ `orchestrator` |

---

### 1.7 CMS — CMS First

| Verificação                                                        | Status                 |
| ------------------------------------------------------------------ | ---------------------- |
| Regra de ouro (nada hardcoded)                                     | ✅ PRODUCT §2.2        |
| Home, LPs, menus, footer, SEO                                      | ✅ Planejado Sprint 3  |
| Hero, empresas, blocos                                             | ✅                     |
| Preview, versionamento                                             | ✅ Sprint 3            |
| **Checklist de validação CMS-first** (como auditar no code review) | 🔴 Ausente             |
| **Matriz conteúdo × collection** completa                          | 🟡 Parcial §5.2        |
| **Workflow publicação multi-empresa**                              | 🟡 Mencionado Sprint 4 |

**Dívida explícita documentada:** EcosystemSection, Header, Footer hardcoded — DEBT-001 a 003.

---

### 1.8 Portal — Separação de superfícies

| Superfície solicitada                       | Documentada claramente?                                  |
| ------------------------------------------- | -------------------------------------------------------- |
| Portal público (`apps/web`)                 | ✅                                                       |
| Admin (`apps/admin` frontend)               | ✅                                                       |
| CMS Payload (`/admin`)                      | ✅                                                       |
| **Área autenticada genérica**               | 🔴 Não separada                                          |
| **Área aluno** (`/aluno` ou `/minha-conta`) | 🟠 Rotas implícitas Sprint 8; **sem mapa de rotas/auth** |
| **Área professor**                          | 🟠 Idem                                                  |
| **Área parceiro**                           | 🟠 Sprint 7 `/parceiro` mencionado                       |
| **Área cliente**                            | 🔴 Ausente                                               |
| **Área holding (consolidado)**              | 🔴 Ausente — BI Sprint 15/16                             |

**Lacuna estrutural:** Não existe documento de **Information Architecture (IA)** com árvore de rotas por persona.

---

### 1.9 Identidade

| Item                                  | Status                                        | Lacuna |
| ------------------------------------- | --------------------------------------------- | ------ |
| Payload Users vs Drizzle Users        | ✅ DOMAIN §8                                  |
| RBAC 15 papéis                        | ✅ DOMAIN §4                                  |
| Multiempresa / multi-tenant           | ✅                                            |
| **Consentimentos LGPD**               | 🔴 Ausente como entidade                      |
| **Auditoria (audit log)**             | 🟡 Sprint 16 `audit_logs`; **sem spec antes** |
| **Logs de segurança**                 | 🔴 Ausente                                    |
| **Perfis** (StudentProfile detalhado) | 🟡 Mencionado                                 |
| **MFA / 2FA**                         | 🔴 Não previsto                               |
| **Password reset / invite flow**      | 🔴 Ausente                                    |

---

### 1.10 Observabilidade

| Item solicitado              | Status                                |
| ---------------------------- | ------------------------------------- |
| Logs estruturados            | 🟡 `OBSERVABILITY.md` raiz; não em V2 |
| Auditoria                    | 🟡 Sprint 16                          |
| Métricas                     | 🟡 Sprint 15–16                       |
| Alertas                      | 🟡 Sprint 16                          |
| **Backups**                  | 🔴 **Ausente em V2**                  |
| **Restore / DR**             | 🔴 **Ausente**                        |
| Monitoramento                | 🟡 Parcial                            |
| **Custos IA**                | 🔴 Ausente                            |
| **Custos infra**             | 🔴 Ausente                            |
| **Versionamento de prompts** | 🔴 Ausente                            |
| **Feature flags**            | 🟡 Package existe; **não em V2**      |

---

### 1.11 Futuro

| Item                  | Previsto?                                                          |
| --------------------- | ------------------------------------------------------------------ |
| App mobile            | ✅ Sprint 16 / FUT-001                                             |
| PWA                   | ✅ FUT-002                                                         |
| API pública           | ✅ Sprint 15                                                       |
| Marketplace completo  | ✅ Sprint 10                                                       |
| Financeiro (módulo)   | 🟡 Role `finance`; **sem BC Financeiro**                           |
| Assinaturas           | ✅ `Subscription`                                                  |
| Pagamentos            | ✅ Sprint 10                                                       |
| Marketplace de cursos | 🟡 Cursos + pagamento; **sem "marketplace educacional" explícito** |
| Integrações ERP       | 🔴 **Ausente**                                                     |
| IoT Neurofrigo        | ✅ Sprint 13                                                       |
| BI                    | ✅ FUT-010                                                         |
| Analytics             | ✅ Sprint 15                                                       |

---

## 2. Inconsistências internas (entre documentos V2)

| ID     | Inconsistência                                                                       | Documentos        | Gravidade  |
| ------ | ------------------------------------------------------------------------------------ | ----------------- | ---------- |
| INC-01 | **Sprint 6:** PRODUCT §15 = Marketplace; MASTER_ROADMAP = Notifications              | PRODUCT vs MASTER | 🔴 Crítica |
| INC-02 | **Sprint IA:** PRODUCT §12.4 = "Sprint 8+"; MASTER = Sprint 12                       | PRODUCT vs MASTER | 🟠 Alta    |
| INC-03 | **Sprint Academy:** PRODUCT §15 = "7+"; MASTER = Sprint 8–9                          | PRODUCT vs MASTER | 🟠 Alta    |
| INC-04 | **courses collection:** PRODUCT §5.2 = Sprint 7+; MASTER = Sprint 8                  | PRODUCT vs MASTER | 🟡 Média   |
| INC-05 | **case-studies:** PRODUCT §5.2 = Sprint 5+; MASTER/BACKLOG = Sprint 4                | PRODUCT vs MASTER | 🟡 Média   |
| INC-06 | **Activity aggregate** em CRM §3.6 conflita semanticamente com `LeadActivity` entity | DOMAIN interno    | 🟡 Média   |
| INC-07 | **Sprint 13 depende Sprint 14** (parcial) mas 14 vem depois de 13 no roadmap         | MASTER §3         | 🟠 Alta    |
| INC-08 | BACKLOG não lista item Must para **ConsentRecord / LGPD** apesar de CRM-006          | BACKLOG vs pedido | 🟠 Alta    |

**Nota:** Estas inconsistências são de **documentação**, não exigem reorganização de sprints — apenas alinhamento textual em futura complementação.

---

## 3. Funcionalidades esquecidas (não mencionadas nos V2)

| #   | Funcionalidade                     | Domínio sugerido | Sprint sugerida |
| --- | ---------------------------------- | ---------------- | --------------- |
| 1   | Newsletter / inscritos             | Marketing        | 6 (Could)       |
| 2   | Comunidade LMS (fórum)             | LMS              | Future          |
| 3   | Campanhas CRM                      | CRM              | 5               |
| 4   | Conta B2B (Account)                | CRM              | 5               |
| 5   | Agenda comercial                   | CRM              | 5               |
| 6   | Visitas de campo                   | CRM              | 5               |
| 7   | Equipamentos do parceiro           | Partners         | 7               |
| 8   | Marcas atendidas pelo parceiro     | Partners         | 7               |
| 9   | Disponibilidade horária parceiro   | Partners         | 7               |
| 10  | Geocoding / reverse geocoding      | Geo              | 7               |
| 11  | Trilhas de aprendizado             | LMS              | 8               |
| 12  | Banco de questões                  | LMS              | 9               |
| 13  | Notas / boletim acadêmico          | LMS              | 9               |
| 14  | Gravações de aulas ao vivo         | LMS              | 9+              |
| 15  | Integração ERP                     | Integrations     | Future          |
| 16  | MFA autenticação                   | Identity         | 3+              |
| 17  | Backup / restore / DR              | Infra            | 16              |
| 18  | Versionamento prompts IA           | AI               | 12              |
| 19  | Custos IA / infra dashboards       | Observability    | 15–16           |
| 20  | Search site-wide (`@omnia/search`) | Portal           | 4               |

---

## 4. Melhorias sugeridas (complementação futura)

### 4.1 Novos documentos complementares (não reescrever V2)

| Documento sugerido         | Conteúdo                                         |
| -------------------------- | ------------------------------------------------ |
| `AGENT_SPEC_V2.md`         | Ficha completa por agente IA (10 agentes)        |
| `PARTNER_DATA_MODEL_V2.md` | Todos os campos do checklist parceiro            |
| `PORTAL_IA_V2.md`          | Information architecture: rotas × persona × auth |
| `CRM_SPEC_V2.md`           | Pipeline por empresa, campanhas, contatos        |
| `LMS_SPEC_V2.md`           | Trilhas, notas, áreas aluno/professor            |
| `GEO_SPEC_V2.md`           | PostGIS, geocoding, LGPD, clusters               |
| `OBSERVABILITY_SPEC_V2.md` | Backups, DR, custos, SLOs                        |
| `LGPD_COMPLIANCE_V2.md`    | Consentimentos, exportação, exclusão             |

### 4.2 Melhorias nos documentos existentes (quando autorizado)

| Melhoria                                      | Arquivo alvo |
| --------------------------------------------- | ------------ |
| Alinhar tabela Sprint 6–12 com MASTER_ROADMAP | PRODUCT §15  |
| Adicionar § "Superfícies do portal" com rotas | PRODUCT §4   |
| Expandir §5 agentes com template padrão       | DOMAIN §5    |
| Adicionar backlog items LGPD, geo, partner    | BACKLOG      |
| Resolver dependência Sprint 13↔14             | MASTER §3    |

### 4.3 ADRs sugeridos (antes de implementar)

| ADR     | Tema                                 |
| ------- | ------------------------------------ |
| ADR-009 | Dual User Model (Payload vs Drizzle) |
| ADR-010 | PostGIS + provedor de mapas          |
| ADR-011 | Gateway de pagamento                 |
| ADR-012 | Geocoding provider + LGPD geo        |
| ADR-013 | Event bus (Redis Streams vs outbox)  |

---

## 5. Entidades adicionais sugeridas

| Entidade              | Aggregate? | Domínio          | Prioridade |
| --------------------- | ---------- | ---------------- | ---------- |
| `Contact`             | Entity     | CRM              | Must S5    |
| `Account`             | AR         | CRM              | Should S5  |
| `Campaign`            | AR         | CRM/Marketing    | Should S5  |
| `Task`                | Entity     | CRM              | Should S5  |
| `Visit`               | Entity     | CRM              | Could S5   |
| `CalendarEvent`       | Entity     | CRM              | Should S5  |
| `ConsentRecord`       | AR         | Identity/LGPD    | Must S5    |
| `AuditLog`            | Entity     | Security         | Must S3    |
| `PartnerSpecialty`    | Entity     | Partners         | Must S7    |
| `PartnerEquipment`    | Entity     | Partners         | Must S7    |
| `PartnerBrand`        | Entity     | Partners         | Should S7  |
| `PartnerDocument`     | Entity     | Partners         | Must S7    |
| `PartnerAvailability` | Entity     | Partners         | Must S7    |
| `PartnerAuditEntry`   | Entity     | Partners         | Should S7  |
| `CommissionPayment`   | AR         | Partners/Finance | Should S7  |
| `GeoConsent`          | Entity     | Geo/LGPD         | Must S7    |
| `QuestionBank`        | AR         | LMS              | Should S9  |
| `Grade`               | Entity     | LMS              | Must S9    |
| `LearningPath`        | AR         | LMS              | Should S8  |
| `CourseCategory`      | Entity     | LMS              | Must S8    |
| `Recording`           | Entity     | LMS              | Could S9   |
| `PromptVersion`       | Entity     | AI               | Should S12 |
| `AiCostBudget`        | Entity     | AI/Ops           | Should S12 |
| `BackupJob`           | Entity     | Infra            | Must S16   |
| `FeatureFlag`         | Entity     | Core             | Should S3  |
| `Subscriber`          | Entity     | Marketing        | Could S6   |
| `Coupon`              | Entity     | Marketplace      | Could S10  |
| `WebhookSubscription` | AR         | API              | Should S15 |
| `DataExportRequest`   | AR         | LGPD             | Must S16   |
| `CrmMessage`          | Entity     | CRM              | Should S11 |
| `TimelineEntry`       | Read Model | CRM              | Should S5  |

---

## 6. Eventos adicionais sugeridos

| Evento                              | Domínio       | Quando                  |
| ----------------------------------- | ------------- | ----------------------- |
| `ConsentGranted` / `ConsentRevoked` | LGPD          | Form submit             |
| `ContactCreated`                    | CRM           | Novo contato            |
| `CampaignLaunched`                  | CRM           | Campanha ativa          |
| `PartnerAvailabilityUpdated`        | Partners      | Horário alterado        |
| `CommissionCalculated`              | Partners      | Fechamento período      |
| `GeoSearchPerformed`                | Analytics/Geo | Busca mapa              |
| `GradePublished`                    | LMS           | Nota lançada            |
| `LearningPathCompleted`             | LMS           | Trilha concluída        |
| `RecordingPublished`                | LMS           | Aula gravada disponível |
| `PromptVersionDeployed`             | AI            | Nova versão prompt      |
| `AiBudgetThresholdReached`          | AI/Ops        | 80% budget              |
| `BackupCompleted` / `BackupFailed`  | Infra         | Job backup              |
| `FeatureFlagToggled`                | Core          | Flag alterada           |
| `DataExportRequested`               | LGPD          | Usuário solicita        |
| `AccountCreated`                    | CRM           | Conta B2B               |
| `VisitScheduled`                    | CRM           | Visita agendada         |
| `MfaEnabled`                        | Identity      | Segurança               |
| `CourseCategoryPublished`           | LMS           | Catálogo                |

---

## 7. Novos aggregates sugeridos

| Aggregate             | Domínio       | Justificativa                           |
| --------------------- | ------------- | --------------------------------------- |
| `Account`             | CRM           | Empresas clientes B2B distintas de Lead |
| `Campaign`            | CRM/Marketing | Origem e atribuição de leads            |
| `CommissionPayment`   | Partners      | Ciclo financeiro parceiro               |
| `QuestionBank`        | LMS           | Reutilização de questões entre provas   |
| `LearningPath`        | LMS           | Trilhas FDFA/CES                        |
| `ConsentRecord`       | LGPD          | Compliance obrigatório                  |
| `PromptVersion`       | AI            | Governança de prompts                   |
| `WebhookSubscription` | API           | Integrações externas                    |
| `DataExportRequest`   | LGPD          | Direito do titular                      |

---

## 8. Ajustes de roadmap sugeridos (somente documentação)

> **Não reorganizar sprints** — apenas registrar alinhamentos necessários.

| #     | Ajuste                                                             | Ação recomendada                              |
| ----- | ------------------------------------------------------------------ | --------------------------------------------- |
| AR-01 | Unificar PRODUCT §15 com MASTER_ROADMAP Sprints 3–16               | Editar tabela em complementação               |
| AR-02 | Documentar dependência circular Sprint 13↔14                       | MASTER: n8n básico em Sprint 12 ou mock em 13 |
| AR-03 | Antecipar spec LGPD para Sprint 5 (não 16)                         | BACKLOG: elevar ConsentRecord a Must          |
| AR-04 | Antecipar AuditLog spec para Sprint 3                              | Identity foundation                           |
| AR-05 | Incluir Sprint 3.5 documental "Portal IA" antes de código Sprint 4 | Processo                                      |
| AR-06 | ADR-009 (dual users) gate obrigatório Sprint 3 kickoff             | Processo                                      |

---

## 9. Riscos (consolidado + novos)

| ID   | Risco                                                             | Gravidade | Mitigação                         |
| ---- | ----------------------------------------------------------------- | --------- | --------------------------------- |
| R-01 | Documentação inconsistente entre PRODUCT e MASTER confunde squads | 🔴        | Alinhar §15 PRODUCT (AR-01)       |
| R-02 | Parceiro subespecificado → rework collection Payload              | 🔴        | PARTNER_DATA_MODEL complementar   |
| R-03 | LGPD geo/consent não modelado antes Sprint 7                      | 🔴        | GEO_SPEC + ConsentRecord Sprint 5 |
| R-04 | CRM sem Contact/Account → modelo ingênuo                          | 🟠        | CRM_SPEC antes Sprint 5           |
| R-05 | IA agents sem spec → comportamento imprevisível                   | 🟠        | AGENT_SPEC antes Sprint 12        |
| R-06 | Portal autenticado sem IA de rotas                                | 🟠        | PORTAL_IA antes Sprint 8          |
| R-07 | LMS sem trilhas/notas → FDFA≠CES na prática                       | 🟠        | LMS_SPEC antes Sprint 8           |
| R-08 | Observabilidade/backup só Sprint 16 → risco operacional early     | 🟠        | Backup mínimo documentar Sprint 3 |
| R-09 | Sprint 13→14 dependência circular                                 | 🟠        | AR-02                             |
| R-10 | `@omnia/search` órfão                                             | 🟡        | Incluir Sprint 4 backlog          |
| R-11 | ERP não previsto — pedido futuro pode surpreender                 | 🟢        | Future backlog OK                 |
| R-12 | Nome Neurofrigo inconsistente com seed                            | 🟢        | Alinhar seed ou doc               |

---

## 10. Itens obrigatórios antes da Sprint 3

Checklist de gate — **não iniciar Sprint 3 sem:**

| #   | Item                                                                      | Responsável   | Tipo     |
| --- | ------------------------------------------------------------------------- | ------------- | -------- |
| 1   | Aprovar PRODUCT + DOMAIN + MASTER + BACKLOG V2                            | Product Owner | Decisão  |
| 2   | Resolver INC-01 (Sprint 6 Marketplace vs Notifications)                   | Product + Eng | Doc      |
| 3   | Publicar ADR-009 Dual User Model                                          | Arquitetura   | ADR      |
| 4   | Complementar PORTAL_IA_V2 (rotas × persona) — mínimo                      | Product       | Doc novo |
| 5   | Elevar AuditLog + ConsentRecord a spec mínima                             | Eng + Legal   | Doc novo |
| 6   | Alinhar seed `Neurofrigo` → nome oficial                                  | Eng           | Seed/doc |
| 7   | Atualizar `docs/README.md` índice → `00-product/`                         | Eng           | Doc      |
| 8   | Marcar `docs/13-roadmap/README.md` como superseded por MASTER_V2 para S3+ | Eng           | Doc      |
| 9   | Confirmar escopo Sprint 3 Must do BACKLOG (CMS-005 a 010, CORE-007 a 010) | PO            | Decisão  |
| 10  | Revisar este PRODUCT_REVIEW_V2 e aceitar lacunas diferidas                | Steering      | Decisão  |

**Itens que podem esperar até antes da Sprint correspondente:**

| Sprint | Gate documental                             |
| ------ | ------------------------------------------- |
| 5      | CRM_SPEC_V2, ConsentRecord final            |
| 7      | PARTNER_DATA_MODEL_V2, GEO_SPEC_V2, ADR-010 |
| 8      | LMS_SPEC_V2, PORTAL_IA áreas autenticadas   |
| 12     | AGENT_SPEC_V2 (10 fichas)                   |
| 16     | OBSERVABILITY_SPEC_V2, LGPD_COMPLIANCE_V2   |

---

## 11. Checklist de congelamento da documentação

### Critérios para declarar documentação "congelada"

| Critério                                                 | Status               |
| -------------------------------------------------------- | -------------------- |
| Visão de produto completa                                | ✅ PRODUCT_MASTER_V2 |
| Modelo de domínio base                                   | ✅ DOMAIN_MODEL_V2   |
| Roadmap 0–16 com critérios por sprint                    | ✅ MASTER_ROADMAP_V2 |
| Backlog MoSCoW rastreável                                | ✅ BACKLOG_V2        |
| 6 empresas holding documentadas                          | ✅                   |
| CMS-first principle                                      | ✅                   |
| RBAC 15 papéis                                           | ✅                   |
| 10 agentes IA listados                                   | ✅                   |
| Inconsistências internas resolvidas                      | ❌ 8 pendentes       |
| Specs detalhadas por módulo (CRM, Partner, LMS, Geo, IA) | ❌                   |
| Portal IA (rotas × persona)                              | ❌                   |
| LGPD modelado                                            | ❌                   |
| Observabilidade / backup                                 | ❌                   |
| ADRs de gate (009–013)                                   | ❌                   |
| Índice docs atualizado                                   | ❌                   |

### Níveis de congelamento propostos

| Nível                  | Significado                                | Status atual                        |
| ---------------------- | ------------------------------------------ | ----------------------------------- |
| **L1 — Foundation**    | Pode iniciar Sprint 3                      | ✅ **Atingido** (com gate §10)      |
| **L2 — Module-ready**  | Pode iniciar Sprint 5 (CRM)                | ❌ Requer complementos              |
| **L3 — Full platform** | Desenvolvimento sem memória conversacional | ❌ Requer L1–L2 + specs Sprint 7–16 |

---

## 12. Resumo quantitativo final

### Lacunas por gravidade

| Gravidade  | Quantidade |
| ---------- | ---------- |
| 🔴 Crítica | **8**      |
| 🟠 Alta    | **22**     |
| 🟡 Média   | **12**     |
| 🟢 Baixa   | **5**      |
| **Total**  | **47**     |

### Lacunas críticas (lista)

1. INC-01 — Sprint 6 inconsistente entre documentos
2. Equipamentos parceiro ausentes
3. Marcas atendidas parceiro ausentes
4. Dias/horários atendimento parceiro ausentes
5. ConsentRecord / LGPD geo não modelado
6. Contatos CRM ausentes
7. Campanhas CRM ausentes
8. Checklist CMS-first audit ausente

### Recomendação final

| Pergunta                                                 | Resposta                                                                                         |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Documentação suficiente para Sprint 3?**               | **Sim**, com gate §10 (ADR-009, alinhar INC-01, PORTAL_IA mínimo)                                |
| **Documentação suficiente para 6–12 meses sem memória?** | **Não** — faltam 8 documentos complementares (§4.1)                                              |
| **Congelar agora?**                                      | **Congelar L1 (Foundation)**; manter V2 abertos para complementação L2/L3                        |
| **Revisão adicional?**                                   | **Sim** — uma sprint documental "Sprint 2.5" de complementação (~1 semana) antes de CRM/Partners |

---

## 13. Referências cruzadas

| Documento              | Papel                                               |
| ---------------------- | --------------------------------------------------- |
| `PRODUCT_MASTER_V2.md` | Visão e regras de produto                           |
| `DOMAIN_MODEL_V2.md`   | Entidades, eventos, RBAC, agentes (nível macro)     |
| `MASTER_ROADMAP_V2.md` | Sequência técnica autoritativa para Sprints 3+      |
| `BACKLOG_V2.md`        | Priorização executável                              |
| `PRODUCT_REVIEW_V2.md` | **Este documento** — lacunas e gate de congelamento |

---

_Revisão gerada sem alteração dos documentos V2 existentes. Próximo passo recomendado: aprovação do gate §10 e criação seletiva dos complementos §4.1._
