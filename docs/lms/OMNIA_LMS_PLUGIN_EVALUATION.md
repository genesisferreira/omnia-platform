# Omnia LMS — Avaliação de Plugins Moodle

> Instalação auditada: **core limpo** (sem plugins Omnia).  
> Política Blueprint: **sem custom core**; plugins só se inevitáveis e mantíveis.

---

## 1. Plugins / componentes presentes (core)

| Componente                                                                     | Tipo | Classificação                          | Justificativa                                                          |
| ------------------------------------------------------------------------------ | ---- | -------------------------------------- | ---------------------------------------------------------------------- |
| Atividades padrão (quiz, forum, page, resource, scorm, h5pactivity, assign, …) | Core | **Aprovar**                            | Base acadêmica                                                         |
| `mod_bigbluebuttonbn`                                                          | Core | **Opcional / Evitar como UX primária** | Blueprint escolhe Jitsi Ext; BBB pode ficar desabilitado na UI produto |
| `tool_lp` / competencies                                                       | Core | **Aprovar** (config)                   | Competências Blueprint                                                 |
| `tool_dataprivacy`                                                             | Core | **Aprovar**                            | LGPD apoio                                                             |
| `tool_mfa` / `tool_oauth2`                                                     | Core | **Opcional**                           | SSO canônico = Omnia IdP; MFA Moodle só se login engine direto         |
| `tool_mobile`                                                                  | Core | **Evitar como app do aluno**           | App = Omnia; mobile WS podem ajudar Connector                          |
| Analytics models                                                               | Core | **Opcional**                           | BI produto = Omnia/Neurofrigo                                          |
| MoodleNet                                                                      | Core | **Evitar**                             | Fora do escopo Omnia Frigo                                             |

---

## 2. Plugins oficiais/comunidade recomendados (candidatos)

| Plugin                         | Uso Blueprint    | Classificação                  | Notas                                                            |
| ------------------------------ | ---------------- | ------------------------------ | ---------------------------------------------------------------- |
| **mod_customcert**             | Certificados PDF | **Opcional → Aprovar sob RFC** | Mais maduro que reinventar PDF; validação pública continua Omnia |
| **enrol_cohort** (core)        | Turmas B2B       | **Aprovar**                    | Já core                                                          |
| format_topics / weeks (core)   | Estrutura        | **Aprovar**                    | Padrão                                                           |
| availability conditions (core) | Pré-requisitos   | **Aprovar**                    |                                                                  |

---

## 3. Plugins a evitar (duplicam Omnia / Neurofrigo / Ext)

| Plugin / classe                           | Motivo                      | Classificação |
| ----------------------------------------- | --------------------------- | ------------- |
| Temas custom / boost child “produto”      | UI = Omnia `lms.*`          | **Evitar**    |
| Gamificação 3º (level up, block ranking…) | Gamificação Omnia           | **Evitar**    |
| Chatbots / AI inside Moodle               | Neurofrigo                  | **Evitar**    |
| Marketplace / payment enrol complexos     | Marketplace Omnia + gateway | **Evitar**    |
| CRM / mail marketing Moodle               | CRM Platform                | **Evitar**    |
| Players VOD proprietários no Moodle       | Player Omnia + CDN          | **Evitar**    |
| Multi-tenant plugins frágeis              | Multiempresa Omnia          | **Evitar**    |
| Certificate plugins abandonados           | Risco segurança             | **Evitar**    |
| XML-RPC / integrações legadas             | Segurança                   | **Evitar**    |

---

## 4. Critérios de aprovação de plugin (RFC)

1. Necessidade acadêmica **não** coberta por WS + Omnia.
2. Manutenção ativa compatível com Moodle 4.5 LTS.
3. Sem fork do core.
4. Licença compatível.
5. Superfície de ataque aceitável.
6. Plano de remoção/substituição.
7. Não duplicar Blueprint Omnia/Neurofrigo/Ext.

---

## 5. Decisão imediata (sprint auditoria)

| Ação                                   | Plugin          | Prazo sugerido       |
| -------------------------------------- | --------------- | -------------------- |
| Manter core limpo                      | —               | Agora                |
| Desabilitar BBB na experiência produto | bigbluebuttonbn | Config 2.5+          |
| RFC `mod_customcert`                   | certificados    | Antes Sprint 2.7     |
| Não instalar AI/gamification/payment   | —               | Permanente salvo RFC |
