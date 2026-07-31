# Omnia LMS — Auditoria Funcional Moodle 4.5 LTS

> **Escopo:** análise apenas — sem código, plugins novos ou alteração de core.  
> **Engine auditado:** instalação limpa VPS `moodle.dev.omniafrigo.com.br` (tag `v4.5.12`, PHP 8.3).  
> **Fonte de verdade do produto:** Blueprint aprovado (`docs/lms/OMNIA_LMS_BLUEPRINT.md`).  
> **Data:** 2026-07-31  

### Inventário rápido do engine

| Item | Evidência |
| --- | --- |
| Versão | Moodle **4.5.x LTS** (build a partir de `v4.5.12`) |
| UI produto | Não usar — apenas ops/admin técnico |
| Plugins `local/` | Nenhum custom Omnia |
| Atividades `mod/` | Core padrão (assign, book, forum, h5pactivity, page, quiz, resource, scorm, url, bigbluebuttonbn, workshop, …) |
| Certificado dedicado | **Ausente** (`mod_customcert` / `mod_certificate` não instalados) |
| Web Services | Disponíveis no core; habilitação/tokens = **configuração** (ainda não endurecida para produção Omnia) |

### Legenda de aderência

| Faixa | Significado |
| --- | --- |
| 80–100% | Moodle cobre o SoR acadêmico; Omnia só UX/orquestração |
| 50–79% | Moodle parcial; exige config/plugin oficial + Omnia |
| 20–49% | Moodle insuficiente para a experiência Blueprint; Omnia/Ext/Neurofrigo dominam |
| 0–19% | Fora do Moodle por desenho |

---

# MÓDULO 1 — Gestão acadêmica

| Funcionalidade | Existe no Moodle | Como funciona | Limitações | Plugins | APIs | Eventos | Dados | Responsável definitivo | Observações |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Categorias | Sim (maduro) | Árvore `course_categories` | UX fraca; multi-tenant visual limitado | — | `core_course_get_categories`, create/update | course_category_* | id, name, parent, idnumber | 🟢 Moodle (SoR) + 🟦 Omnia (vitrine) | Configurar taxonomia Omnia mapeada a categorias |
| Cursos | Sim (maduro) | `course` + formatos topics/weeks/etc. | Authoring UI = Moodle; não é UX Omnia | — | `core_course_*` | course_created/updated/deleted | fullname, shortname, category, summary | 🟢 Moodle + 🟦 Omnia authoring | Omnia escreve via Connector |
| Módulos (seções) | Sim | `course_sections` | “Módulo” pedagógico ≠ seção técnica | — | contents APIs | course_section_* | section, name, visible | 🟢 Moodle | Mapear linguagem Omnia→section |
| Aulas/atividades | Sim | `course_modules` + `mod_*` | Granularidade por tipo de mod | — | get_contents, mod_* | course_module_* | cmid, instance, completion | 🟢 Moodle | “Aula” Omnia = 1+ activities |
| Matrículas | Sim (maduro) | enrol plugins (manual, self, cohort…) | Regras comerciais não são enrol | enrol_* core | enrol_manual_enrol_users etc. | user_enrolment_* | user, course, status, timeend | 🟢 Moodle + 🟦 Omnia entitlement | Checkout Omnia → enrol |
| Turmas (grupos) | Sim | `groups` / groupings | “Turma comercial” pode ser cohort | — | core_group_* | group_* | groupid, members | 🟢 Moodle | Cohorts para B2B |
| Papéis | Sim (maduro) | roles/capabilities | Complexo; não expor cru ao gestor | — | assign roles WS | role_assigned | roleid, context | 🟢 Moodle + 🟦 Omnia RBAC map | Mapear papéis Omnia→Moodle |
| Competências | Sim | Competency framework | Adoção operacional exige desenho | tool_lp (core) | core_competency_* | competency_* | frameworks, user comps | 🟢 Moodle + 🟦 Omnia | Configurar frameworks Omnia Frigo |
| Trilhas | Parcial | Learning plans / programs **não** nativos completos como marketplace | Trilha comercial ≠ learning plan | learning plans core limitado; evitar plugins pesados | competency plans | — | — | 🟦 Omnia (trilha comercial) + 🟢 Moodle (cursos da trilha) | Não forçar plugin “program” de terceiros |
| Conclusão | Sim (maduro) | Activity/course completion | Critérios precisam política pedagógica | — | core_completion_* | course_completed, activity | completionstate | 🟢 Moodle | SoR de progresso |
| Certificados | **Não nativo completo** | Só badges/completion; PDF certificado = plugin | Sem `customcert` na VPS | **customcert** (comunidade madura) oficial-ish | depende do plugin | — | — | 🟢 Moodle(+plugin) emissão + 🟦 Omnia validação UX | Ver Módulo 4 |
| Histórico acadêmico | Sim | grades + logs + completion | UX relatório pobre | — | gradereport_*, logs | — | grade_grades, logstore | 🟢 Moodle + 🟦 Omnia histórico UX | |
| Notas / Gradebook | Sim (maduro) | grade categories/items | UI complexa | — | core_grades_*, gradereport_user_get_grade_items | — | grade_* | 🟢 Moodle | Nota oficial só no Moodle |

