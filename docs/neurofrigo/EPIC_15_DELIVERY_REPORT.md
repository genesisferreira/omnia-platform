# EPIC 15 — Delivery Report

**Branch:** `feature/neurofrigo-knowledge-hub`  
**Tip homologado:** `3421a86`  
**Estratégia:** Adaptive Learning sobre SIP (sem duplicar perfil; decisão determinística)

## Veredito: **GO**

Staging: `ADAPTIVE_LEARNING_SEED_OK` · `E15_HOMOLOG_OK` · `E15_DEPLOY_OK` · admin healthy · `web_http=200` · landing/prod/Moodle intactos

## 1. Auditoria prévia

Ver [EPIC_15_AUDIT.md](./EPIC_15_AUDIT.md)

## 2. Reutilizado

SIP Profile Service · Competency/Evidence/Insights · `loadCourseCatalog` · TutorService · student/learning profiles · padrão commercial/SIP de package+seed+homolog

## 3. Criado

`@omnia/adaptive-learning` · `adaptive-decisions` · `adaptive-policies` · `adaptive-learning-dashboard` · endpoints `/omnia/adaptive/*` · Portal “Seu próximo passo”

## 4. Arquitetura

```
Aluno → SIP/Profile Service → Adaptive Decision Engine → Next Best Action
  → Portal/Tutor → ação → evidência → SIP → perfil atualizado → nova decisão
```

## 5–8. Decision Engine / Policies / NBLA / Plan

Motor determinístico (sem LLM). Policies versionáveis (`global-default` v1.0.0). Ações: CONTINUE/REVIEW/NEXT_MODULE/PRACTICE/ASSESSMENT/REVISIT/ASK_TUTOR. Plano curto now/next/then.

## 9–10. Integração SIP / Tutor

Adaptive **lê** SIP; **não escreve**. Tutor injeta `## ADAPTIVE_NEXT_BEST` via `tutorHint` (não duplica regras no prompt).

## 11–14. Portal / Dashboard / ACL / Auditoria

Portal: bloco + “Por que isso foi recomendado?” (fatores sem IMT). Dashboard: decisões, tipos, aceites, review, confidence, decideMs. ACL: student só próprio userKey. Auditoria: `adaptive-decisions` imutável (update só outcome).

## 15–16. Testes / Benchmarks

Unit: **7/7**. Homolog: A/B/E/I + isolamento + decideMs médio **47ms** (seed 62ms).

```json
{
  "results": [
    { "id": "A", "actionType": "REVIEW_LESSON", "decideMs": 57, "planSteps": 3 },
    { "id": "B", "actionType": "REVIEW_LESSON", "decideMs": 41, "planSteps": 3 },
    { "id": "E", "actionType": "REVIEW_LESSON", "decideMs": 53, "planSteps": 3 },
    { "id": "I", "actionType": "REVIEW_LESSON", "decideMs": 47, "planSteps": 3 }
  ],
  "isolationOk": true,
  "dashDecisions": 15,
  "avgDecideMs": 47,
  "auditTotal": 15
}
```

## 17. CI

Não executado workflow GitHub completo nesta entrega. Falhas locais: nenhuma nos testes do pacote. Classificação: N/A staging path (mesmo padrão EPICs 12–14).

## 18–19. Migration / staging

Migration `20260811_120000_adaptive_learning`. Backup: `/opt/omnia/backups/staging/adaptive-learning-e15-20260811-112404`

## 20. Commits

- `3421a86` — feat EPIC 15 Adaptive Learning Engine

## 21. Pendências

- CTA Portal ainda não deep-linka slug de aula por curso (mostra ação; link genérico para Tutor/cursos)
- ASSESSMENT só quando flag/capacidade existente
- Outcome accepted/ignored UI no Portal (API pronta)

## 22. Rollback

Restaurar dump do backup + `git checkout` tip pré-`3421a86` + recreate admin/web. Migration `down` disponível.

## 23. GO / NO-GO

**GO**

## Não iniciado

CRM · ERP · WhatsApp · agentes · diagnósticos clínicos · certificados · microlessons · fine-tuning

## PARAR

EPIC 15 encerrada em **GO**. Aguardar aprovação humana.
