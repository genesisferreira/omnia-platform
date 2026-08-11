# Omnia LMS — Matriz de Responsabilidades

> Fonte: Blueprint v1.0. Legenda: ● = dono primário · ○ = apoio · — = não participa

**Status:** `Planejado` | `Infra pronta` | `Parcial` | `Futuro`  
**Prioridade:** P0 (crítico) · P1 · P2 · P3  
**Complexidade:** B · M · A · AA

| Funcionalidade                              | Omnia | Moodle | Neurofrigo | Externo | Status            | Prioridade | Complexidade |
| ------------------------------------------- | :---: | :----: | :--------: | :-----: | ----------------- | ---------- | ------------ |
| UX Aluno / Professor / Gestor               |   ●   |   —    |     —      |    —    | Planejado         | P0         | AA           |
| Auth / perfil / SSO                         |   ●   |   ○    |     —      |    ○    | Planejado         | P0         | A            |
| Estrutura curso/módulo/aula                 |   ○   |   ●    |     —      |    —    | Infra engine      | P0         | A            |
| Matrícula acadêmica                         |   ○   |   ●    |     —      |    —    | Infra engine      | P0         | M            |
| Progresso / completion                      |   ○   |   ●    |     ○      |    —    | Planejado         | P0         | M            |
| Dashboard aluno                             |   ●   |   ○    |     ○      |    —    | Planejado         | P0         | M            |
| Continuar estudando                         |   ●   |   ○    |     —      |    —    | Planejado         | P0         | M            |
| Avaliações / quiz / notas                   |   ○   |   ●    |     ○      |    —    | Planejado         | P0         | A            |
| Banco de questões                           |   ○   |   ●    |     ○      |    —    | Planejado         | P1         | A            |
| Questões geradas por IA                     |   ○   |   ○    |     ●      |    —    | Planejado         | P1         | A            |
| Correção assistida IA                       |   ○   |   ○    |     ●      |    —    | Futuro            | P2         | AA           |
| Certificados emissão                        |   ○   |   ●    |     —      |    —    | Planejado         | P1         | M            |
| Validação pública certificado               |   ●   |   ○    |     —      |    —    | Planejado         | P1         | M            |
| Player de vídeo                             |   ●   |   ○    |     —      |    ●    | Planejado         | P0         | AA           |
| Progresso de vídeo → completion             |   ●   |   ●    |     —      |    —    | Planejado         | P0         | A            |
| Aulas ao vivo (Jitsi)                       |   ●   |   ○    |     —      |    ●    | Planejado         | P1         | A            |
| Calendário unificado                        |   ●   |   ○    |     —      |    ○    | Planejado         | P1         | A            |
| Mensagens in-app                            |   ●   |   ○    |     —      |    —    | Planejado         | P1         | M            |
| Email                                       |   ●   |   —    |     —      |    ●    | Parcial (SMTP)    | P0         | B            |
| Push mobile                                 |   ●   |   —    |     —      |    ●    | Futuro            | P1         | M            |
| WhatsApp                                    |   ●   |   —    |     —      |    ●    | Futuro            | P2         | M            |
| Fórum acadêmico                             |   ○   |   ●    |     —      |    —    | Planejado         | P2         | M            |
| Gamificação / ranking                       |   ●   |   ○    |     ○      |    —    | Planejado         | P2         | A            |
| Tutor IA / chat                             |   ●   |   ○    |     ●      |    —    | Spec 3.1          | P1         | A            |
| Plano de estudos IA                         |   ●   |   ○    |     ●      |    —    | Spec 3.1          | P2         | A            |
| Orchestrator / Security / Compliance Guards |   ○   |   —    |     ●      |    —    | Spec 3.1          | P0         | AA           |
| Assessment Integrity Guard                  |   ○   |   ○    |     ●      |    —    | Spec 3.1          | P0         | A            |
| RAG ACL-first + Knowledge Base              |   ○   |   ○    |     ●      |    ○    | Spec 3.1          | P1         | AA           |
| Recomendações                               |   ●   |   ○    |     ●      |    —    | Planejado         | P2         | A            |
| Authoring professor (UI)                    |   ●   |   ○    |     ○      |    —    | Planejado         | P0         | AA           |
| Gerador conteúdo/provas IA                  |   ○   |   ○    |     ●      |    —    | Planejado         | P1         | A            |
| Dashboard gestor / KPIs                     |   ●   |   ○    |     ○      |    ○    | Planejado         | P1         | A            |
| BI / exportações                            |   ●   |   ○    |     —      |    ○    | Planejado         | P2         | A            |
| CRM educacional                             |   ●   |   —    |     ○      |    ○    | Parcial Platform  | P1         | A            |
| Marketplace / checkout                      |   ●   |   ○    |     —      |    ●    | Planejado         | P1         | AA           |
| PIX / gateway                               |   ○   |   —    |     —      |    ●    | Planejado         | P1         | A            |
| Parceiros / comissões                       |   ●   |   ○    |     —      |    —    | Parcial Platform  | P1         | A            |
| Multiempresa / white-label                  |   ●   |   ○    |     —      |    —    | Planejado         | P0         | AA           |
| Mobile Android/iOS                          |   ●   |   ○    |     ○      |    ○    | Futuro            | P1         | AA           |
| Offline                                     |   ●   |   ○    |     —      |    —    | Futuro            | P2         | AA           |
| LGPD / auditoria                            |   ●   |   ○    |     ○      |    —    | Planejado         | P0         | A            |
| 2FA / OAuth                                 |   ●   |   ○    |     —      |    ○    | Planejado         | P1         | A            |
| Backups engine                              |   ○   | ● ops  |     —      |    —    | Infra pronta      | P0         | M            |
| Connector Omnia↔Moodle                      |   ●   |   ○    |     —      |    —    | Planejado (2.4.3) | P0         | A            |
| Sessões concurrentes / revogação            |   ●   |   ○    |     —      |    ○    | Spec aprovada     | P0         | A            |
| Painel limites de sessão                    |   ●   |   —    |     —      |    —    | Spec aprovada     | P0         | M            |
| Proteção conteúdo (no download)             |   ●   |   ○    |     —      |    ●    | Spec aprovada     | P0         | A            |
| URLs assinadas / media tokens               |   ●   |   —    |     —      |    ●    | Spec aprovada     | P0         | A            |
| Viewer docs / player stream                 |   ●   |   ○    |     —      |    ●    | Spec aprovada     | P0         | A            |
| Streaming CDN                               |   —   |   —    |     —      |    ●    | Planejado         | P0         | A            |
| Object storage mídia                        |   ○   |   ○    |     —      |    ●    | Planejado         | P0         | M            |

## Regras de resolução de conflito

1. Em dúvida de **nota/conclusão/estrutura** → Moodle vence.
2. Em dúvida de **UX/marca/funil** → Omnia vence.
3. Em dúvida de **texto gerado/análise preditiva** → Neurofrigo vence (com revisão humana quando afeta nota).
4. Em dúvida de **infra commodity** → Externo vence.
