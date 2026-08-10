# Neurofrigo — Documentação Oficial

> **Sprint 3.1** (+ adendo v1.1) — Runtime, Purpose Guard, Tutor/Command, Portal MVP.  
> **Macroentrega 01:** Knowledge Hub Foundation (Admin editorial + ACL; sem embeddings/LLM).  
> **Status:** Spec runtime + fundação documental Hub.  
> **Regra:** nenhuma integração produtiva com modelos de IA nesta etapa (sem SDK, sem DeepSeek wired, sem WhatsApp).

## Princípio de domínio

| Camada | Responsabilidade |
|--------|------------------|
| **Omnia** | Experiência, identidade, negócio, políticas, orquestração de produto |
| **Moodle** | Verdade acadêmica (SoR) |
| **Neurofrigo** | Toda Inteligência Artificial |
| **Externos** | LLM via **adapters**, storage, vídeo, live, pagamentos, SMTP; WhatsApp = **futuro** |

## Superfícies

| Superfície | Público | Canal MVP |
|------------|---------|-----------|
| **Tutor / Concierge** | Visitantes, alunos, professores, empresas, parceiros | **Somente chat do Portal** |
| **Command** | `super_admin` ou role em `command.allowedRoles` | Console dedicado (pós-Portal) |

## Pipeline obrigatório

```text
Identity Context
  → Purpose Guard          ← Omnia-only; bloqueia IA generalista
  → Intent Classifier
  → Security Guard
  → Context Builder
  → Tool Router
  → Agente Especialista
  → Compliance Guard
  → Resposta ao usuário
```

n8n = executor de automações internas — **não** cérebro nem canal inicial de chat.

**Provider inicial (spec):** DeepSeek via adapter desacoplado; domínio depende só de ports; fallback/troca futuros.

## Índice

