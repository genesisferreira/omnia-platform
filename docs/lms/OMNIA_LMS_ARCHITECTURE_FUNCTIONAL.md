# Omnia LMS — Arquitetura Funcional Completa

> Complemento oficial do [`OMNIA_LMS_BLUEPRINT.md`](OMNIA_LMS_BLUEPRINT.md).  
> Metodologia por funcionalidade: Objetivo · Fluxo · Experiência · Responsável · Justificativa · APIs · Dados · Dependências · Escalabilidade · Complexidade.

**Legenda de responsável:** `Omnia` | `Moodle` | `Neurofrigo` | `Externo`  
**Complexidade:** B (baixa) · M (média) · A (alta) · AA (muito alta)

---

# MÓDULO 1 — Visão geral

## 1.1 Produto Omnia LMS

| #                | Resposta                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| 1 Objetivo       | Oferecer LMS completo de educação técnica Omnia com UX própria e IA.                                   |
| 2 Fluxo          | Descoberta → conta Omnia → matrícula → estudo → avaliação → certificado → reengajamento.               |
| 3 Experiência    | App/web moderno; Moodle invisível ao usuário final.                                                    |
| 4 Responsável    | **Omnia** (orquestração) + **Moodle** (academia) + **Neurofrigo** (IA) + **Externo** (mídia/live/pay). |
| 5 Justificativa  | Separação de concerns: UX/produto ≠ engine acadêmico ≠ IA ≠ commodities.                               |
| 6 APIs           | BFF Omnia LMS; Moodle WS; Neurofrigo API; gateways.                                                    |
| 7 Dados          | Identidade Omnia, matrículas, progresso, conteúdo, analytics, billing.                                 |
| 8 Dependências   | Platform auth, engine Moodle, Neurofrigo, Traefik/`lms.*`.                                             |
| 9 Escalabilidade | Horizontal no BFF/UI; engine com Redis/DB dedicados; CDN/vídeo externo.                                |
| 10 Complexidade  | **AA**                                                                                                 |

## 1.2 Fronteiras (regra de ouro)

| Pertence a | Exemplos                                                                                                        |
| ---------- | --------------------------------------------------------------------------------------------------------------- |
| Moodle     | Estrutura curso/módulo/atividade, matrícula acadêmica, quiz engine, gradebook, completion, competências nativas |
| Omnia      | Shell UX, dashboards, busca global UX, gamificação de marca, marketplace, CRM edu, multiempresa UI, mobile app  |
| Neurofrigo | Qualquer geração/análise/recomendação por IA                                                                    |
| Externo    | CDN/VOD, SFU live, SMTP, WhatsApp, PIX/gateway, object storage                                                  |

---

# MÓDULO 2 — Área do Aluno

## 2.1 Dashboard do aluno

1. **Objetivo:** visão imediata do que estudar agora e do progresso.
2. **Fluxo:** login → dashboard → CTA “Continuar” / curso / agenda.
3. **Experiência:** cards de continuidade, streak, próximos eventos, alertas IA.
4. **Responsável:** **Omnia** (UI/agregação); dados de progresso **Moodle**; insights **Neurofrigo**.
5. **Justificativa:** dashboard é produto; Moodle não dita layout.
6. **APIs:** `GET /lms/me/dashboard` (BFF agrega Moodle + Neurofrigo).
7. **Dados:** enrollments, completion %, last access, due dates, AI tips.
8. **Dependências:** auth Omnia, connector Moodle.
9. **Escalabilidade:** cache por usuário (Redis Omnia).
10. **Complexidade:** **M**

## 2.2 Catálogo de features do aluno (matriz condensada)

