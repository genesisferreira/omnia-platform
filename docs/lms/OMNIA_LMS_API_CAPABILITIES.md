# Omnia LMS — Capacidades de API Moodle 4.5 LTS

> Foco: Web Services nativos para o **Connector Omnia**. Sem implementação nesta sprint.

---

## 1. Protocolos

| Protocolo | Status 4.5 | Recomendação Omnia |
| --- | --- | --- |
| **REST** | Suportado e preferencial | **Usar** |
| **SOAP** | Ainda presente (legado) | Não usar em código novo |
| **XML-RPC** | Removido/descontinuado na linha moderna | **Proibido** |
| Tokens | Por usuário de serviço | Conta técnica + papéis mínimos |
| Serviços | Custom service com funções explicitamente permitidas | Criar serviço `omnia_connector` (fase 2.5) |

**Segurança:** HTTPS obrigatório; `enablewebservices`; restringir por IP se possível; não expor token ao browser; auditar chamadas no BFF Omnia.

---

## 2. Mapa de operações Blueprint → WS Moodle

| Operação necessária | Cobertura nativa | Funções típicas (ilustrativo 4.5) | Maduro? | Lacunas | Responsável |
| --- | --- | --- | --- | --- | --- |
| Criar usuário | Sim | `core_user_create_users` | Sim | Campos custom/profile | Connector → Moodle |
| Atualizar usuário | Sim | `core_user_update_users` | Sim | Conflitos IdP | Connector |
| Suspender usuário | Sim | update `suspended` | Sim | — | Connector |
| Excluir/anonymizar | Parcial | delete + tool_dataprivacy | Sim c/ processo | Orquestração LGPD | Omnia + Moodle |
| Criar curso | Sim | `core_course_create_courses` | Sim | Formato/seções extras | Connector |
| Atualizar curso | Sim | `core_course_update_courses` | Sim | — | Connector |
| Listar/buscar cursos | Sim | `core_course_get_courses`, `…_by_field`, search | Sim | Vitrine = Omnia | Connector read |
| Estrutura (conteúdos) | Sim | `core_course_get_contents` | Sim | — | Connector |
| Criar seções/atividades | Parcial/alta complexidade | APIs diversas / edit via WS limitados em alguns mods | Parcial | Authoring rico pode exigir sequências + arquivos | Omnia authoring incremental |
| Matricular aluno | Sim | `enrol_manual_enrol_users` | Sim | Múltiplos enrol plugins | Connector |
| Remover matrícula | Sim | `enrol_manual_unenrol_users` | Sim | — | Connector |
| Consultar matrículas | Sim | `core_enrol_get_users_courses`, enrol methods | Sim | — | Connector |
| Progresso/completion | Sim | `core_completion_get_activities_completion_status`, `…_course_completion_status` | Sim | Player Omnia deve reportar | Connector + Omnia beacons |
| Marcar conclusão atividade | Parcial | APIs completion / conforme tipo | Parcial | Vídeo Ext → Omnia chama completion | Omnia→Moodle |
| Consultar notas | Sim | `gradereport_user_get_grade_items`, grade functions | Sim | — | Connector |
| Lançar nota | Parcial | grade update functions / assign | Parcial | IA só sugere | Connector |
| Quiz: tentativas | Sim | `mod_quiz_*` (start/process/finish conforme versão) | Sim c/ cuidado | UX Omnia deve respeitar estados | Connector |
| Banco questões | Parcial via WS | core_question / import | Parcial | Import IA em formato Moodle XML/Gift | Omnia+Neurofrigo→import |
| Certificados | **Não padrão** | — / plugin | Não | customcert WS ou Omnia PDF | Plugin ou Omnia |
| Mensagens | Sim | `core_message_*` | Sim | Preferir Omnia inbox | Opcional |
| Calendário | Sim | `core_calendar_get_calendar_events` etc. | Sim | Agregar lives Ext | Connector read |
| Fórum | Sim | `mod_forum_*` | Sim | — | Connector |
| Cohorts/grupos | Sim | `core_cohort_*`, `core_group_*` | Sim | B2B | Connector |
| Papéis | Sim | `core_role_assign_roles` | Sim | Mapear Omnia roles | Connector |
| Competências | Sim | `core_competency_*` | Sim | — | Connector |
| Arquivos | Sim | `core_files_*` / draft upload | Sim | Preferir Ext p/ mídia grande | Híbrido |
| Badges | Sim | core_badges_* | Sim | ≠ certificado | Opcional |

---

## 3. Eventos relevantes (amostra)

| Evento (conceito) | Uso Omnia |
| --- | --- |
| `user_created` / `user_updated` | Sync identidade |
| `user_enrolment_created` | CRM / e-mail / Neurofrigo |
| `course_completed` | Certificado / gamificação |
| `activity completion` | Continuar / tutor |
| `quiz attempt submitted` | Correção / IA |
| `assessable_submitted` | Fila professor |

**Nota:** Moodle não oferece webhooks HTTP nativos de primeira classe como produto SaaS; o Connector deve **poll + logstore/event observers** (plugin observador oficial/minimal **só se necessário** — preferir poll WS na 2.5).

---

## 4. Limitações estruturais das APIs

1. Authoring completo “pixel-perfect” via WS é **mais trabalhoso** que leitura/enrol — planejar MVP authoring por etapas.  
2. Nem todo `mod_*` tem WS simétrico create/update.  
3. Upload de arquivos grandes pelo Moodle degrada escala — usar signed URL Ext.  
4. Certificado formal depende de plugin ou geração Omnia.  
5. Tokens de serviço com muitas capabilities = risco; fatiar serviços.

---

## 5. Serviço Connector recomendado (desenho)

```text
Service: omnia_connector
User: svc_omnia_lms (authenticated)
Protocol: REST
Functions: allowlist mínima por fase (2.5 read → 2.6 progress → 2.7 quiz/cert)
```

Nenhuma função Admin total.
