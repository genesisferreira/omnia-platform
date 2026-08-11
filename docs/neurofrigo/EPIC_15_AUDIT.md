# EPIC 15 — Auditoria prévia (Fase 0)

**Branch:** `feature/neurofrigo-knowledge-hub`  
**SIP tip GO:** `3e0b4c2` / docs `f0ecacd`

## Mapa

| Capability | Path | Verdict |
|---|---|---|
| SIP Profile Service | `@omnia/student-intelligence` + `services/sip/profile.ts` | EXISTENTE · REUTILIZAR |
| Competency / Evidence / Insights | package SIP | EXISTENTE · REUTILIZAR (inputs) |
| SIP Recommendations | package SIP | EXISTENTE · EVOLUIR (não duplicar) |
| TutorService + runTutorAsk | neurofrigo-tutor + tutor/ask.ts | EXISTENTE · EVOLUIR (consultar Adaptive) |
| Tutor recommendations / study plan | neurofrigo-tutor | EXISTENTE · REUTILIZAR catálogo |
| loadCourseCatalog | tutor/catalog.ts | EXISTENTE · REUTILIZAR |
| student-profiles / learning-profiles | collections neurofrigo | EXISTENTE · REUTILIZAR (LMS snapshot) |
| Assessment Engine LMS | `@omnia/assessment-engine` | EXISTENTE · FORA MVP (ação ASSESSMENT só se disponível) |
| Assessment Payload collections | — | NÃO EXISTE · FORA |
| Adaptive Decision Engine | — | NOVO |
| Adaptive Policies | — | NOVO |
| Next Best Learning Action | — | NOVO |
| Adaptive Plan projection | — | NOVO |
| Adaptive audit / dashboard | — | NOVO |
| Microlessons / certificados / CRM | — | FORA |

## Ciclo obrigatório

```
PROFILE (SIP) → DECISION (Adaptive) → ACTION → EVIDENCE → SIP → PROFILE
```

Adaptive **lê** Profile Service; **não** escreve no StudentProfile/SIP diretamente.