**Recomendação M1:** Moodle é SoR acadêmico pleno para estrutura, matrícula, conclusão e notas. Trilhas comerciais e UX = Omnia. Certificado PDF = plugin `mod_customcert` (avaliar na fase de config, sem custom core).

---

# MÓDULO 2 — Conteúdo

| Funcionalidade | Existe | Como | Limitações | Plugins | APIs | Eventos | Dados | Responsável | Obs. |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Página | Sim | `mod_page` | HTML limitado | — | mod_page_* | — | content | 🟢+🟦 | Omnia pode renderizar espelho |
| Livro | Sim | `mod_book` | Capítulos | — | — | — | chapters | 🟢+🟦 | |
| Arquivos / resource | Sim | `mod_resource` / folder | Servir arquivo grande pelo Moodle é anti-padrão | — | — | — | files | 🟢 meta + 🟠 storage/CDN | Binários grandes no Ext |
| URL | Sim | `mod_url` | — | — | — | — | externalurl | 🟢 | |
| SCORM | Sim (maduro) | `mod_scorm` | Versões SCORM; tracking | — | — | — | tracks | 🟢 | Bom para pacotes legacy |
| H5P | Sim | `mod_h5pactivity` + content bank | Autoração H5P na Omnia = esforço | — | — | — | h5p | 🟢+🟦 | |
| Vídeos | Parcial | label/url/resource ou BBB | **Sem player VOD Omnia**; progress fino frágil | evitar players Moodle pesados | — | — | — | 🟦 Player + 🟠 VOD/CDN + 🟢 completion | Blueprint |
| Downloads | Sim | files API | DRM/offline = Omnia | — | — | — | file records | 🟦+🟢+🟠 | |
| Conteúdo restrito | Sim | availability conditions | Expressões complexas | core availability | — | — | avail | 🟢 | Config |
| Controle de acesso | Sim | capabilities + enrolment | — | — | — | — | context | 🟢 | |

**Recomendação M2:** Usar atividades Moodle como **âncoras acadêmicas**; mídia pesada e player = Omnia + Externo.

---

# MÓDULO 3 — Avaliações

| Funcionalidade | Existe | Como | Limitações | Plugins | APIs | Eventos | Dados | Responsável | Obs. |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Questionários | Sim (maduro) | `mod_quiz` | UX nativa não é Omnia | — | mod_quiz_* | attempt_* | quiz, attempts | 🟢 SoR + 🟦 UX | |
| Banco de questões | Sim (maduro) | question bank | Categorias/contexto | — | core_question_* (parcial via WS) | — | question_* | 🟢+🟦 editor | |
| Questões aleatórias | Sim | random qtypes | — | — | — | — | — | 🟢 | |
| Objetivas | Sim | multichoice, truefalse, matching… | — | — | — | — | — | 🟢 | |
| Discursivas | Sim | essay | Correção manual | — | — | — | — | 🟢 + 🟣 sugestão | |
| Rubricas | Sim | grading forms | — | — | — | — | — | 🟢 | |
| Correção | Sim | manual grading | Sem IA nativa | — | — | — | — | 🟢 + 🟣 | |
| Tentativas | Sim | attempt states | Regras de retentativa | — | get_user_attempts | — | — | 🟢 | |
| Feedback | Sim | review options | — | — | — | — | — | 🟢+🟦 | |
| Relatórios quiz | Sim | quiz reports | — | — | — | — | — | 🟢+🟦 viz | |
| Questões IA | Não | — | — | — | — | — | — | 🟣 gera → 🟦 revisa → 🟢 persiste | |

**Recomendação M3:** Engine de avaliação = Moodle. Não substituir quiz por app caseiro. IA só como assistente.

---

# MÓDULO 4 — Certificados

| Funcionalidade | Existe | Como | Limitações | Plugins | APIs | Eventos | Dados | Responsável | Obs. |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Emissão PDF | Não nativo robusto | Badges ≠ certificado formal | VPS sem customcert | **mod_customcert** (recomendado avaliar) | plugin WS se houver | — | issues | 🟢(+plugin) | Instalar só após RFC plugin |
| Modelos | Via plugin | Templates PDF | — | customcert | — | — | — | 🟢+🟦 marca | |
| Validação pública | Não Omnia-grade | Códigos plugin ou página Moodle | UX/marca | — | — | — | code | 🟦 | `/validar` Omnia |
| QR Code | Plugin / Omnia | — | — | customcert ou Omnia | — | — | — | 🟦 (+plugin) | |
| Registro | Plugin DB / Omnia | — | — | — | — | — | — | 🟢+🟦 | |
| APIs consulta | Limitado | — | Depende plugin | — | — | — | — | 🟦 BFF | |

**Recomendação M4:** Emisão acadêmica via `mod_customcert` **ou** geração Omnia baseada em `course_completed` (decisão na priorização). Validação pública sempre Omnia. **Não** customizar core.