| Feature                            | Responsável                              | Justificativa                              | Complexidade |
| ---------------------------------- | ---------------------------------------- | ------------------------------------------ | ------------ |
| Meus cursos                        | Omnia UI + Moodle enrollments            | Lista UX Omnia; fonte acadêmica Moodle     | M            |
| Continuar estudando                | Omnia + Moodle completion/last           | Deep-link para última atividade            | M            |
| Progresso                          | Moodle (verdade) + Omnia viz             | Barras/gráficos na Omnia                   | M            |
| Agenda / Calendário                | Omnia UI + Moodle calendar + live Ext    | Unificar acadêmico + lives                 | A            |
| Certificados                       | Moodle emit + Omnia galeria/validação UX | PDF/regra no engine; vitrine Omnia         | M            |
| Avaliações (fazer)                 | Moodle quiz + Omnia player UX            | Entregar UX; corrigir no engine            | A            |
| Materiais / Downloads              | Moodle files + Omnia biblioteca          | Controle de acesso no engine               | M            |
| Favoritos                          | **Omnia**                                | Preferência de produto, não acadêmica      | B            |
| Histórico                          | Omnia + Moodle logs/grades               | Linha do tempo UX                          | M            |
| Perfil                             | Omnia (identidade) sync Moodle user      | SSO futuro; perfil rico na Platform        | M            |
| Notificações                       | Omnia orquestra + Ext push/email/WA      | Preferências centralizadas                 | A            |
| Gamificação / Ranking / Conquistas | **Omnia** (+ hooks Moodle events)        | Marca Omnia; não depender de plugin Moodle | A            |
| IA Tutor / Chat IA                 | **Neurofrigo** + contexto Omnia/Moodle   | IA nunca no core Moodle                    | A            |
| Resumo automático                  | Neurofrigo                               | Sumariza aula/módulo                       | M            |
| Plano de estudos                   | Neurofrigo + Omnia persistência          | Plano gerado; execução no LMS              | A            |
| Recomendações                      | Neurofrigo                               | Baseado em progresso/lacunas               | A            |
| Pesquisa global                    | Omnia (index) + Moodle search data       | UX unificada multi-tenant                  | A            |
| Mobile / Offline                   | Omnia app + Ext sync                     | Ver Módulo 16                              | AA           |
| Acessibilidade                     | Omnia UI padrão WCAG                     | Obrigação de produto                       | M            |

### Fluxo típico “Continuar estudando”

Aluno abre app → BFF resolve última atividade Moodle → Omnia abre player/aula → progresso reportado ao Moodle → Neurofrigo pode sugerir próximo passo.

---

# MÓDULO 3 — Área do Professor

| Feature                            | Responsável                                       | Notas                                       | Complexidade |
| ---------------------------------- | ------------------------------------------------- | ------------------------------------------- | ------------ |
| Dashboard professor                | Omnia                                             | Turmas, pendências de correção, engajamento | M            |
| Criar cursos/módulos/aulas         | Omnia authoring UX → Moodle structure via API     | Professor não usa UI Moodle                 | AA           |
| Upload PDFs/arquivos               | Omnia UX → Moodle file API / storage Ext          | Quotas e vírus scan                         | A            |
| Vídeos                             | Ext VOD + Omnia metadata + Moodle activity link   | Player Omnia                                | A            |
| Avaliações / banco questões        | Moodle question bank + Omnia editor UX            | Engine de quiz = Moodle                     | A            |
| Questões IA                        | Neurofrigo gera → Omnia revisa → Moodle persiste  | Humano no loop                              | A            |
| Planejamento / turmas / calendário | Omnia + Moodle cohorts/groups/calendar            |                                             | A            |
| Correção / rubricas                | Moodle grading + Omnia UX; IA sugere (Neurofrigo) | Nota final no gradebook                     | A            |
| Relatórios turma                   | Omnia viz + Moodle analytics data                 |                                             | M            |
| Mensagens                          | Omnia messaging (ou bridge Moodle message)        | Preferir Omnia unificado                    | M            |
| IA Professor / geradores           | Neurofrigo                                        | Conteúdo, provas, slides, plano             | A            |

**Fluxo criar aula:** Professor na Omnia → define módulo/aula → upload/vídeo → publica → Connector cria atividades Moodle → alunos veem na Área do Aluno.

---

# MÓDULO 4 — Área do Gestor

| Feature                    | Responsável                            | Notas                       | Complexidade |
| -------------------------- | -------------------------------------- | --------------------------- | ------------ |
| Dashboard executivo        | Omnia                                  | KPIs agregados multi-tenant | A            |
| Indicadores / engajamento  | Omnia BI + eventos Moodle + Neurofrigo |                             | A            |
| Gestão cursos/profs/alunos | Omnia admin + Moodle sync              |                             | A            |
| Parceiros                  | Omnia (Rede Parceiros) ↔ LMS           | Já existe Platform partners | M            |
| Receitas / conversões      | Omnia billing + Ext gateway            |                             | A            |
| Relatórios / exportações   | Omnia                                  | CSV/PDF; jobs async         | M            |
| Auditoria / logs           | Omnia + Moodle logs técnicos           | LGPD                        | A            |
| Monitoramento              | Ext/Observability + Omnia              |                             | M            |
| BI / KPIs                  | Omnia warehouse leve ou Ext BI         |                             | A            |

**Experiência:** gestor nunca opera gradebook cru; vê funis, NPS edu, conclusão, receita, risco de churn (Neurofrigo).

---

# MÓDULO 5 — Cursos (modelo de conteúdo)

## 5.1 Taxonomia

