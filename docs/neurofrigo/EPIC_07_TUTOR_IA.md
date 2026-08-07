# EPIC 07 — Tutor IA

**Branch:** `feature/neurofrigo-knowledge-hub`  
**Depende de:** EPIC 01–06

## Missão

Transformar a IA em Tutor de Aprendizagem **sobre** o Neurofrigo Runtime (sem duplicar Retrieval/PromptBuilder).

## Arquitetura

```
Portal (TutorPanel)
  → BFF /api/tutor/*
    → Admin TutorService
      → StudentProfile + LearningProfile (derivados do LMS Core)
      → Neurofrigo Runtime.ask (existente)
      → recomendações / plano / lacunas (catálogo LMS autorizado)
```

## Entregáveis

1. `@omnia/neurofrigo-tutor` — TutorService + personalização + recomendações + plano + gaps  
2. Collections: `student-profiles`, `learning-profiles`, `tutor-study-plans`  
3. Global: `neurofrigo-tutor-dashboard`  
4. Endpoints: `POST /omnia/tutor/chat`, `GET /omnia/tutor/profile`, `POST /omnia/tutor/dashboard/refresh`  
5. Portal: botão **Conversar com o Tutor**  
6. Migration `20260807_120000_tutor_ia`  
7. Bootstrap mode `tutor-ia`

## Não implementado

Agentes · CRM IA · WhatsApp · memória entre cursos · geração de materiais novos
