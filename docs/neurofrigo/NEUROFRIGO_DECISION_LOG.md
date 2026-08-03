# Neurofrigo — Decision Log

Decisões específicas do Runtime Neurofrigo. IDs oficiais também constam no [Omnia LMS Decision Log](../lms/OMNIA_LMS_DECISION_LOG.md).

| ID | Data | Decisão | Status |
|----|------|---------|--------|
| D020 | 2026-07-31 | Runtime Spec inicial: pipeline Identity→Intent→Security→Context→Tools→Specialist→Compliance; Assessment Integrity; ACL-first RAG; sem LLM nesta sprint | **Aprovado (spec)** |
| D021 | 2026-08-03 | **Adendo Runtime v1.1:** (1) Purpose Guard antes do Intent — Omnia-only, categorias permitidas/recusadas, recusa padrão; (2) Tutor/Concierge ≠ Command; Command só `super_admin` / `command.allowedRoles`; (3) MVP = somente chat Portal; WhatsApp fora do MVP (roadmap); n8n = automação interna, não cérebro/canal; (4) DeepSeek = provider inicial via adapter desacoplado (ports); sem SDK/integração nesta etapa | **Aprovado (spec)** |
| D022 | 2026-08-03 | **Knowledge Hub Foundation (Macroentrega 01):** Admin Payload grupo Neurofrigo AI — documents, categories, sources, reviews, agent access, processing jobs (placeholder), audit, settings/dashboard; workflow editorial + ACL; ingestão **manual**; material técnico sensível inicia `draft` + `INTERNAL_RESTRICTED` + `technicalRiskLevel=high` + `allowAiUse=false`; **sem** embeddings, LLM, WhatsApp, ERP, pesquisa web real; staging-only homologação; produção e landing intactas; RAG/indexação só após aprovação em macroentrega futura | **Aprovado (fundação)** |

## Consequências D021

- Pipeline canônico passa a incluir Purpose Guard.  
- Implementação Fase 1 = Portal + Purpose Guard; Command em fase posterior.  
- Nenhum trabalho WhatsApp ou DeepSeek wired até GO de implementação.  
- Troca/fallback de provider sem alterar Orchestrator/domínio.

## Consequências D022

- Knowledge Hub Admin é pré-requisito documental/operacional antes do consumo via Portal chat / RAG.  
- Indexação vetorial e embeddings **fora** da ME01.  
- `INTERNAL_RESTRICTED` nunca no chat público; Command retrieval futuro só `super_admin`.  
- Docs Hub: `NEUROFRIGO_KNOWLEDGE_HUB_*` + ingestão / security / homologação.
