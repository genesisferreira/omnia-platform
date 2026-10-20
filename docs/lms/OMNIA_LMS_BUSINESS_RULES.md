# Omnia LMS — Business Rules

> **Sprint 2.6.5** — Regras de negócio canônicas.  
> **Status:** Aceito. Implementações (Connector, Web MVP, Policy) devem obedecer.

---

## 1. Continue Learning

| ID   | Regra                                                                                             |
| ---- | ------------------------------------------------------------------------------------------------- |
| CL-1 | Sem endpoint BFF `/continue` no MVP: resolução via **Learning Engine**.                           |
| CL-2 | Pointer em `LearningState` persistido por porta `LearningPersistence` (browser adapter opcional). |
| CL-3 | Last-seen só vale se `courseId` ∈ matrículas ativas.                                              |
| CL-4 | Senão: primeira atividade incompleta conhecida; senão primeiro curso matriculado.                 |
| CL-5 | `TrackLastSeen` / `openLesson` atualizam continue + eventos.                                      |
| CL-6 | `/lms/continuar?courseId=` força contexto do curso se matriculado.                                |
| CL-7 | **Proibido** ler/gravar `localStorage` nas regras de domínio; só adapters de borda.               |

## 2. Progress

| ID   | Regra                                                                               |
| ---- | ----------------------------------------------------------------------------------- |
| PR-1 | % curso = `round(100 * done / total)` onde `done` = activities com `state ∈ {1,2}`. |
| PR-2 | Sem activities → 0%.                                                                |
| PR-3 | Progresso médio dashboard = média dos % dos cursos listados (amostra limitada OK).  |
| PR-4 | Estados UX: NotStarted (0), InProgress (1–99), Completed (≥100).                    |
| PR-5 | SoR dos states = Moodle completion; Omnia só agrega.                                |

## 3. Completion

| ID   | Regra                                                                           |
| ---- | ------------------------------------------------------------------------------- |
| CO-1 | Completion de atividade e de curso vêm do Connector (`progress`, `completion`). |
| CO-2 | UI não marca conclusão localmente sem writeback (writeback fora do RO MVP).     |
| CO-3 | Curso `completed=true` → badge Concluído; CTA revisão permanece.                |

## 4. Grade

| ID   | Regra                                                            |
| ---- | ---------------------------------------------------------------- |
| GR-1 | Notas só via `GET /grades?courseId=` (matrícula obrigatória).    |
| GR-2 | Exibir `gradeFormatted` ou `percentage`; sem item → empty state. |
| GR-3 | Sem alteração de nota pela UI Omnia no modo read-only.           |

## 5. Enrollment

| ID   | Regra                                                                  |
| ---- | ---------------------------------------------------------------------- |
| EN-1 | Lista de cursos = matrículas Moodle do usuário vinculado.              |
| EN-2 | Detalhe/content/progress exige matrícula; senão 403/404 sanitizado.    |
| EN-3 | Sem IdentityLink → empty “conta não vinculada”, não lista cursos.      |
| EN-4 | Provisionamento/compra **fora** desta sprint (futuro Marketplace/B2B). |

## 6. Session

| ID   | Regra                                                                             |
| ---- | --------------------------------------------------------------------------------- |
| SE-1 | Cookie Payload autentica portal; Session LMS é registro separado no Redis.        |
| SE-2 | Limite por papel (Policy); excesso revoga sessão mais antiga (default aluno = 1). |
| SE-3 | Abas mesmo browser → mesmo `sessionFamilyId` (não conta como novo device).        |
| SE-4 | Heartbeat periódico; ausência → expire por TTL.                                   |
| SE-5 | Logout Omnia LMS: `sessions/logout` + logout portal.                              |
| SE-6 | Revogação admin: `revoke` / `revoke-all`.                                         |

## 7. Policies

| ID   | Regra                                                                  |
| ---- | ---------------------------------------------------------------------- |
| PO-1 | Precedência: `userException > material > course > global`.             |
| PO-2 | Flags futuras: download forbid, watermark, media TTL.                  |
| PO-3 | Alterações admin geram auditoria + evento `policy.changed`.            |
| PO-4 | `connectorEnabled` + env `MOODLE_CONNECTOR_ENABLED` ambos necessários. |
| PO-5 | Modo padrão Connector: **read_only**.                                  |

## 8. Certificates

| ID   | Regra                                                          |
| ---- | -------------------------------------------------------------- |
| CE-1 | Emissão SoR Moodle; validação pública Omnia (futuro).          |
| CE-2 | MVP: placeholder UX; não emitir nem listar certificados reais. |

## 9. Learning Path

| ID   | Regra                                                        |
| ---- | ------------------------------------------------------------ |
| LP-1 | Trilha = sequência ordenada de Courses (Omnia).              |
| LP-2 | Progresso da trilha = agregação dos cursos membros (futuro). |
| LP-3 | Não implementar na 2.6.x.                                    |

## 10. Segurança de conteúdo / UI

| ID   | Regra                                                                            |
| ---- | -------------------------------------------------------------------------------- |
| SC-1 | Zero URL Moodle / wstoken no browser (scrub proxy + HTML sanitize).              |
| SC-2 | Zero iframe Moodle no MVP.                                                       |
| SC-3 | S2S: `x-omnia-internal-key` + `x-omnia-user-id`; nunca `moodleUserId` do client. |
| SC-4 | Rate limit nos endpoints LMS sensíveis.                                          |

## 11. Observabilidade

| ID   | Regra                                                 |
| ---- | ----------------------------------------------------- |
| OB-1 | Requests Connector instrumentados (métricas + trace). |
| OB-2 | Erros sanitizados (sem stack/secrets ao client).      |

---

## Referências

Domain Model · Event Catalog · Session Policy · Policy Engine · Product Spec · Connector Security
