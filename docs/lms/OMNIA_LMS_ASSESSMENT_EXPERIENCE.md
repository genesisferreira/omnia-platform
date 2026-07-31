# Omnia LMS — Assessment Experience

> **Sprint 2.7 — Épico D** — Viewer read-only de atividades/avaliações.

## Componentes

| Peça | Função |
| --- | --- |
| `AssessmentProvider` | Engine + sink Learning Engine + security stubs |
| `AssessmentViewer` | Metadata, status, renderers, conclusão local |
| `AssessmentExperience` | Host na Lesson Page (quando `modName` quiz/assign) |
| `AssessmentNav` | Prev/next atividade · aula · módulo · curso |

## Dados Connector (RO)

`content` + `progress` + `grades` + `completion` — sem write.

## Eventos

`assessment.opened|viewed|completed|closed` · `quiz.viewed` · `assignment.viewed` · `grade.viewed` · `feedback.viewed` · `continue.updated` · `progress.updated`

## Testes

```bash
pnpm --filter @omnia/assessment-engine test
pnpm --filter @omnia/web test:lms-assessment
```
