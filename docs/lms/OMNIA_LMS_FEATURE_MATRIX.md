# Omnia LMS — Feature Matrix (Cobertura Blueprint × Moodle 4.5)

> Escala de aderência Moodle ao **SoR acadêmico** do Blueprint (não à UX).  
> Colunas 1–10 = perguntas da sprint de auditoria.

**Legenda colunas:** N=Nativo · M=Maduro prod · C=Só config · PO=Plugin oficial/core tool · PT=Plugin 3º · O=Omnia · NF=Neurofrigo · E=Externo · % = aderência SoR · Rec = recomendação

| Funcionalidade Blueprint               |             N             |    M    |  C  |      PO       |           PT           |        O        |     NF     |       E       |   % | Recomendação arquitetural                |
| -------------------------------------- | :-----------------------: | :-----: | :-: | :-----------: | :--------------------: | :-------------: | :--------: | :-----------: | --: | ---------------------------------------- |
| Categorias/cursos/seções/atividades    |             ✓             |    ✓    |  ✓  |       —       |           —            |  UX/authoring   |     —      |       —       |  95 | Moodle SoR; Omnia authoring via WS       |
| Matrículas / papéis / grupos / coortes |             ✓             |    ✓    |  ✓  |       —       |           —            | entitlement map |     —      |       —       |  95 | Enrol Moodle após checkout Omnia         |
| Competências                           |             ✓             |    ✓    |  ✓  |    tool_lp    |           —            |   mapping UX    |     —      |       —       |  80 | Config frameworks; Omnia apresenta       |
| Trilhas comerciais                     |          Parcial          |    —    |  —  |       —       |   Evitar programs 3º   |     **Sim**     |  opcional  |       —       |  25 | Trilha = Omnia; cursos = Moodle          |
| Conclusão / progresso                  |             ✓             |    ✓    |  ✓  |       —       |           —            |  viz dashboard  |  insights  |       —       |  90 | Completion Moodle é verdade              |
| Gradebook / notas                      |             ✓             |    ✓    |  ✓  |       —       |           —            |       UX        |  sugestão  |       —       |  95 | Nunca duplicar nota fora do Moodle       |
| Página/Livro/Arquivo/URL               |             ✓             |    ✓    |  ✓  |       —       |           —            |     render      |     —      | files grandes |  85 | Arquivos pesados → storage Ext           |
| SCORM / H5P                            |             ✓             |    ✓    |  ✓  |       —       |           —            |  player shell   |     —      |       —       |  85 | Manter no Moodle                         |
| Vídeo VOD + progresso fino             |          Parcial          |    —    |  —  |    Evitar     |         Evitar         |   **Player**    |     —      |    **CDN**    |  30 | Ext+Omnia; Moodle só activity+completion |
| Downloads / offline                    |          Parcial          |    —    |  —  |       —       |           —            |     **Sim**     |     —      |     sync      |  20 | Mobile Omnia                             |
| Restrições de acesso                   |             ✓             |    ✓    |  ✓  | availability  |           —            |        —        |     —      |       —       |  85 | Config                                   |
| Quiz / banco / tentativas / rubricas   |             ✓             |    ✓    |  ✓  |       —       |           —            |  UX tentativa   |     —      |       —       |  90 | Quiz engine Moodle                       |
| Questões IA                            |             —             |    —    |  —  |       —       |           —            |     revisão     |  **Gera**  |       —       |   5 | Neurofrigo → Moodle question bank        |
| Correção assistida IA                  |             —             |    —    |  —  |       —       |           —            |       UI        | **Sugere** |       —       |  10 | Writeback grade Moodle                   |
| Avaliações práticas campo              |             —             |    —    |  —  |       —       |         Evitar         |    **Forms**    |     —      |       —       |  15 | Omnia + grade item Moodle                |
| Certificado PDF                        |             —             |    —    |  —  |  customcert*  |           —            |    validação    |     —      |       —       |  40 | *Plugin a aprovar; validação Omnia       |
| Badges                                 |             ✓             |    ✓    |  ✓  |       —       |           —            |   gamificação   |     —      |       —       |  70 | Complementar, não substituir certificado |
| Mensagens                              |             ✓             |    ✓    |  ✓  |       —       |           —            |    **Inbox**    |     —      |       —       |  55 | Preferir Omnia unificado                 |
| Fórum                                  |             ✓             |    ✓    |  ✓  |       —       |           —            |   UI opcional   |     —      |       —       |  85 | Moodle SoR posts                         |
| Calendário                             |             ✓             |    ✓    |  ✓  |       —       |           —            |    unificar     |     —      |     lives     |  60 | BFF agrega                               |
| Email                                  |             ✓             |    ✓    |  ✓  |       —       |           —            |    templates    |     —      |     SMTP      |  70 | Já parametrizado                         |
| Push / WhatsApp                        |             —             |    —    |  —  |       —       |         Evitar         |    orquestra    |     —      |    **Sim**    |   5 | Ext                                      |
| Perfis / suspend / delete              |             ✓             |    ✓    |  ✓  |  dataprivacy  |           —            |    IdP LGPD     |     —      |       —       |  85 | Mirror Moodle                            |
| MFA / OAuth                            |             ✓             |    ✓    |  ✓  |  mfa/oauth2   |           —            |  **SSO Omnia**  |     —      |    IdP Ext    |  50 | Omnia IdP → provision                    |
| Logs / participação                    |             ✓             |    ✓    |  ✓  |       —       |           —            |  auditoria UX   |     —      |       —       |  75 |                                          |
| Analytics / BI executivo               |          Parcial          |    —    |  —  |   analytics   |  Evitar BI 3º Moodle   |    **KPIs**     |   risco    |    BI Ext     |  35 | Omnia+Neurofrigo                         |
| Dashboard aluno/prof/gestor            |             —             |    —    |  —  |       —       |           —            |     **Sim**     |   cards    |       —       |  10 | 100% Omnia UX                            |
| Continuar estudando                    |          Parcial          |    —    |  —  |       —       |           —            |     **Sim**     |     —      |       —       |  40 | lastaccess Moodle + player Omnia         |
| Gamificação / ranking                  |      Parcial badges       |    —    |  —  |    Evitar     |         Evitar         |     **Sim**     |     —      |       —       |  20 | Omnia                                    |
| Tutor/Chat/Resumos/Plano IA            |             —             |    —    |  —  |       —       |         Evitar         |      shell      |  **Sim**   |       —       |   0 | Neurofrigo                               |
| Authoring professor UX                 |          Parcial          |    —    |  —  |       —       |           —            |     **Sim**     |    gera    |       —       |  25 | WS write Moodle                          |
| CRM educacional                        |             —             |    —    |  —  |       —       |         Evitar         |     **Sim**     |  scoring   |       —       |   0 | Platform                                 |
| Marketplace / PIX                      |             —             |    —    |  —  | Evitar enrol$ |         Evitar         |     **Sim**     |     —      |    gateway    |   5 | Omnia+Ext                                |
| Parceiros / comissões                  |             —             |    —    |  —  |       —       |           —            |     **Sim**     |     —      |       —       |   5 | Platform Partners                        |
| Multiempresa / white-label             |    Parcial cat/cohort     |    —    |  ✓  |       —       | Evitar multi-tenant 3º |     **Sim**     |     —      |       —       |  30 | Omnia Sites + cohorts                    |
| Mobile app / offline                   | app Moodle oficial existe |    —    |  —  |    mobile     |           —            |  **App Omnia**  |     —      |     push      |  15 | Não depender Moodle App                  |
| Live aulas                             |         BBB core          | Parcial |  —  |      bbb      |           —            |       UX        |     —      |   **Jitsi**   |  40 | Preferir Jitsi Ext (Blueprint)           |
| Web Services REST                      |             ✓             |    ✓    |  ✓  |       —       |           —            |    Connector    |     —      |       —       |  90 | Base do Connector 2.4.3/2.5              |

