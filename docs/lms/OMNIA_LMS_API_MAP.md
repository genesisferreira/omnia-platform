# Omnia LMS — API Map (lógico)

> Mapa de **contratos lógicos** do Blueprint. **Não implementar** nesta fase.  
> Convenção: Omnia BFF = fachada; Moodle WS = academia; Neurofrigo = IA; Ext = terceiros.

---

## 1. Diagrama de consumidores

```text
Web/Mobile → Omnia LMS BFF → Moodle Connector → Moodle WS
                     ├──────→ Neurofrigo API
                     ├──────→ Platform APIs (auth, partners, CRM, billing)
                     └──────→ Ext (VOD, Live, Pay, Push, WA, SMTP)
```

---

## 2. Omnia LMS BFF (domínio `lms`)

### 2.1 Identidade e sessão

| API lógica | Método | Descrição |
| --- | --- | --- |
| `/lms/auth/session` | GET | Sessão Omnia + entitlements LMS |
| `/lms/auth/login` | POST | Login; aplica limite concurrent; pode revogar sessões anteriores |
| `/lms/auth/logout` | POST | Revoga sessão Omnia + sync Moodle |
| `/lms/auth/heartbeat` | POST | Atualiza lastActivity; 401 se SESSION_REVOKED |
| `/lms/me` | GET/PATCH | Perfil aluno/professor |
| `/lms/me/preferences` | GET/PUT | Notificações, acessibilidade |
| `/lms/me/sessions` | GET | Sessões ativas do próprio usuário (opcional) |
| `/lms/admin/sessions` | GET/DELETE | Painel: listar/encerrar (gestor/admin) |
| `/lms/admin/session-policy` | GET/PUT | Limites globais/perfil; auditoria |

Detalhe: [`OMNIA_LMS_SESSION_POLICY.md`](OMNIA_LMS_SESSION_POLICY.md), [`OMNIA_LMS_INTEGRATION_SPEC.md`](OMNIA_LMS_INTEGRATION_SPEC.md).

### 2.2 Aluno

| API lógica | Descrição | Fontes |
| --- | --- | --- |
| `/lms/me/dashboard` | Agregado home | Moodle + Neurofrigo + Omnia |
| `/lms/me/courses` | Meus cursos | Moodle enrollments |
| `/lms/courses/{id}` | Detalhe curso UX | Moodle + Omnia metadata |
| `/lms/courses/{id}/outline` | Módulos/aulas | Moodle structure |
| `/lms/activities/{id}` | Payload aula | Moodle + media Ext |
| `/lms/media/authorize` | Token + signed URL stream/view | Sessão + matrícula + política |
| `/lms/media/events` | view_start/progress/end, download_attempt | Auditoria |
| `/lms/content-policy` | Política efetiva material/curso/global | Precedência |
| `/lms/admin/content-policy` | CRUD global/curso/material + audit | Gestor |
| `/lms/activities/{id}/progress` | Beacon progresso | → Moodle completion |
| `/lms/me/continue` | Continuar estudando | Moodle last + Omnia player |
| `/lms/me/calendar` | Agenda | Moodle + lives Omnia |
| `/lms/me/certificates` | Galeria | Moodle + Omnia |
| `/lms/certificates/verify/{code}` | Público | Omnia |
| `/lms/assessments/{id}/attempt` | Iniciar/enviar tentativa | → Moodle quiz |
| `/lms/me/grades` | Notas | Moodle |
| `/lms/search` | Pesquisa global | Omnia index |
| `/lms/ai/tutor/chat` | Chat tutor | Neurofrigo |
| `/lms/me/achievements` | Gamificação | Omnia |

### 2.3 Professor

| API lógica | Descrição |
| --- | --- |
| `/lms/teaching/dashboard` | Pendências e turmas |
| `/lms/teaching/courses` | CRUD estrutura (via Connector) |
| `/lms/teaching/media` | Upload init (signed URL Ext) |
| `/lms/teaching/questions` | Banco + import IA |
| `/lms/teaching/grading/{id}` | Fila correção + writeback |
| `/lms/ai/professor/*` | Geradores Neurofrigo |

