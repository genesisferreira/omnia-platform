# Neurofrigo Implementation Roadmap

Documentação-first. **Sem código nestas fases até GO explícito de implementação.**

## Canal e superfícies (escopo)

| Item | Status no plano |
|------|-----------------|
| Portal chat (Tutor/Concierge) | **MVP — Fase 1–2** |
| Neurofrigo Command | **Após** Portal estável; só `super_admin` |
| WhatsApp | **Fora do MVP** — fase futura |
| DeepSeek (adapter) | Spec agora; **implementação** só com GO |
| n8n | Automação interna; **nunca** Fase 0 de chat |

---

## Macroentrega 01 — Knowledge Hub Foundation

**Antes** do runtime de chat consumir KB. Fundação Admin + domínio ACL/workflow.

- [x] Spec Hub (arquitetura, data model, workflow, ACL, admin, ingestão, security, homologação) — **D022**  
- [x] Collections/globals Admin + pacote `@omnia/neurofrigo-knowledge` (sem embeddings/LLM)  
- [ ] Homologação staging (migrate, seed, CRUD, workflow, ACL) — ver [NEUROFRIGO_KNOWLEDGE_DEV_HOMOLOGATION.md](NEUROFRIGO_KNOWLEDGE_DEV_HOMOLOGATION.md)  
- [ ] Produção e landing **intactas** (critério de GO)

**Fora da ME01:** embeddings, indexação RAG, DeepSeek wired, WhatsApp, ERP, chat Portal consumindo KB.

---

## Fase 0 — Spec freeze (runtime)

- [x] Runtime Spec v1.1 (Purpose Guard, Tutor/Command, Portal MVP, DeepSeek adapter)  
- [x] Orchestrator, Security, Catalog, Journey atualizados  
- [x] Knowledge Hub Foundation docs + Admin (**Macroentrega 01** / D022)  
- [ ] GO humano para implementação de código do **runtime chat**

## Fase 1 — Foundation Portal (código futuro)

1. Runtime NestJS + Identity Context  
2. **Purpose Guard** (antes do Intent)  
3. Intent Classifier + Security Guard  
4. Orchestrator superfície `portal`  
5. Concierge + Support  
6. Observabilidade mínima (`ai.purpose_guard`, `ai.request.*`)  
7. Provider adapter interface + **DeepSeek** como primeiro adapter (sem hardcode no domínio)

**Não incluir:** WhatsApp, Command UI completa, n8n como cérebro.

## Fase 2 — Academic Tutor

Integrity Guard, Context Builder, RAG autorizado, Continuação Learning Engine, Memory segura.

## Fase 3 — Comercial + Content

Sales, Content drafts, CRM tools, Compliance comercial.

## Fase 4 — Neurofrigo Command (separado)

- Identity gate `super_admin` / `command.allowedRoles`  
- Orchestrator superfície `command`  
- Tools auditadas; confirmação humana para mutações  
- **Não** misturar com Concierge Portal  

## Fase 5 — Adaptive + Assessment assist

Adaptive Engine, Assessor (sem gabaritos).

## Fase 6+ — Canais futuros

- WhatsApp (adapter de canal; Purpose + Security iguais)  
- Fallback de provider além de DeepSeek  
- Multi-agente avançado  

## Critérios GO / NO-GO implementação

| GO | NO-GO |
|----|-------|
| Spec v1.1 aprovada | Pedido de WhatsApp no MVP |
| Purpose Guard na Fase 1 | Command no mesmo chat do visitante |
| Portal-only MVP | Provider acoplado ao domínio |
| DeepSeek só via adapter | n8n como orquestrador de diálogo |

## Dependências Omnia

Auth, Enrollment, Media Authorization, Continuação Learning Engine, **Knowledge Hub (ME01)**, Knowledge ACL, Tool Gateway, Observability.