1. Objetivo: organizar catálogo escalável (categorias → cursos → módulos → aulas).
2. Fluxo: gestor/professor estrutura → publica → aluno navega.
3. Experiência: catálogo Omnia com filtros; player contínuo.
4. Responsável: **estrutura acadêmica Moodle**; **catálogo/UX Omnia**; **tags/competências** Moodle + Omnia enrichment.  
   5–10: APIs de course/category/section/module; dados de syllabus; versionamento de conteúdo = Omnia policy + Moodle course backup/restore; idiomas = Moodle multilang + Omnia i18n UI; complexidade **A**.

| Conceito                              | Dono da verdade                          |
| ------------------------------------- | ---------------------------------------- |
| Categoria / curso / seção / atividade | Moodle                                   |
| Trilha comercial / pacote marketplace | Omnia                                    |
| Competências                          | Moodle competencies (+ mapeamento Omnia) |
| Pré-requisitos acadêmicos             | Moodle                                   |
| Favoritos / vitrine                   | Omnia                                    |
| Carga horária / certificado regras    | Moodle + regras Omnia de negócio         |
| Versionamento editorial               | Omnia (workflow) + snapshot Moodle       |

---

# MÓDULO 6 — Avaliações

| Feature                               | Responsável                                       | Complexidade |
| ------------------------------------- | ------------------------------------------------- | ------------ |
| Questionários / tentativas / notas    | **Moodle**                                        | A            |
| Banco de questões                     | Moodle + Omnia editor                             | A            |
| Objetivas / discursivas               | Moodle                                            | A            |
| Questões IA                           | Neurofrigo → revisão humana → Moodle              | A            |
| Rubricas                              | Moodle                                            | M            |
| Correção assistida IA                 | Neurofrigo + Moodle grade writeback               | AA           |
| Avaliações práticas (checklist/campo) | Omnia formulários + nota Moodle                   | A            |
| Certificação (elegibilidade)          | Moodle completion/grade + Omnia regras comerciais | A            |

**Princípio:** a nota oficial vive no Moodle; a experiência de fazer a prova é Omnia.

---

# MÓDULO 7 — Certificados

| #            |                                                                                                                                             |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Objetivo     | Emitir comprovante confiável e verificável.                                                                                                 |
| Fluxo        | Conclusão → elegibilidade → emissão → download → validação pública.                                                                         |
| Experiência  | PDF belo Omnia; página `/validar/{code}`.                                                                                                   |
| Responsável  | Emissão acadêmica **Moodle** (ou template Omnia lendo completion); UX/validação pública **Omnia**; QR **Omnia**; blockchain **futuro Ext**. |
| APIs         | issue, revoke, verify public.                                                                                                               |
| Dados        | aluno, curso, carga, data, hash, tenant.                                                                                                    |
| Complexidade | **A** (blockchain **AA** futuro)                                                                                                            |

---

# MÓDULO 8 — Comunicação

| Canal                        | Responsável                      | Notas                           |
| ---------------------------- | -------------------------------- | ------------------------------- |
| Inbox mensagens in-app       | Omnia                            | Unificar professor/aluno/gestor |
| Fórum/comentários acadêmicos | Moodle forum + Omnia UI opcional |                                 |
| Email                        | Ext SMTP (já Titan) via Omnia    |                                 |
| Push                         | Ext (FCM/APNs) via Omnia mobile  |                                 |
| WhatsApp                     | Ext (Evolution/API) via Omnia    | Opt-in LGPD                     |
| Comunidade                   | Omnia (ou Ext community)         | Fora do Moodle core             |

---

# MÓDULO 9 — Vídeos

| #              |                                                                                                                  |
| -------------- | ---------------------------------------------------------------------------------------------------------------- |
| Objetivo       | Consumo de vídeo com controle pedagógico de progresso.                                                           |
| Fluxo          | Aula → player Omnia → eventos progresso → Moodle completion.                                                     |
| Experiência    | Velocidade, legendas, marcadores, anotações, retomada.                                                           |
| Responsável    | **Player/UX Omnia**; **storage/CDN/transcode Ext**; **completion Moodle**; anotações Omnia; insights Neurofrigo. |
| APIs           | signed URL, progress beacon, captions.                                                                           |
| Escalabilidade | CDN obrigatório; nunca servir vídeo grosso pelo Moodle.                                                          |
| Complexidade   | **AA**                                                                                                           |

---

# MÓDULO 10 — Aulas ao vivo