### 2.4 Gestor

| API lógica | Descrição |
| --- | --- |
| `/lms/mgmt/kpis` | Indicadores |
| `/lms/mgmt/reports` | Relatórios async |
| `/lms/mgmt/tenants` | Multiempresa |
| `/lms/mgmt/audit` | Trilha auditoria |

### 2.5 Marketplace / billing

| API lógica | Descrição |
| --- | --- |
| `/lms/catalog` | Vitrine |
| `/lms/checkout` | Pedido |
| `/lms/webhooks/payment` | Gateway Ext |
| `/lms/entitlements` | Licença → enrollment |

---

## 3. Moodle Connector (interno)

Responsável por traduzir BFF ↔ Moodle Web Services / endpoints oficiais.

| Capacidade | Direção | Exemplos WS (ilustrativo) |
| --- | --- | --- |
| Usuários | Omnia → Moodle | core_user_* |
| Cursos/categorias | R/W | core_course_* |
| Matrículas | R/W | enrol_* |
| Conteúdo/árvore | R | core_course_get_contents |
| Completion | R/W | core_completion_* |
| Quiz/tentativas | R/W | mod_quiz_* |
| Grades | R/W | gradereport_* / core_grades_* |
| Mensagens (opcional) | R/W | core_message_* |
| Calendário | R | core_calendar_* |
| Certificados plugin/nativo | R | conforme auditoria |

**Regras**

- Token de serviço por ambiente; scopes mínimos.  
- Idempotência em provisionamento.  
- Nunca expor token Moodle ao browser.  
- Circuito de resiliência (timeout, retry, fallback cache).

---

## 4. Neurofrigo API (lógico)

| Endpoint lógico | Uso |
| --- | --- |
| `/ai/tutor/chat` | Tutor com RAG do curso |
| `/ai/summarize` | Resumo de aula |
| `/ai/study-plan` | Plano personalizado |
| `/ai/recommend` | Próximos conteúdos |
| `/ai/generate/questions` | Banco de questões |
| `/ai/generate/lesson` | Roteiro/slides |
| `/ai/grade/suggest` | Sugestão de correção |
| `/ai/insights/risk` | Risco de evasão |

Contexto enviado: user id Omnia, course/activity ids Moodle, trechos autorizados, nunca senhas.

---

## 5. Serviços externos (contratos)

| Domínio | Operações |
| --- | --- |
| VOD/CDN | create asset, signed playback, webhooks ready |
| Live | create room, join token, recording webhook |
| Storage | signed upload/download |
| SMTP | send template |
| Push | register device, send |
| WhatsApp | send template opt-in |
| Payment | intent, capture, refund, webhook |

---

## 6. Eventos (domínio)

| Evento | Produtor | Consumidores |
| --- | --- | --- |
| `lms.enrollment.created` | BFF/Connector | CRM, Neurofrigo, email |
| `lms.activity.completed` | Connector | Gamificação, tutor |
| `lms.assessment.submitted` | Connector | Correção, IA |
| `lms.certificate.issued` | BFF | Email, parceiros |
| `lms.payment.confirmed` | Billing | Entitlement |
| `lms.live.attendance` | Live Ext | Completion |
| `lms.session.created` | Auth BFF | Auditoria |
| `lms.session.revoked` | Auth BFF | Clients, media denylist, Moodle sync |
| `lms.media.download_attempt` | Media BFF | Segurança / alerta |
| `lms.policy.changed` | Admin | Auditoria compliance |

---

## 7. Versionamento e governança

- APIs públicas Omnia: versionadas (`/v1`).  
- Breaking changes exigem RFC.  
- OpenAPI gerado na fase de implementação (pós-auditoria).  
- Este mapa é **intenção de produto**, não especificação OpenAPI final.
