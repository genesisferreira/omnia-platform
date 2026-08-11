# EPIC 14 — Student Intelligence Platform (SIP)

**Branch:** `feature/neurofrigo-knowledge-hub`  
**Depende de:** EPIC 07–13 (Tutor + Enterprise AI + assistentes)

## Missão

Gêmeo digital educacional do aluno — **única fonte oficial** do perfil de aprendizagem. Assistentes apenas consomem o Profile Service; não alteram o perfil diretamente.

## Arquitetura

```
Portal / Assistentes
  → Profile Service (@omnia/student-intelligence)
    → Evidence Engine → Competency Engine → Learning Intelligence
    → Recommendation Engine → Insights → Auditoria
  → Persistência: sip-profiles / sip-evidence / sip-audit-events
```

## API interna

- `GET /api/omnia/sip/profile?courseId=`
- `GET /api/omnia/sip/context?courseId=&userKey=` (assistentes)
- `POST /api/omnia/sip/recalculate`
- `POST /api/omnia/sip/motivation`
- `POST /api/omnia/sip/dashboard/refresh`

Portal: `/meu-perfil-inteligente`

## Fora de escopo

Testes psicológicos · diagnósticos clínicos · CRM · ERP · WhatsApp · agentes · certificados