| #            |                                                                                                                      |
| ------------ | -------------------------------------------------------------------------------------------------------------------- |
| Objetivo     | Aulas síncronas com presença e gravação.                                                                             |
| Fluxo        | Agenda → entrar na sala → chat/share → gravação → relatório.                                                         |
| Responsável  | Sala **Ext (Jitsi ou SFU)**; agenda/UX **Omnia**; presença → **Moodle** attendance/completion; gravação storage Ext. |
| Complexidade | **A**                                                                                                                |

---

# MÓDULO 11 — IA (Neurofrigo)

Toda IA é **Neurofrigo**. A Omnia orquestra contexto; o Moodle fornece fatos acadêmicos.

| Agente           | Entrada                      | Saída                     |
| ---------------- | ---------------------------- | ------------------------- |
| Tutor            | progresso, dúvidas, material | respostas, exercícios     |
| Professor        | objetivos, público           | plano, slides, roteiro    |
| Corretor         | resposta + rubrica           | sugestão de nota/feedback |
| Mentor           | perfil + metas               | plano de estudos          |
| Admin assistente | KPIs                         | alertas, textos           |

**Regra:** nenhum modelo embutido no Core Moodle.  
**Complexidade global:** **AA**

---

# MÓDULO 12 — CRM educacional

| Feature                              | Responsável                        |
| ------------------------------------ | ---------------------------------- |
| Leads, funis, campanhas, remarketing | **Omnia** (CRM Platform)           |
| Conversão curso/assinatura           | Omnia + Ext pagamento              |
| Automações                           | Omnia / n8n Ext                    |
| Interesses educacionais              | Omnia eventos + Neurofrigo scoring |

Moodle **não** é CRM.

---

# MÓDULO 13 — Marketplace

| Feature                                               | Responsável                |
| ----------------------------------------------------- | -------------------------- |
| Vitrine cursos/produtos/assinaturas/mentorias/eventos | **Omnia**                  |
| Checkout / PIX / gateway                              | **Externo** + Omnia orders |
| Licenças / entitlement                                | Omnia → matrícula Moodle   |
| Downloads pagos                                       | Omnia + storage Ext        |

---

# MÓDULO 14 — Parceiros

Integra com **Rede de Parceiros** já na Platform.

| Feature                         | Responsável                    |
| ------------------------------- | ------------------------------ |
| Credenciamento                  | Omnia Partners                 |
| Cursos exclusivos parceiro      | Omnia + Moodle category/cohort |
| Pontuação / ranking / comissões | Omnia                          |
| Dashboard parceiro              | Omnia                          |

---

# MÓDULO 15 — Multiempresa

| Feature                          | Responsável                           |
| -------------------------------- | ------------------------------------- |
| Tenants / filiais / clientes B2B | **Omnia** (Sites/Organizations)       |
| Branding / white-label           | Omnia                                 |
| Permissões                       | Omnia RBAC + papéis Moodle mapeados   |
| Cursos exclusivos tenant         | Moodle cohort/category + Omnia policy |

---

# MÓDULO 16 — Mobile

| Feature              | Responsável             | Complexidade |
| -------------------- | ----------------------- | ------------ |
| Android / iOS        | Omnia apps              | AA           |
| Offline seletivo     | Omnia + sync            | AA           |
| Push                 | Ext                     | M            |
| Downloads protegidos | Omnia + DRM leve/policy | A            |

---

# MÓDULO 17 — Segurança

| Tema                  | Responsável                  |
| --------------------- | ---------------------------- |
| LGPD / consentimentos | Omnia                        |
| SSO / OAuth / 2FA     | Omnia IdP → provision Moodle |
| Permissões            | Omnia + Moodle roles         |
| Auditoria             | Omnia + logs Moodle          |
| Backups engine        | Ops Moodle stack             |
| Tokens API            | Omnia + Moodle WS tokens     |

---

# MÓDULO 18 — Integrações

| Sistema             | Papel                                   |
| ------------------- | --------------------------------------- |
| Omnia Platform      | Identidade, CMS, partners, CRM, billing |
| Neurofrigo          | IA                                      |
| Moodle Engine       | Academia                                |
| Jitsi (ou similar)  | Live                                    |
| SMTP                | Email                                   |
| Cloud storage / CDN | Mídia                                   |
| WhatsApp            | Mensageria                              |
| PIX / gateway       | Pagamentos                              |
| ERP (futuro)        | Financeiro corporativo                  |

---

## Padrão de decisão (checklist rápido)

Ao surgir feature nova:

1. É experiência de marca/UX? → **Omnia**
2. É verdade acadêmica (nota, conclusão, estrutura)? → **Moodle**
3. É geração/análise inteligente? → **Neurofrigo**
4. É commodity (vídeo, SMS, pay)? → **Externo**
