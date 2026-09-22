# Omnia LMS — Roadmap Oficial (Sprint 2.4 → 3.1)

> Alinhado ao Blueprint v1.0. Datas são de sequência de produto, não compromissos comerciais fixos.

---

## Visão da sequência

```text
2.4 Infra + Blueprint + Auditoria Moodle
  → 2.5 Connector + Auth bridge + Catálogo read-only
    → 2.6 Área do Aluno MVP (estudo + progresso)
      → 2.7 Avaliações UX + Certificados
        → 2.8 Professor authoring + Vídeo/Live
          → 2.9 Gestor + Marketplace + Parceiros
            → 3.0 Mobile + IA profunda + White-label maduro
```

---

## Sprint 2.4 — Fundação engine + Blueprint

| Item  | Entrega                                                             |
| ----- | ------------------------------------------------------------------- |
| 2.4.1 | Infra Docker Moodle engine (DEV) — **feito**                        |
| 2.4.2 | Instalação limpa validada + HTTPS — **em curso / baseline OK**      |
| 2.4.3 | Blueprint aprovado + Auditoria Funcional Moodle + desenho Connector |
| Fora  | UI produto, SSO, IA, migração HostGator                             |

**Saída:** Blueprint oficial + mapa “nativo / config / Omnia / Neurofrigo / Ext”.

---

## Sprint 2.5 — Connector e identidade

### Macroentrega 01 (esta entrega) — **em implementação**

- Package `@omnia/lms-connector` + BFF Admin `/api/omnia/lms/*`
- Cliente Moodle REST read-only + health
- Leitura: me, courses, content, progress, grades, completion
- Vínculo Omnia↔Moodle mínimo (manual DEV)
- Policy Engine + Session Manager (Redis Platform)
- Global `lms-settings` + auditoria
- **Fora:** provisionamento, escrita acadêmica, UI completa, PROD

### Macroentrega 02 (seguinte)

- Provisionamento de usuários / matrícula
- Sync de identidade automatizado
- Shell `lms.dev` read-only UX

---

## LMS Product Completion (2026-08) — **STAGING GO**

Macroentrega única (auditar → reutilizar → completar gaps):

- Áreas `/aluno` e `/professor` no Portal (não Admin Payload)
- Modelo acadêmico nativo: turmas, matrículas, banco, avaliações, tentativas, notas, certificados, calendário, notificações in-app, progresso
- Assessment Engine nativo (MCQ/TF/short auto; dissertativa manual) **sem dual-write Moodle**
- Moodle Connector permanece **read-only / write dry-run**
- EPIC 16 R6 permanece em validação humana contínua
- Docs: `LMS_PRODUCT_COMPLETION_AUDIT.md`, `LMS_PRODUCT_COMPLETION_ARCHITECTURE.md`, `LMS_PRODUCT_COMPLETION_DELIVERY_REPORT.md`, `LMS_PRODUCT_COMPLETION_STAGING_HOMOLOGATION.md`
- Staging 2026-08-13: SHA `6db7f63`, CI GREEN, E2E PASS (aluno/professor/admin/ACL/certificado)

**Fora desta entrega:** CRM, ERP, WhatsApp, n8n, produção, merge develop.

---

## Intelligent Learning System V1 (2026-08) — **implementado, homologação staging pendente**

Camada sobre o LMS Core homologado (sem segundo LMS):

- Multi-escola Fred do Frio / CTE (`schoolKey` em company/curso/turma/matrícula/certificado)
- First login + onboarding + consentimento + PCAR + avaliação inicial adaptativa
- Student 360 + SIPE + histórico de competências + IMT com evidência
- Professor Cockpit `/professor/alunos/[id]` + inteligência de turma
- Exercise generator com pipeline GENERATED → VALIDATED → AVAILABLE
- Assessment blueprint + Tutor Assessment Guard
- Doc: `INTELLIGENT_LEARNING_SYSTEM_V1.md`

---

## Sprint 2.6 — Área do Aluno MVP

- Dashboard, meus cursos, continuar estudando
- Player de conteúdo básico (PDF/SCORM ou página + vídeo simples)
- Progresso visual
- Notificações email essenciais
- Acessibilidade baseline

**Saída:** Jornada estudar ponta a ponta no `lms.*`.

---

## Sprint 2.7 — Avaliações e certificados

- UX de questionário Omnia → Moodle quiz
- Histórico de notas
- Certificados: emissão + galeria + validação pública
- Neurofrigo: tutor MVP (chat com contexto de curso)

**Saída:** Aluno conclui curso e valida certificado.

---

## Sprint 2.8 — Professor + mídia

- Authoring: criar/editar curso/módulo/aula via Omnia
- Upload + VOD (CDN)
- Player avançado (velocidade, retomada, progresso)
- Live MVP (Jitsi) + presença
- IA Professor: gerador de questões/roteiro (revisão humana)

**Saída:** Professor produz e publica sem Moodle UI.

---

## Sprint 2.9 — Gestor, monetização, parceiros

- Dashboard gestor + exportações
- Marketplace MVP + PIX/gateway
- Entitlement → matrícula automática
- Parceiros: cursos exclusivos + indicadores
- CRM educacional: funil lead → matrícula
- Multiempresa fase 1 (tenant branding leve)

**Saída:** Receita e operação B2B/B2C no LMS.

---

## Sprint 3.0 — Escala e IA plena

- Apps Android/iOS + push
- Offline seletivo
- White-label completo
- Gamificação
- Neurofrigo: corretor, plano de estudos, recomendações, BI preditivo
- Avaliações práticas de campo
- Hardening LGPD, 2FA, SSO enterprise

**Saída:** Produto Omnia LMS em escala nacional.

---

## Sprint 3.1 — Neurofrigo Runtime Blueprint (spec only)

- Runtime Spec + Orchestrator + Agent Catalog
- Security / Compliance / Assessment Integrity Guards
- Context, Tool, Memory, Knowledge, RAG policies
- Portal Chat Journey + Adaptive Learning (níveis 1–2)
- Implementation Roadmap Fases 1–5
- **Sem** implementação de LLM / SDKs nesta sprint

Docs: [`../neurofrigo/README.md`](../neurofrigo/README.md) · Decisões **D020**, **D021**.

**Pré-requisito recomendado para ações de escrita via IA:** Write APIs acadêmicas (LMS Épico C).

**Saída:** Spec aprovada para implementação futura do Runtime.

---

## Dependências críticas entre sprints

| Antes                         | Depois                                           |
| ----------------------------- | ------------------------------------------------ |
| 2.4 Auditoria                 | 2.5 Connector (não inventar o que Moodle já faz) |
| 2.5 Connector                 | 2.6 Aluno                                        |
| 2.6 Progresso                 | 2.7 Certificados                                 |
| 2.8 Vídeo                     | 3.0 Offline vídeo                                |
| 2.9 Billing                   | 3.0 Assinaturas avançadas                        |
| 3.0 Media Auth + Provisioning | 3.1 Neurofrigo Spec                              |
| Write APIs acadêmicas (LMS)   | Neurofrigo Fase 1+ com tools de escrita          |

---

## Explicitamente fora até 3.0 (salvo RFC)

- Customização Core Moodle
- Migrar base HostGator como caminho oficial
- Blockchain de certificados (pós-3.0)
- ERP completo
