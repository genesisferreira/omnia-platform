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
| D009 | 2026-07-31 | Connector não inicia até GO pós-adendos | Governança | Docs Integration Spec + Security Checklist | Pendente GO |

---

## Como usar

1. Nenhuma Sprint pode contradizer decisões **Aprovado** sem RFC.  
2. Decisões **Aberto** exigem fechamento antes da Sprint que dependem.  
3. Implementação só após GO explícito (ver D009).
