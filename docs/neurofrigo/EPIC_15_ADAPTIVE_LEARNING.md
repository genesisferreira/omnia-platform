# EPIC 15 — Adaptive Learning Engine

**Branch:** `feature/neurofrigo-knowledge-hub`  
**Depende de:** EPIC 14 SIP

## Missão

Transformar Student Profile (SIP) em **Next Best Learning Action** — sem duplicar SIP, sem LLM para progressão acadêmica.

## Ciclo

```
PROFILE (SIP) → DECISION (Adaptive) → ACTION → EVIDENCE → SIP → PROFILE
```

## Package

`@omnia/adaptive-learning` — Decision Engine determinístico + policies + AdaptiveLearningService.

## API

- `GET /api/omnia/adaptive/next?courseId=`
- `POST /api/omnia/adaptive/decide`
- `POST /api/omnia/adaptive/outcome`
- `POST /api/omnia/adaptive/dashboard/refresh`

Portal: bloco **Seu próximo passo** em `/meu-perfil-inteligente`.

## Auditoria Fase 0

Ver [EPIC_15_AUDIT.md](./EPIC_15_AUDIT.md)

## Homologação

Tip: `3421a86` · `ADAPTIVE_LEARNING_SEED_OK` · `E15_HOMOLOG_OK` · `E15_DEPLOY_OK` · **GO**

Ver relatório: [EPIC_15_DELIVERY_REPORT.md](./EPIC_15_DELIVERY_REPORT.md)

## Fora de escopo

CRM · ERP · WhatsApp · agentes · diagnósticos clínicos · certificados · microlessons · fine-tuning
