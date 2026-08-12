# Omnia LMS — Prioridade de Implementação (pós-auditoria)

> Ordenação técnica derivada do Blueprint + Feature Matrix + Gaps.  
> **Sem implementação nesta sprint.**

---

## 1. Princípios de priorização

1. Desbloquear Connector antes de UX profunda.
2. SoR Moodle estável antes de authoring rico.
3. Aluno estudar ponta a ponta antes de marketplace.
4. IA com contexto real (progresso) antes de geradores massivos.
5. Zero custom core; plugins só com RFC.

---

## 2. Backlog priorizado

| Ordem | Item                                                                | Sprint alvo | Justificativa técnica               |
| ----: | ------------------------------------------------------------------- | ----------- | ----------------------------------- |
|     1 | Hardening Web Services + conta `svc_omnia_lms` + allowlist          | 2.4.3 / 2.5 | Sem API segura não há produto Omnia |
|     2 | Connector read: users/courses/enrolments/completion/grades          | 2.5         | Valida SoR e alimenta dashboards    |
|     3 | Provisionamento usuário Omnia→Moodle + mapeamento IDs               | 2.5         | Identidade única                    |
|     4 | Shell `lms.*` + lista “Meus cursos” read-only                       | 2.5         | Prova de arquitetura UX≠Moodle      |
|     5 | Dashboard aluno + continuar estudando                               | 2.6         | Jornada core                        |
|     6 | Visualização de atividades page/resource/url + progresso            | 2.6         | Estudo assíncrono mínimo            |
|     7 | Beacon progresso + completion write                                 | 2.6         | Fecha ciclo acadêmico               |
|     8 | Quiz UX Omnia → mod_quiz WS                                         | 2.7         | Avaliações sem UI Moodle            |
|     9 | RFC certificado (`customcert` **ou** PDF Omnia) + validação pública | 2.7         | Diferencial compliance              |
|    10 | Neurofrigo tutor MVP (RAG curso)                                    | 2.7         | Diferencial IA com dados reais      |
|    11 | VOD + player + CDN                                                  | 2.8         | Escala mídia                        |
|    12 | Authoring professor MVP (estrutura + uploads)                       | 2.8         | Independência da UI Moodle          |
|    13 | Live Jitsi + presença                                               | 2.8         | Ao vivo Blueprint                   |
|    14 | IA professor (questões/roteiro) com revisão                         | 2.8         | Produtividade docente               |
|    15 | Dashboard gestor + exports                                          | 2.9         | Operação                            |
|    16 | Marketplace + PIX + entitlement→enrol                               | 2.9         | Receita                             |
|    17 | Parceiros LMS + multiempresa fase 1                                 | 2.9         | Ecossistema Omnia                   |
|    18 | Mobile + push                                                       | 3.0         | Alcance                             |
|    19 | Offline seletivo / gamificação / white-label pleno                  | 3.0         | Escala produto                      |
|    20 | Corretor IA + BI preditivo                                          | 3.0         | Madureza Neurofrigo                 |

---

## 3. Itens explicitamente adiados / rejeitados

| Item                                     | Motivo                        |
| ---------------------------------------- | ----------------------------- |
| Tema Moodle produto                      | Viola Blueprint               |
| Plugins gamificação/AI/payment no Moodle | Duplicam Omnia/Neurofrigo/Ext |
| Migrar HostGator DB                      | Estratégia rejeitada          |
| Custom core Moodle                       | Proibido                      |
| XML-RPC                                  | Inseguro/legado               |
| BBB como live oficial                    | Blueprint = Jitsi Ext         |

---

## 4. Critérios para sair de cada fase

| Fase | Exit criteria                                                  |
| ---- | -------------------------------------------------------------- |
| 2.5  | Token REST; listar cursos do aluno via BFF sem abrir Moodle UI |
| 2.6  | Completar 1 atividade e ver progresso no dashboard Omnia       |
| 2.7  | Fazer quiz + obter/validar certificado                         |
| 2.8  | Professor publica aula com vídeo; aluno assiste com progresso  |
| 2.9  | Pagar curso → matrícula automática → acesso                    |
| 3.0  | App mobile com login e continuar estudando                     |

---

## 5. Dependência da Auditoria

Esta priorização **só é válida** enquanto o Moodle permanecer SoR e o Blueprint aprovado permanecer fonte de verdade. Mudanças exigem RFC atualizando Feature Matrix e Gaps.
