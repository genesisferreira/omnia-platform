# Omnia LMS — Decision Log

Registro oficial de decisões de arquitetura do Omnia LMS.

| ID | Data | Decisão | Contexto | Consequências | Status |
| --- | --- | --- | --- | --- | --- |
| D001 | 2026-07 | Moodle = Academic SoR; Omnia = UX; Neurofrigo = IA; Ext = commodities | Blueprint | Sem UI Moodle para aluno; sem custom core | Aprovado |
| D002 | 2026-07 | Domínios `lms.*` produto; `moodle.*` engine | Infra + Blueprint | Traefik separado | Aprovado |
| D003 | 2026-07 | HostGator não será migrada | Estratégia dados | Instalação limpa VPS | Aprovado |
| D004 | 2026-07 | Live oficial = Jitsi Ext (não BBB como UX) | Auditoria | BBB opcional/desabilitado na UX | Aprovado |
| D005 | 2026-07 | Certificado: validação pública Omnia; emissão Moodle(+plugin) ou Omnia | Auditoria | RFC `customcert` antes 2.7 | Aberto (RFC) |
| D006 | 2026-07-31 | **Sessão concurrent configurável** (aluno default 1; novo login revoga anterior; sync Omnia↔Moodle; abas = mesma sessão) | Adendo segurança | BFF sessão + Connector revoke; painel limites | **Aprovado (spec)** |
| D007 | 2026-07-31 | **Conteúdo sem download** (stream/viewer; signed URL; política material>curso>global; proteção backend) | Adendo segurança | Media authorize no BFF; CDN Ext; limitação screen capture explícita | **Aprovado (spec)** |
| D008 | 2026-07-31 | Precedência de política de conteúdo: material > curso > global; forceViewOnly sensível | Adendo | Overrides auditados | Aprovado (spec) |
| D009 | 2026-07-31 | Connector não inicia até GO pós-adendos | Governança | Docs Integration Spec + Security Checklist | **GO parcial — Macroentrega 01 (read-only)** |
| D010 | 2026-07-31 | BFF LMS no Admin Payload + package `@omnia/lms-connector`; sem terceiro runtime | Monorepo audit | Endpoints `/api/omnia/lms/*`; Redis Platform namespaces | Aprovado |
| D011 | 2026-07-31 | Macroentrega 01: somente leitura acadêmica; vínculo manual DEV; sem provisionamento | Escopo 2.5 | Write Moodle = próxima macroentrega | Aprovado |
| D012 | 2026-07-31 | **Domain Model + Event Catalog + Business Rules + LX Spec + Bounded Contexts** como fonte de verdade pré-2.7 | Sprint 2.6.5 | Sprints futuras não contradizem sem RFC; sem implementação nesta sprint | **Aprovado** |
| D013 | 2026-07-31 | Experience MVP em `apps/web` `/lms/*`; promoção `lms.*` pós-MVP | Sprint 2.6 | Reuso de UI modules | Aprovado |
| D014 | 2026-07-31 | **Learning Engine** (`@omnia/learning-engine`) entre Experience e Connector; Continue/Timeline/Events via porta `LearningPersistence` (sem localStorage nas regras) | Sprint 2.7A | IA/marketplace/professor/gestor/provisionamento fora | **Aprovado** |
| D015 | 2026-07-31 | **Lesson Experience** em `/lms/.../atividades/[id]`; conteúdo via Connector + placeholders; conclusão local via engine (write Moodle = futuro) | Sprint 2.7B | Streaming CDN / media auth avançada fora | **Aprovado** |
| D016 | 2026-07-31 | **Material Experience** (`MaterialProvider`/`Viewer`/renderers) + security ports stub; eventos `material.viewed|completed` | Sprint 2.7C | Signed URLs / watermark / streaming fora | **Aprovado** |
| D017 | 2026-07-31 | **Assessment Engine** (`@omnia/assessment-engine`) read-only; Viewer quiz/assign; eventos `assessment.*`; sem Write API / submissão | Sprint 2.7D | Submissão Moodle = futuro | **Aprovado** |

---

## Como usar

1. Nenhuma Sprint pode contradizer decisões **Aprovado** sem RFC.  
2. Decisões **Aberto** exigem fechamento antes da Sprint que dependem.  
3. Implementação só após GO explícito (ver D009).