\* `mod_customcert` **não instalado**; classificação “PO/PT” = candidato oficial de comunidade, sujeito a RFC.

---

## Cobertura agregada (estimativa ponderada)

| Camada Blueprint                                                       | Aderência Moodle média | Interpretação                   |
| ---------------------------------------------------------------------- | ---------------------: | ------------------------------- |
| Academic System of Record (estrutura, enrol, grades, completion, quiz) |               **~88%** | Excelente base engine           |
| Experiência de produto (UX, dashboards, mobile, CRM, marketplace)      |               **~12%** | Quase tudo Omnia                |
| IA                                                                     |                **~0%** | Neurofrigo                      |
| Mídia avançada (VOD/live Omnia-grade)                                  |               **~25%** | Ext + Omnia                     |
| **Média global Blueprint × Moodle (todas funções iguais)**             |               **~42%** | Moodle não é o produto; é o SoR |
| **Média só SoR acadêmico crítico**                                     |               **~88%** | Adequado à arquitetura aprovada |

---

## Leitura executiva

O Moodle 4.5 LTS **não precisa ser “completado” para parecer Omnia LMS**. Precisa ser **integrado**. A lacuna dominante é **experiência e orquestração (Omnia)** + **IA (Neurofrigo)** + **commodities (Externos)**, não falta de CMS acadêmico.