---

# MÓDULO 5 — Comunicação

| Funcionalidade | Existe | Como | Limitações | Plugins | APIs | Eventos | Dados | Responsável | Obs. |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Mensagens | Sim | messaging | UX datada; fragmenta produto | — | core_message_* | message_* | messages | 🟦 inbox produto; 🟢 opcional bridge | Preferir Omnia |
| Fórum | Sim (maduro) | `mod_forum` | — | — | mod_forum_* | — | posts | 🟢 acadêmico + 🟦 UI opcional | |
| Avisos | Sim | announcements forum / notices | — | — | — | — | — | 🟢+🟦 | |
| Calendário | Sim | calendar API | Não unifica lives Ext | — | core_calendar_* | — | events | 🟦 unifica + 🟢 eventos acad. | |
| Notificações | Sim | processors email/popup | Sem push/WA nativos bons | — | — | — | — | 🟦 orquestra + 🟠 canais | |
| Email | Sim | message output email | SMTP já previsto | — | — | — | — | 🟠 SMTP + 🟦 templates | |

---

# MÓDULO 6 — Usuários e permissões

| Funcionalidade | Existe | Como | Limitações | Plugins | APIs | Eventos | Dados | Responsável | Obs. |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Perfis | Sim | user profile | Identidade canônica = Omnia | — | core_user_* | user_* | user | 🟦 IdP + 🟢 mirror | |
| Papéis/capacidades | Sim (maduro) | RBAC Moodle | Curva alta | — | — | role_* | role_assignments | 🟢 | |
| Matrículas | Sim | enrol | — | — | enrol_* | — | — | 🟢 | |
| Suspensão | Sim | auth/suspend | — | — | update_users suspended | — | — | 🟢 via Connector | |
| Exclusão | Sim | delete user | LGPD orquestração Omnia | tool_dataprivacy | — | — | — | 🟦+🟢 | |
| Grupos | Sim | groups | — | — | core_group_* | — | — | 🟢 | |
| Coortes | Sim | cohorts | Ideal B2B | — | core_cohort_* | — | — | 🟢 | |
| MFA/OAuth | Sim tools | tool_mfa, oauth2 | SSO enterprise = Omnia | core tools | — | — | — | 🟦 SSO + 🟢 provision | |

---

# MÓDULO 7 — Relatórios

| Funcionalidade | Existe | Como | Limitações | Plugins | APIs | Eventos | Dados | Responsável | Obs. |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Logs | Sim | logstore_standard | Volume alto | — | — | — | logstore | 🟢 técnico + 🟦 auditoria produto | |
| Participação | Sim | reports | UX | — | — | — | — | 🟢+🟦 | |
| Conclusão | Sim | completion report | — | — | — | — | — | 🟢+🟦 | |
| Engajamento / Analytics | Parcial | Analytics models core | Limitado vs BI Omnia | analytics | — | — | — | 🟦 BI + 🟣 risco + 🟢 eventos | |
| Exportações | Parcial | CSV reports | Jobs async = Omnia | — | — | — | — | 🟦 | |

---

# MÓDULO 8 — APIs (resumo)

Ver detalhe em [`OMNIA_LMS_API_CAPABILITIES.md`](OMNIA_LMS_API_CAPABILITIES.md).

| Tema | Situação no 4.5 LTS |
| --- | --- |
| REST | Protocolo principal recomendado |
| SOAP | Legado; evitar novos usos |
| XML-RPC | Removido/desaconselhado em versões recentes — **não usar** |
| Tokens | Por usuário/serviço; escopo por função |
| Segurança | HTTPS, IP restrict, short-lived tokens, capability checks |
| Eventos | Observáveis via plugins/`tool_monitor` / log; ideal webhooks Omnia depois |

---

# MÓDULO 9 — Plugins (resumo)

Ver [`OMNIA_LMS_PLUGIN_EVALUATION.md`](OMNIA_LMS_PLUGIN_EVALUATION.md).

Instalação atual: **somente core**. Nenhum plugin Omnia. BBB está no core tree (`bigbluebuttonbn`) — live Omnia preferirá Jitsi Ext conforme Blueprint.

---

# MÓDULO 10 — Integração com Blueprint (responsável por domínio)

| Domínio Blueprint | Responsável primário pós-auditoria |
| --- | --- |
| UX Aluno/Professor/Gestor | 🟦 Omnia |
| SoR acadêmico (curso, nota, completion, enrol) | 🟢 Moodle |
| Player VOD / CDN | 🟦+🟠 |
| Live | 🟦+🟠 (Jitsi); Moodle BBB = evitar como UX principal |
| Certificados | 🟢(+plugin) emissão · 🟦 validação |
| IA | 🟣 Neurofrigo |
| CRM / Marketplace / Parceiros / Mobile | 🟦 (+🟠 pay/push) |
| Multiempresa visual | 🟦 (Moodle category/cohort apoio) |

**Nenhuma funcionalidade do Blueprint fica sem responsável.**