| Documento | Conteúdo |
|-----------|----------|
| [NEUROFRIGO_RUNTIME_SPEC.md](NEUROFRIGO_RUNTIME_SPEC.md) | Runtime v1.1, Purpose Guard, canais, DeepSeek |
| [NEUROFRIGO_ORCHESTRATOR.md](NEUROFRIGO_ORCHESTRATOR.md) | Orchestrators Portal vs Command |
| [NEUROFRIGO_AGENT_CATALOG.md](NEUROFRIGO_AGENT_CATALOG.md) | Agentes Tutor/Concierge + `ops.command` |
| [NEUROFRIGO_SECURITY_ARCHITECTURE.md](NEUROFRIGO_SECURITY_ARCHITECTURE.md) | Purpose + Security Guards |
| [NEUROFRIGO_ASSESSMENT_INTEGRITY.md](NEUROFRIGO_ASSESSMENT_INTEGRITY.md) | Integridade acadêmica |
| [NEUROFRIGO_CONTEXT_POLICY.md](NEUROFRIGO_CONTEXT_POLICY.md) | Context Builder + matrícula |
| [NEUROFRIGO_TOOL_POLICY.md](NEUROFRIGO_TOOL_POLICY.md) | Tool Router allowlist |
| [NEUROFRIGO_KNOWLEDGE_ARCHITECTURE.md](NEUROFRIGO_KNOWLEDGE_ARCHITECTURE.md) | Base de conhecimento ACL (visão); aponta Hub ME01 |
| [NEUROFRIGO_KNOWLEDGE_HUB_ARCHITECTURE.md](NEUROFRIGO_KNOWLEDGE_HUB_ARCHITECTURE.md) | **ME01** — Arquitetura Knowledge Hub Foundation |
| [EPIC_03_KNOWLEDGE_INTELLIGENCE.md](EPIC_03_KNOWLEDGE_INTELLIGENCE.md) | **Epic 03** — Fábrica LMS → chunks + fila (sem embeddings) |
| [EPIC_04_RETRIEVAL_ENGINE.md](EPIC_04_RETRIEVAL_ENGINE.md) | **Epic 04** — Embeddings → vector search → ranking → citations |
| [EPIC_05_NEUROFRIGO_AI_MVP.md](EPIC_05_NEUROFRIGO_AI_MVP.md) | **Epic 05** — Runtime + Portal Chat + AISession |
| [EPIC_06_AI_EXPERIENCE.md](EPIC_06_AI_EXPERIENCE.md) | **Epic 06** — UX, explainability, follow-up, feedback |
| [EPIC_07_TUTOR_IA.md](EPIC_07_TUTOR_IA.md) | **Epic 07** — Tutor IA sobre Runtime + LMS |
| [EPIC_07_DELIVERY_REPORT.md](EPIC_07_DELIVERY_REPORT.md) | **Epic 07** — Delivery / GO |
| [EPIC_08_ENTERPRISE_AI.md](EPIC_08_ENTERPRISE_AI.md) | **Epic 08** — Enterprise AI multiassistente |
| [EPIC_08_DELIVERY_REPORT.md](EPIC_08_DELIVERY_REPORT.md) | **Epic 08** — Delivery / GO |
| [EPIC_09_DEEPSEEK_AGENTS.md](EPIC_09_DEEPSEEK_AGENTS.md) | **Epic 09** — DeepSeek Live + Agent Library |
| [EPIC_09_DELIVERY_REPORT.md](EPIC_09_DELIVERY_REPORT.md) | **Epic 09** — Delivery / GO |
| [EPIC_10_KNOWLEDGE_HUB_LOAD.md](EPIC_10_KNOWLEDGE_HUB_LOAD.md) | **Epic 10** — Carga oficial Knowledge Hub |
| [EPIC_10_DELIVERY_REPORT.md](EPIC_10_DELIVERY_REPORT.md) | **Epic 10** — Delivery / GO |
| [EPIC_11_ENTERPRISE_AI.md](EPIC_11_ENTERPRISE_AI.md) | **Epic 11** — Enterprise AI gap-close (sobre EPIC 08) |
| [EPIC_11_DELIVERY_REPORT.md](EPIC_11_DELIVERY_REPORT.md) | **Epic 11** — Delivery / GO |
| [EPIC_12_COMMERCIAL_IA.md](EPIC_12_COMMERCIAL_IA.md) | **Epic 12** — Comercial IA |
| [EPIC_12_DELIVERY_REPORT.md](EPIC_12_DELIVERY_REPORT.md) | **Epic 12** — Delivery / GO |
| [NEUROFRIGO_KNOWLEDGE_DATA_MODEL.md](NEUROFRIGO_KNOWLEDGE_DATA_MODEL.md) | **ME01** — Modelo de dados Payload |
| [NEUROFRIGO_KNOWLEDGE_WORKFLOW.md](NEUROFRIGO_KNOWLEDGE_WORKFLOW.md) | **ME01** — Workflow editorial |
| [NEUROFRIGO_KNOWLEDGE_ACL.md](NEUROFRIGO_KNOWLEDGE_ACL.md) | **ME01** — ACL Admin + retrieval futuro |
| [NEUROFRIGO_KNOWLEDGE_ADMIN.md](NEUROFRIGO_KNOWLEDGE_ADMIN.md) | **ME01** — Guia Admin |
| [NEUROFRIGO_KNOWLEDGE_INGESTION.md](NEUROFRIGO_KNOWLEDGE_INGESTION.md) | **ME01** — Ingestão manual (defaults sensíveis) |
| [NEUROFRIGO_KNOWLEDGE_SECURITY.md](NEUROFRIGO_KNOWLEDGE_SECURITY.md) | **ME01** — Segurança do Hub |
| [NEUROFRIGO_KNOWLEDGE_DEV_HOMOLOGATION.md](NEUROFRIGO_KNOWLEDGE_DEV_HOMOLOGATION.md) | **ME01** — Checklist staging |
| [NEUROFRIGO_RAG_SPEC.md](NEUROFRIGO_RAG_SPEC.md) | RAG + citações (indexação pós-aprovação; sem embeddings em ME01) |
| [NEUROFRIGO_MEMORY_POLICY.md](NEUROFRIGO_MEMORY_POLICY.md) | Memória e retenção |
| [NEUROFRIGO_ADAPTIVE_LEARNING.md](NEUROFRIGO_ADAPTIVE_LEARNING.md) | Adaptive Learning |
| [NEUROFRIGO_COMPLIANCE_POLICY.md](NEUROFRIGO_COMPLIANCE_POLICY.md) | Compliance Guard |
| [NEUROFRIGO_OBSERVABILITY.md](NEUROFRIGO_OBSERVABILITY.md) | Eventos e métricas |
| [NEUROFRIGO_PORTAL_CHAT_JOURNEY.md](NEUROFRIGO_PORTAL_CHAT_JOURNEY.md) | Jornada Portal (único canal MVP) |
| [NEUROFRIGO_IMPLEMENTATION_ROADMAP.md](NEUROFRIGO_IMPLEMENTATION_ROADMAP.md) | Fases; WhatsApp futuro |
| [NEUROFRIGO_DECISION_LOG.md](NEUROFRIGO_DECISION_LOG.md) | Decisões Neurofrigo (espelho D020/D021/**D022**) |

## Relação com Omnia LMS

- Media Authorization, Learning Engine, Connector e Provisioning são fontes/ferramentas via Tool Router — nunca Moodle direto pelo modelo.
- Write acadêmico via IA só após Write APIs.
- Decisões: **D020** (Runtime Spec inicial), **D021** (Purpose Guard / Tutor·Command / Portal MVP / DeepSeek adapter), **D022** (Knowledge Hub Foundation) no [Decision Log LMS](../lms/OMNIA_LMS_DECISION_LOG.md).

## Fora de escopo desta atualização documental

Código runtime chat, instalação de SDK, integração DeepSeek, fluxo WhatsApp, UI Command.  
**ME01 Knowledge Hub** cobre apenas fundação Admin (collections/workflow/ACL) — sem embeddings/LLM.
